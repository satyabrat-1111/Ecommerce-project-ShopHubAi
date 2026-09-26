from collections import defaultdict
from decimal import Decimal
from math import exp

from django.utils import timezone

from recommendations.models import UserProductInteraction


# ============================================================
# USER PROFILE CONFIGURATION
# ============================================================

INTERACTION_WEIGHTS = {
    "view": 1.0,
    "wishlist": 3.0,
    "cart": 4.0,
    "purchase": 5.0,
}

RECENCY_DECAY_DAYS = 30.0

MAX_INTERACTIONS = 200

TOP_CATEGORIES = 5
TOP_BRANDS = 5
TOP_PRODUCTS = 10


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def calculate_recency_score(created_at):
    """
    Gives higher importance to recent interactions.

    Recent interaction  -> higher score
    Older interaction   -> lower score
    """

    if not created_at:
        return 1.0

    now = timezone.now()

    age_seconds = max(
        0,
        (now - created_at).total_seconds()
    )

    age_days = age_seconds / 86400

    return exp(
        -age_days / RECENCY_DECAY_DAYS
    )


def normalize_scores(score_dict):
    """
    Converts raw scores into values between 0 and 1.
    """

    if not score_dict:
        return {}

    maximum = max(score_dict.values())

    if maximum <= 0:
        return {
            key: 0.0
            for key in score_dict
        }

    return {
        key: round(value / maximum, 4)
        for key, value in score_dict.items()
    }


def get_intent_level(interaction_strength):
    """
    Determines the user's current behavioral intent.

    This is rule-based behavioral intelligence,
    not a machine-learning prediction.
    """

    purchase_score = interaction_strength.get(
        "purchase",
        0.0
    )

    cart_score = interaction_strength.get(
        "cart",
        0.0
    )

    wishlist_score = interaction_strength.get(
        "wishlist",
        0.0
    )

    view_score = interaction_strength.get(
        "view",
        0.0
    )

    if purchase_score > 0:
        return "high"

    if cart_score > 0:
        return "high"

    if wishlist_score > 0:
        return "medium"

    if view_score > 0:
        return "exploration"

    return "unknown"


def get_price_range_label(min_price, max_price):
    """
    Creates a human-readable price preference label.
    """

    if min_price is None or max_price is None:
        return "unknown"

    if max_price <= 1000:
        return "budget"

    if max_price <= 10000:
        return "mid_range"

    if max_price <= 50000:
        return "premium"

    return "high_value"


# ============================================================
# MAIN USER PROFILE FUNCTION
# ============================================================

