from calendar import month_abbr
from datetime import date

from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from cart.models import CartItem
from payments.models import Payment
from wishlist.models import WishlistItem

from .models import Order


class CustomerInsightsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.localdate()
        current_month = today.year * 12 + today.month - 1
        month_keys = []
        for offset in range(5, -1, -1):
            year, month_index = divmod(current_month - offset, 12)
            month_keys.append((year, month_index + 1))

        first_year, first_month = month_keys[0]
        first_day = date(first_year, first_month, 1)

        payments = Payment.objects.filter(
            user=user,
            order__user=user,
            payment_status="Success",
        )
        monthly_payments = (
            payments
            .filter(created_at__date__gte=first_day, created_at__date__lte=today)
            .annotate(month=TruncMonth(
                "created_at",
                tzinfo=timezone.get_current_timezone(),
            ))
            .values("month")
            .annotate(amount=Sum("amount"))
        )
        monthly_totals = {
            (row["month"].year, row["month"].month): row["amount"]
            for row in monthly_payments
        }

        orders = Order.objects.filter(user=user)
        order_totals = orders.aggregate(
            total=Count("id"),
            delivered=Count("id", filter=Q(status="Delivered")),
        )
        recent_orders = [
            {
                "id": order["id"],
                "status": order["status"],
                "total": str(order["total_amount"]),
                "created_at": order["created_at"].isoformat(),
                "delivered_at": (
                    order["delivered_at"].isoformat()
                    if order["delivered_at"]
                    else None
                ),
            }
            for order in orders.order_by("-created_at").values(
                "id",
                "status",
                "total_amount",
                "created_at",
                "delivered_at",
            )[:5]
        ]

        cart_summary = CartItem.objects.filter(cart__user=user).aggregate(
            products=Count("id"),
            units=Sum("quantity"),
        )

        return Response({
            "summary": {
                "successful_spend": str(
                    payments.aggregate(total=Sum("amount"))["total"] or 0
                ),
                "orders": order_totals["total"],
                "delivered_orders": order_totals["delivered"],
                "successful_payments": payments.count(),
                "cart_products": cart_summary["products"],
                "cart_units": cart_summary["units"] or 0,
                "wishlist_products": WishlistItem.objects.filter(
                    wishlist__user=user
                ).count(),
            },
            "spending_trend": [
                {
                    "month": f"{year:04d}-{month:02d}",
                    "label": f"{month_abbr[month]} {year}",
                    "amount": str(monthly_totals.get((year, month), 0)),
                }
                for year, month in month_keys
            ],
            "recent_orders": recent_orders,
        })