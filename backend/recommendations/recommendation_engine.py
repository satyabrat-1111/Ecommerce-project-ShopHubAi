from decimal import Decimal

from django.core.cache import cache
from django.db.models import Count

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from products.models import Product
from .models import UserProductInteraction
from .services.user_profile import get_user_preference_profile


# ============================================================
# RECOMMENDATION CONFIGURATION
# ============================================================

CATEGORY_WEIGHT = 0.35
BRAND_WEIGHT = 0.20
DESCRIPTION_WEIGHT = 0.30
PRICE_WEIGHT = 0.15

# Existing content score
CONTENT_SCORE_WEIGHT = 0.55

# Existing interaction-based personalization
USER_PREFERENCE_WEIGHT = 0.20

# New behavioral user profile personalization
USER_PROFILE_WEIGHT = 0.25


# ============================================================
# CACHE CONFIGURATION
# ============================================================

RECOMMENDATION_CACHE_TIMEOUT = 600

# v2 because recommendation scoring logic has changed
CACHE_KEY_PREFIX = "shophub_ai:recommendations:v2"


# ============================================================
# INTERACTION WEIGHTS
# ============================================================

INTERACTION_WEIGHTS = {
    "view": 1.0,
    "wishlist": 3.0,
    "cart": 4.0,
    "purchase": 5.0,
}


# ============================================================
# STRICTLY EXCLUDED INTERACTIONS
# ============================================================

EXCLUDED_INTERACTION_TYPES = [
    "wishlist",
    "cart",
    "purchase",
]


# ============================================================
# RELAXED FALLBACK EXCLUSIONS
# ============================================================

# In fallback mode:
#
# Purchased products remain excluded.
#
# Wishlist/cart products can become candidates if
# there are not enough fresh recommendations.

RELAXED_EXCLUDED_INTERACTION_TYPES = [
    "purchase",
]


# ============================================================
# CACHE KEY
# ============================================================

def get_recommendation_cache_key(
    product_id,
    user=None,
    limit=5
):
    """
    Generate a unique recommendation cache key.

    Guest:

        shophub_ai:recommendations:v2:guest:product:2:limit:5

    Authenticated:

        shophub_ai:recommendations:v2:user:5:product:2:limit:5
    """

    if (
        user
        and user.is_authenticated
    ):

        return (
            f"{CACHE_KEY_PREFIX}:"
            f"user:{user.id}:"
            f"product:{product_id}:"
            f"limit:{limit}"
        )

    return (
        f"{CACHE_KEY_PREFIX}:"
        f"guest:"
        f"product:{product_id}:"
        f"limit:{limit}"
    )


# ============================================================
# TEXT TOKENIZATION
# ============================================================

def tokenize(text):
    """
    Convert text into normalized tokens.
    """

    if not text:
        return set()

    return set(
        word.strip().lower()
        for word in str(text).split()
        if word.strip()
    )


# ============================================================
# BASIC TEXT SIMILARITY
# ============================================================

def text_similarity(text1, text2):
    """
    Calculate Jaccard similarity between two texts.
    """

    tokens1 = tokenize(text1)
    tokens2 = tokenize(text2)

    if not tokens1 or not tokens2:
        return 0.0

    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)

    if not union:
        return 0.0

    return len(intersection) / len(union)


# ============================================================
# CATEGORY SIMILARITY
# ============================================================

def category_similarity(
    product1,
    product2
):
    """
    Returns:

        1.0 -> same category
        0.0 -> different category
    """

    if (
        not product1.category_id
        or not product2.category_id
    ):
        return 0.0

    return (
        1.0
        if product1.category_id == product2.category_id
        else 0.0
    )


# ============================================================
# BRAND SIMILARITY
# ============================================================

def brand_similarity(
    product1,
    product2
):
    """
    Returns:

        1.0 -> same brand
        0.0 -> different brand
    """

    brand1 = (
        product1.brand or ""
    ).strip().lower()

    brand2 = (
        product2.brand or ""
    ).strip().lower()

    if not brand1 or not brand2:
        return 0.0

    return (
        1.0
        if brand1 == brand2
        else 0.0
    )


# ============================================================
# EFFECTIVE PRODUCT PRICE
# ============================================================

def get_product_price(product):
    """
    Return effective selling price.

    Discount price is preferred.
    """

    if product.discount_price is not None:

        return Decimal(
            str(product.discount_price)
        )

    if product.price is not None:

        return Decimal(
            str(product.price)
        )

    return Decimal("0")


