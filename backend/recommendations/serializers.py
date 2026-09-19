from rest_framework import serializers

from .models import (
    UserProductInteraction,
    RecommendationEvent,
)


# =====================================
# USER PRODUCT INTERACTION SERIALIZER
# =====================================

class UserProductInteractionSerializer(
    serializers.ModelSerializer
):

    class Meta:

        model = UserProductInteraction

        fields = [
            "id",
            "product",
            "interaction_type",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
        ]


# =====================================
# RECOMMENDATION EVENT SERIALIZER
# =====================================

class RecommendationEventSerializer(
    serializers.ModelSerializer
):

    class Meta:

        model = RecommendationEvent

        fields = [
            "id",
            "source_product",
            "recommended_product",
            "event_type",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
        ]

    # =====================================
    # VALIDATE EVENT TYPE
    # =====================================

    def validate_event_type(self, value):

        allowed_events = [
            "impression",
            "click",
            "view",
            "wishlist",
            "cart",
            "purchase",
        ]

        if value not in allowed_events:

            raise serializers.ValidationError(
                "Invalid recommendation event type."
            )

        return value