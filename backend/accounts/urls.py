from django.urls import path

from .views import (
    CustomTokenObtainPairView,
    RegisterView,
    ProfileView,
    ChangePasswordView,
    AdminTestView,
    AdminDashboardView,
    AdminAnalyticsView,
    RecentOrdersView,
    AdminOrderStatusUpdateView,
    ForgotPasswordView,
    ResetPasswordView,
)


urlpatterns = [

    # =========================================
    # JWT LOGIN
    # =========================================

    path(
        "token/",
        CustomTokenObtainPairView.as_view(),
        name="token",
    ),


    # =========================================
    # REGISTER
    # =========================================

    path(
        "register/",
        RegisterView.as_view(),
        name="register",
    ),


    # =========================================
    # PROFILE
    # =========================================

    path(
        "profile/",
        ProfileView.as_view(),
        name="profile",
    ),


    # =========================================
    # CHANGE PASSWORD
    # =========================================

    path(
        "change-password/",
        ChangePasswordView.as_view(),
        name="change_password",
    ),


    # =========================================
    # FORGOT PASSWORD
    # =========================================

    path(
        "forgot-password/",
        ForgotPasswordView.as_view(),
        name="forgot_password",
    ),


    # =========================================
    # RESET PASSWORD
    # =========================================

    path(
        "reset-password/<uid>/<token>/",
        ResetPasswordView.as_view(),
        name="reset_password",
    ),


    # =========================================
    # ADMIN TEST
    # =========================================

    path(
        "admin-test/",
        AdminTestView.as_view(),
        name="admin_test",
    ),


    # =========================================
    # ADMIN DASHBOARD
    # =========================================

    path(
        "admin/dashboard/",
        AdminDashboardView.as_view(),
        name="admin_dashboard",
    ),


    # =========================================
    # ADMIN ANALYTICS
    # =========================================

    path(
        "admin/analytics/",
        AdminAnalyticsView.as_view(),
        name="admin_analytics",
    ),


    # =========================================
    # ADMIN RECENT ORDERS
    # =========================================

    path(
        "admin/recent-orders/",
        RecentOrdersView.as_view(),
        name="admin_recent_orders",
    ),


    # =========================================
    # ADMIN ORDER STATUS UPDATE
    # =========================================

    path(
        "admin/orders/<int:order_id>/status/",
        AdminOrderStatusUpdateView.as_view(),
        name="admin_order_status_update",
    ),

]