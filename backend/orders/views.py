from decimal import Decimal
import logging

from django.conf import settings
from django.core.mail import send_mail
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from cart.models import Cart
from payments.models import Payment

from .claim_analysis import analyze_claim_images
from .models import DeliveryIssueClaim, Order, OrderItem
from .serializers import (
    DeliveryIssueClaimCreateSerializer,
    DeliveryIssueClaimSerializer,
    OrderSerializer,
)
from .twilio_service import (
    DeliveryOTPError,
    send_delivery_otp,
    verify_delivery_otp,
)


logger = logging.getLogger(__name__)


# ============================================================
# PLACE ORDER
# ============================================================

class PlaceOrderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        cart = get_object_or_404(
            Cart,
            user=request.user
        )

        if not cart.items.exists():
            return Response(
                {
                    "error": "Your cart is empty"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        order = Order.objects.create(
            user=request.user,
            shipping_address=request.data.get("shipping_address"),
            city=request.data.get("city"),
            state=request.data.get("state"),
            country=request.data.get("country", "India"),
            pincode=request.data.get("pincode"),
            total_amount=Decimal("0.00"),
        )

        total = Decimal("0.00")

        for item in cart.items.all():
            OrderItem.objects.create(
                order=order,
                product=item.product,
                quantity=item.quantity,
                price=item.product.price,
            )

            total += item.product.price * item.quantity

        order.total_amount = total
        order.save()

        return Response(
            OrderSerializer(order).data,
            status=status.HTTP_201_CREATED,
        )


# ============================================================
# CUSTOMER ORDER HISTORY
# ============================================================

class OrderHistoryView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Order.objects
            .filter(user=self.request.user)
            .order_by("-created_at")
        )


# ============================================================
# CUSTOMER ORDER DETAIL
# ============================================================

class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    lookup_field = "id"

    def get_queryset(self):
        return Order.objects.filter(
            user=self.request.user
        )


# ============================================================
# SEND DELIVERY OTP
# ============================================================

class DeliveryOTPSendView(APIView):
    """
    Sends a delivery OTP to the phone number entered
    by the admin/delivery person.

    OTP can only be sent when the order is Shipped.

    The entered phone number is saved against the order
    so the same number is used during OTP verification.
    """

    permission_classes = [
        IsAuthenticated,
        IsAdminUser,
    ]

    def post(self, request, order_id):
        order = get_object_or_404(
            Order,
            id=order_id
        )

        # ----------------------------------------------------
        # OTP is only allowed for shipped orders.
        # ----------------------------------------------------

        if order.status != "Shipped":
            return Response(
                {
                    "error": (
                        "Delivery OTP can only be sent "
                        "for a shipped order."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ----------------------------------------------------
        # Already delivered orders cannot receive another OTP.
        # ----------------------------------------------------

        if order.delivery_otp_verified:
            return Response(
                {
                    "error": (
                        "Delivery OTP has already been "
                        "verified for this order."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ----------------------------------------------------
        # Get phone number from request.
        #
        # Example:
        # {
        #     "phone": "9861336792"
        # }
        # ----------------------------------------------------

        phone = request.data.get("phone")

        if not phone:
            return Response(
                {
                    "error": (
                        "Delivery phone number is required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # ------------------------------------------------
            # Send OTP through Twilio Verify.
            #
            # twilio_service.py will normalize:
            #
            # 9861336792
            #      ↓
            # +919861336792
            # ------------------------------------------------

            result = send_delivery_otp(phone)

        except DeliveryOTPError as exc:
            return Response(
                {
                    "error": str(exc)
                },
                status=exc.status_code,
            )

        # ----------------------------------------------------
        # Save the normalized phone number against the order.
        #
        # IMPORTANT:
        # We do not store the OTP itself.
        # Twilio Verify manages the OTP.
        # ----------------------------------------------------

        order.delivery_phone = result.get("phone")
        order.delivery_otp_created_at = timezone.now()
        order.delivery_otp_verified = False
        order.delivery_otp_attempts = 0

        order.save(
            update_fields=[
                "delivery_phone",
                "delivery_otp_created_at",
                "delivery_otp_verified",
                "delivery_otp_attempts",
                "updated_at",
            ]
        )

        return Response(
            {
                "message": (
                    "Delivery OTP sent successfully "
                    "to the entered delivery phone number."
                ),
                "order_id": order.id,
                "status": order.status,
                "phone": order.delivery_phone,
                "otp_status": result.get("status"),
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# VERIFY DELIVERY OTP
# ============================================================

class DeliveryOTPVerificationView(APIView):
    """
    Verifies the delivery OTP using Twilio Verify.

    The OTP is verified against the SAME phone number that
    was saved when the OTP was sent.

    Successful verification automatically changes:

        Shipped → Delivered
    """

    permission_classes = [
        IsAuthenticated,
        IsAdminUser,
    ]

    def post(self, request, order_id):
        order = get_object_or_404(
            Order,
            id=order_id
        )

        # ----------------------------------------------------
        # OTP verification only for shipped orders.
        # ----------------------------------------------------

        if order.status != "Shipped":
            return Response(
                {
                    "error": (
                        "Delivery OTP can only be verified "
                        "for a shipped order."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ----------------------------------------------------
        # Prevent duplicate verification.
        # ----------------------------------------------------

        if order.delivery_otp_verified:
            return Response(
                {
                    "error": (
                        "Delivery OTP has already been verified."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ----------------------------------------------------
        # OTP must have been sent first.
        # ----------------------------------------------------

        if not order.delivery_otp_created_at:
            return Response(
                {
                    "error": (
                        "Delivery OTP has not been sent yet. "
                        "Please send the OTP first."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ----------------------------------------------------
        # Delivery phone must exist.
        # ----------------------------------------------------

        customer_phone = order.delivery_phone

        if not customer_phone:
            return Response(
                {
                    "error": (
                        "Delivery phone number is not available. "
                        "Please send the OTP first."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ----------------------------------------------------
        # Get OTP from request body.
        #
        # Example:
        # {
        #     "otp": "123456"
        # }
        # ----------------------------------------------------

        otp = request.data.get("otp")

        if otp is None:
            return Response(
                {
                    "error": "OTP is required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp = str(otp).strip()

        if not otp:
            return Response(
                {
                    "error": "OTP is required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not otp.isdigit():
            return Response(
                {
                    "error": "OTP must contain only digits."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(otp) != 6:
            return Response(
                {
                    "error": (
                        "OTP must be a valid 6-digit number."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # ------------------------------------------------
            # Verify OTP against the SAME saved phone number.
            # ------------------------------------------------

            result = verify_delivery_otp(
                customer_phone,
                otp,
            )

        except DeliveryOTPError as exc:
            return Response(
                {
                    "error": str(exc)
                },
                status=exc.status_code,
            )

        # ----------------------------------------------------
        # Twilio Verify returns "approved" for valid OTP.
        # ----------------------------------------------------

        if result.get("status") != "approved":
            return Response(
                {
                    "error": (
                        "Invalid or expired delivery OTP."
                    ),
                    "otp_status": result.get("status"),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ----------------------------------------------------
        # SUCCESS:
        #
        # Shipped → Delivered
        # ----------------------------------------------------

        order.delivery_otp_verified = True
        order.status = "Delivered"
        order.delivered_at = timezone.now()

        order.save(
            update_fields=[
                "delivery_otp_verified",
                "status",
                "delivered_at",
                "updated_at",
            ]
        )

        return Response(
            {
                "message": (
                    "Delivery OTP verified successfully. "
                    "Order has been marked as Delivered."
                ),
                "order_id": order.id,
                "status": order.status,
                "delivery_otp_verified": (
                    order.delivery_otp_verified
                ),
                "delivered_at": order.delivered_at,
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# ADMIN DASHBOARD
# ============================================================

class AdminDashboardView(APIView):
    permission_classes = [
        IsAuthenticated,
        IsAdminUser,
    ]

    def get(self, request):
        total_orders = Order.objects.count()

        pending_orders = Order.objects.filter(
            status="Pending"
        ).count()

        confirmed_orders = Order.objects.filter(
            status="Confirmed"
        ).count()

        shipped_orders = Order.objects.filter(
            status="Shipped"
        ).count()

        delivered_orders = Order.objects.filter(
            status="Delivered"
        ).count()

        cancelled_orders = Order.objects.filter(
            status="Cancelled"
        ).count()

        total_sales = (
            Payment.objects
            .filter(payment_status="Success")
            .aggregate(
                total=Sum("amount")
            )["total"]
            or Decimal("0.00")
        )

        return Response(
            {
                "total_orders": total_orders,
                "pending_orders": pending_orders,
                "confirmed_orders": confirmed_orders,
                "shipped_orders": shipped_orders,
                "delivered_orders": delivered_orders,
                "cancelled_orders": cancelled_orders,
                "total_sales": total_sales,
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# ADMIN ANALYTICS
# ============================================================

class AdminAnalyticsView(APIView):
    permission_classes = [
        IsAuthenticated,
        IsAdminUser,
    ]

    def get(self, request):
        successful_payments = Payment.objects.filter(
            payment_status="Success"
        )

        successful_payment_count = (
            successful_payments.count()
        )

        pending_payment_count = Payment.objects.filter(
            payment_status="Pending"
        ).count()

        failed_payment_count = Payment.objects.filter(
            payment_status="Failed"
        ).count()

        total_sales = (
            successful_payments
            .aggregate(
                total=Sum("amount")
            )["total"]
            or Decimal("0.00")
        )

        return Response(
            {
                "successful_payments": (
                    successful_payment_count
                ),
                "pending_payments": (
                    pending_payment_count
                ),
                "failed_payments": (
                    failed_payment_count
                ),
                "total_sales": total_sales,
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# ADMIN RECENT ORDERS
# ============================================================

class AdminRecentOrdersView(generics.ListAPIView):
    permission_classes = [
        IsAuthenticated,
        IsAdminUser,
    ]

    serializer_class = OrderSerializer

    def get_queryset(self):
        return (
            Order.objects
            .all()
            .order_by("-created_at")[:10]
        )


# ============================================================
# ADMIN ORDER STATUS UPDATE
# ============================================================

class AdminOrderStatusUpdateView(APIView):
    """
    Admin can update normal order statuses.

    IMPORTANT:
    "Delivered" cannot be set manually.

    Delivered status is ONLY set after successful
    delivery OTP verification.
    """

    permission_classes = [
        IsAuthenticated,
        IsAdminUser,
    ]

    def patch(self, request, order_id):
        order = get_object_or_404(
            Order,
            id=order_id
        )

        new_status = request.data.get("status")

        valid_statuses = [
            "Pending",
            "Confirmed",
            "Shipped",
            "Delivered",
            "Cancelled",
        ]

        # ----------------------------------------------------
        # Validate requested status.
        # ----------------------------------------------------

        if new_status not in valid_statuses:
            return Response(
                {
                    "error": "Invalid order status."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ----------------------------------------------------
        # IMPORTANT:
        #
        # Admin cannot manually mark order as Delivered.
        #
        # OTP verification is mandatory.
        # ----------------------------------------------------

        if new_status == "Delivered":
            return Response(
                {
                    "error": (
                        "Order can only be marked as Delivered "
                        "after successful delivery OTP verification."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ----------------------------------------------------
        # SHIPPED
        #
        # OTP is NOT sent here.
        #
        # Admin/delivery person will enter the phone number
        # and send OTP separately.
        # ----------------------------------------------------

        if new_status == "Shipped":

            order.delivery_otp_verified = False
            order.delivered_at = None

            order.delivery_phone = None

            order.delivery_otp_created_at = None
            order.delivery_otp_attempts = 0

            order.status = "Shipped"

            order.save(
                update_fields=[
                    "delivery_otp_verified",
                    "delivered_at",
                    "delivery_phone",
                    "delivery_otp_created_at",
                    "delivery_otp_attempts",
                    "status",
                    "updated_at",
                ]
            )

            return Response(
                {
                    "message": (
                        "Order marked as Shipped. "
                        "Enter the delivery phone number "
                        "and send OTP from the delivery "
                        "verification flow."
                    ),
                    "order_id": order.id,
                    "status": order.status,
                    "delivery_otp_verified": (
                        order.delivery_otp_verified
                    ),
                },
                status=status.HTTP_200_OK,
            )

        # ----------------------------------------------------
        # CANCELLED
        #
        # Clear delivery verification data.
        # ----------------------------------------------------

        if new_status == "Cancelled":

            order.delivery_otp_created_at = None
            order.delivery_otp_attempts = 0
            order.delivery_otp_verified = False
            order.delivered_at = None
            order.delivery_phone = None

            # delivery_otp_hash is kept for compatibility
            # with the existing database model but is not
            # used by Twilio Verify.

            order.delivery_otp_hash = None
            order.status = "Cancelled"

            order.save(
                update_fields=[
                    "delivery_otp_created_at",
                    "delivery_otp_attempts",
                    "delivery_otp_verified",
                    "delivered_at",
                    "delivery_phone",
                    "delivery_otp_hash",
                    "status",
                    "updated_at",
                ]
            )

            return Response(
                {
                    "message": (
                        "Order status updated successfully."
                    ),
                    "order_id": order.id,
                    "status": order.status,
                    "delivery_otp_verified": (
                        order.delivery_otp_verified
                    ),
                },
                status=status.HTTP_200_OK,
            )

        # ----------------------------------------------------
        # OTHER STATUSES
        #
        # Pending / Confirmed
        # ----------------------------------------------------

        order.status = new_status

        order.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

        return Response(
            {
                "message": (
                    "Order status updated successfully."
                ),
                "order_id": order.id,
                "status": order.status,
                "delivery_otp_verified": (
                    order.delivery_otp_verified
                ),
            },
            status=status.HTTP_200_OK,
        )


class DeliveryIssueClaimsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        order = get_object_or_404(
            Order,
            id=order_id,
            user=request.user,
        )
        claims = (
            DeliveryIssueClaim.objects
            .filter(order=order)
            .select_related("order_item__product", "user")
        )
        serializer = DeliveryIssueClaimSerializer(
            claims,
            many=True,
            context={"request": request},
        )
        return Response(serializer.data)

    def post(self, request, order_id):
        order = get_object_or_404(
            Order,
            id=order_id,
            user=request.user,
        )
        if order.status != "Delivered":
            return Response(
                {"error": "You can report a delivery issue after the order is delivered."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        input_serializer = DeliveryIssueClaimCreateSerializer(
            data=request.data,
        )
        input_serializer.is_valid(raise_exception=True)
        order_item = get_object_or_404(
            OrderItem,
            id=input_serializer.validated_data["order_item_id"],
            order=order,
        )
        active_claim_exists = DeliveryIssueClaim.objects.filter(
            order_item=order_item,
            user=request.user,
        ).exclude(status="rejected").exists()
        if active_claim_exists:
            return Response(
                {"error": "A claim for this item is already under review or resolved."},
                status=status.HTTP_409_CONFLICT,
            )

        claim = DeliveryIssueClaim.objects.create(
            order=order,
            order_item=order_item,
            user=request.user,
            evidence_image=input_serializer.validated_data["evidence_image"],
            issue_type=input_serializer.validated_data["issue_type"],
            description=input_serializer.validated_data.get("description", ""),
        )
        claim.ai_analysis, claim.visual_similarity = analyze_claim_images(
            order_item.product.image,
            claim.evidence_image,
            claim.issue_type,
        )
        claim.save(
            update_fields=["ai_analysis", "visual_similarity", "updated_at"]
        )

        output_serializer = DeliveryIssueClaimSerializer(
            claim,
            context={"request": request},
        )
        return Response(
            output_serializer.data,
            status=status.HTTP_201_CREATED,
        )


class AdminDeliveryIssueClaimsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        claims = (
            DeliveryIssueClaim.objects
            .select_related(
                "order",
                "order_item__product",
                "user",
                "reviewed_by",
            )
            .all()[:100]
        )
        serializer = DeliveryIssueClaimSerializer(
            claims,
            many=True,
            context={"request": request},
        )
        return Response(serializer.data)


class AdminDeliveryIssueReviewView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def patch(self, request, claim_id):
        claim = get_object_or_404(
            DeliveryIssueClaim.objects.select_related(
                "order_item__product",
                "user",
            ),
            id=claim_id,
        )
        if claim.status != "pending":
            return Response(
                {"error": "This claim has already been reviewed."},
                status=status.HTTP_409_CONFLICT,
            )

        decision = request.data.get("decision")
        if decision not in {"approved", "rejected"}:
            return Response(
                {"error": "Decision must be approved or rejected."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        refund_date = None
        if decision == "approved":
            raw_refund_date = request.data.get("refund_processing_date")
            refund_date = parse_date(str(raw_refund_date or ""))
            if not refund_date or refund_date < timezone.localdate():
                return Response(
                    {"error": "Choose a valid refund processing date today or later."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        claim.status = decision
        claim.refund_processing_date = refund_date
        claim.admin_note = str(request.data.get("admin_note", ""))[:2000]
        claim.reviewed_by = request.user
        claim.reviewed_at = timezone.now()

        if decision == "approved":
            claim.customer_message = (
                f"Your delivery issue claim for order #{claim.order_id} "
                f"was approved. A refund of Rs. {claim.order_item.total_price} "
                f"is scheduled to be processed on {refund_date:%B %d, %Y}."
            )
        else:
            claim.customer_message = (
                f"Your delivery issue claim for order #{claim.order_id} "
                "was reviewed and could not be approved. "
                f"{claim.admin_note}".strip()
            )

        claim.save(
            update_fields=[
                "status",
                "refund_processing_date",
                "admin_note",
                "customer_message",
                "reviewed_by",
                "reviewed_at",
                "updated_at",
            ]
        )

        if claim.user.email:
            try:
                send_mail(
                    subject=f"Delivery issue update for order #{claim.order_id}",
                    message=claim.customer_message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[claim.user.email],
                    fail_silently=False,
                )
            except Exception as exc:
                logger.warning(
                    "Unable to email delivery claim update: %s",
                    type(exc).__name__,
                )

        serializer = DeliveryIssueClaimSerializer(
            claim,
            context={"request": request},
        )
        return Response(serializer.data)