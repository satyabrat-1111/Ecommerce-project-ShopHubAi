from rest_framework import generics
from rest_framework.permissions import IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Product
from .serializers import ProductSerializer
from .filters import ProductFilter


# =========================================================
# CUSTOMER - PRODUCT LIST
# =========================================================

class ProductListView(generics.ListAPIView):

    queryset = Product.objects.filter(
        is_active=True
    ).select_related(
        "category"
    )

    serializer_class = ProductSerializer

    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]

    # =========================================
    # FILTER
    # =========================================

    filterset_class = ProductFilter

    # =========================================
    # SEARCH
    # =========================================

    search_fields = [
        "name",
        "brand",
        "description",
        "sku",
    ]

    # =========================================
    # SORTING
    # =========================================

    ordering_fields = [
        "price",
        "created_at",
        "name",
        "stock",
    ]

    # =========================================
    # DEFAULT ORDERING
    # =========================================

    ordering = [
        "-created_at"
    ]


# =========================================================
# CUSTOMER - PRODUCT DETAILS
# =========================================================

class ProductDetailView(
    generics.RetrieveAPIView
):

    queryset = Product.objects.filter(
        is_active=True
    ).select_related(
        "category"
    )

    serializer_class = ProductSerializer

    lookup_field = "id"


# =========================================================
# ADMIN - PRODUCT LIST + CREATE
# =========================================================

class AdminProductListCreateView(
    generics.ListCreateAPIView
):

    queryset = Product.objects.all().select_related(
        "category"
    ).order_by(
        "-created_at"
    )

    serializer_class = ProductSerializer

    permission_classes = [
        IsAdminUser
    ]

    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]

    # =========================================
    # FILTER
    # =========================================

    filterset_fields = [
        "category",
        "brand",
        "is_active",
    ]

    # =========================================
    # SEARCH
    # =========================================

    search_fields = [
        "name",
        "brand",
        "description",
        "sku",
    ]

    # =========================================
    # SORTING
    # =========================================

    ordering_fields = [
        "price",
        "created_at",
        "name",
        "stock",
    ]


# =========================================================
# ADMIN - PRODUCT DETAIL / UPDATE / DELETE
# =========================================================

class AdminProductDetailView(
    generics.RetrieveUpdateDestroyAPIView
):

    queryset = Product.objects.all().select_related(
        "category"
    )

    serializer_class = ProductSerializer

    permission_classes = [
        IsAdminUser
    ]

    lookup_field = "id"