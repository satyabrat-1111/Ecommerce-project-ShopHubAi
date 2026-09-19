from decimal import Decimal

from django.db.models import Sum
from django.shortcuts import get_object_or_404

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from cart.models import Cart
from payments.models import Payment

from .models import Order, OrderItem
from .serializers import OrderSerializer


# =====================================
# PLACE ORDER
# =====================================

class PlaceOrderView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        # =====================================
        # GET USER CART
        # =====================================

        cart = get_object_or_404(
            Cart,
            user=request.user
        )

        # =====================================
        # CHECK CART
        # =====================================

        if not cart.items.exists():

            return Response(
                {
                    "error": "Your cart is empty"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # =====================================
        # CREATE ORDER
        # =====================================

        order = Order.objects.create(
            user=request.user,

            shipping_address=request.data.get(
                "shipping_address"
            ),

            city=request.data.get(
                "city"
            ),

            state=request.data.get(
                "state"
            ),

            country=request.data.get(
                "country",
                "India"
            ),

            pincode=request.data.get(
                "pincode"
            ),

            total_amount=Decimal("0.00"),
        )

        # =====================================
        # CREATE ORDER ITEMS
        # =====================================

        total = Decimal("0.00")

        for item in cart.items.all():

            OrderItem.objects.create(
                order=order,
                product=item.product,
                quantity=item.quantity,
                price=item.product.price,
            )

            total += (
                item.product.price
                * item.quantity
            )

        # =====================================
        # UPDATE ORDER TOTAL
        # =====================================

        order.total_amount = total

        order.save()

        # =====================================
        # IMPORTANT
        #
        # Invoice generation
        # Email sending
        # Cart clearing
        #
        # These happen only after
        # successful Razorpay payment.
        # =====================================

        return Response(
            OrderSerializer(order).data,
            status=status.HTTP_201_CREATED,
        )


# =====================================
# ORDER HISTORY
# =====================================

class OrderHistoryView(
    generics.ListAPIView
):

    serializer_class = OrderSerializer

    permission_classes = [
        IsAuthenticated
    ]

    def get_queryset(self):

        return Order.objects.filter(
            user=self.request.user
        ).order_by(
            "-created_at"
        )


# =====================================
# ORDER DETAIL
# =====================================

class OrderDetailView(
    generics.RetrieveAPIView
):

    serializer_class = OrderSerializer

    permission_classes = [
        IsAuthenticated
    ]

    lookup_field = "id"

    def get_queryset(self):

        return Order.objects.filter(
            user=self.request.user
        )


# =====================================
# ADMIN DASHBOARD
# =====================================

class AdminDashboardView(APIView):

    permission_classes = [
        IsAuthenticated,
        IsAdminUser,
    ]

    def get(self, request):

        # =====================================
        # TOTAL ORDERS
        # =====================================

        total_orders = Order.objects.count()

        # =====================================
        # ORDER STATUS COUNTS
        # =====================================

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

        # =====================================
        # TOTAL SALES
        #
        # Revenue is based on successful
        # Razorpay payments.
        # =====================================

        total_sales = (
            Payment.objects.filter(
                payment_status="Success"
            ).aggregate(
                total=Sum("amount")
            )["total"]
            or Decimal("0.00")
        )

        # =====================================
        # RESPONSE
        # =====================================

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


# =====================================
# ADMIN ANALYTICS
# =====================================

class AdminAnalyticsView(APIView):

    permission_classes = [
        IsAuthenticated,
        IsAdminUser,
    ]

    def get(self, request):

        # =====================================
        # SUCCESSFUL PAYMENTS
        # =====================================

        successful_payments = Payment.objects.filter(
            payment_status="Success"
        )

        successful_payment_count = (
            successful_payments.count()
        )

        # =====================================
        # PENDING PAYMENTS
        # =====================================

        pending_payment_count = (
            Payment.objects.filter(
                payment_status="Pending"
            ).count()
        )

        # =====================================
        # FAILED PAYMENTS
        # =====================================

        failed_payment_count = (
            Payment.objects.filter(
                payment_status="Failed"
            ).count()
        )

        # =====================================
        # TOTAL SALES
        # =====================================

        total_sales = (
            successful_payments.aggregate(
                total=Sum("amount")
            )["total"]
            or Decimal("0.00")
        )

        # =====================================
        # RESPONSE
        # =====================================

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


# =====================================
# ADMIN RECENT ORDERS
# =====================================

class AdminRecentOrdersView(
    generics.ListAPIView
):

    permission_classes = [
        IsAuthenticated,
        IsAdminUser,
    ]

    serializer_class = OrderSerializer

    def get_queryset(self):

        return Order.objects.all().order_by(
            "-created_at"
        )[:10]


# =====================================
# ADMIN ORDER STATUS UPDATE
# =====================================

class AdminOrderStatusUpdateView(
    APIView
):

    permission_classes = [
        IsAuthenticated,
        IsAdminUser,
    ]

    def patch(
        self,
        request,
        order_id
    ):

        # =====================================
        # GET ORDER
        # =====================================

        order = get_object_or_404(
            Order,
            id=order_id
        )

        # =====================================
        # GET NEW STATUS
        # =====================================

        new_status = request.data.get(
            "status"
        )

        # =====================================
        # VALID STATUSES
        # =====================================

        valid_statuses = [
            "Pending",
            "Confirmed",
            "Shipped",
            "Delivered",
            "Cancelled",
        ]

        # =====================================
        # VALIDATE STATUS
        # =====================================

        if new_status not in valid_statuses:

            return Response(
                {
                    "error":
                        "Invalid order status."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # =====================================
        # UPDATE STATUS
        # =====================================

        order.status = new_status

        order.save()

        # =====================================
        # RESPONSE
        # =====================================

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