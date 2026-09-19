from rest_framework import generics
from rest_framework.permissions import IsAdminUser
from rest_framework.parsers import (
    MultiPartParser,
    FormParser,
    JSONParser,
)
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Product
from .serializers import ProductSerializer


# =========================================================
# ADMIN PRODUCT LIST + CREATE
# =========================================================

class AdminProductListCreateView(
    generics.ListCreateAPIView
):

    serializer_class = ProductSerializer

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
        "description",
    ]

    ordering_fields = [
        "id",
        "name",
        "price",
        "stock",
        "created_at",
        "updated_at",
    ]

    ordering = [
        "-created_at"
    ]

    def get_queryset(self):

        return Product.objects.select_related(
    "category"
    ).order_by("-created_at")


# =========================================================
# ADMIN PRODUCT DETAIL
# =========================================================

class AdminProductDetailView(
    generics.RetrieveUpdateDestroyAPIView
):

    serializer_class = ProductSerializer

    permission_classes = [
        IsAdminUser
    ]

    parser_classes = [
        MultiPartParser,
        FormParser,
        JSONParser,
    ]

    queryset = Product.objects.all()

    lookup_field = "id"