def get_user_preference_profile(
    user,
    max_interactions=MAX_INTERACTIONS,
):
    """
    Builds a behavioral preference profile for a user.

    Profile signals:

    1. Category affinity
    2. Brand affinity
    3. Price preference
    4. Interaction intensity
    5. Recency
    6. Preferred products
    7. Behavioral intent
    """

    # --------------------------------------------------------
    # BASIC VALIDATION
    # --------------------------------------------------------

    if not user or not getattr(
        user,
        "is_authenticated",
        False,
    ):
        return {
            "is_authenticated": False,
            "is_cold_start": True,
            "interaction_count": 0,
            "category_affinity": [],
            "brand_affinity": [],
            "price_preference": {
                "min": None,
                "max": None,
                "average": None,
                "range_label": "unknown",
            },
            "interaction_strength": {
                "view": 0.0,
                "wishlist": 0.0,
                "cart": 0.0,
                "purchase": 0.0,
            },
            "intent": "unknown",
            "recent_product_ids": [],
            "preferred_product_ids": [],
            "preferred_category_ids": [],
            "preferred_brands": [],
        }

    # --------------------------------------------------------
    # FETCH USER INTERACTIONS
    # --------------------------------------------------------

    interactions = (
        UserProductInteraction.objects
        .filter(user=user)
        .select_related(
            "product",
            "product__category",
        )
        .order_by("-created_at")[
            :max_interactions
        ]
    )

    interactions = list(interactions)

    if not interactions:
        return {
            "is_authenticated": True,
            "is_cold_start": True,
            "interaction_count": 0,
            "category_affinity": [],
            "brand_affinity": [],
            "price_preference": {
                "min": None,
                "max": None,
                "average": None,
                "range_label": "unknown",
            },
            "interaction_strength": {
                "view": 0.0,
                "wishlist": 0.0,
                "cart": 0.0,
                "purchase": 0.0,
            },
            "intent": "unknown",
            "recent_product_ids": [],
            "preferred_product_ids": [],
            "preferred_category_ids": [],
            "preferred_brands": [],
        }

    # --------------------------------------------------------
    # RAW PROFILE STORAGE
    # --------------------------------------------------------

    category_scores = defaultdict(float)
    brand_scores = defaultdict(float)
    product_scores = defaultdict(float)

    interaction_strength = {
        "view": 0.0,
        "wishlist": 0.0,
        "cart": 0.0,
        "purchase": 0.0,
    }

    weighted_prices = []

    recent_product_ids = []

    # --------------------------------------------------------
    # PROCESS EACH INTERACTION
    # --------------------------------------------------------

    for interaction in interactions:

        product = interaction.product

        if not product:
            continue

        interaction_type = (
            interaction.interaction_type
        )

        base_weight = INTERACTION_WEIGHTS.get(
            interaction_type,
            1.0,
        )

        recency_score = calculate_recency_score(
            interaction.created_at
        )

        signal = (
            base_weight *
            recency_score
        )

        # --------------------------------------------
        # Interaction strength
        # --------------------------------------------

        if interaction_type in interaction_strength:
            interaction_strength[
                interaction_type
            ] += signal

        # --------------------------------------------
        # Category affinity
        # --------------------------------------------

        if product.category_id:
            category_scores[
                product.category_id
            ] += signal

        # --------------------------------------------
        # Brand affinity
        # --------------------------------------------

        if product.brand:
            brand_scores[
                product.brand
            ] += signal

        # --------------------------------------------
        # Product preference
        # --------------------------------------------

        product_scores[
            product.id
        ] += signal

        # --------------------------------------------
        # Price preference
        # --------------------------------------------

        price = (
            product.discount_price
            if product.discount_price is not None
            else product.price
        )

        if price is not None:
            weighted_prices.append(
                (
                    Decimal(str(price)),
                    signal,
                )
            )

        # --------------------------------------------
        # Recent products
        # --------------------------------------------

        if product.id not in recent_product_ids:
            recent_product_ids.append(
                product.id
            )

    # ========================================================
    # NORMALIZE CATEGORY / BRAND / PRODUCT SCORES
    # ========================================================

    normalized_category_scores = normalize_scores(
        category_scores
    )

    normalized_brand_scores = normalize_scores(
        brand_scores
    )

    normalized_product_scores = normalize_scores(
        product_scores
    )

    # ========================================================
    # CATEGORY AFFINITY
    # ========================================================

    category_affinity = []

    category_objects = {}

    for interaction in interactions:

        product = interaction.product

        if (
            product
            and product.category_id
            and product.category_id
            not in category_objects
        ):
            category_objects[
                product.category_id
            ] = product.category

    for category_id, score in sorted(
        normalized_category_scores.items(),
        key=lambda item: item[1],
        reverse=True,
    )[:TOP_CATEGORIES]:

        category = category_objects.get(
            category_id
        )

        category_affinity.append(
            {
                "category_id": category_id,
                "category_name": (
                    category.name
                    if category
                    else None
                ),
                "score": score,
            }
        )

    # ========================================================
    # BRAND AFFINITY
    # ========================================================

    brand_affinity = []

    for brand, score in sorted(
        normalized_brand_scores.items(),
        key=lambda item: item[1],
        reverse=True,
    )[:TOP_BRANDS]:

        brand_affinity.append(
            {
                "brand": brand,
                "score": score,
            }
        )

    # ========================================================
    # PREFERRED PRODUCTS
    # ========================================================

    preferred_product_ids = [
        product_id
        for product_id, score in sorted(
            normalized_product_scores.items(),
            key=lambda item: item[1],
            reverse=True,
        )[:TOP_PRODUCTS]
    ]

    # ========================================================
    # PREFERRED CATEGORY IDS
    # ========================================================

    preferred_category_ids = [
        item["category_id"]
        for item in category_affinity
    ]

    # ========================================================
    # PREFERRED BRANDS
    # ========================================================

    preferred_brands = [
        item["brand"]
        for item in brand_affinity
    ]

    # ========================================================
    # PRICE PREFERENCE
    # ========================================================

    price_min = None
    price_max = None
    weighted_average = None

    if weighted_prices:

        prices = [
            price
            for price, signal
            in weighted_prices
        ]

        price_min = min(prices)
        price_max = max(prices)

        total_weight = sum(
            signal
            for price, signal
            in weighted_prices
        )

        if total_weight > 0:

            weighted_sum = sum(
                price * Decimal(str(signal))
                for price, signal
                in weighted_prices
            )

            weighted_average = (
                weighted_sum
                / Decimal(str(total_weight))
            )

    price_preference = {
        "min": (
            float(price_min)
            if price_min is not None
            else None
        ),
        "max": (
            float(price_max)
            if price_max is not None
            else None
        ),
        "average": (
            round(float(weighted_average), 2)
            if weighted_average is not None
            else None
        ),
        "range_label": get_price_range_label(
            float(price_min)
            if price_min is not None
            else None,
            float(price_max)
            if price_max is not None
            else None,
        ),
    }

    # ========================================================
    # ROUND INTERACTION STRENGTH
    # ========================================================

    interaction_strength = {
        key: round(value, 4)
        for key, value
        in interaction_strength.items()
    }

    # ========================================================
    # USER INTENT
    # ========================================================

    intent = get_intent_level(
        interaction_strength
    )

    # ========================================================
    # FINAL PROFILE
    # ========================================================

    return {
        "is_authenticated": True,

        "is_cold_start": False,

        "interaction_count": len(
            interactions
        ),

        "category_affinity": category_affinity,

        "brand_affinity": brand_affinity,

        "price_preference": price_preference,

        "interaction_strength": interaction_strength,

        "intent": intent,

        "recent_product_ids": recent_product_ids[:10],

        "preferred_product_ids": preferred_product_ids,

        "preferred_category_ids": preferred_category_ids,

        "preferred_brands": preferred_brands,
    }