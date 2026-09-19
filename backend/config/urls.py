"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
"""
URL configuration for config project.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from rest_framework_simplejwt.views import (
    TokenRefreshView,
)

from accounts.views import (
    CustomTokenObtainPairView,
)

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)


urlpatterns = [

    # =========================================
    # DJANGO ADMIN
    # =========================================

    path(
        "admin/",
        admin.site.urls,
    ),


    # =========================================
    # ACCOUNTS APIs
    # =========================================

    path(
        "api/accounts/",
        include("accounts.urls"),
    ),


    # =========================================
    # CATEGORIES APIs
    # =========================================

    path(
        "api/categories/",
        include("categories.urls"),
    ),


    # =========================================
    # PRODUCTS APIs
    # =========================================

    path(
        "api/products/",
        include("products.urls"),
    ),


    # =========================================
    # CART APIs
    # =========================================

    path(
        "api/cart/",
        include("cart.urls"),
    ),


    # =========================================
    # WISHLIST APIs
    # =========================================

    path(
        "api/wishlist/",
        include("wishlist.urls"),
    ),


    # =========================================
    # CUSTOMER ORDER APIs
    # =========================================

    path(
        "api/orders/",
        include("orders.urls"),
    ),


    # =========================================
    # ADMIN APIs
    # =========================================

    path(
        "api/admin/",
        include("orders.admin_urls"),
    ),

    path(
        "api/admin/products/",
        include("products.admin_urls"),
    ),


    # =========================================
    # PAYMENT APIs
    # =========================================

    path(
        "api/payments/",
        include("payments.urls"),
    ),


    # =========================================
    # JWT AUTHENTICATION
    # =========================================

    path(
        "api/token/",
        CustomTokenObtainPairView.as_view(),
        name="token_obtain_pair",
    ),

    path(
        "api/token/refresh/",
        TokenRefreshView.as_view(),
        name="token_refresh",
    ),


    # =========================================
    # SWAGGER API SCHEMA
    # =========================================

    path(
        "api/schema/",
        SpectacularAPIView.as_view(),
        name="schema",
    ),

    path(
    "api/recommendations/",
    include("recommendations.urls")
),


    # =========================================
    # SWAGGER UI
    # =========================================

    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(
            url_name="schema"
        ),
        name="swagger-ui",
    ),
]


# =========================================
# MEDIA FILES
# =========================================

if settings.DEBUG:

    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )