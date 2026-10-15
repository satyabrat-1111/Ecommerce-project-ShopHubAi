from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Count, DecimalField, F, Sum
from django.db.models.functions import TruncDate, TruncMonth, TruncWeek
from django.utils import timezone

from rest_framework import status
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from payments.models import Payment
from products.models import Product
from recommendations.models import RecommendationEvent

from .models import Order, OrderItem


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


class BusinessAnalyticsOverviewView(APIView):

    permission_classes = [IsAdminUser]

    def get(self, request):
        today = timezone.localdate()
        try:
            end_date = date.fromisoformat(request.query_params.get("end", today.isoformat()))
            start_date = date.fromisoformat(
                request.query_params.get("start", (today - timedelta(days=29)).isoformat())
            )
        except ValueError:
            return Response(
                {"detail": "Dates must use YYYY-MM-DD format."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if start_date > end_date or (end_date - start_date).days > 365:
            return Response(
                {"detail": "Select a valid date range of no more than 366 days."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        granularity = request.query_params.get("granularity", "daily")
        truncation = {
            "daily": TruncDate,
            "weekly": TruncWeek,
            "monthly": TruncMonth,
        }.get(granularity)
        if truncation is None:
            return Response(
                {"detail": "Granularity must be daily, weekly, or monthly."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        start_at = timezone.make_aware(datetime.combine(start_date, time.min))
        end_at = timezone.make_aware(
            datetime.combine(end_date + timedelta(days=1), time.min)
        )
        period_orders = Order.objects.filter(
            created_at__gte=start_at,
            created_at__lt=end_at,
        )
        period_payments = Payment.objects.filter(order__in=period_orders)
        successful_payments = period_payments.filter(payment_status="Success")
        sales = successful_payments.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
        payment_count = successful_payments.count()
        order_count = period_orders.count()

        def bucket_date(value):
            return value.date() if isinstance(value, datetime) else value

        order_buckets = {
            bucket_date(row["bucket"]): row["count"]
            for row in period_orders.annotate(
                bucket=truncation("created_at", tzinfo=timezone.get_current_timezone())
            ).values("bucket").annotate(count=Count("id"))
        }
        sales_buckets = {
            bucket_date(row["bucket"]): row["total"] or Decimal("0.00")
            for row in successful_payments.annotate(
                bucket=truncation("order__created_at", tzinfo=timezone.get_current_timezone())
            ).values("bucket").annotate(total=Sum("amount"))
        }
        customer_model = get_user_model()
        customer_buckets = {
            bucket_date(row["bucket"]): row["count"]
            for row in customer_model.objects.filter(
                is_staff=False,
                is_superuser=False,
                date_joined__gte=start_at,
                date_joined__lt=end_at,
            ).annotate(
                bucket=truncation("date_joined", tzinfo=timezone.get_current_timezone())
            ).values("bucket").annotate(count=Count("id"))
        }
        bucket_starts = []
        cursor = start_date
        while cursor <= end_date:
            if granularity == "daily":
                bucket = cursor
                cursor += timedelta(days=1)
            elif granularity == "weekly":
                bucket = cursor - timedelta(days=cursor.weekday())
                cursor += timedelta(days=7 - cursor.weekday())
            else:
                bucket = cursor.replace(day=1)
                if cursor.month == 12:
                    cursor = cursor.replace(year=cursor.year + 1, month=1, day=1)
                else:
                    cursor = cursor.replace(month=cursor.month + 1, day=1)
            if not bucket_starts or bucket_starts[-1] != bucket:
                bucket_starts.append(bucket)

        sales_trend = [
            {
                "date": bucket.isoformat(),
                "orders": order_buckets.get(bucket, 0),
                "sales": f'{sales_buckets.get(bucket, Decimal("0.00")):.2f}',
            }
            for bucket in bucket_starts
        ]
        customer_trend = [
            {
                "date": bucket.isoformat(),
                "new_customers": customer_buckets.get(bucket, 0),
            }
            for bucket in bucket_starts
        ]

        order_statuses = list(
            period_orders.values("status").annotate(count=Count("id")).order_by("status")
        )
        payment_statuses = list(
            period_payments.values("payment_status")
            .annotate(count=Count("id"))
            .order_by("payment_status")
        )

        revenue_expression = Sum(
            F("quantity") * F("price"),
            output_field=DecimalField(max_digits=18, decimal_places=2),
        )
        paid_order_items = OrderItem.objects.filter(
            order__in=period_orders,
            order__payment__payment_status="Success",
        )
        top_products = list(
            paid_order_items.values("product_id", "product__name", "product__sku")
            .annotate(quantity_sold=Sum("quantity"), revenue=revenue_expression)
            .order_by("-revenue")[:10]
        )
        category_sales = list(
            paid_order_items.values("product__category__name")
            .annotate(quantity_sold=Sum("quantity"), revenue=revenue_expression)
            .order_by("-revenue")[:10]
        )

        stock_threshold = 5
        inventory = list(
            Product.objects.filter(is_active=True, stock__lte=stock_threshold)
            .values("name", "sku", "stock", "category__name")
            .order_by("stock", "name")[:20]
        )
        repeat_customers = (
            period_orders.values("user_id")
            .annotate(customer_orders=Count("id"))
            .filter(customer_orders__gte=2)
            .count()
        )
        active_buyers = period_orders.values("user_id").distinct().count()
        recommendation_counts = {
            row["event_type"]: row["count"]
            for row in RecommendationEvent.objects.filter(
                created_at__gte=start_at,
                created_at__lt=end_at,
            ).values("event_type").annotate(count=Count("id"))
        }

        delivered_orders = period_orders.filter(status="Delivered").count()
        cancelled_orders = period_orders.filter(status="Cancelled").count()
        low_stock_count = Product.objects.filter(
            is_active=True,
            stock__gt=0,
            stock__lte=stock_threshold,
        ).count()
        out_of_stock_count = Product.objects.filter(is_active=True, stock=0).count()
        impressions = recommendation_counts.get("impression", 0)
        clicks = recommendation_counts.get("click", 0)

        return Response(
            {
                "period": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat(),
                    "granularity": granularity,
                },
                "kpis": {
                    "successful_sales": f"{sales:.2f}",
                    "successful_payments": payment_count,
                    "average_order_value": f"{(sales / payment_count if payment_count else Decimal('0.00')):.2f}",
                    "orders": order_count,
                    "delivered_orders": delivered_orders,
                    "cancellation_rate": round(cancelled_orders * 100 / order_count, 1) if order_count else 0,
                    "registered_customers": customer_model.objects.filter(
                        is_staff=False,
                        is_superuser=False,
                    ).count(),
                    "new_customers": customer_model.objects.filter(
                        is_staff=False,
                        is_superuser=False,
                        date_joined__gte=start_at,
                        date_joined__lt=end_at,
                    ).count(),
                    "repeat_customer_rate": round(repeat_customers * 100 / active_buyers, 1) if active_buyers else 0,
                    "low_stock_products": low_stock_count,
                    "out_of_stock_products": out_of_stock_count,
                    "stock_threshold": stock_threshold,
                    "pending_payments": period_payments.filter(payment_status="Pending").count(),
                    "failed_payments": period_payments.filter(payment_status="Failed").count(),
                },
                "sales_trend": sales_trend,
                "customer_trend": customer_trend,
                "order_statuses": order_statuses,
                "payment_statuses": payment_statuses,
                "top_products": [
                    {
                        "id": row["product_id"],
                        "name": row["product__name"],
                        "sku": row["product__sku"],
                        "quantity": row["quantity_sold"],
                        "revenue": f'{row["revenue"] or Decimal("0.00"):.2f}',
                    }
                    for row in top_products
                ],
                "category_sales": [
                    {
                        "name": row["product__category__name"],
                        "quantity": row["quantity_sold"],
                        "revenue": f'{row["revenue"] or Decimal("0.00"):.2f}',
                    }
                    for row in category_sales
                ],
                "inventory": inventory,
                "recommendations": {
                    "impressions": impressions,
                    "clicks": clicks,
                    "click_through_rate": round(clicks * 100 / impressions, 1) if impressions else 0,
                    "views": recommendation_counts.get("view", 0),
                    "wishlist_additions": recommendation_counts.get("wishlist", 0),
                    "cart_additions": recommendation_counts.get("cart", 0),
                    "purchase_events": recommendation_counts.get("purchase", 0),
                    "purchase_revenue_attribution_available": False,
                },
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