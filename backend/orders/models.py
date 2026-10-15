from django.db import models
from django.conf import settings

from products.models import Product


class Order(models.Model):

    STATUS_CHOICES = [
        ("Pending", "Pending"),
        ("Confirmed", "Confirmed"),
        ("Shipped", "Shipped"),
        ("Delivered", "Delivered"),
        ("Cancelled", "Cancelled"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="orders"
    )

    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    shipping_address = models.TextField()

    city = models.CharField(max_length=100)

    state = models.CharField(max_length=100)

    country = models.CharField(
        max_length=100,
        default="India"
    )

    pincode = models.CharField(max_length=10)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="Pending"
    )

    # ==============================
    # Delivery OTP Verification
    # ==============================

    delivery_otp_hash = models.CharField(
        max_length=128,
        blank=True,
        null=True
    )

    delivery_otp_created_at = models.DateTimeField(
        blank=True,
        null=True
    )

    delivery_otp_attempts = models.PositiveIntegerField(
        default=0
    )

    delivery_otp_verified = models.BooleanField(
        default=False
    )

    delivered_at = models.DateTimeField(
        blank=True,
        null=True
    )
    delivery_phone = models.CharField(max_length=20, blank=True, null=True)

    # ==============================

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order #{self.id} - {self.user.username}"


class OrderItem(models.Model):

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items"
    )

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE
    )

    quantity = models.PositiveIntegerField(default=1)

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    def __str__(self):
        return f"{self.product.name} ({self.quantity})"

    @property
    def total_price(self):
        return self.price * self.quantity


class DeliveryTracking(models.Model):
    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name="delivery_tracking",
    )
    delivery_person = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="assigned_deliveries",
        null=True,
        blank=True,
    )
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    accuracy_meters = models.FloatField(null=True, blank=True)
    is_sharing = models.BooleanField(default=False)
    last_location_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Tracking for order #{self.order_id}"


class DeliveryIssueClaim(models.Model):

    ISSUE_TYPES = [
        ("damaged", "Damaged"),
        ("broken", "Broken"),
        ("wrong_product", "Wrong product"),
        ("other", "Other issue"),
    ]

    REVIEW_STATUSES = [
        ("pending", "Pending review"),
        ("approved", "Refund approved"),
        ("rejected", "Rejected"),
    ]

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="delivery_issue_claims",
    )
    order_item = models.ForeignKey(
        OrderItem,
        on_delete=models.CASCADE,
        related_name="delivery_issue_claims",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="delivery_issue_claims",
    )
    evidence_image = models.ImageField(
        upload_to="delivery-claims/%Y/%m/",
    )
    issue_type = models.CharField(
        max_length=20,
        choices=ISSUE_TYPES,
    )
    description = models.TextField(blank=True)
    ai_analysis = models.JSONField(default=dict, blank=True)
    visual_similarity = models.FloatField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=REVIEW_STATUSES,
        default="pending",
    )
    admin_note = models.TextField(blank=True)
    refund_processing_date = models.DateField(null=True, blank=True)
    customer_message = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="reviewed_delivery_issue_claims",
        null=True,
        blank=True,
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self):
        return f"Delivery issue #{self.id} for order #{self.order_id}"