
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
    getWishlist,
    removeFromWishlist,
} from "../services/wishlistApi";

import { addToCart } from "../services/cartApi";


function Wishlist() {

    const [wishlist, setWishlist] = useState(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [actionLoading, setActionLoading] =
        useState(null);

    const [message, setMessage] =
        useState("");


    // =====================================
    // LOAD WISHLIST
    // =====================================

    const loadWishlist = async () => {

        try {

            setLoading(true);
            setError("");

            const data =
                await getWishlist();

            setWishlist(data);

        } catch (err) {

            console.error(
                "Wishlist Load Error:",
                err
            );

            setError(
                err.message ||
                "Unable to load wishlist."
            );

        } finally {

            setLoading(false);

        }
    };


    useEffect(() => {

        const token =
            localStorage.getItem(
                "access_token"
            );

        if (!token) {

            setError(
                "Please login to view your wishlist."
            );

            setLoading(false);

            return;
        }

        loadWishlist();

    }, []);


    // =====================================
    // REMOVE FROM WISHLIST
    // =====================================

    const handleRemove = async (
        itemId
    ) => {

        try {

            setActionLoading(
                `remove-${itemId}`
            );

            setError("");
            setMessage("");

            await removeFromWishlist(
                itemId
            );

            setWishlist((previous) => {

                if (!previous) {
                    return previous;
                }

                return {
                    ...previous,

                    items:
                        previous.items.filter(
                            (item) =>
                                item.id !== itemId
                        ),
                };
            });

            setMessage(
                "Product removed from wishlist."
            );

        } catch (err) {

            console.error(
                "Remove Wishlist Error:",
                err
            );

            setError(
                err.message ||
                "Failed to remove product."
            );

        } finally {

            setActionLoading(null);

        }
    };


    // =====================================
    // ADD TO CART
    // =====================================

    const handleAddToCart = async (
        productId
    ) => {

        try {

            setActionLoading(
                `cart-${productId}`
            );

            setError("");
            setMessage("");

            await addToCart(
                productId,
                1
            );

            setMessage(
                "✓ Product added to cart."
            );

        } catch (err) {

            console.error(
                "Wishlist Add Cart Error:",
                err
            );

            setError(
                err.message ||
                "Failed to add product to cart."
            );

        } finally {

            setActionLoading(null);

        }
    };


    // =====================================
    // LOADING
    // =====================================

    if (loading) {

        return (
            <div className="wishlist-page">

                <div className="wishlist-message">

                    <div className="wishlist-spinner"></div>

                    <p>
                        Loading wishlist...
                    </p>

                </div>

            </div>
        );
    }


    // =====================================
    // LOGIN / ERROR
    // =====================================

    if (error && !wishlist) {

        return (
            <div className="wishlist-page">

                <div className="wishlist-error">

                    <span>
                        ❌
                    </span>

                    <p>
                        {error}
                    </p>

                    <Link
                        to="/login"
                        className="wishlist-login-button"
                    >
                        Login
                    </Link>

                </div>

            </div>
        );
    }


    const items =
        wishlist?.items || [];


    // =====================================
    // PAGE
    // =====================================

    return (

        <div className="wishlist-page">

            {/* ================================= */}
            {/* HEADER */}
            {/* ================================= */}

            <section className="wishlist-header">

                <div>

                    <span className="section-label">
                        YOUR COLLECTION
                    </span>

                    <h1>
                        ❤️ My Wishlist
                    </h1>

                    <p>
                        Save your favorite products
                        and shop them whenever you want.
                    </p>

                </div>

                <Link
                    to="/products"
                    className="wishlist-shop-button"
                >
                    Continue Shopping →
                </Link>

            </section>


            {/* ================================= */}
            {/* SUCCESS MESSAGE */}
            {/* ================================= */}

            {message && (

                <div className="wishlist-success">
                    ✓ {message}
                </div>

            )}


            {/* ================================= */}
            {/* ERROR MESSAGE */}
            {/* ================================= */}

            {error && wishlist && (

                <div className="wishlist-error-inline">
                    ❌ {error}
                </div>

            )}


            {/* ================================= */}
            {/* EMPTY WISHLIST */}
            {/* ================================= */}

            {items.length === 0 && (

                <div className="wishlist-empty">

                    <div className="wishlist-empty-icon">
                        ❤️
                    </div>

                    <h2>
                        Your Wishlist is Empty
                    </h2>

                    <p>
                        You haven't added any products
                        to your wishlist yet.
                    </p>

                    <Link
                        to="/products"
                        className="wishlist-shop-button"
                    >
                        Explore Products →
                    </Link>

                </div>

            )}


            {/* ================================= */}
            {/* WISHLIST ITEMS */}
            {/* ================================= */}

            {items.length > 0 && (

                <div className="wishlist-grid">

                    {items.map((item) => {

                        const product =
                            item.product_details ||
                            item.product;

                        /*
                         * Current WishlistSerializer returns:
                         *
                         * product
                         * product_name
                         * product_price
                         *
                         * Therefore product can be an ID.
                         *
                         * We use product_name/product_price
                         * directly from wishlist response.
                         */

                        const productId =
                            typeof item.product === "object"
                                ? item.product.id
                                : item.product;


                        const productName =
                            item.product_name ||
                            product?.name ||
                            "Product";


                        const productPrice =
                            item.product_price ||
                            product?.price ||
                            0;


                        const image =
                            typeof item.product === "object"
                                ? item.product.image
                                : null;


                        return (

                            <article
                                className="wishlist-card"
                                key={item.id}
                            >

                                {/* ============================ */}
                                {/* IMAGE */}
                                {/* ============================ */}

                                <div className="wishlist-image">

                                    {image ? (

                                        <img
                                            src={image}
                                            alt={productName}
                                        />

                                    ) : (

                                        <div className="wishlist-no-image">

                                            <span>
                                                📦
                                            </span>

                                            <small>
                                                No Image
                                            </small>

                                        </div>

                                    )}

                                </div>


                                {/* ============================ */}
                                {/* INFO */}
                                {/* ============================ */}

                                <div className="wishlist-info">

                                    <span className="wishlist-label">
                                        SAVED PRODUCT
                                    </span>

                                    <h2>
                                        {productName}
                                    </h2>

                                    <div className="wishlist-price">

                                        ₹
                                        {Number(
                                            productPrice
                                        ).toLocaleString(
                                            "en-IN"
                                        )}

                                    </div>


                                    <p className="wishlist-added">

                                        Added on{" "}

                                        {item.added_at
                                            ? new Date(
                                                item.added_at
                                            ).toLocaleDateString(
                                                "en-IN"
                                            )
                                            : "Recently"}

                                    </p>


                                    {/* ============================ */}
                                    {/* ACTIONS */}
                                    {/* ============================ */}

                                    <div className="wishlist-actions">

                                        <Link
                                            to={`/products/${productId}`}
                                            className="wishlist-details-button"
                                        >
                                            View Product
                                        </Link>


                                        <button
                                            type="button"
                                            className="wishlist-cart-button"
                                            onClick={() =>
                                                handleAddToCart(
                                                    productId
                                                )
                                            }
                                            disabled={
                                                actionLoading ===
                                                `cart-${productId}`
                                            }
                                        >

                                            {actionLoading ===
                                            `cart-${productId}`
                                                ? "Adding..."
                                                : "🛒 Add to Cart"}

                                        </button>


                                        <button
                                            type="button"
                                            className="wishlist-remove-button"
                                            onClick={() =>
                                                handleRemove(
                                                    item.id
                                                )
                                            }
                                            disabled={
                                                actionLoading ===
                                                `remove-${item.id}`
                                            }
                                        >

                                            {actionLoading ===
                                            `remove-${item.id}`
                                                ? "Removing..."
                                                : "♡ Remove"}

                                        </button>

                                    </div>

                                </div>

                            </article>

                        );

                    })}

                </div>

            )}

        </div>
    );
}

export default Wishlist;
