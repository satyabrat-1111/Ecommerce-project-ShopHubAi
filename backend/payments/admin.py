from django.contrib import admin

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "user",
        "order",
        "amount",
        "payment_method",
        "payment_status",
        "created_at",
    )

    list_filter = (
        "payment_status",
        "payment_method",
    )

    search_fields = (
        "user__username",
        "razorpay_order_id",
    )