from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import User
from .serializers import (
    RegisterSerializer,
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
)
from .permissions import IsAdminUser

from django.db.models import Sum

from products.models import Product
from orders.models import Order
from payments.models import Payment

from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.conf import settings

from django.utils.encoding import (
    force_bytes,
    force_str,
)

from django.utils.http import (
    urlsafe_base64_encode,
    urlsafe_base64_decode,
)


# =========================================================
# JWT LOGIN
# =========================================================

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):

    @classmethod
    def get_token(cls, user):

        token = super().get_token(user)

        # User information inside JWT
        token["username"] = user.username
        token["is_admin"] = user.is_staff
        token["is_delivery_person"] = user.is_delivery_person

        return token


class CustomTokenObtainPairView(TokenObtainPairView):

    serializer_class = CustomTokenObtainPairSerializer


# =========================================================
# REGISTER
# =========================================================

class RegisterView(generics.CreateAPIView):

    queryset = User.objects.all()
    serializer_class = RegisterSerializer


# =========================================================
# PROFILE
# =========================================================

class ProfileView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        user = request.user

        return Response({
            "username": user.username,
            "email": user.email,
            "phone": user.phone,
            "city": user.city,
            "state": user.state,
            "country": user.country,
        })


# =========================================================
# CHANGE PASSWORD
# =========================================================

