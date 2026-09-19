import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
    getHomeRecommendations,
    trackRecommendationEvent,
} from "../services/recommendationApi";

import ProductCard from "./ProductCard";


function Home() {

    const navigate = useNavigate();


    // =====================================================
    // HOMEPAGE RECOMMENDATION STATE
    // =====================================================

    const [recommendations, setRecommendations] = useState({
        recommended_for_you: [],
        because_you_viewed: [],
        trending_for_you: [],
        recently_viewed: [],
        latest_products: [],
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");


    // =====================================================
    // IMPRESSION TRACKING
    // =====================================================
    //
    // Prevent duplicate impression events.
    //
    // Example:
    // recommended_for_you-3
    // trending_for_you-2
    //
    // Once tracked, same product + section will not
    // generate another impression during this page session.
    //

    const impressionTracker = useRef(
        new Set()
    );


    // =====================================================
    // TRACK RECOMMENDATION IMPRESSION
    // =====================================================

    const trackImpression = (
        productId,
        sectionName
    ) => {

        if (!productId) {
            return;
        }


        const impressionKey =
            `${sectionName}-${productId}`;


        // ---------------------------------------------
        // DUPLICATE PROTECTION
        // ---------------------------------------------

        if (
            impressionTracker.current.has(
                impressionKey
            )
        ) {

            return;
        }


        impressionTracker.current.add(
            impressionKey
        );


        // ---------------------------------------------
        // HOMEPAGE HAS NO SOURCE PRODUCT
        // ---------------------------------------------

        trackRecommendationEvent(
            null,
            productId,
            "impression"
        );


        console.log(
            "Homepage Recommendation Impression:",
            {
                productId,
                section: sectionName,
            }
        );
    };


    // =====================================================
    // TRACK RECOMMENDATION CLICK
    // =====================================================

    const handleRecommendationClick = (
        productId,
        sectionName
    ) => {

        if (!productId) {
            return;
        }


        // ---------------------------------------------
        // TRACK CLICK
        // ---------------------------------------------

        trackRecommendationEvent(
            null,
            productId,
            "click"
        );


        console.log(
            "Homepage Recommendation Click:",
            {
                productId,
                section: sectionName,
            }
        );


        // ---------------------------------------------
        // EXISTING PRODUCT DETAILS FLOW
        // ---------------------------------------------

        navigate(
            `/products/${productId}`
        );
    };


    // =====================================================
    // LOAD HOMEPAGE RECOMMENDATIONS
    // =====================================================

    useEffect(() => {

        const loadHomepageRecommendations =
            async () => {

                try {

                    setLoading(true);
                    setError("");


                    const data =
                        await getHomeRecommendations();


                    // -----------------------------------------
                    // API RESPONSE
                    // -----------------------------------------

                    if (data) {

                        setRecommendations({

                            recommended_for_you:
                                data.recommended_for_you || [],

                            because_you_viewed:
                                data.because_you_viewed || [],

                            trending_for_you:
                                data.trending_for_you || [],

                            recently_viewed:
                                data.recently_viewed || [],

                            latest_products:
                                data.latest_products || [],

                        });

                    } else {

                        setError(
                            "Unable to load recommendations."
                        );

                    }

                } catch (err) {

                    console.error(
                        "Home Recommendation Error:",
                        err
                    );

                    setError(
                        "Unable to load homepage products."
                    );

                } finally {

                    setLoading(false);

                }

            };


        loadHomepageRecommendations();

    }, []);


    // =====================================================
    // TRACK IMPRESSIONS AFTER RECOMMENDATIONS LOAD
    // =====================================================

    useEffect(() => {

        // ---------------------------------------------
        // DO NOT TRACK WHILE LOADING
        // ---------------------------------------------

        if (loading) {
            return;
        }


        // ---------------------------------------------
        // DO NOT TRACK IF API FAILED
        // ---------------------------------------------

        if (error) {
            return;
        }


        // ---------------------------------------------
        // ONLY AI / RECOMMENDATION SECTIONS
        // ---------------------------------------------

        const recommendationSections = [

            {
                name: "recommended_for_you",

                products:
                    recommendations
                        .recommended_for_you,
            },

            {
                name: "because_you_viewed",

                products:
                    recommendations
                        .because_you_viewed,
            },

            {
                name: "trending_for_you",

                products:
                    recommendations
                        .trending_for_you,
            },

        ];


        // ---------------------------------------------
        // TRACK EACH PRODUCT IMPRESSION
        // ---------------------------------------------

        recommendationSections.forEach(
            (section) => {

                const products =
                    section.products || [];


                products
                    .slice(0, 8)
                    .forEach(
                        (product) => {

                            if (
                                !product ||
                                !product.id
                            ) {
                                return;
                            }


                            trackImpression(
                                product.id,
                                section.name
                            );

                        }
                    );

            }
        );


    }, [
        loading,
        error,
        recommendations,
    ]);


    // =====================================================
    // SECTION COMPONENT
    // =====================================================

    const ProductSection = ({
        products,
        label,
        title,
        description,
        showViewAll = false,

        // New prop
        trackEvents = false,

        sectionName = "",
    }) => {

        // -----------------------------------------------
        // Don't render empty recommendation sections
        // -----------------------------------------------

        if (
            !products ||
            products.length === 0
        ) {

            return null;

        }


        return (

            <section className="products-section">


                {/* ===================================== */}
                {/* SECTION HEADER */}
                {/* ===================================== */}

                <div className="section-header">

                    <div>

                        {label && (

                            <span className="section-label">

                                {label}

                            </span>

                        )}


                        <h2>

                            {title}

                        </h2>


                        {description && (

                            <p>

                                {description}

                            </p>

                        )}

                    </div>


                    {showViewAll && (

                        <Link
                            to="/products"
                            className="view-all-link"
                        >

                            View All →

                        </Link>

                    )}

                </div>


                {/* ===================================== */}
                {/* PRODUCT GRID */}
                {/* ===================================== */}

                <div className="product-grid">

                    {products
                        .slice(0, 8)
                        .map((product) => (

                            <div
                                key={product.id}

                                onClick={() => {

                                    // ---------------------------------
                                    // TRACK CLICK ONLY FOR
                                    // RECOMMENDATION SECTIONS
                                    // ---------------------------------

                                    if (trackEvents) {

                                        handleRecommendationClick(
                                            product.id,
                                            sectionName
                                        );

                                    }

                                }}

                                style={
                                    trackEvents
                                        ? {
                                            cursor:
                                                "pointer",
                                        }
                                        : undefined
                                }
                            >

                                <ProductCard
                                    product={product}
                                />

                            </div>

                        ))}

                </div>

            </section>

        );

    };


    // =====================================================
    // RENDER
    // =====================================================

    return (

        <div className="home-page">


            {/* ================================================= */}
            {/* HERO SECTION */}
            {/* ================================================= */}

            <section className="hero-section">

                <div className="hero-content">

                    <span className="hero-badge">

                        ✨ Smart Shopping with ShopHubAI

                    </span>


                    <h1>

                        Discover Products

                        <br />

                        <span>

                            You’ll Love.

                        </span>

                    </h1>


                    <p>

                        Explore premium products, amazing deals
                        and a smarter shopping experience — all
                        in one place.

                    </p>


                    <div className="hero-buttons">

                        <Link
                            to="/products"
                            className="hero-primary-button"
                        >

                            Explore Products →

                        </Link>


                        <Link
                            to="/cart"
                            className="hero-secondary-button"
                        >

                            🛒 View Cart

                        </Link>

                    </div>


                    {/* ========================================= */}
                    {/* HERO FEATURES */}
                    {/* ========================================= */}

                    <div className="hero-features">


                        <div className="hero-feature">

                            <span>

                                🛍️

                            </span>

                            <div>

                                <strong>

                                    Best Deals

                                </strong>

                                <small>

                                    Every Day

                                </small>

                            </div>

                        </div>


                        <div className="hero-feature">

                            <span>

                                🔒

                            </span>

                            <div>

                                <strong>

                                    Secure

                                </strong>

                                <small>

                                    Shopping

                                </small>

                            </div>

                        </div>


                        <div className="hero-feature">

                            <span>

                                ⚡

                            </span>

                            <div>

                                <strong>

                                    Fast

                                </strong>

                                <small>

                                    Delivery

                                </small>

                            </div>

                        </div>


                    </div>

                </div>

            </section>


            {/* ================================================= */}
            {/* LOADING STATE */}
            {/* ================================================= */}

            {loading && (

                <section className="products-section">

                    <div className="home-message">

                        <div className="home-spinner"></div>

                        <p>

                            Loading smart recommendations...

                        </p>

                    </div>

                </section>

            )}


            {/* ================================================= */}
            {/* ERROR STATE */}
            {/* ================================================= */}

            {!loading && error && (

                <section className="products-section">

                    <div className="home-error">

                        ❌ {error}

                    </div>

                </section>

            )}


            {/* ================================================= */}
            {/* AI RECOMMENDATION SECTIONS */}
            {/* ================================================= */}

            {!loading && !error && (

                <>


                    {/* ========================================= */}
                    {/* RECOMMENDED FOR YOU */}
                    {/* ========================================= */}

                    <ProductSection

                        products={
                            recommendations
                                .recommended_for_you
                        }

                        label="AI RECOMMENDED"

                        title="Recommended For You"

                        description="Products selected based on your shopping activity."

                        showViewAll={true}

                        trackEvents={true}

                        sectionName="recommended_for_you"

                    />


                    {/* ========================================= */}
                    {/* BECAUSE YOU VIEWED */}
                    {/* ========================================= */}

                    <ProductSection

                        products={
                            recommendations
                                .because_you_viewed
                        }

                        label="BASED ON YOUR ACTIVITY"

                        title="Because You Viewed"

                        description="More products similar to what you recently explored."

                        trackEvents={true}

                        sectionName="because_you_viewed"

                    />


                    {/* ========================================= */}
                    {/* TRENDING FOR YOU */}
                    {/* ========================================= */}

                    <ProductSection

                        products={
                            recommendations
                                .trending_for_you
                        }

                        label="TRENDING NOW"

                        title="Trending For You"

                        description="Popular products based on current shopping activity."

                        trackEvents={true}

                        sectionName="trending_for_you"

                    />


                    {/* ========================================= */}
                    {/* RECENTLY VIEWED */}
                    {/* ========================================= */}

                    <ProductSection

                        products={
                            recommendations
                                .recently_viewed
                        }

                        label="YOUR ACTIVITY"

                        title="Recently Viewed"

                        description="Products you recently explored."

                        trackEvents={false}

                    />


                    {/* ========================================= */}
                    {/* LATEST PRODUCTS */}
                    {/* ========================================= */}

                    <ProductSection

                        products={
                            recommendations
                                .latest_products
                        }

                        label="SHOP NOW"

                        title="Latest Products"

                        description="Discover our newest products and best deals."

                        showViewAll={true}

                        trackEvents={false}

                    />


                </>

            )}


            {/* ================================================= */}
            {/* NO PRODUCTS FALLBACK */}
            {/* ================================================= */}

            {!loading &&
                !error &&
                recommendations.recommended_for_you.length === 0 &&
                recommendations.because_you_viewed.length === 0 &&
                recommendations.trending_for_you.length === 0 &&
                recommendations.recently_viewed.length === 0 &&
                recommendations.latest_products.length === 0 && (

                    <section className="products-section">

                        <div className="home-message">

                            <span>

                                📦

                            </span>

                            <p>

                                No products available.

                            </p>

                        </div>

                    </section>

                )}


            {/* ================================================= */}
            {/* WHY SHOPHUBAI */}
            {/* ================================================= */}

            <section className="why-section">


                <div className="section-header center">

                    <span className="section-label">

                        SHOP WITH CONFIDENCE

                    </span>


                    <h2>

                        Why ShopHubAI?

                    </h2>


                    <p>

                        Everything you need for a smooth
                        and secure shopping experience.

                    </p>

                </div>


                <div className="why-grid">


                    {/* ===================================== */}
                    {/* FAST DELIVERY */}
                    {/* ===================================== */}

                    <div className="why-card">

                        <div className="why-icon">

                            🚚

                        </div>


                        <h3>

                            Fast Delivery

                        </h3>


                        <p>

                            Get your orders delivered quickly
                            and reliably.

                        </p>

                    </div>


                    {/* ===================================== */}
                    {/* SECURE SHOPPING */}
                    {/* ===================================== */}

                    <div className="why-card">

                        <div className="why-icon">

                            🔒

                        </div>


                        <h3>

                            Secure Shopping

                        </h3>


                        <p>

                            Your account and payments are
                            protected with secure technology.

                        </p>

                    </div>


                    {/* ===================================== */}
                    {/* SECURE PAYMENTS */}
                    {/* ===================================== */}

                    <div className="why-card">

                        <div className="why-icon">

                            💳

                        </div>


                        <h3>

                            Secure Payments

                        </h3>


                        <p>

                            Pay safely using trusted payment
                            methods.

                        </p>

                    </div>


                    {/* ===================================== */}
                    {/* QUALITY PRODUCTS */}
                    {/* ===================================== */}

                    <div className="why-card">

                        <div className="why-icon">

                            ⭐

                        </div>


                        <h3>

                            Quality Products

                        </h3>


                        <p>

                            Discover products selected for
                            a better shopping experience.

                        </p>

                    </div>


                </div>

            </section>


            {/* ================================================= */}
            {/* CTA SECTION */}
            {/* ================================================= */}

            <section className="cta-section">


                <div className="cta-content">


                    <span>

                        READY TO SHOP?

                    </span>


                    <h2>

                        Your next favorite product
                        is waiting.

                    </h2>


                    <p>

                        Explore ShopHubAI and find
                        something amazing today.

                    </p>


                    <Link
                        to="/products"
                        className="cta-button"
                    >

                        Start Shopping →

                    </Link>


                </div>

            </section>


        </div>

    );

}


export default Home;