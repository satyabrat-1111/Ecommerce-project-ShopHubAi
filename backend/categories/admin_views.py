from rest_framework import generics
from rest_framework.permissions import IsAdminUser
from rest_framework.parsers import (
    MultiPartParser,
    FormParser,
    JSONParser,
)
from django_filters.rest_framework import (
    DjangoFilterBackend,
)
from rest_framework.filters import (
    SearchFilter,
    OrderingFilter,
)

from .models import Product
from .admin_serializers import AdminProductSerializer


# =====================================================
# ADMIN PRODUCT LIST + CREATE
# =====================================================

class AdminProductListCreateView(
    generics.ListCreateAPIView
):

    serializer_class = AdminProductSerializer

    permission_classes = [
        IsAdminUser
    ]

    parser_classes = [
        MultiPartParser,
        FormParser,
        JSONParser,
    ]

    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]

    filterset_fields = [
        "category",
        "brand",
        "is_active",
    ]

    search_fields = [
        "name",
        "brand",
        "sku",
        "slug",
        "description",
    ]

    ordering_fields = [
        "id",
        "name",
        "price",
        "created_at",
        "updated_at",
    ]

    ordering = [
        "-created_at"
    ]

    def get_queryset(self):

        return Product.objects.select_related(
            "category"
        ).all().order_by(
            "-created_at"
        )


# =====================================================
# ADMIN PRODUCT DETAIL
# =====================================================

class AdminProductDetailView(
    generics.RetrieveUpdateDestroyAPIView
):

    serializer_class = AdminProductSerializer

    permission_classes = [
        IsAdminUser
    ]

    parser_classes = [
        MultiPartParser,
        FormParser,
        JSONParser,
    ]

    lookup_field = "id"

    def get_queryset(self):

        return Product.objects.select_related(
            "category"
        ).all()