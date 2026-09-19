import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { addToCart } from "../services/cartApi";

import {
    getWishlist,
    addToWishlist,
    removeFromWishlist,
} from "../services/wishlistApi";

import "../styles/ProductCard.css";


function ProductCard({ product }) {

    const [isWishlisted, setIsWishlisted] = useState(false);
    const [wishlistItemId, setWishlistItemId] = useState(null);

    const [cartLoading, setCartLoading] = useState(false);
    const [wishlistLoading, setWishlistLoading] = useState(false);

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");


    // ==========================================
    // PRODUCT DATA
    // ==========================================

    const originalPrice = Number(product.price || 0);

    const discountPrice =
        product.discount_price !== null &&
        product.discount_price !== undefined &&
        product.discount_price !== ""
            ? Number(product.discount_price)
            : null;

    const hasDiscount =
        discountPrice !== null &&
        discountPrice > 0 &&
        discountPrice < originalPrice;

    const finalPrice =
        hasDiscount
            ? discountPrice
            : originalPrice;

    const discountPercentage =
        hasDiscount && originalPrice > 0
            ? Math.round(
                ((originalPrice - discountPrice) / originalPrice) * 100
            )
            : 0;

    const isInStock = Number(product.stock || 0) > 0;


    // ==========================================
    // CHECK WISHLIST
    // ==========================================

    useEffect(() => {

        const checkWishlist = async () => {

            const token =
                localStorage.getItem("access_token");

            if (!token) {
                setIsWishlisted(false);
                setWishlistItemId(null);
                return;
            }

            try {

                const data = await getWishlist();

                const items = data?.items || [];

                const wishlistItem = items.find(
                    (item) =>
                        Number(item.product) ===
                        Number(product.id)
                );

                if (wishlistItem) {

                    setIsWishlisted(true);
                    setWishlistItemId(wishlistItem.id);

                } else {

                    setIsWishlisted(false);
                    setWishlistItemId(null);

                }

            } catch (err) {

                console.error(
                    "Wishlist Check Error:",
                    err
                );

            }
        };

        checkWishlist();

    }, [product.id]);


    // ==========================================
    // ADD TO CART
    // ==========================================

    const handleAddToCart = async () => {

        const token =
            localStorage.getItem("access_token");

        if (!token) {

            setError(
                "Please login to add products to cart."
            );

            setMessage("");

            return;
        }

        if (!isInStock) {

            setError(
                "This product is currently out of stock."
            );

            setMessage("");

            return;
        }

        try {

            setCartLoading(true);

            setError("");
            setMessage("");

            await addToCart(
                product.id,
                1
            );

            setMessage(
                "✓ Added to cart successfully."
            );

        } catch (err) {

            console.error(
                "Add To Cart Error:",
                err
            );

            setError(
                err.message ||
                "Failed to add product to cart."
            );

        } finally {

            setCartLoading(false);

        }
    };


    // ==========================================
    // WISHLIST TOGGLE
    // ==========================================

    const handleWishlist = async () => {

        const token =
            localStorage.getItem("access_token");

        if (!token) {

            setError(
                "Please login to use wishlist."
            );

            setMessage("");

            return;
        }

        try {

            setWishlistLoading(true);

            setError("");
            setMessage("");


            // --------------------------------------
            // REMOVE FROM WISHLIST
            // --------------------------------------

            if (
                isWishlisted &&
                wishlistItemId
            ) {

                await removeFromWishlist(
                    wishlistItemId
                );

                setIsWishlisted(false);
                setWishlistItemId(null);

                setMessage(
                    "Removed from wishlist."
                );

                return;
            }


            // --------------------------------------
            // ADD TO WISHLIST
            // --------------------------------------

            const data =
                await addToWishlist(
                    product.id
                );

            console.log(
                "Wishlist Add Response:",
                data
            );

            setIsWishlisted(true);


            // Backend returns item_id
            if (data?.item_id) {

                setWishlistItemId(
                    data.item_id
                );

            } else {

                // Fallback: refresh wishlist

                try {

                    const wishlist =
                        await getWishlist();

                    const items =
                        wishlist?.items || [];

                    const newItem =
                        items.find(
                            (item) =>
                                Number(item.product) ===
                                Number(product.id)
                        );

                    if (newItem) {

                        setWishlistItemId(
                            newItem.id
                        );

                    }

                } catch (wishlistError) {

                    console.error(
                        "Wishlist Refresh Error:",
                        wishlistError
                    );

                }
            }


            setMessage(
                "❤️ Added to wishlist."
            );

        } catch (err) {

            console.error(
                "Wishlist Error:",
                err
            );

            setError(
                err.message ||
                "Wishlist operation failed."
            );

        } finally {

            setWishlistLoading(false);

        }
    };


    // ==========================================
    // CLEAR MESSAGE
    // ==========================================

    const clearMessage = () => {

        setMessage("");
        setError("");

    };


    // ==========================================
    // FORMAT PRICE
    // ==========================================

    const formatPrice = (value) => {

        return Number(value || 0).toLocaleString(
            "en-IN"
        );

    };


    // ==========================================
    // UI
    // ==========================================

    return (

        <article
            className={`product-card ${
                !isInStock
                    ? "product-card-out"
                    : ""
            }`}
        >

            {/* ======================================
                IMAGE SECTION
            ====================================== */}

            <div className="product-image">

                {product.image ? (

                    <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                    />

                ) : (

                    <div className="no-image">

                        <span className="no-image-icon">
                            📦
                        </span>

                        <span>
                            No Image
                        </span>

                    </div>

                )}


                {/* DISCOUNT */}

                {hasDiscount && (

                    <span className="discount-badge">

                        -{discountPercentage}%

                    </span>

                )}


                {/* OUT OF STOCK */}

                {!isInStock && (

                    <span className="out-stock-badge">

                        Out of Stock

                    </span>

                )}


                {/* WISHLIST */}

                <button
                    type="button"
                    className={`wishlist-button ${
                        isWishlisted
                            ? "active"
                            : ""
                    }`}
                    onClick={handleWishlist}
                    disabled={wishlistLoading}
                    aria-label={
                        isWishlisted
                            ? "Remove from wishlist"
                            : "Add to wishlist"
                    }
                    title={
                        isWishlisted
                            ? "Remove from wishlist"
                            : "Add to wishlist"
                    }
                >

                    {wishlistLoading
                        ? (
                            <span className="wishlist-spinner">
                                ⟳
                            </span>
                        )
                        : isWishlisted
                            ? "♥"
                            : "♡"
                    }

                </button>


                {/* QUICK VIEW */}

                <Link
                    to={`/products/${product.id}`}
                    className="quick-view-button"
                    onClick={clearMessage}
                >

                    <span>👁</span>

                    Quick View

                </Link>

            </div>


            {/* ======================================
                PRODUCT INFORMATION
            ====================================== */}

            <div className="product-info">


                {/* BRAND */}

                {product.brand && (

                    <div className="product-brand">

                        {product.brand}

                    </div>

                )}


                {/* PRODUCT NAME */}

                <Link
                    to={`/products/${product.id}`}
                    className="product-title-link"
                    onClick={clearMessage}
                >

                    <h3 className="product-title">

                        {product.name}

                    </h3>

                </Link>


                {/* RATING */}

                <div className="product-rating">

                    <span className="stars">
                        ★★★★★
                    </span>

                    <span className="rating-value">
                        4.5
                    </span>

                    <span className="rating-count">
                        (128)
                    </span>

                </div>


                {/* DESCRIPTION */}

                <p className="description">

                    {product.description ||
                        "Premium quality product from ShopHubAI."}

                </p>


                {/* PRICE */}

                <div className="price-section">

                    <span className="discount-price">

                        ₹{formatPrice(finalPrice)}

                    </span>


                    {hasDiscount && (

                        <span className="original-price">

                            ₹{formatPrice(originalPrice)}

                        </span>

                    )}

                </div>


                {/* SAVING */}

                {hasDiscount && (

                    <div className="saving-text">

                        You save ₹
                        {formatPrice(
                            originalPrice - finalPrice
                        )}

                    </div>

                )}


                {/* STOCK */}

                <div
                    className={`stock ${
                        isInStock
                            ? "in-stock"
                            : "out-of-stock"
                    }`}
                >

                    <span className="stock-dot"></span>

                    {isInStock

                        ? `${product.stock} ${
                            Number(product.stock) === 1
                                ? "item"
                                : "items"
                        } available`

                        : "Currently unavailable"}

                </div>


                {/* ACTION BUTTONS */}

                <div className="product-actions">

                    <button
                        type="button"
                        className="add-cart-button"
                        onClick={handleAddToCart}
                        disabled={
                            cartLoading ||
                            !isInStock
                        }
                    >

                        {cartLoading ? (

                            <>
                                <span className="button-spinner">
                                    ⟳
                                </span>

                                Adding...
                            </>

                        ) : (

                            <>
                                <span>🛒</span>

                                Add to Cart
                            </>

                        )}

                    </button>


                    <Link
                        to={`/products/${product.id}`}
                        className="details-button"
                        onClick={clearMessage}
                    >

                        Details
                        <span>→</span>

                    </Link>

                </div>


                {/* SUCCESS MESSAGE */}

                {message && (

                    <p className="product-success">

                        {message}

                    </p>

                )}


                {/* ERROR MESSAGE */}

                {error && (

                    <p className="product-error">

                        {error}

                    </p>

                )}

            </div>

        </article>
    );
}


export default ProductCard;