from django.urls import path

from .admin_views import (
    AdminProductListCreateView,
    AdminProductDetailView,
)


urlpatterns = [

    # =========================================
    # PRODUCT LIST + CREATE
    # =========================================

    path(
        "",
        AdminProductListCreateView.as_view(),
        name="admin-product-list-create",
    ),

    # =========================================
    # PRODUCT DETAIL + UPDATE + DELETE
    # =========================================

    path(
        "<int:id>/",
        AdminProductDetailView.as_view(),
        name="admin-product-detail",
    ),
]