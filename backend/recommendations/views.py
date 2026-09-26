from django.db.models import Count, Q

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
    IsAdminUser,
)
from rest_framework import status

from products.models import Product
from products.serializers import ProductSerializer

from .models import (
    UserProductInteraction,
    RecommendationEvent,
)

from .serializers import (
    UserProductInteractionSerializer,
    RecommendationEventSerializer,
)

from .recommendation_engine import (
    get_recommendations,
    get_recommendation_reasons,
    get_aggregated_user_interactions,
    invalidate_user_recommendation_cache,
)


# ============================================================
# TRACK USER PRODUCT INTERACTION
# ============================================================

class TrackProductInteractionView(APIView):

    permission_classes = [
        IsAuthenticated
    ]

    def post(self, request):

        serializer = UserProductInteractionSerializer(
            data=request.data
        )

        if serializer.is_valid():

            interaction = serializer.save(
                user=request.user
            )

            # Invalidate personalized recommendation cache
            invalidate_user_recommendation_cache(
                request.user
            )

            return Response(
                {
                    "message":
                        "Product interaction tracked successfully.",

                    "interaction":
                        UserProductInteractionSerializer(
                            interaction
                        ).data,
                },
                status=status.HTTP_201_CREATED,
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )


# ============================================================
# PRODUCT RECOMMENDATIONS
# ============================================================

