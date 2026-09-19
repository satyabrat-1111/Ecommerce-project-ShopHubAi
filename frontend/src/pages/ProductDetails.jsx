import {
    useEffect,
    useState,
} from "react";

import {
    useNavigate,
    useParams,
} from "react-router-dom";

import { addToCart } from "../services/cartApi";

import {
    trackProductInteraction,
    trackRecommendationEvent,
} from "../services/recommendationApi";


const API_BASE_URL =
    "http://localhost:8000/api";


function ProductDetails() {

    const { id } = useParams();
    const navigate = useNavigate();


    // =====================================================
    // STATE
    // =====================================================

    const [product, setProduct] =
        useState(null);

    const [recommendedProducts, setRecommendedProducts] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [recommendationLoading, setRecommendationLoading] =
        useState(false);

    const [error, setError] =
        useState("");

    const [quantity, setQuantity] =
        useState(1);

    const [addingToCart, setAddingToCart] =
        useState(false);

    const [cartMessage, setCartMessage] =
        useState("");

    const [imageLoaded, setImageLoaded] =
        useState(false);

    const [hoveredRecommendation, setHoveredRecommendation] =
        useState(null);


    // =====================================================
    // VALID PRODUCT ID
    // =====================================================

    const isValidId =
        id &&
        id !== "undefined" &&
        id !== "null";


    // =====================================================
    // LOAD PRODUCT DETAILS
    // =====================================================

    useEffect(() => {

        if (!isValidId) {

            console.warn(
                "Invalid product ID:",
                id
            );

            setLoading(false);
            setError("Invalid product ID.");

            return;
        }


        const loadProduct = async () => {

            try {

                setLoading(true);
                setError("");
                setCartMessage("");
                setImageLoaded(false);


                const response =
                    await fetch(
                        `${API_BASE_URL}/products/${id}/`
                    );


                if (!response.ok) {

                    throw new Error(
                        "Product not found."
                    );
                }


                const data =
                    await response.json();


                console.log(
                    "Product Details:",
                    data
                );


                setProduct(data);

                setQuantity(1);


                // =================================================
                // TRACK PRODUCT VIEW
                // =================================================

                const token =
                    localStorage.getItem(
                        "access_token"
                    );


                if (
                    token &&
                    data.id
                ) {

                    /*
                     * React StrictMode/development can execute
                     * effects more than once.
                     *
                     * Session guard prevents unnecessary duplicate
                     * tracking requests for the same product.
                     */

                    const trackingKey =
                        `product_view_tracked_${data.id}`;


                    const alreadyTracked =
                        sessionStorage.getItem(
                            trackingKey
                        );


                    if (!alreadyTracked) {

                        try {

                            await trackProductInteraction(
                                data.id,
                                "view"
                            );


                            sessionStorage.setItem(
                                trackingKey,
                                "true"
                            );


                            console.log(
                                "Product view tracked:",
                                data.id
                            );

                        } catch (trackingError) {

                            /*
                             * Tracking failure must NEVER
                             * break Product Details.
                             */

                            console.warn(
                                "Product interaction tracking failed:",
                                trackingError
                            );
                        }

                    } else {

                        console.log(
                            "Product view tracking skipped - already tracked in this session:",
                            data.id
                        );
                    }

                } else {

                    console.log(
                        "Product view tracking skipped - user not authenticated."
                    );
                }


            } catch (error) {

                console.error(
                    "Product Details Error:",
                    error
                );


                setError(
                    error.message ||
                    "Unable to load product."
                );

            } finally {

                setLoading(false);
            }
        };


        loadProduct();

    }, [id, isValidId]);


    // =====================================================
    // LOAD AI RECOMMENDATIONS
    // =====================================================

    useEffect(() => {

        if (!isValidId) {

            setRecommendedProducts([]);

            return;
        }


        const loadRecommendations =
            async () => {

                try {

                    setRecommendationLoading(
                        true
                    );


                    const response =
                        await fetch(
                            `${API_BASE_URL}/recommendations/product/${id}/`
                        );


                    if (!response.ok) {

                        console.warn(
                            "Recommendation API unavailable:",
                            response.status
                        );


                        setRecommendedProducts(
                            []
                        );

                        return;
                    }


                    const data =
                        await response.json();


                    console.log(
                        "Recommendation API Response:",
                        data
                    );


                    let recommendations =
                        [];


                    // -------------------------------------------------
                    // RESPONSE FORMAT 1
                    // {
                    //   recommendations: [...]
                    // }
                    // -------------------------------------------------

                    if (
                        data &&
                        Array.isArray(
                            data.recommendations
                        )
                    ) {

                        recommendations =
                            data.recommendations;

                    }


                    // -------------------------------------------------
                    // RESPONSE FORMAT 2
                    // [...]
                    // -------------------------------------------------

                    else if (
                        Array.isArray(data)
                    ) {

                        recommendations =
                            data;

                    }


                    // -------------------------------------------------
                    // RESPONSE FORMAT 3
                    // {
                    //   results: [...]
                    // }
                    // -------------------------------------------------

                    else if (
                        data &&
                        Array.isArray(
                            data.results
                        )
                    ) {

                        recommendations =
                            data.results;
                    }


                    // =================================================
                    // NORMALIZE RECOMMENDATIONS
                    // =================================================

                    const normalizedRecommendations =
                        recommendations
                            .map((item) => {

                                if (!item) {
                                    return null;
                                }


                                // -------------------------------------
                                // Direct Product object
                                // -------------------------------------

                                if (
                                    item.id !== undefined &&
                                    item.id !== null
                                ) {

                                    return {
                                        ...item,

                                        recommendationScore:
                                            item.recommendation_score ??
                                            item.recommendationScore ??
                                            item.score ??
                                            null,
                                    };
                                }


                                // -------------------------------------
                                // Nested Product object
                                // -------------------------------------

                                if (
                                    item.product &&
                                    item.product.id !== undefined &&
                                    item.product.id !== null
                                ) {

                                    return {
                                        ...item.product,

                                        recommendationScore:
                                            item.recommendation_score ??
                                            item.recommendationScore ??
                                            item.score ??
                                            null,
                                    };
                                }


                                console.warn(
                                    "Invalid recommendation item:",
                                    item
                                );


                                return null;

                            })
                            .filter(Boolean);


                    console.log(
                        "Normalized Recommendations:",
                        normalizedRecommendations
                    );


                    setRecommendedProducts(
                        normalizedRecommendations
                    );


                    // =================================================
                    // TRACK RECOMMENDATION IMPRESSIONS
                    // =================================================

                    /*
                     * Each recommendation displayed to the user
                     * is considered an "impression".
                     *
                     * source product:
                     *     currently opened product
                     *
                     * recommended product:
                     *     product shown in recommendation card
                     *
                     * SessionStorage prevents duplicate
                     * impressions caused by React StrictMode
                     * or repeated renders in the same session.
                     */

                    if (
                        data?.product_id &&
                        normalizedRecommendations.length > 0
                    ) {

                        const sourceProductId =
                            Number(
                                data.product_id
                            );


                        normalizedRecommendations.forEach(
                            (recommendedProduct) => {

                                const recommendedProductId =
                                    Number(
                                        recommendedProduct.id
                                    );


                                if (
                                    !Number.isInteger(
                                        sourceProductId
                                    ) ||
                                    sourceProductId <= 0
                                ) {

                                    console.warn(
                                        "Invalid source product ID for recommendation impression:",
                                        sourceProductId
                                    );

                                    return;
                                }


                                if (
                                    !Number.isInteger(
                                        recommendedProductId
                                    ) ||
                                    recommendedProductId <= 0
                                ) {

                                    console.warn(
                                        "Invalid recommended product ID for recommendation impression:",
                                        recommendedProduct.id
                                    );

                                    return;
                                }


                                /*
                                 * Example key:
                                 *
                                 * recommendation_impression_1_2
                                 *
                                 * Meaning:
                                 * Product 1 recommended Product 2
                                 */

                                const impressionKey =
                                    `recommendation_impression_${sourceProductId}_${recommendedProductId}`;


                                const alreadyTracked =
                                    sessionStorage.getItem(
                                        impressionKey
                                    );


                                if (
                                    alreadyTracked
                                ) {

                                    console.log(
                                        "Recommendation impression skipped - already tracked in this session:",
                                        {
                                            sourceProductId,
                                            recommendedProductId,
                                        }
                                    );

                                    return;
                                }


                                /*
                                 * Do not await this request.
                                 *
                                 * Recommendation tracking is non-critical
                                 * and must never delay the UI.
                                 */

                                trackRecommendationEvent(
                                    sourceProductId,
                                    recommendedProductId,
                                    "impression"
                                )
                                    .then(() => {

                                        /*
                                         * Mark as tracked only after
                                         * the tracking function completes.
                                         *
                                         * The API helper safely returns
                                         * null on failure.
                                         */

                                        sessionStorage.setItem(
                                            impressionKey,
                                            "true"
                                        );


                                        console.log(
                                            "Recommendation impression tracked:",
                                            {
                                                sourceProductId,
                                                recommendedProductId,
                                            }
                                        );

                                    })
                                    .catch(
                                        (
                                            impressionError
                                        ) => {

                                            console.warn(
                                                "Recommendation impression tracking failed:",
                                                impressionError
                                            );

                                        }
                                    );

                            }
                        );

                    } else {

                        console.log(
                            "Recommendation impression tracking skipped - invalid source product or no recommendations."
                        );

                    }


                } catch (error) {

                    console.warn(
                        "Recommendation Error:",
                        error
                    );


                    setRecommendedProducts(
                        []
                    );

                } finally {

                    setRecommendationLoading(
                        false
                    );
                }
            };


        loadRecommendations();

    }, [id, isValidId]);


    // =====================================================
    // ADD TO CART
    // =====================================================

    const handleAddToCart =
        async () => {

            setCartMessage("");
            setError("");


            const token =
                localStorage.getItem(
                    "access_token"
                );


            if (!token) {

                setError(
                    "Please login before adding products to cart."
                );

                return;
            }


            if (!product) {
                return;
            }


            if (
                Number(product.stock) <= 0
            ) {

                setError(
                    "This product is out of stock."
                );

                return;
            }


            if (
                quantity >
                Number(product.stock)
            ) {

                setError(
                    `Only ${product.stock} items available.`
                );

                return;
            }


            try {

                setAddingToCart(true);


                const data =
                    await addToCart(
                        product.id,
                        quantity
                    );


                console.log(
                    "Product Added To Cart:",
                    data
                );


                setCartMessage(
                    "Product added to cart successfully! 🛒"
                );


            } catch (error) {

                console.error(
                    "Add To Cart Error:",
                    error
                );


                setError(
                    error.message ||
                    "Unable to add product to cart."
                );

            } finally {

                setAddingToCart(false);
            }
        };


    // =====================================================
    // BUY NOW
    // =====================================================

    const handleBuyNow =
        async () => {

            setCartMessage("");
            setError("");


            const token =
                localStorage.getItem(
                    "access_token"
                );


            if (!token) {

                setError(
                    "Please login before buying."
                );

                return;
            }


            if (
                !product ||
                Number(product.stock) <= 0
            ) {

                setError(
                    "This product is out of stock."
                );

                return;
            }


            if (
                quantity >
                Number(product.stock)
            ) {

                setError(
                    `Only ${product.stock} items available.`
                );

                return;
            }


            try {

                setAddingToCart(true);


                await addToCart(
                    product.id,
                    quantity
                );


                navigate(
                    "/checkout"
                );


            } catch (error) {

                console.error(
                    "Buy Now Error:",
                    error
                );


                setError(
                    error.message ||
                    "Unable to continue with purchase."
                );

            } finally {

                setAddingToCart(false);
            }
        };


    // =====================================================
    // RECOMMENDATION CLICK
    // =====================================================

    const handleRecommendationClick =
        (productId) => {

            if (
                !productId ||
                productId === "undefined" ||
                productId === "null"
            ) {

                console.warn(
                    "Invalid recommendation product ID:",
                    productId
                );

                return;
            }


            const numericRecommendedProductId =
                Number(productId);


            const numericSourceProductId =
                Number(
                    product?.id || id
                );


            if (
                !Number.isInteger(
                    numericRecommendedProductId
                ) ||
                numericRecommendedProductId <= 0
            ) {

                console.warn(
                    "Invalid numeric recommendation product ID:",
                    productId
                );

                return;
            }


            if (
                !Number.isInteger(
                    numericSourceProductId
                ) ||
                numericSourceProductId <= 0
            ) {

                console.warn(
                    "Invalid source product ID:",
                    product?.id || id
                );

                return;
            }


            console.log(
                "Opening recommended product:",
                numericRecommendedProductId
            );


            // =================================================
            // TRACK RECOMMENDATION CLICK
            // =================================================

            /*
             * Click event is linked with:
             *
             * source_product
             *        ↓
             * recommended_product
             *
             * This attribution is required for
             * true recommendation CTR calculation.
             */

            trackRecommendationEvent(
                numericSourceProductId,
                numericRecommendedProductId,
                "click"
            )
                .then((data) => {

                    console.log(
                        "Recommendation click tracked:",
                        {
                            sourceProductId:
                                numericSourceProductId,

                            recommendedProductId:
                                numericRecommendedProductId,

                            data,
                        }
                    );

                })
                .catch((clickError) => {

                    /*
                     * Tracking failure must NEVER
                     * stop the user from opening
                     * the recommended product.
                     */

                    console.warn(
                        "Recommendation click tracking failed:",
                        clickError
                    );

                });


            // =================================================
            // NAVIGATION
            // =================================================

            navigate(
                `/products/${numericRecommendedProductId}`
            );
        };


    // =====================================================
    // QUANTITY HANDLERS
    // =====================================================

    const decreaseQuantity =
        () => {

            setQuantity(
                (current) =>
                    Math.max(
                        1,
                        current - 1
                    )
            );
        };


    const increaseQuantity =
        () => {

            if (!product) {
                return;
            }


            setQuantity(
                (current) =>
                    Math.min(
                        Number(product.stock),
                        current + 1
                    )
            );
        };


    // =====================================================
    // LOADING
    // =====================================================

    if (loading) {

        return (

            <div
                style={{
                    minHeight: "70vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "40px 20px",
                    background:
                        "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
                }}
            >

                <div
                    style={{
                        width: "100%",
                        maxWidth: "420px",
                        textAlign: "center",
                        padding: "45px 30px",
                        background: "#ffffff",
                        borderRadius: "20px",
                        boxShadow:
                            "0 12px 40px rgba(15, 23, 42, 0.08)",
                    }}
                >

                    <div
                        style={{
                            width: "52px",
                            height: "52px",
                            margin: "0 auto 20px",
                            borderRadius: "50%",
                            border:
                                "4px solid #e5e7eb",
                            borderTopColor:
                                "#2563eb",
                            animation:
                                "productSpin 0.9s linear infinite",
                        }}
                    />

                    <h2
                        style={{
                            margin: "0 0 8px",
                            color: "#111827",
                        }}
                    >
                        Loading product...
                    </h2>

                    <p
                        style={{
                            margin: 0,
                            color: "#6b7280",
                        }}
                    >
                        Please wait while we prepare
                        the product details.
                    </p>

                </div>


                <style>
                    {`
                        @keyframes productSpin {
                            to {
                                transform: rotate(360deg);
                            }
                        }
                    `}
                </style>

            </div>
        );
    }


    // =====================================================
    // ERROR WITHOUT PRODUCT
    // =====================================================

    if (error && !product) {

        return (

            <div
                style={{
                    minHeight: "70vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "40px 20px",
                    background: "#f8fafc",
                }}
            >

                <div
                    style={{
                        maxWidth: "500px",
                        width: "100%",
                        textAlign: "center",
                        padding: "45px 30px",
                        background: "#ffffff",
                        borderRadius: "20px",
                        boxShadow:
                            "0 12px 40px rgba(15, 23, 42, 0.08)",
                    }}
                >

                    <div
                        style={{
                            width: "70px",
                            height: "70px",
                            margin: "0 auto 20px",
                            borderRadius: "50%",
                            background: "#fee2e2",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "32px",
                        }}
                    >
                        ⚠️
                    </div>


                    <h2
                        style={{
                            margin: "0 0 10px",
                            color: "#dc2626",
                        }}
                    >
                        Product Unavailable
                    </h2>


                    <p
                        style={{
                            color: "#6b7280",
                            marginBottom: "25px",
                        }}
                    >
                        {error}
                    </p>


                    <button
                        type="button"
                        onClick={() =>
                            navigate("/products")
                        }
                        style={{
                            border: "none",
                            borderRadius: "10px",
                            padding:
                                "12px 22px",
                            background: "#111827",
                            color: "#ffffff",
                            cursor: "pointer",
                            fontWeight: "600",
                        }}
                    >
                        ← Back to Products
                    </button>

                </div>

            </div>
        );
    }


    if (!product) {
        return null;
    }


    const currentPrice =
        product.discount_price ||
        product.price;


    const hasDiscount =
        product.discount_price &&
        Number(product.discount_price) <
            Number(product.price);


    const discountPercentage =
        hasDiscount
            ? Math.round(
                (
                    (
                        Number(product.price) -
                        Number(product.discount_price)
                    ) /
                    Number(product.price)
                ) *
                100
            )
            : 0;


    const stock =
        Number(product.stock || 0);


    const isOutOfStock =
        stock <= 0;


    // =====================================================
    // MAIN UI
    // =====================================================

    return (

        <div
            style={{
                minHeight: "100vh",
                background:
                    "linear-gradient(180deg, #f8fafc 0%, #ffffff 55%)",
                padding:
                    "28px 20px 60px",
            }}
        >

            <div
                style={{
                    width: "100%",
                    maxWidth: "1250px",
                    margin: "0 auto",
                }}
            >

                {/* ================================================= */}
                {/* TOP NAVIGATION */}
                {/* ================================================= */}

                <button
                    type="button"
                    onClick={() =>
                        navigate("/products")
                    }
                    style={{
                        border: "none",
                        background: "transparent",
                        color: "#4b5563",
                        fontSize: "15px",
                        fontWeight: "600",
                        cursor: "pointer",
                        padding:
                            "8px 0",
                        marginBottom: "22px",
                    }}
                >
                    ← Continue Shopping
                </button>


                {/* ================================================= */}
                {/* PRODUCT MAIN CARD */}
                {/* ================================================= */}

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "minmax(0, 1.05fr) minmax(0, 0.95fr)",
                        gap: "45px",
                        background: "#ffffff",
                        borderRadius: "24px",
                        padding: "28px",
                        boxShadow:
                            "0 15px 50px rgba(15, 23, 42, 0.08)",
                        border:
                            "1px solid #eef2f7",
                    }}
                >

                    {/* ================================================= */}
                    {/* IMAGE SECTION */}
                    {/* ================================================= */}

                    <div>

                        <div
                            style={{
                                position: "relative",
                                minHeight: "520px",
                                borderRadius: "20px",
                                background:
                                    "linear-gradient(145deg, #f8fafc, #eef2f7)",
                                overflow: "hidden",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border:
                                    "1px solid #e5e7eb",
                            }}
                        >

                            {/* DISCOUNT BADGE */}

                            {hasDiscount && (

                                <div
                                    style={{
                                        position: "absolute",
                                        top: "18px",
                                        left: "18px",
                                        zIndex: 2,
                                        background: "#dc2626",
                                        color: "#ffffff",
                                        padding:
                                            "8px 13px",
                                        borderRadius:
                                            "999px",
                                        fontSize: "13px",
                                        fontWeight: "800",
                                        boxShadow:
                                            "0 5px 15px rgba(220, 38, 38, 0.25)",
                                    }}
                                >
                                    {discountPercentage}% OFF
                                </div>

                            )}


                            {/* STOCK BADGE */}

                            <div
                                style={{
                                    position: "absolute",
                                    top: "18px",
                                    right: "18px",
                                    zIndex: 2,
                                    padding:
                                        "8px 13px",
                                    borderRadius:
                                        "999px",
                                    fontSize: "12px",
                                    fontWeight: "800",
                                    background:
                                        isOutOfStock
                                            ? "#fee2e2"
                                            : "#dcfce7",
                                    color:
                                        isOutOfStock
                                            ? "#b91c1c"
                                            : "#15803d",
                                }}
                            >
                                {isOutOfStock
                                    ? "OUT OF STOCK"
                                    : "IN STOCK"}
                            </div>


                            {product.image ? (

                                <img
                                    src={product.image}
                                    alt={product.name}
                                    onLoad={() =>
                                        setImageLoaded(true)
                                    }
                                    style={{
                                        width: "90%",
                                        height: "90%",
                                        maxHeight: "480px",
                                        objectFit: "contain",
                                        borderRadius: "14px",
                                        opacity:
                                            imageLoaded
                                                ? 1
                                                : 0.35,
                                        transform:
                                            "scale(1)",
                                        transition:
                                            "transform 0.45s ease, opacity 0.3s ease",
                                    }}
                                    onMouseEnter={(event) => {
                                        event.currentTarget.style.transform =
                                            "scale(1.06)";
                                    }}
                                    onMouseLeave={(event) => {
                                        event.currentTarget.style.transform =
                                            "scale(1)";
                                    }}
                                />

                            ) : (

                                <div
                                    style={{
                                        textAlign: "center",
                                        color: "#9ca3af",
                                    }}
                                >

                                    <div
                                        style={{
                                            fontSize: "80px",
                                            marginBottom:
                                                "10px",
                                        }}
                                    >
                                        📦
                                    </div>

                                    <strong>
                                        No Image Available
                                    </strong>

                                </div>

                            )}

                        </div>


                        {/* IMAGE INFO */}

                        <div
                            style={{
                                display: "flex",
                                justifyContent:
                                    "center",
                                gap: "20px",
                                marginTop: "16px",
                                color: "#6b7280",
                                fontSize: "13px",
                            }}
                        >
                            <span>
                                ✓ Genuine Product
                            </span>

                            <span>
                                ✓ Secure Checkout
                            </span>

                        </div>

                    </div>


                    {/* ================================================= */}
                    {/* PRODUCT INFORMATION */}
                    {/* ================================================= */}

                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent:
                                "center",
                            padding: "10px 5px",
                        }}
                    >

                        {/* BRAND */}

                        <div
                            style={{
                                display: "inline-flex",
                                width: "fit-content",
                                alignItems: "center",
                                gap: "7px",
                                padding:
                                    "7px 12px",
                                borderRadius:
                                    "999px",
                                background: "#eff6ff",
                                color: "#2563eb",
                                fontSize: "12px",
                                fontWeight: "800",
                                letterSpacing:
                                    "0.7px",
                                textTransform:
                                    "uppercase",
                                marginBottom: "15px",
                            }}
                        >
                            <span>✦</span>
                            {product.brand ||
                                "Premium Product"}
                        </div>


                        {/* PRODUCT TITLE */}

                        <h1
                            style={{
                                fontSize:
                                    "clamp(30px, 4vw, 46px)",
                                lineHeight: "1.12",
                                color: "#111827",
                                margin:
                                    "0 0 18px",
                                letterSpacing:
                                    "-1px",
                            }}
                        >
                            {product.name}
                        </h1>


                        {/* DESCRIPTION */}

                        <p
                            style={{
                                fontSize: "15px",
                                lineHeight: "1.8",
                                color: "#6b7280",
                                margin:
                                    "0 0 22px",
                            }}
                        >
                            {product.description ||
                                "Experience quality, performance and value with this product."}
                        </p>


                        {/* DIVIDER */}

                        <div
                            style={{
                                height: "1px",
                                background:
                                    "#e5e7eb",
                                marginBottom:
                                    "20px",
                            }}
                        />


                        {/* PRICE */}

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                flexWrap: "wrap",
                                marginBottom: "15px",
                            }}
                        >

                            <span
                                style={{
                                    fontSize:
                                        "clamp(30px, 4vw, 38px)",
                                    fontWeight: "900",
                                    color: "#111827",
                                    letterSpacing:
                                        "-1px",
                                }}
                            >
                                ₹
                                {currentPrice}
                            </span>


                            {hasDiscount && (

                                <>

                                    <span
                                        style={{
                                            fontSize:
                                                "18px",
                                            color:
                                                "#9ca3af",
                                            textDecoration:
                                                "line-through",
                                        }}
                                    >
                                        ₹
                                        {product.price}
                                    </span>


                                    <span
                                        style={{
                                            padding:
                                                "5px 9px",
                                            borderRadius:
                                                "7px",
                                            background:
                                                "#fef2f2",
                                            color:
                                                "#dc2626",
                                            fontSize:
                                                "12px",
                                            fontWeight:
                                                "800",
                                        }}
                                    >
                                        Save {discountPercentage}%
                                    </span>

                                </>

                            )}

                        </div>


                        {/* STOCK INFORMATION */}

                        <div
                            style={{
                                display: "flex",
                                alignItems:
                                    "center",
                                gap: "9px",
                                marginBottom:
                                    "20px",
                                fontSize: "14px",
                            }}
                        >

                            <span
                                style={{
                                    width: "9px",
                                    height: "9px",
                                    borderRadius:
                                        "50%",
                                    background:
                                        isOutOfStock
                                            ? "#dc2626"
                                            : "#16a34a",
                                }}
                            />

                            <strong
                                style={{
                                    color:
                                        isOutOfStock
                                            ? "#dc2626"
                                            : "#15803d",
                                }}
                            >
                                {isOutOfStock
                                    ? "Out of Stock"
                                    : "In Stock"}
                            </strong>


                            {!isOutOfStock && (

                                <span
                                    style={{
                                        color:
                                            "#6b7280",
                                    }}
                                >
                                    • {stock} units
                                    available
                                </span>

                            )}

                        </div>


                        {/* QUANTITY */}

                        {!isOutOfStock && (

                            <div
                                style={{
                                    marginBottom:
                                        "22px",
                                }}
                            >

                                <div
                                    style={{
                                        fontSize:
                                            "14px",
                                        fontWeight:
                                            "700",
                                        color:
                                            "#374151",
                                        marginBottom:
                                            "9px",
                                    }}
                                >
                                    Quantity
                                </div>


                                <div
                                    style={{
                                        display:
                                            "inline-flex",
                                        alignItems:
                                            "center",
                                        border:
                                            "1px solid #d1d5db",
                                        borderRadius:
                                            "12px",
                                        overflow:
                                            "hidden",
                                        background:
                                            "#ffffff",
                                    }}
                                >

                                    <button
                                        type="button"
                                        onClick={
                                            decreaseQuantity
                                        }
                                        disabled={
                                            quantity <=
                                                1 ||
                                            addingToCart
                                        }
                                        style={{
                                            width:
                                                "45px",
                                            height:
                                                "45px",
                                            border:
                                                "none",
                                            background:
                                                "#f8fafc",
                                            color:
                                                "#111827",
                                            fontSize:
                                                "22px",
                                            cursor:
                                                quantity >
                                                    1 &&
                                                !addingToCart
                                                    ? "pointer"
                                                    : "not-allowed",
                                        }}
                                    >
                                        −
                                    </button>


                                    <div
                                        style={{
                                            minWidth:
                                                "55px",
                                            textAlign:
                                                "center",
                                            fontWeight:
                                                "800",
                                            color:
                                                "#111827",
                                        }}
                                    >
                                        {quantity}
                                    </div>


                                    <button
                                        type="button"
                                        onClick={
                                            increaseQuantity
                                        }
                                        disabled={
                                            quantity >=
                                                stock ||
                                            addingToCart
                                        }
                                        style={{
                                            width:
                                                "45px",
                                            height:
                                                "45px",
                                            border:
                                                "none",
                                            background:
                                                "#f8fafc",
                                            color:
                                                "#111827",
                                            fontSize:
                                                "22px",
                                            cursor:
                                                quantity <
                                                    stock &&
                                                !addingToCart
                                                    ? "pointer"
                                                    : "not-allowed",
                                        }}
                                    >
                                        +
                                    </button>

                                </div>

                            </div>

                        )}


                        {/* SUCCESS MESSAGE */}

                        {cartMessage && (

                            <div
                                style={{
                                    display:
                                        "flex",
                                    alignItems:
                                        "center",
                                    gap: "10px",
                                    padding:
                                        "12px 14px",
                                    marginBottom:
                                        "15px",
                                    borderRadius:
                                        "11px",
                                    background:
                                        "#ecfdf5",
                                    border:
                                        "1px solid #bbf7d0",
                                    color:
                                        "#15803d",
                                    fontSize:
                                        "14px",
                                    fontWeight:
                                        "700",
                                }}
                            >
                                <span>✓</span>
                                {cartMessage}
                            </div>

                        )}


                        {/* ERROR MESSAGE */}

                        {error && product && (

                            <div
                                style={{
                                    display:
                                        "flex",
                                    alignItems:
                                        "center",
                                    gap: "10px",
                                    padding:
                                        "12px 14px",
                                    marginBottom:
                                        "15px",
                                    borderRadius:
                                        "11px",
                                    background:
                                        "#fef2f2",
                                    border:
                                        "1px solid #fecaca",
                                    color:
                                        "#dc2626",
                                    fontSize:
                                        "14px",
                                    fontWeight:
                                        "700",
                                }}
                            >
                                <span>⚠</span>
                                {error}
                            </div>

                        )}


                        {/* ACTION BUTTONS */}

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "1fr 1fr",
                                gap: "12px",
                            }}
                        >

                            <button
                                type="button"
                                onClick={
                                    handleAddToCart
                                }
                                disabled={
                                    addingToCart ||
                                    isOutOfStock
                                }
                                style={{
                                    minHeight:
                                        "52px",
                                    border:
                                        "1px solid #2563eb",
                                    borderRadius:
                                        "12px",
                                    background:
                                        addingToCart ||
                                        isOutOfStock
                                            ? "#dbeafe"
                                            : "#ffffff",
                                    color:
                                        "#2563eb",
                                    fontWeight:
                                        "800",
                                    fontSize:
                                        "14px",
                                    cursor:
                                        addingToCart ||
                                        isOutOfStock
                                            ? "not-allowed"
                                            : "pointer",
                                    transition:
                                        "all 0.2s ease",
                                }}
                                onMouseEnter={(event) => {

                                    if (
                                        !addingToCart &&
                                        !isOutOfStock
                                    ) {

                                        event.currentTarget.style.background =
                                            "#eff6ff";

                                        event.currentTarget.style.transform =
                                            "translateY(-2px)";
                                    }
                                }}
                                onMouseLeave={(event) => {

                                    event.currentTarget.style.background =
                                        "#ffffff";

                                    event.currentTarget.style.transform =
                                        "translateY(0)";
                                }}
                            >
                                {addingToCart
                                    ? "Adding..."
                                    : "🛒 Add to Cart"}
                            </button>


                            <button
                                type="button"
                                onClick={
                                    handleBuyNow
                                }
                                disabled={
                                    addingToCart ||
                                    isOutOfStock
                                }
                                style={{
                                    minHeight:
                                        "52px",
                                    border: "none",
                                    borderRadius:
                                        "12px",
                                    background:
                                        addingToCart ||
                                        isOutOfStock
                                            ? "#9ca3af"
                                            : "#111827",
                                    color:
                                        "#ffffff",
                                    fontWeight:
                                        "800",
                                    fontSize:
                                        "14px",
                                    cursor:
                                        addingToCart ||
                                        isOutOfStock
                                            ? "not-allowed"
                                            : "pointer",
                                    boxShadow:
                                        "0 8px 20px rgba(17, 24, 39, 0.16)",
                                    transition:
                                        "all 0.2s ease",
                                }}
                                onMouseEnter={(event) => {

                                    if (
                                        !addingToCart &&
                                        !isOutOfStock
                                    ) {

                                        event.currentTarget.style.background =
                                            "#2563eb";

                                        event.currentTarget.style.transform =
                                            "translateY(-2px)";
                                    }
                                }}
                                onMouseLeave={(event) => {

                                    event.currentTarget.style.background =
                                        "#111827";

                                    event.currentTarget.style.transform =
                                        "translateY(0)";
                                }}
                            >
                                {addingToCart
                                    ? "Processing..."
                                    : "⚡ Buy Now"}
                            </button>

                        </div>


                        {/* TRUST FEATURES */}

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(3, 1fr)",
                                gap: "10px",
                                marginTop:
                                    "22px",
                            }}
                        >

                            <div
                                style={{
                                    padding:
                                        "12px 8px",
                                    textAlign:
                                        "center",
                                    background:
                                        "#f8fafc",
                                    borderRadius:
                                        "10px",
                                    fontSize:
                                        "11px",
                                    color:
                                        "#6b7280",
                                    fontWeight:
                                        "700",
                                }}
                            >
                                🔒
                                <br />
                                Secure
                            </div>


                            <div
                                style={{
                                    padding:
                                        "12px 8px",
                                    textAlign:
                                        "center",
                                    background:
                                        "#f8fafc",
                                    borderRadius:
                                        "10px",
                                    fontSize:
                                        "11px",
                                    color:
                                        "#6b7280",
                                    fontWeight:
                                        "700",
                                }}
                            >
                                🚚
                                <br />
                                Fast Delivery
                            </div>


                            <div
                                style={{
                                    padding:
                                        "12px 8px",
                                    textAlign:
                                        "center",
                                    background:
                                        "#f8fafc",
                                    borderRadius:
                                        "10px",
                                    fontSize:
                                        "11px",
                                    color:
                                        "#6b7280",
                                    fontWeight:
                                        "700",
                                }}
                            >
                                ✓
                                <br />
                                Quality
                            </div>

                        </div>

                    </div>

                </div>


                {/* ================================================= */}
                {/* AI RECOMMENDATIONS */}
                {/* ================================================= */}

                <section
                    style={{
                        marginTop: "65px",
                    }}
                >

                    {/* HEADER */}

                    <div
                        style={{
                            marginBottom:
                                "25px",
                        }}
                    >

                        <div
                            style={{
                                display:
                                    "inline-flex",
                                alignItems:
                                    "center",
                                gap: "8px",
                                padding:
                                    "7px 12px",
                                borderRadius:
                                    "999px",
                                background:
                                    "#f3e8ff",
                                color:
                                    "#7c3aed",
                                fontSize:
                                    "11px",
                                fontWeight:
                                    "900",
                                letterSpacing:
                                    "0.8px",
                            }}
                        >
                            ✨ AI POWERED
                        </div>


                        <h2
                            style={{
                                margin:
                                    "12px 0 6px",
                                fontSize:
                                    "clamp(25px, 4vw, 34px)",
                                color:
                                    "#111827",
                                letterSpacing:
                                    "-0.7px",
                            }}
                        >
                            You May Also Like
                        </h2>


                        <p
                            style={{
                                margin: 0,
                                color:
                                    "#6b7280",
                                fontSize:
                                    "14px",
                            }}
                        >
                            Smart recommendations
                            based on{" "}
                            <strong
                                style={{
                                    color:
                                        "#374151",
                                }}
                            >
                                {product.name}
                            </strong>
                        </p>

                    </div>


                    {/* ================================================= */}
                    {/* RECOMMENDATION LOADING */}
                    {/* ================================================= */}

                    {recommendationLoading && (

                        <div
                            style={{
                                display:
                                    "grid",
                                gridTemplateColumns:
                                    "repeat(auto-fit, minmax(220px, 1fr))",
                                gap: "20px",
                            }}
                        >

                            {[1, 2, 3, 4].map(
                                (item) => (

                                    <div
                                        key={item}
                                        style={{
                                            background:
                                                "#ffffff",
                                            border:
                                                "1px solid #eef2f7",
                                            borderRadius:
                                                "18px",
                                            padding:
                                                "15px",
                                            overflow:
                                                "hidden",
                                        }}
                                    >

                                        <div
                                            style={{
                                                height:
                                                    "190px",
                                                borderRadius:
                                                    "13px",
                                                background:
                                                    "#f1f5f9",
                                                marginBottom:
                                                    "15px",
                                                animation:
                                                    "productPulse 1.4s ease-in-out infinite",
                                            }}
                                        />


                                        <div
                                            style={{
                                                height:
                                                    "17px",
                                                width:
                                                    "75%",
                                                background:
                                                    "#f1f5f9",
                                                borderRadius:
                                                    "6px",
                                                marginBottom:
                                                    "10px",
                                            }}
                                        />


                                        <div
                                            style={{
                                                height:
                                                    "15px",
                                                width:
                                                    "45%",
                                                background:
                                                    "#f1f5f9",
                                                borderRadius:
                                                    "6px",
                                                marginBottom:
                                                    "15px",
                                            }}
                                        />


                                        <div
                                            style={{
                                                height:
                                                    "20px",
                                                width:
                                                    "35%",
                                                background:
                                                    "#f1f5f9",
                                                borderRadius:
                                                    "6px",
                                            }}
                                        />

                                    </div>

                                )
                            )}

                        </div>

                    )}


                    {/* ================================================= */}
                    {/* RECOMMENDATION CARDS */}
                    {/* ================================================= */}

                    {!recommendationLoading &&
                        recommendedProducts.length >
                            0 && (

                        <div
                            style={{
                                display:
                                    "grid",
                                gridTemplateColumns:
                                    "repeat(auto-fit, minmax(220px, 1fr))",
                                gap: "20px",
                            }}
                        >

                            {recommendedProducts.map(
                                (recommended) => {

                                    const score =
                                        recommended.recommendationScore;


                                    const hasScore =
                                        score !==
                                            null &&
                                        score !==
                                            undefined &&
                                        !Number.isNaN(
                                            Number(score)
                                        );


                                    return (

                                        <div
                                            key={
                                                recommended.id
                                            }
                                            onClick={() =>
                                                handleRecommendationClick(
                                                    recommended.id
                                                )
                                            }
                                            onMouseEnter={() =>
                                                setHoveredRecommendation(
                                                    recommended.id
                                                )
                                            }
                                            onMouseLeave={() =>
                                                setHoveredRecommendation(
                                                    null
                                                )
                                            }
                                            style={{
                                                position:
                                                    "relative",
                                                background:
                                                    "#ffffff",
                                                border:
                                                    "1px solid #e5e7eb",
                                                borderRadius:
                                                    "18px",
                                                padding:
                                                    "15px",
                                                cursor:
                                                    "pointer",
                                                overflow:
                                                    "hidden",
                                                transform:
                                                    hoveredRecommendation ===
                                                    recommended.id
                                                        ? "translateY(-7px)"
                                                        : "translateY(0)",
                                                boxShadow:
                                                    hoveredRecommendation ===
                                                    recommended.id
                                                        ? "0 18px 35px rgba(15, 23, 42, 0.12)"
                                                        : "0 5px 18px rgba(15, 23, 42, 0.04)",
                                                transition:
                                                    "all 0.25s ease",
                                            }}
                                        >

                                            {/* AI BADGE */}

                                            {hasScore && (

                                                <div
                                                    style={{
                                                        position:
                                                            "absolute",
                                                        top:
                                                            "25px",
                                                        right:
                                                            "25px",
                                                        zIndex: 2,
                                                        padding:
                                                            "6px 9px",
                                                        borderRadius:
                                                            "999px",
                                                        background:
                                                            "#ede9fe",
                                                        color:
                                                            "#6d28d9",
                                                        fontSize:
                                                            "11px",
                                                        fontWeight:
                                                            "900",
                                                        boxShadow:
                                                            "0 4px 12px rgba(109, 40, 217, 0.12)",
                                                    }}
                                                >
                                                    AI{" "}
                                                    {(
                                                        Number(
                                                            score
                                                        ) *
                                                        100
                                                    ).toFixed(
                                                        1
                                                    )}
                                                    %
                                                </div>

                                            )}


                                            {/* IMAGE */}

                                            <div
                                                style={{
                                                    height:
                                                        "195px",
                                                    borderRadius:
                                                        "13px",
                                                    background:
                                                        "#f8fafc",
                                                    display:
                                                        "flex",
                                                    alignItems:
                                                        "center",
                                                    justifyContent:
                                                        "center",
                                                    overflow:
                                                        "hidden",
                                                    marginBottom:
                                                        "15px",
                                                }}
                                            >

                                                {recommended.image ? (

                                                    <img
                                                        src={
                                                            recommended.image
                                                        }
                                                        alt={
                                                            recommended.name
                                                        }
                                                        style={{
                                                            width:
                                                                "100%",
                                                            height:
                                                                "100%",
                                                            objectFit:
                                                                "contain",
                                                            padding:
                                                                "10px",
                                                            transform:
                                                                hoveredRecommendation ===
                                                                recommended.id
                                                                    ? "scale(1.08)"
                                                                    : "scale(1)",
                                                            transition:
                                                                "transform 0.35s ease",
                                                        }}
                                                    />

                                                ) : (

                                                    <span
                                                        style={{
                                                            fontSize:
                                                                "65px",
                                                        }}
                                                    >
                                                        📦
                                                    </span>

                                                )}

                                            </div>


                                            {/* BRAND */}

                                            {recommended.brand && (

                                                <div
                                                    style={{
                                                        fontSize:
                                                            "11px",
                                                        color:
                                                            "#6b7280",
                                                        fontWeight:
                                                            "800",
                                                        textTransform:
                                                            "uppercase",
                                                        letterSpacing:
                                                            "0.6px",
                                                        marginBottom:
                                                            "6px",
                                                    }}
                                                >
                                                    {
                                                        recommended.brand
                                                    }
                                                </div>

                                            )}


                                            {/* NAME */}

                                            <h3
                                                style={{
                                                    margin:
                                                        "0 0 9px",
                                                    color:
                                                        "#111827",
                                                    fontSize:
                                                        "17px",
                                                    lineHeight:
                                                        "1.35",
                                                    minHeight:
                                                        "46px",
                                                    display:
                                                        "-webkit-box",
                                                    WebkitLineClamp:
                                                        2,
                                                    WebkitBoxOrient:
                                                        "vertical",
                                                    overflow:
                                                        "hidden",
                                                }}
                                            >
                                                {
                                                    recommended.name
                                                }
                                            </h3>


                                            {/* PRICE */}

                                            <div
                                                style={{
                                                    display:
                                                        "flex",
                                                    alignItems:
                                                        "center",
                                                    gap:
                                                        "8px",
                                                    marginBottom:
                                                        "12px",
                                                }}
                                            >

                                                <strong
                                                    style={{
                                                        fontSize:
                                                            "20px",
                                                        color:
                                                            "#111827",
                                                    }}
                                                >
                                                    ₹
                                                    {
                                                        recommended.discount_price ||
                                                        recommended.price ||
                                                        "N/A"
                                                    }
                                                </strong>


                                                {recommended.discount_price &&
                                                    recommended.price && (

                                                    <span
                                                        style={{
                                                            color:
                                                                "#9ca3af",
                                                            fontSize:
                                                                "12px",
                                                            textDecoration:
                                                                "line-through",
                                                        }}
                                                    >
                                                        ₹
                                                        {
                                                            recommended.price
                                                        }
                                                    </span>

                                                )}

                                            </div>


                                            {/* AI SCORE BAR */}

                                            {hasScore && (

                                                <div
                                                    style={{
                                                        marginBottom:
                                                            "13px",
                                                    }}
                                                >

                                                    <div
                                                        style={{
                                                            display:
                                                                "flex",
                                                            justifyContent:
                                                                "space-between",
                                                            fontSize:
                                                                "11px",
                                                            color:
                                                                "#6b7280",
                                                            marginBottom:
                                                                "5px",
                                                        }}
                                                    >
                                                        <span>
                                                            AI Match
                                                        </span>

                                                        <strong
                                                            style={{
                                                                color:
                                                                    "#7c3aed",
                                                            }}
                                                        >
                                                            {(
                                                                Number(
                                                                    score
                                                                ) *
                                                                100
                                                            ).toFixed(
                                                                0
                                                            )}
                                                            %
                                                        </strong>
                                                    </div>


                                                    <div
                                                        style={{
                                                            height:
                                                                "5px",
                                                            borderRadius:
                                                                "999px",
                                                            background:
                                                                "#ede9fe",
                                                            overflow:
                                                                "hidden",
                                                        }}
                                                    >

                                                        <div
                                                            style={{
                                                                width:
                                                                    `${Math.min(
                                                                        100,
                                                                        Math.max(
                                                                            0,
                                                                            Number(
                                                                                score
                                                                            ) *
                                                                            100
                                                                        )
                                                                    )}%`,
                                                                height:
                                                                    "100%",
                                                                borderRadius:
                                                                    "999px",
                                                                background:
                                                                    "#7c3aed",
                                                            }}
                                                        />

                                                    </div>

                                                </div>

                                            )}


                                            {/* VIEW BUTTON */}

                                            <div
                                                style={{
                                                    display:
                                                        "flex",
                                                    alignItems:
                                                        "center",
                                                    justifyContent:
                                                        "space-between",
                                                    paddingTop:
                                                        "12px",
                                                    borderTop:
                                                        "1px solid #f1f5f9",
                                                    color:
                                                        "#2563eb",
                                                    fontSize:
                                                        "13px",
                                                    fontWeight:
                                                        "800",
                                                }}
                                            >

                                                <span>
                                                    View Product
                                                </span>

                                                <span
                                                    style={{
                                                        fontSize:
                                                            "18px",
                                                        transform:
                                                            hoveredRecommendation ===
                                                            recommended.id
                                                                ? "translateX(4px)"
                                                                : "translateX(0)",
                                                        transition:
                                                            "transform 0.2s ease",
                                                    }}
                                                >
                                                    →
                                                </span>

                                            </div>

                                        </div>

                                    );
                                }
                            )}

                        </div>

                    )}


                    {/* ================================================= */}
                    {/* NO RECOMMENDATIONS */}
                    {/* ================================================= */}

                    {!recommendationLoading &&
                        recommendedProducts.length ===
                            0 && (

                        <div
                            style={{
                                padding:
                                    "45px 25px",
                                border:
                                    "1px solid #e5e7eb",
                                borderRadius:
                                    "18px",
                                background:
                                    "#ffffff",
                                textAlign:
                                    "center",
                            }}
                        >

                            <div
                                style={{
                                    fontSize:
                                        "45px",
                                    marginBottom:
                                        "12px",
                                }}
                            >
                                🤖
                            </div>


                            <h3
                                style={{
                                    margin:
                                        "0 0 7px",
                                    color:
                                        "#374151",
                                }}
                            >
                                No recommendations
                                available yet
                            </h3>


                            <p
                                style={{
                                    margin: 0,
                                    color:
                                        "#9ca3af",
                                    fontSize:
                                        "14px",
                                }}
                            >
                                We're still learning
                                your preferences.
                            </p>

                        </div>

                    )}

                </section>


                {/* ================================================= */}
                {/* BOTTOM CONTINUE SHOPPING */}
                {/* ================================================= */}

                <div
                    style={{
                        textAlign: "center",
                        marginTop: "55px",
                    }}
                >

                    <button
                        type="button"
                        onClick={() =>
                            navigate("/products")
                        }
                        style={{
                            border:
                                "1px solid #d1d5db",
                            background:
                                "#ffffff",
                            color:
                                "#374151",
                            padding:
                                "12px 24px",
                            borderRadius:
                                "11px",
                            fontWeight:
                                "700",
                            cursor:
                                "pointer",
                            transition:
                                "all 0.2s ease",
                        }}
                        onMouseEnter={(event) => {

                            event.currentTarget.style.background =
                                "#f8fafc";

                            event.currentTarget.style.transform =
                                "translateY(-2px)";
                        }}
                        onMouseLeave={(event) => {

                            event.currentTarget.style.background =
                                "#ffffff";

                            event.currentTarget.style.transform =
                                "translateY(0)";
                        }}
                    >
                        ← Continue Shopping
                    </button>

                </div>

            </div>


            {/* ===================================================== */}
            {/* RESPONSIVE CSS */}
            {/* ===================================================== */}

            <style>
                {`

                    @keyframes productPulse {

                        0% {
                            opacity: 0.55;
                        }

                        50% {
                            opacity: 1;
                        }

                        100% {
                            opacity: 0.55;
                        }

                    }


                    @media (max-width: 850px) {

                        .product-details-main {
                            grid-template-columns: 1fr;
                        }

                    }


                    @media (max-width: 850px) {

                        /* Main product card */

                        div[style*="minmax(0, 1.05fr)"] {
                            grid-template-columns: 1fr !important;
                        }

                    }


                    @media (max-width: 600px) {

                        /* Page spacing */

                        body {
                            overflow-x: hidden;
                        }


                        /* Product image */

                        div[style*="minHeight: 520px"] {
                            min-height: 360px !important;
                        }


                        /* Action buttons */

                        div[style*="gridTemplateColumns: 1fr 1fr"] {
                            grid-template-columns: 1fr !important;
                        }


                        /* Trust features */

                        div[style*="repeat(3, 1fr)"] {
                            grid-template-columns:
                                repeat(3, 1fr) !important;
                        }

                    }

                `}
            </style>

        </div>
    );
}


export default ProductDetails;