# ============================================================
# PRICE SIMILARITY
# ============================================================

def price_similarity(
    product1,
    product2
):
    """
    Calculate price similarity.
    """

    price1 = get_product_price(
        product1
    )

    price2 = get_product_price(
        product2
    )

    if price1 <= 0 or price2 <= 0:
        return 0.0

    difference = abs(
        price1 - price2
    )

    average_price = (
        price1 + price2
    ) / Decimal("2")

    if average_price <= 0:
        return 0.0

    similarity = Decimal("1") - (
        difference /
        average_price
    )

    similarity = max(
        Decimal("0"),
        min(
            Decimal("1"),
            similarity
        )
    )

    return float(
        similarity
    )


# ============================================================
# BUILD PRODUCT TEXT
# ============================================================

def build_product_text(product):
    """
    Build combined textual representation
    for TF-IDF.
    """

    category_name = ""

    if product.category:

        category_name = (
            product.category.name or ""
        )

    return " ".join(
        [
            str(product.name or ""),
            str(product.brand or ""),
            str(product.description or ""),
            str(category_name),
        ]
    ).strip()


# ============================================================
# TF-IDF SIMILARITY
# ============================================================

def calculate_tfidf_similarity(
    product1,
    product2
):
    """
    Calculate cosine similarity using TF-IDF.
    """

    text1 = build_product_text(
        product1
    )

    text2 = build_product_text(
        product2
    )

    if not text1 or not text2:
        return 0.0

    if (
        text1.strip().lower()
        ==
        text2.strip().lower()
    ):
        return 1.0

    try:

        vectorizer = TfidfVectorizer(
            stop_words="english"
        )

        tfidf_matrix = (
            vectorizer.fit_transform(
                [
                    text1,
                    text2
                ]
            )
        )

        similarity = cosine_similarity(
            tfidf_matrix[0:1],
            tfidf_matrix[1:2]
        )[0][0]

        return float(
            similarity
        )

    except ValueError:

        return text_similarity(
            text1,
            text2
        )


# ============================================================
# CONTENT SCORE
# ============================================================

def calculate_content_score(
    target_product,
    candidate_product
):
    """
    Calculate content-based recommendation score.

    Components:

        Category
        Brand
        Description/Text
        Price
    """

    category_score = category_similarity(
        target_product,
        candidate_product
    )

    brand_score = brand_similarity(
        target_product,
        candidate_product
    )

    description_score = (
        calculate_tfidf_similarity(
            target_product,
            candidate_product
        )
    )

    price_score = price_similarity(
        target_product,
        candidate_product
    )

    content_score = (
        category_score * CATEGORY_WEIGHT
        +
        brand_score * BRAND_WEIGHT
        +
        description_score * DESCRIPTION_WEIGHT
        +
        price_score * PRICE_WEIGHT
    )

    return round(
        max(
            0.0,
            min(
                1.0,
                content_score
            )
        ),
        4
    )


# ============================================================
# GET USER INTERACTIONS
# ============================================================

def get_user_interactions(user):
    """
    Return all interactions for a user.
    """

    if (
        not user
        or not user.is_authenticated
    ):
        return []

    return list(
        UserProductInteraction.objects
        .filter(
            user=user
        )
        .select_related(
            "product",
            "product__category"
        )
        .order_by(
            "-created_at"
        )
    )


# ============================================================
# INTERACTION AGGREGATION
# ============================================================

def get_aggregated_user_interactions(
    user
):
    """
    Aggregate repeated interactions
    for each product.
    """

    if (
        not user
        or not user.is_authenticated
    ):
        return {}

    aggregated = {}

    interactions = (
        UserProductInteraction.objects
        .filter(
            user=user
        )
        .select_related(
            "product",
            "product__category"
        )
    )

    for interaction in interactions:

        product_id = (
            interaction.product_id
        )

        interaction_type = (
            interaction.interaction_type
        )

        if product_id not in aggregated:

            aggregated[product_id] = {
                "product":
                    interaction.product,

                "interaction_counts":
                    {},

                "total_weight":
                    0.0,
            }

        current_data = (
            aggregated[product_id]
        )

        current_data[
            "interaction_counts"
        ][interaction_type] = (
            current_data[
                "interaction_counts"
            ].get(
                interaction_type,
                0
            )
            + 1
        )

        interaction_weight = (
            INTERACTION_WEIGHTS.get(
                interaction_type,
                0.0
            )
        )

        current_data[
            "total_weight"
        ] += interaction_weight

    return aggregated


