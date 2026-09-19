from rest_framework import serializers

from .models import Product


class AdminProductSerializer(serializers.ModelSerializer):

    # Category ka naam response mein bhi milega
    category_name = serializers.CharField(
        source="category.name",
        read_only=True
    )

    class Meta:

        model = Product

        fields = [
            "id",
            "category",
            "category_name",
            "name",
            "slug",
            "brand",
            "description",
            "price",
            "discount_price",
            "sku",
            "image",
            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "category_name",
            "created_at",
            "updated_at",
        ]

    # =========================================
    # CATEGORY VALIDATION
    # =========================================

    def validate_category(self, value):

        if not value.is_active:

            raise serializers.ValidationError(
                "Selected category is inactive."
            )

        return value

    # =========================================
    # SLUG VALIDATION
    # =========================================

    def validate_slug(self, value):

        queryset = Product.objects.filter(
            slug=value
        )

        # UPDATE ke time current product ko exclude karein
        if self.instance:

            queryset = queryset.exclude(
                pk=self.instance.pk
            )

        if queryset.exists():

            raise serializers.ValidationError(
                "Product with this slug already exists."
            )

        return value

    # =========================================
    # SKU VALIDATION
    # =========================================

    def validate_sku(self, value):

        queryset = Product.objects.filter(
            sku=value
        )

        # UPDATE ke time current product ko exclude karein
        if self.instance:

            queryset = queryset.exclude(
                pk=self.instance.pk
            )

        if queryset.exists():

            raise serializers.ValidationError(
                "Product with this SKU already exists."
            )

        return value

    # =========================================
    # PRICE VALIDATION
    # =========================================

    def validate_price(self, value):

        if value < 0:

            raise serializers.ValidationError(
                "Price cannot be negative."
            )

        return value

    # =========================================
    # DISCOUNT PRICE VALIDATION
    # =========================================

    def validate_discount_price(self, value):

        if value is not None and value < 0:

            raise serializers.ValidationError(
                "Discount price cannot be negative."
            )

        return value

    # =========================================
    # COMPLETE PRODUCT VALIDATION
    # =========================================

    def validate(self, attrs):

        price = attrs.get(
            "price",
            getattr(
                self.instance,
                "price",
                None
            )
        )

        discount_price = attrs.get(
            "discount_price",
            getattr(
                self.instance,
                "discount_price",
                None
            )
        )

        if (
            price is not None
            and discount_price is not None
            and discount_price > price
        ):

            raise serializers.ValidationError({
                "discount_price":
                    "Discount price cannot be greater than price."
            })

        return attrs