from django.urls import path

from .views import (
    PlaceOrderView,
    OrderHistoryView,
    OrderDetailView,
    AdminDashboardView,
    AdminAnalyticsView,
    AdminRecentOrdersView,
    AdminOrderStatusUpdateView,
    DeliveryOTPSendView,
    DeliveryOTPVerificationView,
    DeliveryIssueClaimsView,
    AdminDeliveryIssueClaimsView,
    AdminDeliveryIssueReviewView,
)
from .customer_views import CustomerInsightsView


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
        "insights/",
        CustomerInsightsView.as_view(),
        name="customer-insights",
    ),

    path(
        "<int:id>/",
        OrderDetailView.as_view(),
        name="order-detail",
    ),


    # =====================================
    # DELIVERY OTP
    # =====================================

    path(
        "<int:order_id>/delivery/send-otp/",
        DeliveryOTPSendView.as_view(),
        name="delivery-send-otp",
    ),

    path(
        "<int:order_id>/delivery/verify-otp/",
        DeliveryOTPVerificationView.as_view(),
        name="delivery-verify-otp",
    ),

    path(
        "<int:order_id>/claims/",
        DeliveryIssueClaimsView.as_view(),
        name="delivery-issue-claims",
    ),

    path(
        "admin/delivery-claims/",
        AdminDeliveryIssueClaimsView.as_view(),
        name="admin-delivery-issue-claims",
    ),

    path(
        "admin/delivery-claims/<int:claim_id>/review/",
        AdminDeliveryIssueReviewView.as_view(),
        name="admin-delivery-issue-review",
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