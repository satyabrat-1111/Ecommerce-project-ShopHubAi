from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import User
from categories.models import Category
from products.models import Product

from .models import DeliveryTracking, Order


class DeliveryTrackingAPITests(APITestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            username="tracking-customer",
            password="test-password",
        )
        self.other_customer = User.objects.create_user(
            username="other-tracking-customer",
            password="test-password",
        )
        self.delivery_person = User.objects.create_user(
            username="tracking-driver",
            password="test-password",
            is_delivery_person=True,
        )
        self.other_staff = User.objects.create_user(
            username="other-tracking-driver",
            password="test-password",
            is_delivery_person=True,
        )
        self.admin = User.objects.create_user(
            username="tracking-admin",
            password="test-password",
            is_staff=True,
            is_superuser=True,
        )
        category = Category.objects.create(
            name="Tracking Test",
            slug="tracking-test",
        )
        Product.objects.create(
            category=category,
            name="Tracking product",
            slug="tracking-product",
            brand="Test brand",
            description="Product used for tracking tests.",
            price="30.00",
            sku="TRACKING-001",
        )
        self.order = Order.objects.create(
            user=self.customer,
            total_amount="30.00",
            shipping_address="Private street address",
            city="Test City",
            state="Test State",
            pincode="123456",
            status="Shipped",
        )
        self.other_order = Order.objects.create(
            user=self.other_customer,
            total_amount="10.00",
            shipping_address="Another private address",
            city="Other City",
            state="Other State",
            pincode="654321",
            status="Shipped",
        )
        self.tracking = DeliveryTracking.objects.create(
            order=self.order,
            delivery_person=self.delivery_person,
        )
        self.other_tracking = DeliveryTracking.objects.create(
            order=self.other_order,
            delivery_person=self.other_staff,
            latitude=10.0,
            longitude=20.0,
            last_location_at=timezone.now() - timedelta(seconds=10),
            is_sharing=True,
        )

    def test_anonymous_and_other_customers_cannot_read_tracking(self):
        response = self.client.get(
            reverse("delivery-location-detail", args=[self.order.id])
        )
        self.assertEqual(response.status_code, 401)

        self.client.force_authenticate(user=self.other_customer)
        response = self.client.get(
            reverse("delivery-location-detail", args=[self.order.id])
        )
        self.assertEqual(response.status_code, 404)

        self.client.force_authenticate(user=self.customer)
        response = self.client.get(
            reverse("delivery-location-detail", args=[self.order.id])
        )
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("shipping_address", response.data)
        self.assertNotIn("delivery_phone", response.data)

    def test_only_assigned_delivery_person_can_start_and_submit_location(self):
        self.client.force_authenticate(user=self.other_staff)
        denied = self.client.post(
            reverse("delivery-sharing-state", args=[self.order.id, "start"])
        )
        self.assertEqual(denied.status_code, 404)

        self.client.force_authenticate(user=self.delivery_person)
        started = self.client.post(
            reverse("delivery-sharing-state", args=[self.order.id, "start"])
        )
        self.assertEqual(started.status_code, 200)
        self.assertTrue(started.data["tracking"]["is_sharing"])

        update = self.client.post(
            reverse("delivery-location-update", args=[self.order.id]),
            {"latitude": 37.4219, "longitude": -122.084, "accuracy_meters": 12.5},
            format="json",
        )
        self.assertEqual(update.status_code, 200)
        self.tracking.refresh_from_db()
        self.assertAlmostEqual(self.tracking.latitude, 37.4219)
        self.assertAlmostEqual(self.tracking.longitude, -122.084)

        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "Shipped")
        self.assertFalse(self.order.delivery_otp_verified)

    def test_unknown_sharing_action_is_rejected(self):
        self.client.force_authenticate(user=self.delivery_person)
        response = self.client.post(
            reverse("delivery-sharing-state", args=[self.order.id, "pause"])
        )
        self.assertEqual(response.status_code, 400)

    def test_invalid_coordinates_are_rejected(self):
        self.client.force_authenticate(user=self.delivery_person)
        self.client.post(
            reverse("delivery-sharing-state", args=[self.order.id, "start"])
        )

        for latitude, longitude in ((90.01, 10), (10, -181), ("NaN", 10)):
            with self.subTest(latitude=latitude, longitude=longitude):
                response = self.client.post(
                    reverse("delivery-location-update", args=[self.order.id]),
                    {"latitude": latitude, "longitude": longitude},
                    format="json",
                )
                self.assertEqual(response.status_code, 400)

    def test_location_updates_are_rate_limited(self):
        self.tracking.is_sharing = True
        self.tracking.last_location_at = timezone.now() - timedelta(seconds=4)
        self.tracking.save(update_fields=["is_sharing", "last_location_at"])
        self.client.force_authenticate(user=self.delivery_person)

        payload = {"latitude": 10, "longitude": 20}
        first = self.client.post(
            reverse("delivery-location-update", args=[self.order.id]),
            payload,
            format="json",
        )
        second = self.client.post(
            reverse("delivery-location-update", args=[self.order.id]),
            payload,
            format="json",
        )
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 429)

    def test_admin_assignment_requires_staff_and_shipped_order(self):
        self.client.force_authenticate(user=self.customer)
        denied = self.client.post(
            reverse("delivery-assignment", args=[self.order.id]),
            {"delivery_person_id": self.other_staff.id},
            format="json",
        )
        self.assertEqual(denied.status_code, 403)

        self.client.force_authenticate(user=self.admin)
        assignees = self.client.get(reverse("delivery-assignees"))
        self.assertEqual(
            {person["id"] for person in assignees.data},
            {self.delivery_person.id, self.other_staff.id},
        )
        invalid_assignee = self.client.post(
            reverse("delivery-assignment", args=[self.order.id]),
            {"delivery_person_id": self.customer.id},
            format="json",
        )
        self.assertEqual(invalid_assignee.status_code, 400)

        assigned = self.client.post(
            reverse("delivery-assignment", args=[self.order.id]),
            {"delivery_person_id": self.other_staff.id},
            format="json",
        )
        self.assertEqual(assigned.status_code, 200)
        self.tracking.refresh_from_db()
        self.assertEqual(self.tracking.delivery_person_id, self.other_staff.id)
        self.assertIsNone(self.tracking.latitude)

        self.order.status = "Delivered"
        self.order.save(update_fields=["status"])
        rejected = self.client.post(
            reverse("delivery-assignment", args=[self.order.id]),
            {"delivery_person_id": self.delivery_person.id},
            format="json",
        )
        self.assertEqual(rejected.status_code, 400)

    def test_delivery_person_role_is_required_and_assignments_are_scoped(self):
        self.client.force_authenticate(user=self.customer)
        denied = self.client.get(reverse("my-assigned-deliveries"))
        self.assertEqual(denied.status_code, 403)

        self.client.force_authenticate(user=self.delivery_person)
        allowed = self.client.get(reverse("my-assigned-deliveries"))
        self.assertEqual(allowed.status_code, 200)
        self.assertEqual(
            [row["order_id"] for row in allowed.data],
            [self.order.id],
        )

        self.delivery_person.is_delivery_person = False
        self.delivery_person.save(update_fields=["is_delivery_person"])
        revoked = self.client.post(
            reverse("delivery-sharing-state", args=[self.order.id, "start"])
        )
        self.assertEqual(revoked.status_code, 403)

    def test_admin_monitoring_is_staff_only_and_completion_stops_sharing(self):
        self.client.force_authenticate(user=self.customer)
        denied = self.client.get(reverse("admin-active-deliveries"))
        self.assertEqual(denied.status_code, 403)

        self.client.force_authenticate(user=self.admin)
        allowed = self.client.get(reverse("admin-active-deliveries"))
        self.assertEqual(allowed.status_code, 200)
        self.assertEqual(len(allowed.data), 2)

        self.order.status = "Delivered"
        self.order.save(update_fields=["status"])
        self.tracking.refresh_from_db()
        self.assertFalse(self.tracking.is_sharing)

        self.client.force_authenticate(user=self.delivery_person)
        rejected = self.client.post(
            reverse("delivery-location-update", args=[self.order.id]),
            {"latitude": 10, "longitude": 20},
            format="json",
        )
        self.assertEqual(rejected.status_code, 400)

    def test_cancelled_order_stops_sharing(self):
        self.tracking.latitude = 40.0
        self.tracking.longitude = -73.0
        self.tracking.last_location_at = timezone.now()
        self.tracking.is_sharing = True
        self.tracking.save()
        self.order.status = "Cancelled"
        self.order.save(update_fields=["status"])
        self.tracking.refresh_from_db()
        self.assertFalse(self.tracking.is_sharing)
        self.assertIsNone(self.tracking.latitude)
        self.assertIsNone(self.tracking.longitude)

    def test_reverting_to_non_shipped_status_clears_location(self):
        self.tracking.latitude = 40.0
        self.tracking.longitude = -73.0
        self.tracking.last_location_at = timezone.now()
        self.tracking.is_sharing = True
        self.tracking.save()
        self.order.status = "Confirmed"
        self.order.save(update_fields=["status"])
        self.tracking.refresh_from_db()
        self.assertFalse(self.tracking.is_sharing)
        self.assertIsNone(self.tracking.latitude)
        self.assertIsNone(self.tracking.longitude)
