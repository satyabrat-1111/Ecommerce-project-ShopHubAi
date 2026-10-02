from decimal import Decimal

from django.db.models import Sum

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from payments.models import Payment

from .models import Order


# =========================================
# ADMIN PERMISSION
# =========================================

class IsAdminUserCustom:

    def has_permission(self, request):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_staff
        )


# =========================================
# ADMIN DASHBOARD
# =========================================

class AdminDashboardView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        # =========================================
        # ADMIN CHECK
        # =========================================

        if not request.user.is_staff:

            return Response(
                {
                    "error": "Admin access required."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # =========================================
        # TOTAL ORDERS
        # =========================================

        total_orders = Order.objects.count()

        # =========================================
        # ORDER STATUS COUNTS
        # =========================================

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

        # =========================================
        # TOTAL SALES
        #
        # Only successful payments are counted.
        # =========================================

        total_sales = (
            Payment.objects.filter(
                payment_status="Success"
            ).aggregate(
                total=Sum("amount")
            )["total"]
            or Decimal("0.00")
        )

        # =========================================
        # RESPONSE
        # =========================================

        return Response(
            {
                "total_orders":
                    total_orders,

                "pending_orders":
                    pending_orders,

                "confirmed_orders":
                    confirmed_orders,

                "shipped_orders":
                    shipped_orders,

                "delivered_orders":
                    delivered_orders,

                "cancelled_orders":
                    cancelled_orders,

                "total_sales":
                    total_sales,
            },
            status=status.HTTP_200_OK,
        )


# =========================================
# ADMIN ANALYTICS
# =========================================

class AdminAnalyticsView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        # =========================================
        # ADMIN CHECK
        # =========================================

        if not request.user.is_staff:

            return Response(
                {
                    "error": "Admin access required."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # =========================================
        # SUCCESSFUL PAYMENTS
        # =========================================

        successful_payments = Payment.objects.filter(
            payment_status="Success"
        )

        successful_payment_count = (
            successful_payments.count()
        )

        # =========================================
        # PENDING PAYMENTS
        # =========================================

        pending_payment_count = (
            Payment.objects.filter(
                payment_status="Pending"
            ).count()
        )

        # =========================================
        # FAILED PAYMENTS
        # =========================================

        failed_payment_count = (
            Payment.objects.filter(
                payment_status="Failed"
            ).count()
        )

        # =========================================
        # TOTAL SALES
        # =========================================

        total_sales = (
            successful_payments.aggregate(
                total=Sum("amount")
            )["total"]
            or Decimal("0.00")
        )

        # =========================================
        # RESPONSE
        # =========================================

        return Response(
            {
                "successful_payments":
                    successful_payment_count,

                "pending_payments":
                    pending_payment_count,

                "failed_payments":
                    failed_payment_count,

                "total_sales":
                    total_sales,
            },
            status=status.HTTP_200_OK,
        )


# =========================================
# RECENT ORDERS
# =========================================

class RecentOrdersView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        # =========================================
        # ADMIN CHECK
        # =========================================

        if not request.user.is_staff:

            return Response(
                {
                    "error": "Admin access required."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # =========================================
        # GET RECENT ORDERS
        # =========================================

        orders = (
            Order.objects
            .select_related("user")
            .prefetch_related("items")
            .order_by("-created_at")[:10]
        )

        data = []

        # =========================================
        # SERIALIZE ORDERS
        # =========================================

        for order in orders:

            data.append(
                {
                    "id":
                        order.id,

                    "order_id":
                        order.id,

                    "customer":
                        order.user.username,

                    "email":
                        order.user.email,

                    "total_amount":
                        order.total_amount,

                    "status":
                        order.status,

                    "created_at":
                        order.created_at,
                }
            )

        # =========================================
        # RESPONSE
        # =========================================

        return Response(
            {
                "recent_orders":
                    data
            },
            status=status.HTTP_200_OK,
        )


# =========================================
# UPDATE ORDER STATUS
# =========================================

class AdminOrderStatusUpdateView(APIView):

    permission_classes = [IsAuthenticated]

    def patch(
        self,
        request,
        order_id
    ):

        # =========================================
        # ADMIN CHECK
        # =========================================

        if not request.user.is_staff:

            return Response(
                {
                    "error":
                        "Admin access required."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # =========================================
        # GET ORDER
        # =========================================

        try:

            order = Order.objects.get(
                id=order_id
            )

        except Order.DoesNotExist:

            return Response(
                {
                    "error":
                        "Order not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # =========================================
        # GET NEW STATUS
        # =========================================

        new_status = request.data.get(
            "status"
        )

        # =========================================
        # ALLOWED STATUSES
        # =========================================

        allowed_statuses = [
            "Pending",
            "Confirmed",
            "Shipped",
            "Delivered",
            "Cancelled",
        ]

        # =========================================
        # VALIDATE STATUS
        # =========================================

        if new_status not in allowed_statuses:

            return Response(
                {
                    "error":
                        "Invalid order status.",

                    "allowed_statuses":
                        allowed_statuses,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # =========================================
        # UPDATE STATUS
        # =========================================

        order.status = new_status

        order.save(
            update_fields=["status"]
        )

        # =========================================
        # RESPONSE
        # =========================================

        return Response(
            {
                "message":
                    "Order status updated successfully",

                "order_id":
                    order.id,

                "status":
                    order.status,
            },
            status=status.HTTP_200_OK,
        )