# ============================================================
# COLD START USER
# ============================================================

def is_cold_start_user(user):
    """
    Determine whether user has no
    interaction history.
    """

    if (
        not user
        or not user.is_authenticated
    ):
        return True

    return not (
        UserProductInteraction.objects
        .filter(
            user=user
        )
        .exists()
    )


# ============================================================
# GET EXCLUDED PRODUCTS
# ============================================================

def get_excluded_product_ids(
    user,
    interaction_types=None
):
    """
    Get product IDs that should be excluded.

    By default:

        wishlist
        cart
        purchase

    can be excluded.

    The interaction_types argument allows
    relaxed fallback rules.
    """

    if (
        not user
        or not user.is_authenticated
    ):
        return set()

    if interaction_types is None:

        interaction_types = (
            EXCLUDED_INTERACTION_TYPES
        )

    return set(
        UserProductInteraction.objects
        .filter(
            user=user,
            interaction_type__in=
                interaction_types
        )
        .values_list(
            "product_id",
            flat=True
        )
    )


# ============================================================
# USER PREFERENCE SCORE
# ============================================================

def get_user_preference_score(
    candidate_product,
    user,
    aggregated_interactions=None
):
    """
    Calculate personalized preference score.

    This is the existing interaction-based
    personalization layer.
    """

    if (
        not user
        or not user.is_authenticated
    ):
        return 0.0

    if aggregated_interactions is None:

        aggregated_interactions = (
            get_aggregated_user_interactions(
                user
            )
        )

    if not aggregated_interactions:
        return 0.0

    total_user_weight = sum(
        data["total_weight"]
        for data in
        aggregated_interactions.values()
    )

    if total_user_weight <= 0:
        return 0.0

    weighted_similarity = 0.0

    for data in (
        aggregated_interactions.values()
    ):

        interacted_product = (
            data["product"]
        )

        interaction_weight = (
            data["total_weight"]
        )

        if not interacted_product:
            continue

        similarity = (
            calculate_content_score(
                interacted_product,
                candidate_product
            )
        )

        normalized_weight = (
            interaction_weight
            /
            total_user_weight
        )

        weighted_similarity += (
            similarity
            *
            normalized_weight
        )

    return round(
        max(
            0.0,
            min(
                1.0,
                weighted_similarity
            )
        ),
        4
    )


# ============================================================
# USER PROFILE PREFERENCE SCORE
# ============================================================

def get_user_profile_preference_score(
    candidate_product,
    user,
    user_profile=None
):
    """
    Calculate recommendation score using
    the user's behavioral preference profile.

    Profile signals:

        Category affinity
        Brand affinity
        Price preference

    The profile itself already considers:

        Interaction type
        Interaction intensity
        Interaction recency

    Final profile score:

        Category = 40%
        Brand    = 35%
        Price    = 25%
    """

    if (
        not user
        or not user.is_authenticated
    ):
        return 0.0

    # --------------------------------------------------------
    # Use supplied profile when available.
    #
    # This is important because the main recommendation
    # pipeline calculates the profile only once.
    # --------------------------------------------------------

    if user_profile is None:

        user_profile = (
            get_user_preference_profile(
                user
            )
        )

    # --------------------------------------------------------
    # Cold-start user
    # --------------------------------------------------------

    if user_profile.get(
        "is_cold_start",
        True
    ):
        return 0.0

    # ========================================================
    # CATEGORY AFFINITY
    # ========================================================

    category_score = 0.0

    for item in user_profile.get(
        "category_affinity",
        []
    ):

        if (
            item.get("category_id")
            ==
            candidate_product.category_id
        ):

            category_score = float(
                item.get(
                    "score",
                    0.0
                )
            )

            break

    # ========================================================
    # BRAND AFFINITY
    # ========================================================

    brand_score = 0.0

    candidate_brand = (
        (candidate_product.brand or "")
        .strip()
        .lower()
    )

    if candidate_brand:

        for item in user_profile.get(
            "brand_affinity",
            []
        ):

            profile_brand = (
                (item.get("brand") or "")
                .strip()
                .lower()
            )

            if (
                profile_brand
                ==
                candidate_brand
            ):

                brand_score = float(
                    item.get(
                        "score",
                        0.0
                    )
                )

                break

    # ========================================================
    # PRICE AFFINITY
    # ========================================================

    price_score = 0.0

    price_preference = (
        user_profile.get(
            "price_preference",
            {}
        )
    )

    average_price = (
        price_preference.get(
            "average"
        )
    )

    candidate_price = float(
        get_product_price(
            candidate_product
        )
    )

    if (
        average_price is not None
        and candidate_price > 0
        and float(average_price) > 0
    ):

        price_difference = abs(
            candidate_price
            -
            float(average_price)
        )

        price_average = (
            candidate_price
            +
            float(average_price)
        ) / 2

        if price_average > 0:

            price_score = (
                1.0
                -
                (
                    price_difference
                    /
                    price_average
                )
            )

            price_score = max(
                0.0,
                min(
                    1.0,
                    price_score
                )
            )

    # ========================================================
    # FINAL PROFILE SCORE
    # ========================================================

    profile_score = (
        category_score * 0.40
        +
        brand_score * 0.35
        +
        price_score * 0.25
    )

    return round(
        max(
            0.0,
            min(
                1.0,
                profile_score
            )
        ),
        4
    )


