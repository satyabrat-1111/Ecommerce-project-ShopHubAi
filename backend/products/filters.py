import django_filters

from .models import Product


class ProductFilter(django_filters.FilterSet):

    # -----------------------------------------
    # PRICE RANGE
    # -----------------------------------------

    min_price = django_filters.NumberFilter(
        field_name="price",
        lookup_expr="gte",
    )

    max_price = django_filters.NumberFilter(
        field_name="price",
        lookup_expr="lte",
    )

    # -----------------------------------------
    # STOCK / AVAILABILITY
    # -----------------------------------------

    in_stock = django_filters.BooleanFilter(
        method="filter_in_stock",
    )

    # -----------------------------------------
    # CATEGORY
    # -----------------------------------------

    category = django_filters.NumberFilter(
        field_name="category_id",
    )

    # -----------------------------------------
    # BRAND
    # -----------------------------------------

    brand = django_filters.CharFilter(
        field_name="brand",
        lookup_expr="iexact",
    )

    def filter_in_stock(self, queryset, name, value):

        if value is True:
            return queryset.filter(stock__gt=0)

        if value is False:
            return queryset.filter(stock=0)

        return queryset

    class Meta:

        model = Product

        fields = [
            "category",
            "brand",
            "min_price",
            "max_price",
            "in_stock",
        ]