import tempfile
from datetime import timedelta
from io import BytesIO
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from PIL import Image
from rest_framework.test import APITestCase
from requests.exceptions import ConnectionError
from twilio.base.exceptions import TwilioException

from accounts.models import User
from categories.models import Category
from products.models import Product
from .models import DeliveryIssueClaim, Order, OrderItem
from .twilio_service import (
	DeliveryOTPError,
	send_delivery_otp,
	verify_delivery_otp,
)
from .claim_analysis import calculate_visual_similarity


class DeliveryOTPServiceTests(SimpleTestCase):

	@patch(
		"orders.twilio_service.get_twilio_client",
		side_effect=TwilioException("provider failure"),
	)
	def test_converts_twilio_errors(self, _get_twilio_client):
		with self.assertRaises(DeliveryOTPError):
			send_delivery_otp("9861336792")

	@patch(
		"orders.twilio_service.get_twilio_client",
		side_effect=ConnectionError("network failure"),
	)
	def test_converts_network_errors(self, _get_twilio_client):
		with self.assertRaises(DeliveryOTPError) as error:
			send_delivery_otp("9861336792")
		self.assertEqual(error.exception.status_code, 503)

	@patch(
		"orders.twilio_service.get_twilio_client",
		side_effect=TwilioException("provider failure"),
	)
	def test_converts_verify_twilio_errors(self, _get_twilio_client):
		with self.assertRaises(DeliveryOTPError):
			verify_delivery_otp("9861336792", "123456")

	@patch(
		"orders.twilio_service.get_twilio_client",
		side_effect=ConnectionError("network failure"),
	)
	def test_converts_verify_network_errors(self, _get_twilio_client):
		with self.assertRaises(DeliveryOTPError) as error:
			verify_delivery_otp("9861336792", "123456")
		self.assertEqual(error.exception.status_code, 503)


class DeliveryClaimAnalysisTests(SimpleTestCase):

	def test_identical_images_have_full_visual_similarity(self):
		image_buffer = BytesIO()
		Image.new("RGB", (32, 32), (20, 120, 220)).save(
			image_buffer,
			format="PNG",
		)
		image_bytes = image_buffer.getvalue()

		self.assertEqual(
			calculate_visual_similarity(image_bytes, image_bytes),
			100.0,
		)


class DeliveryIssueClaimAPITests(APITestCase):

	def setUp(self):
		media_directory = tempfile.TemporaryDirectory()
		self.addCleanup(media_directory.cleanup)
		media_settings = override_settings(MEDIA_ROOT=media_directory.name)
		media_settings.enable()
		self.addCleanup(media_settings.disable)

		self.customer = User.objects.create_user(
			username="claim-customer",
			email="customer@example.com",
			password="test-password",
		)
		self.admin = User.objects.create_user(
			username="claim-admin",
			email="admin@example.com",
			password="test-password",
			is_staff=True,
		)
		category = Category.objects.create(
			name="Claim Test",
			slug="claim-test",
		)
		product = Product.objects.create(
			category=category,
			name="Test product",
			slug="test-product-claim",
			brand="Test brand",
			description="Product used for claim tests.",
			price="25.00",
			sku="CLAIM-TEST-001",
		)
		self.order = Order.objects.create(
			user=self.customer,
			total_amount="25.00",
			shipping_address="1 Test Street",
			city="Test City",
			state="Test State",
			pincode="123456",
			status="Delivered",
		)
		self.order_item = OrderItem.objects.create(
			order=self.order,
			product=product,
			quantity=1,
			price="25.00",
		)

	def _image_upload(self):
		image_buffer = BytesIO()
		Image.new("RGB", (16, 16), (50, 100, 150)).save(
			image_buffer,
			format="PNG",
		)
		return SimpleUploadedFile(
			"received-item.png",
			image_buffer.getvalue(),
			content_type="image/png",
		)

	def _claim_payload(self):
		return {
			"order_item_id": str(self.order_item.id),
			"issue_type": "broken",
			"description": "The item arrived broken.",
			"evidence_image": self._image_upload(),
		}

	@patch(
		"orders.views.analyze_claim_images",
		return_value=(
			{
				"provider": "test",
				"product_match": "uncertain",
				"damage_visible": None,
				"confidence": None,
				"summary": "Admin review required.",
			},
			80.0,
		),
	)
	def test_customer_can_submit_claim_for_delivered_item(self, _analyze):
		self.client.force_authenticate(user=self.customer)
		response = self.client.post(
			reverse("delivery-issue-claims", args=[self.order.id]),
			self._claim_payload(),
			format="multipart",
		)

		self.assertEqual(response.status_code, 201)
		self.assertEqual(response.data["status"], "pending")
		self.assertEqual(response.data["visual_similarity"], 80.0)
		self.assertTrue(
			DeliveryIssueClaim.objects.filter(
				order=self.order,
				order_item=self.order_item,
				user=self.customer,
			).exists()
		)

	def test_customer_cannot_submit_claim_before_delivery(self):
		self.order.status = "Shipped"
		self.order.save(update_fields=["status"])
		self.client.force_authenticate(user=self.customer)

		response = self.client.post(
			reverse("delivery-issue-claims", args=[self.order.id]),
			self._claim_payload(),
			format="multipart",
		)

		self.assertEqual(response.status_code, 400)

	def test_customer_cannot_view_another_users_claims(self):
		other_customer = User.objects.create_user(
			username="other-customer",
			password="test-password",
		)
		self.client.force_authenticate(user=other_customer)

		response = self.client.get(
			reverse("delivery-issue-claims", args=[self.order.id])
		)

		self.assertEqual(response.status_code, 404)

	@patch("orders.views.send_mail")
	def test_admin_approval_persists_refund_date_and_notice(self, send_email):
		claim = DeliveryIssueClaim.objects.create(
			order=self.order,
			order_item=self.order_item,
			user=self.customer,
			evidence_image=self._image_upload(),
			issue_type="broken",
		)
		self.client.force_authenticate(user=self.admin)
		refund_date = timezone.localdate() + timedelta(days=5)

		response = self.client.patch(
			reverse("admin-delivery-issue-review", args=[claim.id]),
			{
				"decision": "approved",
				"refund_processing_date": refund_date.isoformat(),
				"admin_note": "Evidence reviewed.",
			},
			format="json",
		)

		self.assertEqual(response.status_code, 200)
		claim.refresh_from_db()
		self.assertEqual(claim.status, "approved")
		self.assertEqual(claim.refund_processing_date, refund_date)
		self.assertIn(refund_date.strftime("%B %d, %Y"), claim.customer_message)
		send_email.assert_called_once()
