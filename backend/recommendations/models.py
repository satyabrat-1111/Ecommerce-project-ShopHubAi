from django.db import models
from django.contrib.auth import get_user_model

from products.models import Product


User = get_user_model()


class UserProductInteraction(models.Model):

    # =====================================
    # INTERACTION TYPES
    # =====================================

    INTERACTION_CHOICES = [
        ("view", "View"),
        ("wishlist", "Wishlist"),
        ("cart", "Cart"),
        ("purchase", "Purchase"),
    ]

    # =====================================
    # USER
    # =====================================

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="product_interactions",
    )

    # =====================================
    # PRODUCT
    # =====================================

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="user_interactions",
    )

    # =====================================
    # INTERACTION
    # =====================================

    interaction_type = models.CharField(
        max_length=20,
        choices=INTERACTION_CHOICES,
    )

    # =====================================
    # TIMESTAMP
    # =====================================

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    # =====================================
    # STRING REPRESENTATION
    # =====================================

    def __str__(self):

        return (
            f"{self.user} - "
            f"{self.product} - "
            f"{self.interaction_type}"
        )

    # =====================================
    # META
    # =====================================

    class Meta:

        ordering = [
            "-created_at"
        ]

        indexes = [
            models.Index(
                fields=[
                    "user",
                    "product",
                ]
            ),

            models.Index(
                fields=[
                    "user",
                    "interaction_type",
                ]
            ),

            models.Index(
                fields=[
                    "product",
                    "interaction_type",
                ]
            ),
        ]
        # =====================================
# RECOMMENDATION PERFORMANCE EVENT
# =====================================

class RecommendationEvent(models.Model):

    # =====================================
    # EVENT TYPES
    # =====================================

    EVENT_CHOICES = [
        ("impression", "Impression"),
        ("click", "Click"),
        ("view", "View"),
        ("wishlist", "Wishlist"),
        ("cart", "Cart"),
        ("purchase", "Purchase"),
    ]

    # =====================================
    # USER
    # =====================================

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="recommendation_events",
        null=True,
        blank=True,
    )

    # =====================================
    # SOURCE PRODUCT
    # Product from which recommendation was generated
    # =====================================

    source_product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="recommendation_source_events",
        null=True,
        blank=True,
    )

    # =====================================
    # RECOMMENDED PRODUCT
    # Product shown/clicked as recommendation
    # =====================================

    recommended_product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="recommendation_events",
    )

    # =====================================
    # EVENT TYPE
    # =====================================

    event_type = models.CharField(
        max_length=20,
        choices=EVENT_CHOICES,
    )

    # =====================================
    # TIMESTAMP
    # =====================================

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    # =====================================
    # STRING REPRESENTATION
    # =====================================

    def __str__(self):

        return (
            f"{self.user} - "
            f"{self.recommended_product} - "
            f"{self.event_type}"
        )

    # =====================================
    # META
    # =====================================

    class Meta:

        ordering = [
            "-created_at"
        ]

        indexes = [

            models.Index(
                fields=[
                    "user",
                    "event_type",
                ]
            ),

            models.Index(
                fields=[
                    "recommended_product",
                    "event_type",
                ]
            ),

            models.Index(
                fields=[
                    "source_product",
                    "recommended_product",
                ]
            ),

            models.Index(
                fields=[
                    "created_at",
                ]
            ),
        ]