from rest_framework import serializers

from .models import Order, OrderItem


# =========================================
# ORDER ITEM SERIALIZER
# =========================================

class OrderItemSerializer(serializers.ModelSerializer):

    product_name = serializers.ReadOnlyField(
        source="product.name"
    )

    class Meta:

        model = OrderItem

        fields = [
            "id",
            "product",
            "product_name",
            "price",
            "quantity",
            "total_price",
        ]


# =========================================
# ORDER SERIALIZER
# =========================================

class OrderSerializer(serializers.ModelSerializer):

    items = OrderItemSerializer(
        many=True,
        read_only=True
    )

    # =====================================
    # PAYMENT INFORMATION
    # =====================================

    payment_id = serializers.SerializerMethodField()

    payment_status = serializers.SerializerMethodField()

    class Meta:

        model = Order

        fields = [
            "id",
            "user",
            "items",

            "total_amount",

            "shipping_address",
            "city",
            "state",
            "country",
            "pincode",

            "status",

            "payment_id",
            "payment_status",

            "created_at",
            "updated_at",
        ]

    # =====================================
    # GET PAYMENT ID
    # =====================================

    def get_payment_id(self, obj):

        try:

            return obj.payment.id

        except Exception:

            return None

    # =====================================
    # GET PAYMENT STATUS
    # =====================================

    def get_payment_status(self, obj):

        try:

            return obj.payment.payment_status

        except Exception:

            return None