class ChangePasswordView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = ChangePasswordSerializer(
            data=request.data
        )

        if serializer.is_valid():

            if not request.user.check_password(
                serializer.validated_data["old_password"]
            ):
                return Response(
                    {
                        "error": "Old password is incorrect"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            request.user.set_password(
                serializer.validated_data["new_password"]
            )

            request.user.save()

            return Response(
                {
                    "message": "Password changed successfully"
                }
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )


# =========================================================
# ADMIN TEST
# =========================================================

class AdminTestView(APIView):

    permission_classes = [IsAdminUser]

    def get(self, request):

        return Response({
            "message": "Welcome to ShopHubAI Admin Dashboard",
            "admin": request.user.username,
        })


# =========================================================
# ADMIN DASHBOARD
# =========================================================

class AdminDashboardView(APIView):

    permission_classes = [IsAdminUser]

    def get(self, request):

        # -------------------------
        # USERS
        # -------------------------

        total_users = User.objects.count()


        # -------------------------
        # PRODUCTS
        # -------------------------

        total_products = Product.objects.count()

        active_products = Product.objects.filter(
            is_active=True
        ).count()

        low_stock_products = Product.objects.filter(
            stock__gt=0,
            stock__lte=5
        ).count()

        out_of_stock_products = Product.objects.filter(
            stock=0
        ).count()


        # -------------------------
        # ORDERS
        # -------------------------

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


        # -------------------------
        # PAYMENTS
        # -------------------------

        total_payments = Payment.objects.count()

        successful_payments = Payment.objects.filter(
            payment_status="Success"
        ).count()

        pending_payments = Payment.objects.filter(
            payment_status="Pending"
        ).count()

        failed_payments = Payment.objects.filter(
            payment_status="Failed"
        ).count()


        # -------------------------
        # REVENUE
        # -------------------------

        revenue = Payment.objects.filter(
            payment_status="Success"
        ).aggregate(
            total=Sum("amount")
        )["total"] or 0


        # -------------------------
        # RESPONSE
        # -------------------------

        return Response({

            "users": {
                "total": total_users,
            },

            "products": {
                "total": total_products,
                "active": active_products,
                "low_stock": low_stock_products,
                "out_of_stock": out_of_stock_products,
            },

            "orders": {
                "total": total_orders,
                "pending": pending_orders,
                "confirmed": confirmed_orders,
                "shipped": shipped_orders,
                "delivered": delivered_orders,
                "cancelled": cancelled_orders,
            },

            "payments": {
                "total": total_payments,
                "successful": successful_payments,
                "pending": pending_payments,
                "failed": failed_payments,
            },

            "revenue": {
                "total": revenue,
            },
        })


# =========================================================
# ADMIN RECENT ORDERS
# =========================================================

class RecentOrdersView(APIView):

    permission_classes = [IsAdminUser]

    def get(self, request):

        orders = Order.objects.select_related(
            "user"
        ).order_by(
            "-created_at"
        )[:10]

        data = []

        for order in orders:

            data.append({

                "order_id": order.id,

                "customer": order.user.username,

                "email": order.user.email,

                "total_amount": order.total_amount,

                "status": order.status,

                "created_at": order.created_at,
            })

        return Response({
            "recent_orders": data
        })


# =========================================================
# ADMIN ORDER STATUS UPDATE
# =========================================================

class AdminOrderStatusUpdateView(APIView):

    permission_classes = [IsAdminUser]

    def patch(self, request, order_id):

        try:

            order = Order.objects.get(
                id=order_id
            )

        except Order.DoesNotExist:

            return Response(
                {
                    "error": "Order not found"
                },
                status=status.HTTP_404_NOT_FOUND,
            )


        new_status = request.data.get(
            "status"
        )


        if not new_status:

            return Response(
                {
                    "error": "Status is required"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


        allowed_statuses = [
            "Pending",
            "Confirmed",
            "Shipped",
            "Delivered",
            "Cancelled",
        ]


        if new_status not in allowed_statuses:

            return Response(
                {
                    "error": "Invalid status",
                    "allowed_statuses": allowed_statuses,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


        order.status = new_status

        order.save(
            update_fields=["status"]
        )


        return Response(
            {
                "message": "Order status updated successfully",

                "order_id": order.id,

                "status": order.status,
            },
            status=status.HTTP_200_OK,
        )
# =========================================================
# ADMIN ANALYTICS
# =========================================================

class AdminAnalyticsView(APIView):

    permission_classes = [IsAdminUser]

    def get(self, request):

        # -------------------------
        # ORDER ANALYTICS
        # -------------------------

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


        # -------------------------
        # PAYMENT ANALYTICS
        # -------------------------

        total_payments = Payment.objects.count()

        successful_payments = Payment.objects.filter(
            payment_status="Success"
        ).count()

        pending_payments = Payment.objects.filter(
            payment_status="Pending"
        ).count()

        failed_payments = Payment.objects.filter(
            payment_status="Failed"
        ).count()


        # -------------------------
        # REVENUE ANALYTICS
        # -------------------------

        total_revenue = Payment.objects.filter(
            payment_status="Success"
        ).aggregate(
            total=Sum("amount")
        )["total"] or 0


        # -------------------------
        # RESPONSE
        # -------------------------

        return Response({

            "orders": {
                "total": total_orders,
                "pending": pending_orders,
                "confirmed": confirmed_orders,
                "shipped": shipped_orders,
                "delivered": delivered_orders,
                "cancelled": cancelled_orders,
            },

            "payments": {
                "total": total_payments,
                "successful": successful_payments,
                "pending": pending_payments,
                "failed": failed_payments,
            },

            "revenue": {
                "total": total_revenue,
            },

        })

    
# =========================================================
# FORGOT PASSWORD
# =========================================================

class ForgotPasswordView(APIView):

    def post(self, request):

        serializer = ForgotPasswordSerializer(
            data=request.data
        )

        if not serializer.is_valid():

            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = serializer.validated_data["email"]

        try:

            user = User.objects.get(
                email=email
            )

        except User.DoesNotExist:

            return Response(
                {
                    "message":
                    "If an account exists with this email, "
                    "a password reset link has been sent."
                },
                status=status.HTTP_200_OK,
            )

        # Generate secure token

        token_generator = PasswordResetTokenGenerator()

        token = token_generator.make_token(user)

        uid = urlsafe_base64_encode(
            force_bytes(user.pk)
        )

        # Frontend reset URL

        reset_url = (
            "http://localhost:5173/reset-password/"
            f"{uid}/{token}/"
        )

        # Email

        subject = "ShopHubAI - Password Reset"

        message = f"""
Hello {user.username},

We received a request to reset your ShopHubAI password.

Click the link below to create a new password:

{reset_url}

This link is valid for a limited time.

If you did not request a password reset, please ignore this email.

Regards,
ShopHubAI Team
"""

        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )

        return Response(
            {
                "message":
                "Password reset link has been sent to your email."
            },
            status=status.HTTP_200_OK,
        )


# =========================================================
# RESET PASSWORD
# =========================================================

class ResetPasswordView(APIView):

    def post(self, request, uid, token):

        serializer = ResetPasswordSerializer(
            data=request.data
        )

        if not serializer.is_valid():

            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:

            user_id = force_str(
                urlsafe_base64_decode(uid)
            )

            user = User.objects.get(
                pk=user_id
            )

        except (
            TypeError,
            ValueError,
            OverflowError,
            User.DoesNotExist,
        ):

            return Response(
                {
                    "error":
                    "Invalid password reset link."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate token

        token_generator = PasswordResetTokenGenerator()

        if not token_generator.check_token(
            user,
            token
        ):

            return Response(
                {
                    "error":
                    "Password reset link is invalid or expired."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Set new password

        user.set_password(
            serializer.validated_data[
                "new_password"
            ]
        )

        user.save()

        return Response(
            {
                "message":
                "Password reset successfully. "
                "You can now login."
            },
            status=status.HTTP_200_OK,
        )