# ============================================================
# PERSONALIZED SCORE
# ============================================================

def calculate_personalized_score(
    target_product,
    candidate_product,
    user=None,
    aggregated_interactions=None,
    user_profile=None
):
    """
    Calculate final personalized score.

    Guest / cold-start:

        100% Content

    Existing user:

        55% Content
        20% Existing User Preference
        25% Behavioral User Profile
    """

    # ========================================================
    # CONTENT SCORE
    # ========================================================

    content_score = (
        calculate_content_score(
            target_product,
            candidate_product
        )
    )

    # ========================================================
    # GUEST
    # ========================================================

    if (
        not user
        or not user.is_authenticated
    ):

        return round(
            content_score,
            4
        )

    # ========================================================
    # AGGREGATED INTERACTIONS
    # ========================================================

    if aggregated_interactions is None:

        aggregated_interactions = (
            get_aggregated_user_interactions(
                user
            )
        )

    # ========================================================
    # COLD START
    # ========================================================

    if not aggregated_interactions:

        return round(
            content_score,
            4
        )

    # ========================================================
    # EXISTING USER PREFERENCE
    # ========================================================

    user_preference_score = (
        get_user_preference_score(
            candidate_product=
                candidate_product,

            user=user,

            aggregated_interactions=
                aggregated_interactions
        )
    )

    # ========================================================
    # NEW USER PROFILE SCORE
    # ========================================================

    user_profile_score = (
        get_user_profile_preference_score(
            candidate_product=
                candidate_product,

            user=user,

            user_profile=
                user_profile
        )
    )

    # ========================================================
    # FINAL SCORE
    # ========================================================

    final_score = (
        content_score
        *
        CONTENT_SCORE_WEIGHT

        +

        user_preference_score
        *
        USER_PREFERENCE_WEIGHT

        +

        user_profile_score
        *
        USER_PROFILE_WEIGHT
    )

    return round(
        max(
            0.0,
            min(
                1.0,
                final_score
            )
        ),
        4
    )


# ============================================================
# RECOMMENDATION EXPLANATION
# ============================================================

