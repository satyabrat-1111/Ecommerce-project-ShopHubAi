from django.urls import path

from .views import (
    ProductListView,
    ProductDetailView,
    AdminProductListCreateView,
    AdminProductDetailView,
)


urlpatterns = [

    # =====================================================
    # ADMIN PRODUCTS
    # =====================================================

    path(
        "admin/",
        AdminProductListCreateView.as_view(),
        name="admin-product-list-create",
    ),

    path(
        "admin/<int:id>/",
        AdminProductDetailView.as_view(),
        name="admin-product-detail",
    ),


    # =====================================================
    # CUSTOMER PRODUCTS
    # =====================================================

    path(
        "",
        ProductListView.as_view(),
        name="product-list",
    ),

    path(
        "<int:id>/",
        ProductDetailView.as_view(),
        name="product-detail",
    ),
]