class ProductRecommendationView(APIView):

    permission_classes = [
        AllowAny
    ]

    def get(self, request, product_id):

        # ----------------------------------------------------
        # TARGET PRODUCT
        # ----------------------------------------------------

        try:

            product = Product.objects.select_related(
                "category"
            ).get(
                id=product_id,
                is_active=True,
            )

        except Product.DoesNotExist:

            return Response(
                {
                    "error":
                        "Product not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # ----------------------------------------------------
        # USER
        # ----------------------------------------------------

        current_user = (
            request.user
            if request.user.is_authenticated
            else None
        )

        # ----------------------------------------------------
        # USER INTERACTIONS
        # ----------------------------------------------------

        user_interactions = (
            get_aggregated_user_interactions(
                current_user
            )
            if current_user
            else {}
        )

        # ----------------------------------------------------
        # RECOMMENDATIONS
        # ----------------------------------------------------

        recommendations = get_recommendations(
            product_id=product.id,
            user=current_user,
            limit=5,
        )

        # ----------------------------------------------------
        # SERIALIZE
        # ----------------------------------------------------

        recommendation_data = []

        for recommendation in recommendations:

            # =================================================
            # IMPORTANT:
            #
            # Recommendation engine returns:
            #
            # {
            #     "product": Product object,
            #     "score": float
            # }
            # =================================================

            recommended_product = recommendation.get(
                "product"
            )

            recommendation_score = recommendation.get(
                "score",
                0.0
            )

            if not recommended_product:
                continue

            # ------------------------------------------------
            # PRODUCT SERIALIZATION
            # ------------------------------------------------

            serialized_product = ProductSerializer(
                recommended_product,
                context={
                    "request": request
                },
            ).data

            # ------------------------------------------------
            # RECOMMENDATION REASONS
            # ------------------------------------------------

            reasons = get_recommendation_reasons(
                target_product=product,
               candidate_product =recommended_product,
                user=current_user,
            )

            # ------------------------------------------------
            # RECOMMENDATION SCORE
            # ------------------------------------------------

            serialized_product[
                "recommendation_score"
            ] = round(
                float(recommendation_score),
                4
            )

            # ------------------------------------------------
            # RECOMMENDATION REASONS
            # ------------------------------------------------

            serialized_product[
                "recommendation_reasons"
            ] = reasons

            # ------------------------------------------------
            # RECOMMENDATION SIGNALS
            # ------------------------------------------------

            serialized_product[
                "recommendation_signals"
            ] = {
                "user_has_history":
                    bool(user_interactions),
            }

            recommendation_data.append(
                serialized_product
            )

        # ----------------------------------------------------
        # FINAL RESPONSE
        # ----------------------------------------------------

        return Response(
            {
                "product_id":
                    product.id,

                "recommendations":
                    recommendation_data,
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# HOMEPAGE PERSONALIZED RECOMMENDATIONS
# ============================================================

class HomeRecommendationView(APIView):

    """
    Personalized homepage recommendation API.

    Guest User:
        - Trending Products
        - Latest Products

    Authenticated User:
        - Recommended For You
        - Because You Viewed
        - Trending For You
        - Recently Viewed
        - Latest Products
    """

    permission_classes = [
        AllowAny
    ]

    def get(self, request):

        # ====================================================
        # CURRENT USER
        # ====================================================

        current_user = (
            request.user
            if request.user.is_authenticated
            else None
        )

        # ====================================================
        # BASE PRODUCT QUERY
        # ====================================================

        base_products = (
            Product.objects
            .select_related("category")
            .filter(
                is_active=True,
                stock__gt=0,
            )
        )

        # ====================================================
        # LATEST PRODUCTS
        # ====================================================

        latest_products = (
            base_products
            .order_by("-created_at")[:8]
        )

        # ====================================================
        # TRENDING PRODUCTS
        # ====================================================

        trending_products = (
            base_products
            .annotate(
                interaction_count=Count(
                    "user_interactions"
                )
            )
            .order_by(
                "-interaction_count",
                "-created_at",
            )[:8]
        )

        # ====================================================
        # DEFAULT RESPONSE
        # ====================================================

        response_data = {

            "recommended_for_you": [],

            "because_you_viewed": [],

            "trending_for_you": [],

            "recently_viewed": [],

            "latest_products": [],
        }

        # ====================================================
        # LATEST PRODUCTS SERIALIZATION
        # ====================================================

        response_data[
            "latest_products"
        ] = ProductSerializer(
            latest_products,
            many=True,
            context={
                "request": request
            },
        ).data

        # ====================================================
        # GUEST USER
        # ====================================================

        if not current_user:

            response_data[
                "trending_for_you"
            ] = ProductSerializer(
                trending_products,
                many=True,
                context={
                    "request": request
                },
            ).data

            return Response(
                response_data,
                status=status.HTTP_200_OK,
            )

        # ====================================================
        # USER'S RECENT INTERACTIONS
        # ====================================================

        recent_interactions = (
            UserProductInteraction.objects
            .filter(
                user=current_user
            )
            .select_related(
                "product",
                "product__category",
            )
            .order_by("-created_at")
        )

        # ====================================================
        # RECENTLY VIEWED PRODUCT IDs
        # ====================================================

        recently_viewed_ids = []

        for interaction in recent_interactions:

            if interaction.interaction_type != "view":
                continue

            if interaction.product_id in recently_viewed_ids:
                continue

            recently_viewed_ids.append(
                interaction.product_id
            )

            if len(recently_viewed_ids) >= 8:
                break

        # ====================================================
        # RECENTLY VIEWED PRODUCTS
        # ====================================================

        recently_viewed_products = (
            Product.objects
            .select_related("category")
            .filter(
                id__in=recently_viewed_ids,
                is_active=True,
                stock__gt=0,
            )
        )

        # Preserve interaction order

        recently_viewed_map = {
            product.id: product
            for product in recently_viewed_products
        }

        ordered_recently_viewed = [
            recently_viewed_map[product_id]
            for product_id in recently_viewed_ids
            if product_id in recently_viewed_map
        ]

        response_data[
            "recently_viewed"
        ] = ProductSerializer(
            ordered_recently_viewed,
            many=True,
            context={
                "request": request
            },
        ).data

        # ====================================================
        # USER INTERACTION PRODUCTS
        # ====================================================

        interaction_products = []

        seen_product_ids = set()

        for interaction in recent_interactions:

            product_id = interaction.product_id

            if product_id in seen_product_ids:
                continue

            if not interaction.product:
                continue

            seen_product_ids.add(
                product_id
            )

            interaction_products.append(
                interaction.product
            )

            if len(interaction_products) >= 5:
                break

        # ====================================================
        # RECOMMENDED FOR YOU
        # ====================================================

        personalized_ids = []

        personalized_id_set = set()

        for source_product in interaction_products:

            recommendations = get_recommendations(
                product_id=source_product.id,
                user=current_user,
                limit=5,
            )

            for recommendation in recommendations:

                # --------------------------------------------
                # Engine returns:
                #
                # {
                #     "product": Product,
                #     "score": float
                # }
                # --------------------------------------------

                recommended_product = recommendation.get(
                    "product"
                )

                if not recommended_product:
                    continue

                product_id = recommended_product.id

                # --------------------------------------------
                # Don't recommend source product itself
                # --------------------------------------------

                if product_id == source_product.id:
                    continue

                # --------------------------------------------
                # Avoid duplicate products
                # --------------------------------------------

                if product_id in personalized_id_set:
                    continue

                personalized_id_set.add(
                    product_id
                )

                personalized_ids.append(
                    product_id
                )

                if len(personalized_ids) >= 8:
                    break

            if len(personalized_ids) >= 8:
                break

        # ====================================================
        # CONVERT PERSONALIZED IDs → PRODUCT OBJECTS
        # ====================================================

        personalized_products = (
            Product.objects
            .select_related("category")
            .filter(
                id__in=personalized_ids,
                is_active=True,
                stock__gt=0,
            )
        )

        personalized_map = {
            product.id: product
            for product in personalized_products
        }

        # Preserve recommendation order

        ordered_personalized_products = [
            personalized_map[product_id]
            for product_id in personalized_ids
            if product_id in personalized_map
        ]

        response_data[
            "recommended_for_you"
        ] = ProductSerializer(
            ordered_personalized_products,
            many=True,
            context={
                "request": request
            },
        ).data

        # ====================================================
        # BECAUSE YOU VIEWED
        # ====================================================

        because_you_viewed_ids = []

        if recently_viewed_ids:

            latest_viewed_product_id = (
                recently_viewed_ids[0]
            )

            try:

                viewed_product = (
                    Product.objects
                    .select_related("category")
                    .get(
                        id=latest_viewed_product_id,
                        is_active=True,
                    )
                )

                because_recommendations = (
                    get_recommendations(
                        product_id=viewed_product.id,
                        user=current_user,
                        limit=8,
                    )
                )

                because_id_set = set()

                for recommendation in because_recommendations:

                    # ----------------------------------------
                    # Engine returns:
                    #
                    # {
                    #     "product": Product,
                    #     "score": float
                    # }
                    # ----------------------------------------

                    recommended_product = (
                        recommendation.get(
                            "product"
                        )
                    )

                    if not recommended_product:
                        continue

                    product_id = (
                        recommended_product.id
                    )

                    # ----------------------------------------
                    # Don't recommend viewed product itself
                    # ----------------------------------------

                    if product_id == viewed_product.id:
                        continue

                    # ----------------------------------------
                    # Avoid duplicates
                    # ----------------------------------------

                    if product_id in because_id_set:
                        continue

                    because_id_set.add(
                        product_id
                    )

                    because_you_viewed_ids.append(
                        product_id
                    )

                    if len(
                        because_you_viewed_ids
                    ) >= 8:
                        break

            except Product.DoesNotExist:

                because_you_viewed_ids = []

        # ====================================================
        # BECAUSE YOU VIEWED → PRODUCT OBJECTS
        # ====================================================

        because_products = (
            Product.objects
            .select_related("category")
            .filter(
                id__in=because_you_viewed_ids,
                is_active=True,
                stock__gt=0,
            )
        )

        because_map = {
            product.id: product
            for product in because_products
        }

        # Preserve recommendation order

        ordered_because_products = [
            because_map[product_id]
            for product_id in because_you_viewed_ids
            if product_id in because_map
        ]

        response_data[
            "because_you_viewed"
        ] = ProductSerializer(
            ordered_because_products,
            many=True,
            context={
                "request": request
            },
        ).data

        # ====================================================
        # TRENDING FOR YOU
        # ====================================================

        preferred_category_ids = []

        for interaction in recent_interactions:

            if not interaction.product:
                continue

            category_id = (
                interaction.product.category_id
            )

            if category_id in preferred_category_ids:
                continue

            preferred_category_ids.append(
                category_id
            )

            if len(
                preferred_category_ids
            ) >= 5:
                break

        # ====================================================
        # PERSONALIZED TRENDING PRODUCTS
        # ====================================================

        if preferred_category_ids:

            trending_for_user = (
                base_products
                .filter(
                    category_id__in=
                        preferred_category_ids
                )
                .annotate(
                    interaction_count=Count(
                        "user_interactions"
                    )
                )
                .order_by(
                    "-interaction_count",
                    "-created_at",
                )[:8]
            )

        else:

            trending_for_user = (
                trending_products
            )

        response_data[
            "trending_for_you"
        ] = ProductSerializer(
            trending_for_user,
            many=True,
            context={
                "request": request
            },
        ).data

        # ====================================================
        # FINAL RESPONSE
        # ====================================================

        return Response(
            response_data,
            status=status.HTTP_200_OK,
        )


# ============================================================
# RECOMMENDATION PERFORMANCE EVENT
# ============================================================

class RecommendationEventView(APIView):

    permission_classes = [
        AllowAny
    ]

    def post(self, request):

        serializer = RecommendationEventSerializer(
            data=request.data
        )

        if serializer.is_valid():

            user = (
                request.user
                if request.user.is_authenticated
                else None
            )

            event = serializer.save(
                user=user
            )

            return Response(
                {
                    "message":
                        "Recommendation event tracked successfully.",

                    "event":
                        RecommendationEventSerializer(
                            event
                        ).data,
                },
                status=status.HTTP_201_CREATED,
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )


# ============================================================
# RECOMMENDATION ANALYTICS
# ============================================================

class RecommendationAnalyticsView(APIView):

    permission_classes = [
        IsAdminUser
    ]

    def get(self, request):

        # ====================================================
        # USER PRODUCT INTERACTIONS
        # ====================================================

        total_interactions = (
            UserProductInteraction.objects.count()
        )

        interaction_counts = (
            UserProductInteraction.objects
            .values("interaction_type")
            .annotate(
                count=Count("id")
            )
        )

        interaction_summary = {

            "view": 0,

            "wishlist": 0,

            "cart": 0,

            "purchase": 0,
        }

        for item in interaction_counts:

            interaction_summary[
                item["interaction_type"]
            ] = item["count"]

        # ====================================================
        # RECOMMENDATION EVENTS
        # ====================================================

        total_events = (
            RecommendationEvent.objects.count()
        )

        event_counts = (
            RecommendationEvent.objects
            .values("event_type")
            .annotate(
                count=Count("id")
            )
        )

        event_summary = {

            "impression": 0,

            "click": 0,

            "view": 0,

            "wishlist": 0,

            "cart": 0,

            "purchase": 0,
        }

        for item in event_counts:

            event_summary[
                item["event_type"]
            ] = item["count"]

        # ====================================================
        # CTR
        # ====================================================

        impressions = (
            event_summary["impression"]
        )

        clicks = (
            event_summary["click"]
        )

        ctr = (
            (clicks / impressions) * 100
            if impressions > 0
            else 0
        )

        # ====================================================
        # TOP PRODUCTS
        # ====================================================

        top_products = (
            Product.objects
            .annotate(

                total_views=Count(
                    "user_interactions",
                    filter=Q(
                        user_interactions__interaction_type=
                            "view"
                    ),
                ),

                total_wishlist=Count(
                    "user_interactions",
                    filter=Q(
                        user_interactions__interaction_type=
                            "wishlist"
                    ),
                ),

                total_cart=Count(
                    "user_interactions",
                    filter=Q(
                        user_interactions__interaction_type=
                            "cart"
                    ),
                ),

                total_purchase=Count(
                    "user_interactions",
                    filter=Q(
                        user_interactions__interaction_type=
                            "purchase"
                    ),
                ),

                total_interactions=Count(
                    "user_interactions"
                ),
            )
            .order_by(
                "-total_interactions"
            )[:10]
        )

        top_products_data = []

        for product in top_products:

            top_products_data.append(
                {
                    "id":
                        product.id,

                    "name":
                        product.name,

                    "views":
                        product.total_views,

                    "wishlist":
                        product.total_wishlist,

                    "cart":
                        product.total_cart,

                    "purchase":
                        product.total_purchase,

                    "total_interactions":
                        product.total_interactions,
                }
            )

        # ====================================================
        # RESPONSE
        # ====================================================

        return Response(
            {
                "summary": {

                    "total_interactions":
                        total_interactions,

                    "interactions":
                        interaction_summary,

                    "total_events":
                        total_events,

                    "events":
                        event_summary,

                    "ctr":
                        round(
                            ctr,
                            2
                        ),
                },

                "top_products":
                    top_products_data,
            },

            status=status.HTTP_200_OK,
        )