def get_recommendation_reasons(
    target_product,
    candidate_product,
    user=None,
    aggregated_interactions=None,
    user_profile=None,
):
    """
    Explain why a candidate product was recommended.

    Reasons are generated from:
    1. Product similarity
    2. Previous user interactions
    3. User preference profile
    """

    reasons = []

    category_score = category_similarity(
        target_product,
        candidate_product
    )

    brand_score = brand_similarity(
        target_product,
        candidate_product
    )

    price_score = price_similarity(
        target_product,
        candidate_product
    )

    text_score = calculate_tfidf_similarity(
        target_product,
        candidate_product
    )

    # ========================================================
    # CATEGORY
    # ========================================================

    if category_score > 0:

        reasons.append(
            "Same category"
        )

    # ========================================================
    # BRAND
    # ========================================================

    if brand_score > 0:

        reasons.append(
            "Same brand"
        )

    # ========================================================
    # PRICE
    # ========================================================

    if price_score >= 0.70:

        reasons.append(
            "Similar price range"
        )

    # ========================================================
    # TEXT / FEATURES
    # ========================================================

    if text_score >= 0.20:

        reasons.append(
            "Similar product features or description"
        )

    # ========================================================
    # USER PERSONALIZATION
    # ========================================================

    if (
        user
        and user.is_authenticated
    ):

        # ----------------------------------------------------
        # Existing aggregated interaction preference
        # ----------------------------------------------------

        if aggregated_interactions is None:

            aggregated_interactions = (
                get_aggregated_user_interactions(
                    user
                )
            )

        if aggregated_interactions:

            preference_score = (
                get_user_preference_score(
                    candidate_product=
                        candidate_product,

                    user=user,

                    aggregated_interactions=
                        aggregated_interactions
                )
            )

            if preference_score >= 0.20:

                reasons.append(
                    "Matches your previous product interactions"
                )

            # ------------------------------------------------
            # Find strongest previous interaction
            # ------------------------------------------------

            strongest_interaction = None
            strongest_weighted_similarity = 0.0

            for data in (
                aggregated_interactions.values()
            ):

                interacted_product = (
                    data["product"]
                )

                if not interacted_product:
                    continue

                similarity = (
                    calculate_content_score(
                        interacted_product,
                        candidate_product
                    )
                )

                weighted_similarity = (
                    similarity
                    *
                    data["total_weight"]
                )

                if (
                    weighted_similarity
                    >
                    strongest_weighted_similarity
                ):

                    strongest_weighted_similarity = (
                        weighted_similarity
                    )

                    strongest_interaction = (
                        data
                    )

            if strongest_interaction:

                interaction_counts = (
                    strongest_interaction[
                        "interaction_counts"
                    ]
                )

                if (
                    interaction_counts.get(
                        "purchase",
                        0
                    )
                    > 0
                ):

                    reasons.append(
                        "Related to products you purchased"
                    )

                elif (
                    interaction_counts.get(
                        "cart",
                        0
                    )
                    > 0
                ):

                    reasons.append(
                        "Related to products you added to cart"
                    )

                elif (
                    interaction_counts.get(
                        "wishlist",
                        0
                    )
                    > 0
                ):

                    reasons.append(
                        "Related to products you wishlisted"
                    )

                elif (
                    interaction_counts.get(
                        "view",
                        0
                    )
                    > 0
                ):

                    reasons.append(
                        "Related to products you viewed"
                    )

        # ----------------------------------------------------
        # NEW USER PROFILE EXPLAINABILITY
        # ----------------------------------------------------

        if user_profile is None:

            user_profile = (
                get_user_preference_profile(
                    user
                )
            )

        if user_profile and not user_profile.get(
            "is_cold_start",
            True
        ):

            # -----------------------------------------------
            # Preferred category
            # -----------------------------------------------

            category_affinity = (
                user_profile.get(
                    "category_affinity",
                    []
                )
            )

            candidate_category_id = (
                getattr(
                    candidate_product,
                    "category_id",
                    None
                )
            )

            for category_data in category_affinity:

                if (
                    category_data.get(
                        "category_id"
                    )
                    ==
                    candidate_category_id
                    and
                    category_data.get(
                        "score",
                        0
                    )
                    >= 0.40
                ):

                    reasons.append(
                        "Matches your preferred category"
                    )

                    break

            # -----------------------------------------------
            # Preferred brand
            # -----------------------------------------------

            brand_affinity = (
                user_profile.get(
                    "brand_affinity",
                    []
                )
            )

            candidate_brand = (
                getattr(
                    candidate_product,
                    "brand",
                    ""
                )
                or ""
            ).strip().lower()

            for brand_data in brand_affinity:

                preferred_brand = (
                    brand_data.get(
                        "brand",
                        ""
                    )
                    or ""
                ).strip().lower()

                if (
                    candidate_brand
                    and
                    candidate_brand == preferred_brand
                    and
                    brand_data.get(
                        "score",
                        0
                    )
                    >= 0.40
                ):

                    reasons.append(
                        "Matches a brand you frequently interact with"
                    )

                    break

            # -----------------------------------------------
            # Preferred price range
            # -----------------------------------------------

            price_preference = (
                user_profile.get(
                    "price_preference",
                    {}
                )
            )

            average_price = (
                price_preference.get(
                    "average"
                )
            )

            candidate_price = (
                candidate_product.discount_price
                if candidate_product.discount_price
                is not None
                else candidate_product.price
            )

            if (
                average_price is not None
                and candidate_price is not None
            ):

                try:

                    candidate_price_float = float(
                        candidate_price
                    )

                    average_price_float = float(
                        average_price
                    )

                    denominator = (
                        candidate_price_float
                        +
                        average_price_float
                    ) / 2

                    if denominator > 0:

                        profile_price_similarity = (
                            1
                            -
                            abs(
                                candidate_price_float
                                -
                                average_price_float
                            )
                            /
                            denominator
                        )

                        profile_price_similarity = max(
                            0.0,
                            min(
                                1.0,
                                profile_price_similarity
                            )
                        )

                        if (
                            profile_price_similarity
                            >= 0.70
                        ):

                            reasons.append(
                                "Price is close to your preferred range"
                            )

                except (
                    TypeError,
                    ValueError,
                    ZeroDivisionError,
                ):

                    pass

    # ========================================================
    # FALLBACK REASON
    # ========================================================

    if not reasons:

        reasons.append(
            "Recommended based on product similarity"
        )

    # Keep response concise.
    reasons = reasons[:4]

    # ========================================================
    # RETURN EXPLANATION
    # ========================================================

    return {
        "reasons":
            reasons,

        "signals": {

            "category_similarity":
                round(
                    category_score,
                    4
                ),

            "brand_similarity":
                round(
                    brand_score,
                    4
                ),

            "price_similarity":
                round(
                    price_score,
                    4
                ),

            "text_similarity":
                round(
                    text_score,
                    4
                ),
        },
    }
