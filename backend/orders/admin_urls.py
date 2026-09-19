from django.urls import path

from .admin_views import (
    AdminDashboardView,
    AdminAnalyticsView,
    RecentOrdersView,
    AdminOrderStatusUpdateView,
)


urlpatterns = [

    # =========================================
    # ADMIN DASHBOARD
    # =========================================

    path(
        "dashboard/",
        AdminDashboardView.as_view(),
        name="admin-dashboard",
    ),


    # =========================================
    # ADMIN ANALYTICS
    # =========================================

    path(
        "analytics/",
        AdminAnalyticsView.as_view(),
        name="admin-analytics",
    ),


    # =========================================
    # RECENT ORDERS
    # =========================================

    path(
        "orders/recent/",
        RecentOrdersView.as_view(),
        name="admin-recent-orders",
    ),


    # =========================================
    # UPDATE ORDER STATUS
    # =========================================

    path(
        "orders/<int:order_id>/status/",
        AdminOrderStatusUpdateView.as_view(),
        name="admin-order-status-update",
    ),
]