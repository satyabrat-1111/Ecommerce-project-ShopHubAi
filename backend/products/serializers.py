from rest_framework import serializers
from .models import Product


class ProductSerializer(serializers.ModelSerializer):

    class Meta:
        model = Product
        fields = "__all__"

    def validate(self, attrs):

        price = attrs.get(
            "price",
            getattr(self.instance, "price", None)
        )

        discount_price = attrs.get(
            "discount_price",
            getattr(self.instance, "discount_price", None)
        )

        stock = attrs.get(
            "stock",
            getattr(self.instance, "stock", 0)
        )

        # Discount price validation
        if (
            discount_price is not None
            and price is not None
            and discount_price > price
        ):
            raise serializers.ValidationError({
                "discount_price":
                    "Discount price cannot be greater than price."
            })

        # Stock validation
        if stock is not None and stock < 0:
            raise serializers.ValidationError({
                "stock":
                    "Stock cannot be negative."
            })

        return attrs