# ============================================================
# TRENDING PRODUCTS
# ============================================================

def get_trending_products(
    exclude_product_ids=None,
    limit=5
):
    """
    Return trending products based on
    weighted interactions.
    """

    if exclude_product_ids is None:

        exclude_product_ids = set()

    products = list(
        Product.objects
        .filter(
            is_active=True,
            stock__gt=0
        )
        .exclude(
            id__in=exclude_product_ids
        )
        .select_related(
            "category"
        )
    )

    trending_products = []

    for product in products:

        interactions = (
            UserProductInteraction.objects
            .filter(
                product=product
            )
            .values(
                "interaction_type"
            )
            .annotate(
                total=Count("id")
            )
        )

        trending_score = 0.0

        for interaction in interactions:

            interaction_type = (
                interaction[
                    "interaction_type"
                ]
            )

            count = (
                interaction[
                    "total"
                ]
            )

            weight = (
                INTERACTION_WEIGHTS.get(
                    interaction_type,
                    0.0
                )
            )

            trending_score += (
                count * weight
            )

        if trending_score <= 0:
            continue

        trending_products.append(
            {
                "product":
                    product,

                "score":
                    round(
                        trending_score,
                        4
                    ),
            }
        )

    trending_products.sort(
        key=lambda item:
            item["score"],
        reverse=True
    )

    return trending_products[
        :limit
    ]


# ============================================================
# CANDIDATE FILTERING
# ============================================================

