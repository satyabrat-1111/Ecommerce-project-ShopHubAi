from rest_framework import serializers

from .models import DeliveryIssueClaim, Order, OrderItem


# =========================================
# ORDER ITEM SERIALIZER
# =========================================

class OrderItemSerializer(serializers.ModelSerializer):

    product_name = serializers.ReadOnlyField(
        source="product.name"
    )
    product_image = serializers.SerializerMethodField()

    class Meta:

        model = OrderItem

        fields = [
            "id",
            "product",
            "product_name",
            "product_image",
            "price",
            "quantity",
            "total_price",
        ]

    def get_product_image(self, obj):
        if not obj.product.image:
            return None

        request = self.context.get("request")
        image_url = obj.product.image.url
        return request.build_absolute_uri(image_url) if request else image_url


class DeliveryIssueClaimCreateSerializer(serializers.Serializer):
    order_item_id = serializers.IntegerField()
    issue_type = serializers.ChoiceField(
        choices=[choice[0] for choice in DeliveryIssueClaim.ISSUE_TYPES]
    )
    description = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=2000,
    )
    evidence_image = serializers.ImageField()

    def validate_evidence_image(self, image):
        if image.size > 8 * 1024 * 1024:
            raise serializers.ValidationError(
                "Image must be 8 MB or smaller."
            )

        if image.content_type not in {
            "image/jpeg",
            "image/png",
            "image/webp",
        }:
            raise serializers.ValidationError(
                "Upload a JPEG, PNG, or WebP image."
            )

        return image


class DeliveryIssueClaimSerializer(serializers.ModelSerializer):
    order_item_name = serializers.CharField(
        source="order_item.product.name",
        read_only=True,
    )
    customer_name = serializers.CharField(
        source="user.username",
        read_only=True,
    )
    customer_email = serializers.EmailField(
        source="user.email",
        read_only=True,
    )
    refund_amount = serializers.SerializerMethodField()
    product_image = serializers.SerializerMethodField()
    evidence_image = serializers.SerializerMethodField()

    class Meta:
        model = DeliveryIssueClaim
        fields = [
            "id",
            "order",
            "order_item",
            "order_item_name",
            "customer_name",
            "customer_email",
            "refund_amount",
            "product_image",
            "evidence_image",
            "issue_type",
            "description",
            "ai_analysis",
            "visual_similarity",
            "status",
            "admin_note",
            "refund_processing_date",
            "customer_message",
            "reviewed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_refund_amount(self, obj):
        return obj.order_item.total_price

    def _image_url(self, image):
        if not image:
            return None

        request = self.context.get("request")
        image_url = image.url
        return request.build_absolute_uri(image_url) if request else image_url

    def get_product_image(self, obj):
        return self._image_url(obj.order_item.product.image)

    def get_evidence_image(self, obj):
        return self._image_url(obj.evidence_image)


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

    # =====================================
    # DELIVERY INFORMATION
    # =====================================

    delivery_otp_verified = serializers.ReadOnlyField()

    delivered_at = serializers.ReadOnlyField()

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

            "delivery_otp_verified",
            "delivered_at",

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