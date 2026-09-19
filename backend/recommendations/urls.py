from django.urls import path

from .views import (
    TrackProductInteractionView,
    ProductRecommendationView,
    RecommendationAnalyticsView,
    RecommendationEventView,
    HomeRecommendationView,
)


urlpatterns = [

    # ========================================================
    # TRACK USER BEHAVIOUR
    # ========================================================

    path(
        "track/",
        TrackProductInteractionView.as_view(),
        name="track-product-interaction",
    ),

    # ========================================================
    # GET PRODUCT RECOMMENDATIONS
    # ========================================================

    path(
        "product/<int:product_id>/",
        ProductRecommendationView.as_view(),
        name="product-recommendations",
    ),

    # ========================================================
    # RECOMMENDATION ANALYTICS
    # ========================================================

    path(
        "analytics/",
        RecommendationAnalyticsView.as_view(),
        name="recommendation-analytics",
    ),

    # ========================================================
    # RECOMMENDATION PERFORMANCE EVENT
    # ========================================================

    path(
        "event/",
        RecommendationEventView.as_view(),
        name="recommendation-event",
    ),
    path(
    "home/",
    HomeRecommendationView.as_view(),
    name="home-recommendations",
),

]