def get_relevant_candidates(
    target_product,
    user=None,
    max_candidates=100,
    interaction_types=None
):
    """
    Candidate Filtering Layer.

    Priority:

        1. Same category
        2. Same brand
        3. Similar price
        4. Remaining products

    interaction_types controls which user
    interaction products are excluded.
    """

    excluded_product_ids = {
        target_product.id
    }

    # ========================================================
    # USER EXCLUSIONS
    # ========================================================

    if (
        user
        and user.is_authenticated
    ):

        excluded_product_ids.update(
            get_excluded_product_ids(
                user=user,
                interaction_types=
                    interaction_types
            )
        )

    # ========================================================
    # BASE QUERYSET
    # ========================================================

    base_queryset = (
        Product.objects
        .filter(
            stock__gt=0,
            is_active=True
        )
        .exclude(
            id__in=excluded_product_ids
        )
        .select_related(
            "category"
        )
    )

    candidate_map = {}

    # ========================================================
    # SAME CATEGORY
    # ========================================================

    if target_product.category_id:

        category_candidates = (
            base_queryset
            .filter(
                category_id=
                    target_product.category_id
            )
            .order_by(
                "-created_at"
            )[
                :max_candidates
            ]
        )

        for product in category_candidates:

            candidate_map[
                product.id
            ] = product

    # ========================================================
    # SAME BRAND
    # ========================================================

    if target_product.brand:

        brand_candidates = (
            base_queryset
            .filter(
                brand__iexact=
                    target_product.brand
            )
            .order_by(
                "-created_at"
            )[
                :max_candidates
            ]
        )

        for product in brand_candidates:

            candidate_map[
                product.id
            ] = product

    # ========================================================
    # SIMILAR PRICE
    # ========================================================

    target_price = get_product_price(
        target_product
    )

    if target_price > 0:

        lower_price = (
            target_price
            *
            Decimal("0.70")
        )

        upper_price = (
            target_price
            *
            Decimal("1.30")
        )

        price_candidates = (
            base_queryset
            .filter(
                price__gte=lower_price,
                price__lte=upper_price
            )
            .order_by(
                "-created_at"
            )[
                :max_candidates
            ]
        )

        for product in price_candidates:

            candidate_map[
                product.id
            ] = product

    # ========================================================
    # REMAINING CANDIDATES
    # ========================================================

    candidates = list(
        candidate_map.values()
    )

    if len(candidates) < max_candidates:

        remaining_candidates = (
            base_queryset
            .exclude(
                id__in=candidate_map.keys()
            )
            .order_by(
                "-created_at"
            )[
                :
                max_candidates
                -
                len(candidates)
            ]
        )

        candidates.extend(
            remaining_candidates
        )

    return candidates[
        :max_candidates
    ]


# ============================================================
# SCORE CANDIDATES
# ============================================================

def score_candidate_products(
    target_product,
    candidates,
    user=None,
    aggregated_interactions=None,
    user_profile=None
):
    """
    Score and rank candidate products.

    user_profile is passed into every scoring call
    so the profile is NOT recalculated for every candidate.
    """

    scored_products = []

    for candidate in candidates:

        score = (
            calculate_personalized_score(
                target_product=
                    target_product,

                candidate_product=
                    candidate,

                user=user,

                aggregated_interactions=
                    aggregated_interactions,

                user_profile=
                    user_profile
            )
        )

        if score <= 0:
            continue

        scored_products.append(
            {
                "product":
                    candidate,

                "score":
                    score,
            }
        )

    scored_products.sort(
        key=lambda item:
            item["score"],
        reverse=True
    )

    return scored_products


# ============================================================
# MAIN RECOMMENDATION FUNCTION
# ============================================================

