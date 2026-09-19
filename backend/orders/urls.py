from django.urls import path

from .views import (
    PlaceOrderView,
    OrderHistoryView,
    OrderDetailView,
    AdminDashboardView,
    AdminAnalyticsView,
    AdminRecentOrdersView,
    AdminOrderStatusUpdateView,
)


urlpatterns = [

    # =====================================
    # CUSTOMER ORDERS
    # =====================================

    path(
        "",
        PlaceOrderView.as_view(),
        name="place-order",
    ),

    path(
        "history/",
        OrderHistoryView.as_view(),
        name="order-history",
    ),

    path(
        "<int:id>/",
        OrderDetailView.as_view(),
        name="order-detail",
    ),


    # =====================================
    # ADMIN DASHBOARD
    # =====================================

    path(
        "admin/dashboard/",
        AdminDashboardView.as_view(),
        name="admin-dashboard",
    ),


    # =====================================
    # ADMIN ANALYTICS
    # =====================================

    path(
        "admin/analytics/",
        AdminAnalyticsView.as_view(),
        name="admin-analytics",
    ),


    # =====================================
    # ADMIN RECENT ORDERS
    # =====================================

    path(
        "admin/orders/recent/",
        AdminRecentOrdersView.as_view(),
        name="admin-recent-orders",
    ),


    # =====================================
    # ADMIN ORDER STATUS UPDATE
    # =====================================

    path(
        "admin/orders/<int:order_id>/status/",
        AdminOrderStatusUpdateView.as_view(),
        name="admin-order-status-update",
    ),
]