def get_recommendations(
    product_id,
    user=None,
    limit=5
):
    """
    Main recommendation pipeline.

    Flow:

        Cache
          ↓
        Target Product
          ↓
        User Profile
          ↓
        Strict Candidates
          ↓
        Personalized Scoring
          ↓
        Relaxed Fallback
          ↓
        Trending Fallback
          ↓
        Cache
    """

    # ========================================================
    # CACHE KEY
    # ========================================================

    cache_key = get_recommendation_cache_key(
        product_id=product_id,
        user=user,
        limit=limit
    )

    # ========================================================
    # CACHE CHECK
    # ========================================================

    cached_recommendations = cache.get(
        cache_key
    )

    if cached_recommendations is not None:

        return cached_recommendations

    # ========================================================
    # TARGET PRODUCT
    # ========================================================

    try:

        target_product = (
            Product.objects
            .select_related(
                "category"
            )
            .get(
                id=product_id,
                is_active=True
            )
        )

    except Product.DoesNotExist:

        return []

    # ========================================================
    # INTERACTION AGGREGATION
    # ========================================================

    aggregated_interactions = {}

    if (
        user
        and user.is_authenticated
    ):

        aggregated_interactions = (
            get_aggregated_user_interactions(
                user
            )
        )

    # ========================================================
    # USER PREFERENCE PROFILE
    # ========================================================

    user_profile = None

    if (
        user
        and user.is_authenticated
    ):

        user_profile = (
            get_user_preference_profile(
                user
            )
        )

    # ========================================================
    # LEVEL 1: STRICT CANDIDATES
    # ========================================================

    candidates = (
        get_relevant_candidates(
            target_product=
                target_product,

            user=user,

            max_candidates=100,

            interaction_types=
                EXCLUDED_INTERACTION_TYPES
        )
    )

    # ========================================================
    # LEVEL 1: SCORE
    # ========================================================

    scored_products = (
        score_candidate_products(
            target_product=
                target_product,

            candidates=
                candidates,

            user=user,

            aggregated_interactions=
                aggregated_interactions,

            user_profile=
                user_profile
        )
    )

    recommendations = (
        scored_products[:limit]
    )

    # ========================================================
    # LEVEL 2: RELAXED FALLBACK
    # ========================================================

    if len(recommendations) < limit:

        already_recommended_ids = {
            item["product"].id
            for item in recommendations
        }

        already_recommended_ids.add(
            target_product.id
        )

        relaxed_candidates = (
            get_relevant_candidates(
                target_product=
                    target_product,

                user=user,

                max_candidates=100,

                interaction_types=
                    RELAXED_EXCLUDED_INTERACTION_TYPES
            )
        )

        # ----------------------------------------------------
        # Remove duplicates
        # ----------------------------------------------------

        relaxed_candidates = [
            product
            for product in relaxed_candidates
            if product.id
            not in already_recommended_ids
        ]

        relaxed_scored_products = (
            score_candidate_products(
                target_product=
                    target_product,

                candidates=
                    relaxed_candidates,

                user=user,

                aggregated_interactions=
                    aggregated_interactions,

                user_profile=
                    user_profile
            )
        )

        for item in relaxed_scored_products:

            product_id_value = (
                item["product"].id
            )

            if (
                product_id_value
                in already_recommended_ids
            ):
                continue

            recommendations.append(
                item
            )

            already_recommended_ids.add(
                product_id_value
            )

            if len(recommendations) >= limit:
                break

    # ========================================================
    # LEVEL 3: TRENDING FALLBACK
    # ========================================================

    if len(recommendations) < limit:

        already_recommended_ids = {
            item["product"].id
            for item in recommendations
        }

        already_recommended_ids.add(
            target_product.id
        )

        # Purchased products remain excluded
        # even during trending fallback.

        if (
            user
            and user.is_authenticated
        ):

            already_recommended_ids.update(
                get_excluded_product_ids(
                    user=user,
                    interaction_types=
                        RELAXED_EXCLUDED_INTERACTION_TYPES
                )
            )

        remaining_limit = (
            limit
            -
            len(recommendations)
        )

        trending_products = (
            get_trending_products(
                exclude_product_ids=
                    already_recommended_ids,

                limit=
                    remaining_limit
            )
        )

        for item in trending_products:

            recommended_product_id = (
                item["product"].id
            )

            if (
                recommended_product_id
                in
                already_recommended_ids
            ):
                continue

            recommendations.append(
                item
            )

            already_recommended_ids.add(
                recommended_product_id
            )

            if len(recommendations) >= limit:
                break

    # ========================================================
    # CACHE FINAL RESULT
    # ========================================================

    cache.set(
        cache_key,
        recommendations,
        RECOMMENDATION_CACHE_TIMEOUT
    )

    # ========================================================
    # RETURN
    # ========================================================

    return recommendations[
        :limit
    ]


# ============================================================
# CACHE INVALIDATION
# ============================================================

def invalidate_user_recommendation_cache(
    user
):
    """
    Invalidate recommendation caches for a
    specific authenticated user.

    Current LocMemCache implementation removes
    caches for products in the user's interaction
    history.
    """

    if (
        not user
        or not user.is_authenticated
    ):
        return

    product_ids = (
        UserProductInteraction.objects
        .filter(
            user=user
        )
        .values_list(
            "product_id",
            flat=True
        )
        .distinct()
    )

    for product_id in product_ids:

        # Delete default limit cache
        cache.delete(
            get_recommendation_cache_key(
                product_id=
                    product_id,

                user=user,

                limit=5
            )
        )

        # Backward compatibility with
        # previous cache-key format.
        old_cache_key = (
            f"{CACHE_KEY_PREFIX}:"
            f"user:{user.id}:"
            f"product:{product_id}"
        )

        cache.delete(
            old_cache_key
        )


# ============================================================
# GUEST CACHE INVALIDATION
# ============================================================

def invalidate_product_recommendation_cache(
    product_id
):
    """
    Invalidate guest recommendation cache
    for a specific product.
    """

    cache.delete(
        get_recommendation_cache_key(
            product_id=
                product_id,

            user=None,

            limit=5
        )
    )

    # Backward compatibility
    old_cache_key = (
        f"{CACHE_KEY_PREFIX}:"
        f"guest:"
        f"product:{product_id}"
    )

    cache.delete(
        old_cache_key
    )