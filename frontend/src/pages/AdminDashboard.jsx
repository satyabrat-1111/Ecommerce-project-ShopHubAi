import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    getAdminDashboard,
    getAdminAnalytics,
    getRecentOrders,
    updateOrderStatus,
    getRecommendationAnalytics,
} from "../services/adminApi";


function AdminDashboard() {

    const navigate = useNavigate();

    // ============================================================
    // DASHBOARD STATE
    // ============================================================

    const [dashboard, setDashboard] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [orders, setOrders] = useState([]);

    // ============================================================
    // RECOMMENDATION ANALYTICS STATE
    // ============================================================

    const [
        recommendationAnalytics,
        setRecommendationAnalytics
    ] = useState(null);

    // ============================================================
    // GENERAL STATE
    // ============================================================

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updatingOrder, setUpdatingOrder] = useState(null);

    // ============================================================
    // THEME STATE
    // ============================================================

    const [darkMode, setDarkMode] = useState(() => {

        const savedTheme =
            localStorage.getItem(
                "admin_dashboard_theme"
            );

        return savedTheme === "dark";
    });


    // ============================================================
    // THEME OBJECT
    // ============================================================

    const theme = darkMode
        ? {
            page: "#0f172a",
            card: "#1e293b",
            cardHover: "#263449",
            text: "#f8fafc",
            secondaryText: "#cbd5e1",
            mutedText: "#94a3b8",
            border: "#334155",
            input: "#0f172a",
            tableHeader: "#273449",
            tableHover: "#263449",
            progressBg: "#334155",
            shadow:
                "0 10px 30px rgba(0,0,0,0.35)",
        }
        : {
            page: "#f8fafc",
            card: "#ffffff",
            cardHover: "#f8fafc",
            text: "#111827",
            secondaryText: "#4b5563",
            mutedText: "#6b7280",
            border: "#e5e7eb",
            input: "#ffffff",
            tableHeader: "#f8fafc",
            tableHover: "#f8fafc",
            progressBg: "#e5e7eb",
            shadow:
                "0 8px 25px rgba(15,23,42,0.08)",
        };


    // ============================================================
    // SAVE THEME
    // ============================================================

    useEffect(() => {

        localStorage.setItem(
            "admin_dashboard_theme",
            darkMode
                ? "dark"
                : "light"
        );

    }, [darkMode]);


    // ============================================================
    // LOAD ADMIN DASHBOARD
    // ============================================================

    const loadDashboard = async () => {

        try {

            setLoading(true);
            setError("");


            // ====================================================
            // GET DASHBOARD
            // ====================================================

            const dashboardResponse =
                await getAdminDashboard();

            console.log(
                "REAL ADMIN DASHBOARD RESPONSE:",
                dashboardResponse
            );


            const dashboardData =
                dashboardResponse?.data ||
                dashboardResponse ||
                {};


            console.log(
                "ADMIN DASHBOARD DATA:",
                dashboardData
            );


            // ====================================================
            // GET ANALYTICS
            // ====================================================

            const analyticsResponse =
                await getAdminAnalytics();

            console.log(
                "REAL ADMIN ANALYTICS RESPONSE:",
                JSON.stringify(
                    analyticsResponse,
                    null,
                    2
                )
            );


            const analyticsData =
                analyticsResponse?.data ||
                analyticsResponse ||
                {};


            console.log(
                "ADMIN ANALYTICS DATA:",
                JSON.stringify(
                    analyticsData,
                    null,
                    2
                )
            );


            // ====================================================
            // GET RECENT ORDERS
            // ====================================================

            const ordersResponse =
                await getRecentOrders();

            console.log(
                "REAL ADMIN ORDERS RESPONSE:",
                ordersResponse
            );


            const recentOrders =
                Array.isArray(ordersResponse)
                    ? ordersResponse
                    : ordersResponse?.results ||
                      ordersResponse?.recent_orders ||
                      ordersResponse?.orders ||
                      ordersResponse?.data ||
                      [];


            console.log(
                "ADMIN RECENT ORDERS:",
                recentOrders
            );


            // ====================================================
            // GET RECOMMENDATION ANALYTICS
            // ====================================================

            const recommendationResponse =
                await getRecommendationAnalytics();

            console.log(
                "REAL RECOMMENDATION ANALYTICS RESPONSE:",
                JSON.stringify(
                    recommendationResponse,
                    null,
                    2
                )
            );


            const recommendationData =
                recommendationResponse?.data ||
                recommendationResponse ||
                {};


            console.log(
                "RECOMMENDATION ANALYTICS DATA:",
                JSON.stringify(
                    recommendationData,
                    null,
                    2
                )
            );


            // ====================================================
            // SAVE DATA
            // ====================================================

            setDashboard(dashboardData);

            setAnalytics(analyticsData);

            setOrders(recentOrders);

            setRecommendationAnalytics(
                recommendationData
            );

        } catch (error) {

            console.error(
                "Admin Dashboard Error:",
                error
            );

            setError(
                error.message ||
                "Failed to load admin dashboard."
            );

        } finally {

            setLoading(false);

        }

    };


    // ============================================================
    // INITIAL LOAD
    // ============================================================

    useEffect(() => {

        const token =
            localStorage.getItem(
                "access_token"
            );


        if (!token) {

            setLoading(false);

            setError(
                "Please login to access Admin Dashboard."
            );

            return;

        }


        loadDashboard();

    }, []);


    // ============================================================
    // UPDATE ORDER STATUS
    // ============================================================

    const handleStatusChange = async (
        orderId,
        newStatus
    ) => {

        try {

            setUpdatingOrder(orderId);


            await updateOrderStatus(
                orderId,
                newStatus
            );


            await loadDashboard();


            alert(
                "Order status updated successfully."
            );

        } catch (error) {

            console.error(
                "Status Update Error:",
                error
            );


            alert(
                error.message ||
                "Failed to update order status."
            );

        } finally {

            setUpdatingOrder(null);

        }

    };


    // ============================================================
    // LOADING
    // ============================================================

    if (loading) {

        return (

            <div
                style={{
                    minHeight: "70vh",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: theme.page,
                    color: theme.text,
                    transition:
                        "background-color 0.3s ease, color 0.3s ease",
                }}
            >

                <div
                    style={{
                        textAlign: "center",
                    }}
                >

                    <div
                        style={{
                            width: "50px",
                            height: "50px",
                            borderRadius: "50%",
                            border:
                                `4px solid ${theme.border}`,
                            borderTopColor:
                                "#007bff",
                            animation:
                                "adminSpin 1s linear infinite",
                            margin:
                                "0 auto 20px",
                        }}
                    />

                    <h2>
                        Loading Admin Dashboard...
                    </h2>

                    <p
                        style={{
                            color:
                                theme.secondaryText,
                        }}
                    >
                        Please wait.
                    </p>

                </div>

                <style>
                    {`
                        @keyframes adminSpin {
                            from {
                                transform: rotate(0deg);
                            }
                            to {
                                transform: rotate(360deg);
                            }
                        }
                    `}
                </style>

            </div>

        );

    }


    // ============================================================
    // ERROR
    // ============================================================

    if (error) {

        return (

            <div
                style={{
                    minHeight: "70vh",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "20px",
                    backgroundColor:
                        theme.page,
                    color:
                        theme.text,
                }}
            >

                <div
                    style={{
                        width: "100%",
                        maxWidth: "600px",
                        padding: "35px",
                        textAlign: "center",
                        border:
                            `1px solid ${theme.border}`,
                        borderRadius: "18px",
                        backgroundColor:
                            theme.card,
                        boxShadow:
                            theme.shadow,
                    }}
                >

                    <div
                        style={{
                            fontSize: "48px",
                            marginBottom: "10px",
                        }}
                    >
                        ⚠️
                    </div>

                    <h2
                        style={{
                            color: "#dc3545",
                            marginBottom: "20px",
                        }}
                    >
                        Admin Dashboard Error
                    </h2>


                    <p
                        style={{
                            color:
                                theme.secondaryText,
                            marginBottom: "25px",
                        }}
                    >
                        {error}
                    </p>


                    <button
                        onClick={loadDashboard}
                        style={{
                            padding:
                                "12px 24px",
                            cursor: "pointer",
                            border: "none",
                            borderRadius: "8px",
                            backgroundColor:
                                "#007bff",
                            color: "#fff",
                            fontSize: "15px",
                            fontWeight: "600",
                        }}
                    >
                        🔄 Try Again
                    </button>

                </div>

            </div>

        );

    }


    // ============================================================
    // DASHBOARD VALUES
    // ============================================================

    const totalOrders =
        dashboard?.total_orders ??
        0;

    const totalRevenue =
        dashboard?.total_sales ??
        dashboard?.total_revenue ??
        0;

    const pendingOrders =
        dashboard?.pending_orders ??
        0;

    const confirmedOrders =
        dashboard?.confirmed_orders ??
        0;

    const shippedOrders =
        dashboard?.shipped_orders ??
        0;

    const deliveredOrders =
        dashboard?.delivered_orders ??
        0;

    const cancelledOrders =
        dashboard?.cancelled_orders ??
        0;


    // ============================================================
    // PAYMENT VALUES
    // ============================================================

    const successfulPayments =
        analytics?.successful_payments ??
        0;

    const pendingPayments =
        analytics?.pending_payments ??
        0;

    const failedPayments =
        analytics?.failed_payments ??
        0;

    const totalSales =
        analytics?.total_sales ??
        0;


    // ============================================================
    // RECOMMENDATION VALUES
    // ============================================================

    const recommendationSummary =
        recommendationAnalytics?.summary ||
        {};


    const recommendationTopProducts =
        Array.isArray(
            recommendationAnalytics?.top_products
        )
            ? recommendationAnalytics.top_products
            : [];


    const totalRecommendationInteractions =
        Number(
            recommendationSummary.total_interactions
        ) || 0;


    const recommendationViews =
        Number(
            recommendationSummary.views
        ) || 0;


    const recommendationWishlist =
        Number(
            recommendationSummary.wishlist
        ) || 0;


    const recommendationCart =
        Number(
            recommendationSummary.cart
        ) || 0;


    const recommendationPurchase =
        Number(
            recommendationSummary.purchase
        ) || 0;


    // ============================================================
    // NEW CTR VALUES
    // ============================================================

    const recommendationImpressions =
        Number(
            recommendationSummary.impressions
        ) || 0;


    const recommendationClicks =
        Number(
            recommendationSummary.clicks
        ) || 0;


    const recommendationCTR =
        Number(
            recommendationSummary.ctr
        ) || 0;


    const recommendationViewsTracked =
        Number(
            recommendationSummary.recommendation_views
        ) || 0;


    const recommendationWishlistTracked =
        Number(
            recommendationSummary.recommendation_wishlist
        ) || 0;


    const recommendationCartTracked =
        Number(
            recommendationSummary.recommendation_cart
        ) || 0;


    const recommendationPurchaseTracked =
        Number(
            recommendationSummary.recommendation_purchase
        ) || 0;


    // ============================================================
    // RECOMMENDATION PERCENTAGES
    // ============================================================

    const getRecommendationPercentage = (
        value
    ) => {

        if (
            totalRecommendationInteractions ===
            0
        ) {
            return 0;
        }

        return Math.round(
            (
                Number(value) /
                totalRecommendationInteractions
            ) * 100
        );

    };


    const recommendationViewPercentage =
        getRecommendationPercentage(
            recommendationViews
        );


    const recommendationWishlistPercentage =
        getRecommendationPercentage(
            recommendationWishlist
        );


    const recommendationCartPercentage =
        getRecommendationPercentage(
            recommendationCart
        );


    const recommendationPurchasePercentage =
        getRecommendationPercentage(
            recommendationPurchase
        );


    // ============================================================
    // TOP PRODUCT CALCULATION
    // ============================================================

    const topProductInteractionAmounts =
        recommendationTopProducts.map(
            (product) =>
                Number(
                    product.total_interactions
                ) || 0
        );


    const maximumProductInteractions =
        topProductInteractionAmounts.length > 0
            ? Math.max(
                ...topProductInteractionAmounts
            )
            : 0;


    const getProductInteractionWidth = (
        amount
    ) => {

        if (
            maximumProductInteractions ===
            0
        ) {
            return 0;
        }

        return Math.max(
            5,
            Math.round(
                (
                    Number(amount) /
                    maximumProductInteractions
                ) * 100
            )
        );

    };


    // ============================================================
    // ORDER PERCENTAGES
    // ============================================================

    const safeTotalOrders =
        Number(totalOrders) || 0;


    const getOrderPercentage = (
        value
    ) => {

        if (
            safeTotalOrders === 0
        ) {
            return 0;
        }

        return Math.round(
            (
                Number(value) /
                safeTotalOrders
            ) * 100
        );

    };


    const pendingPercentage =
        getOrderPercentage(
            pendingOrders
        );


    const confirmedPercentage =
        getOrderPercentage(
            confirmedOrders
        );


    const shippedPercentage =
        getOrderPercentage(
            shippedOrders
        );


    const deliveredPercentage =
        getOrderPercentage(
            deliveredOrders
        );


    const cancelledPercentage =
        getOrderPercentage(
            cancelledOrders
        );


    // ============================================================
    // RECENT SALES
    // ============================================================

    const recentOrderAmounts =
        orders.map(
            (order) =>
                Number(
                    order.total_amount
                ) || 0
        );


    const maximumRecentOrderAmount =
        recentOrderAmounts.length > 0
            ? Math.max(
                ...recentOrderAmounts
            )
            : 0;


    const getSalesWidth = (
        amount
    ) => {

        if (
            maximumRecentOrderAmount ===
            0
        ) {
            return 0;
        }

        return Math.max(
            5,
            Math.round(
                (
                    Number(amount) /
                    maximumRecentOrderAmount
                ) * 100
            )
        );

    };


    // ============================================================
    // CARD STYLE
    // ============================================================

    const cardStyle = {
        padding: "25px",
        border:
            `1px solid ${theme.border}`,
        borderRadius: "16px",
        backgroundColor:
            theme.card,
        color:
            theme.text,
        boxShadow:
            theme.shadow,
        transition:
            "all 0.25s ease",
    };


    const handleCardEnter = (
        event
    ) => {

        event.currentTarget.style.transform =
            "translateY(-5px)";

        event.currentTarget.style.boxShadow =
            darkMode
                ? "0 14px 35px rgba(0,0,0,0.45)"
                : "0 14px 35px rgba(15,23,42,0.12)";

    };


    const handleCardLeave = (
        event
    ) => {

        event.currentTarget.style.transform =
            "translateY(0)";

        event.currentTarget.style.boxShadow =
            theme.shadow;

    };


    // ============================================================
    // DASHBOARD
    // ============================================================

    return (

        <div
            style={{
                minHeight: "100vh",
                backgroundColor:
                    theme.page,
                color:
                    theme.text,
                padding:
                    "30px 20px 60px",
                transition:
                    "background-color 0.3s ease, color 0.3s ease",
            }}
        >

            <div
                style={{
                    maxWidth: "1300px",
                    margin: "0 auto",
                }}
            >

                {/* ================================================= */}
                {/* HEADER */}
                {/* ================================================= */}

                <div
                    style={{
                        marginBottom: "35px",
                    }}
                >

                    <div
                        style={{
                            display: "flex",
                            justifyContent:
                                "space-between",
                            alignItems:
                                "center",
                            gap: "20px",
                            flexWrap:
                                "wrap",
                        }}
                    >

                        <div>

                            <h1
                                style={{
                                    margin:
                                        "0 0 8px",
                                    fontSize:
                                        "34px",
                                    letterSpacing:
                                        "-0.5px",
                                }}
                            >
                                Admin Dashboard 📊
                            </h1>


                            <p
                                style={{
                                    color:
                                        theme.secondaryText,
                                    margin: 0,
                                }}
                            >
                                Manage ShopHubAI orders
                                and monitor your store.
                            </p>

                        </div>


                        <div
                            style={{
                                display: "flex",
                                gap: "10px",
                                flexWrap:
                                    "wrap",
                            }}
                        >

                            {/* THEME BUTTON */}

                            <button
                                onClick={() =>
                                    setDarkMode(
                                        (previous) =>
                                            !previous
                                    )
                                }
                                style={{
                                    padding:
                                        "12px 18px",
                                    border:
                                        `1px solid ${theme.border}`,
                                    borderRadius:
                                        "10px",
                                    backgroundColor:
                                        theme.card,
                                    color:
                                        theme.text,
                                    cursor:
                                        "pointer",
                                    fontSize:
                                        "14px",
                                    fontWeight:
                                        "600",
                                    transition:
                                        "all 0.2s ease",
                                }}
                            >
                                {darkMode
                                    ? "☀️ Light Mode"
                                    : "🌙 Dark Mode"}
                            </button>


                            {/* MANAGE PRODUCTS */}

                            <button
                                onClick={() =>
                                    navigate(
                                        "/admin/products"
                                    )
                                }
                                style={{
                                    padding:
                                        "12px 20px",
                                    border:
                                        "none",
                                    borderRadius:
                                        "10px",
                                    background:
                                        "linear-gradient(135deg, #007bff, #0056d6)",
                                    color:
                                        "#fff",
                                    fontSize:
                                        "15px",
                                    fontWeight:
                                        "600",
                                    cursor:
                                        "pointer",
                                    boxShadow:
                                        "0 5px 15px rgba(0,123,255,0.25)",
                                }}
                            >
                                🛍️ Manage Products
                            </button>

                        </div>

                    </div>

                </div>


                {/* ================================================= */}
                {/* ORDER STATISTICS */}
                {/* ================================================= */}

                <h2
                    style={{
                        marginBottom:
                            "20px",
                    }}
                >
                    Order Statistics
                </h2>


                <div
                    style={{
                        display:
                            "grid",
                        gridTemplateColumns:
                            "repeat(auto-fit, minmax(200px, 1fr))",
                        gap:
                            "20px",
                        marginBottom:
                            "40px",
                    }}
                >

                    {[
                        {
                            title:
                                "Total Orders",
                            value:
                                totalOrders,
                            icon:
                                "📦",
                        },
                        {
                            title:
                                "Total Revenue",
                            value:
                                `₹${totalRevenue}`,
                            icon:
                                "💰",
                        },
                        {
                            title:
                                "Pending Orders",
                            value:
                                pendingOrders,
                            icon:
                                "⏳",
                        },
                        {
                            title:
                                "Confirmed Orders",
                            value:
                                confirmedOrders,
                            icon:
                                "✅",
                        },
                        {
                            title:
                                "Shipped Orders",
                            value:
                                shippedOrders,
                            icon:
                                "🚚",
                        },
                        {
                            title:
                                "Delivered Orders",
                            value:
                                deliveredOrders,
                            icon:
                                "🎉",
                        },
                    ].map(
                        (item) => (

                            <div
                                key={
                                    item.title
                                }
                                style={{
                                    ...cardStyle,
                                    cursor:
                                        "default",
                                }}
                                onMouseEnter={
                                    handleCardEnter
                                }
                                onMouseLeave={
                                    handleCardLeave
                                }
                            >

                                <div
                                    style={{
                                        display:
                                            "flex",
                                        justifyContent:
                                            "space-between",
                                        alignItems:
                                            "center",
                                    }}
                                >

                                    <p
                                        style={{
                                            margin:
                                                0,
                                            color:
                                                theme.secondaryText,
                                        }}
                                    >
                                        {
                                            item.title
                                        }
                                    </p>

                                    <span
                                        style={{
                                            fontSize:
                                                "25px",
                                        }}
                                    >
                                        {
                                            item.icon
                                        }
                                    </span>

                                </div>


                                <h2
                                    style={{
                                        margin:
                                            "12px 0 0",
                                        fontSize:
                                            "32px",
                                    }}
                                >
                                    {
                                        item.value
                                    }
                                </h2>

                            </div>

                        )
                    )}

                </div>


                {/* ================================================= */}
                {/* PAYMENT ANALYTICS */}
                {/* ================================================= */}

                <h2
                    style={{
                        marginBottom:
                            "20px",
                    }}
                >
                    Payment Analytics 💳
                </h2>


                <div
                    style={{
                        display:
                            "grid",
                        gridTemplateColumns:
                            "repeat(auto-fit, minmax(200px, 1fr))",
                        gap:
                            "20px",
                        marginBottom:
                            "40px",
                    }}
                >

                    {[
                        {
                            title:
                                "Total Sales",
                            value:
                                `₹${totalSales}`,
                            icon:
                                "💰",
                        },
                        {
                            title:
                                "Successful Payments",
                            value:
                                successfulPayments,
                            icon:
                                "✅",
                        },
                        {
                            title:
                                "Pending Payments",
                            value:
                                pendingPayments,
                            icon:
                                "⏳",
                        },
                        {
                            title:
                                "Failed Payments",
                            value:
                                failedPayments,
                            icon:
                                "❌",
                        },
                    ].map(
                        (item) => (

                            <div
                                key={
                                    item.title
                                }
                                style={{
                                    ...cardStyle,
                                }}
                                onMouseEnter={
                                    handleCardEnter
                                }
                                onMouseLeave={
                                    handleCardLeave
                                }
                            >

                                <div
                                    style={{
                                        display:
                                            "flex",
                                        justifyContent:
                                            "space-between",
                                    }}
                                >

                                    <p
                                        style={{
                                            margin: 0,
                                            color:
                                                theme.secondaryText,
                                        }}
                                    >
                                        {
                                            item.title
                                        }
                                    </p>

                                    <span
                                        style={{
                                            fontSize:
                                                "24px",
                                        }}
                                    >
                                        {
                                            item.icon
                                        }
                                    </span>

                                </div>


                                <h2
                                    style={{
                                        margin:
                                            "12px 0 0",
                                        fontSize:
                                            "32px",
                                    }}
                                >
                                    {
                                        item.value
                                    }
                                </h2>

                            </div>

                        )
                    )}

                </div>


                {/* ================================================= */}
                {/* RECOMMENDATION ANALYTICS */}
                {/* ================================================= */}

                <div
                    style={{
                        marginBottom:
                            "40px",
                    }}
                >

                    <div
                        style={{
                            display:
                                "flex",
                            justifyContent:
                                "space-between",
                            alignItems:
                                "center",
                            gap:
                                "15px",
                            flexWrap:
                                "wrap",
                            marginBottom:
                                "20px",
                        }}
                    >

                        <div>

                            <h2
                                style={{
                                    margin:
                                        0,
                                }}
                            >
                                Recommendation Analytics
                                🤖📊
                            </h2>

                            <p
                                style={{
                                    color:
                                        theme.secondaryText,
                                    marginTop:
                                        "8px",
                                }}
                            >
                                Monitor recommendation
                                performance and user activity.
                            </p>

                        </div>

                    </div>


                    {/* ================================================= */}
                    {/* RECOMMENDATION PERFORMANCE */}
                    {/* ================================================= */}

                    <h3
                        style={{
                            marginBottom:
                                "15px",
                        }}
                    >
                        Recommendation Performance 🚀
                    </h3>


                    <div
                        style={{
                            display:
                                "grid",
                            gridTemplateColumns:
                                "repeat(auto-fit, minmax(220px, 1fr))",
                            gap:
                                "20px",
                            marginBottom:
                                "25px",
                        }}
                    >

                        {/* IMPRESSIONS */}

                        <div
                            style={{
                                ...cardStyle,
                                borderTop:
                                    "4px solid #007bff",
                            }}
                            onMouseEnter={
                                handleCardEnter
                            }
                            onMouseLeave={
                                handleCardLeave
                            }
                        >

                            <div
                                style={{
                                    display:
                                        "flex",
                                    justifyContent:
                                        "space-between",
                                    alignItems:
                                        "center",
                                }}
                            >

                                <span
                                    style={{
                                        color:
                                            theme.secondaryText,
                                        fontWeight:
                                            "600",
                                    }}
                                >
                                    Impressions
                                </span>

                                <span
                                    style={{
                                        fontSize:
                                            "28px",
                                    }}
                                >
                                    👁️
                                </span>

                            </div>


                            <h2
                                style={{
                                    fontSize:
                                        "36px",
                                    margin:
                                        "12px 0 5px",
                                }}
                            >
                                {
                                    recommendationImpressions
                                }
                            </h2>


                            <p
                                style={{
                                    margin:
                                        0,
                                    color:
                                        theme.mutedText,
                                    fontSize:
                                        "13px",
                                }}
                            >
                                Recommendations shown
                            </p>

                        </div>


                        {/* CLICKS */}

                        <div
                            style={{
                                ...cardStyle,
                                borderTop:
                                    "4px solid #6f42c1",
                            }}
                            onMouseEnter={
                                handleCardEnter
                            }
                            onMouseLeave={
                                handleCardLeave
                            }
                        >

                            <div
                                style={{
                                    display:
                                        "flex",
                                    justifyContent:
                                        "space-between",
                                }}
                            >

                                <span
                                    style={{
                                        color:
                                            theme.secondaryText,
                                        fontWeight:
                                            "600",
                                    }}
                                >
                                    Clicks
                                </span>

                                <span
                                    style={{
                                        fontSize:
                                            "28px",
                                    }}
                                >
                                    🖱️
                                </span>

                            </div>


                            <h2
                                style={{
                                    fontSize:
                                        "36px",
                                    margin:
                                        "12px 0 5px",
                                }}
                            >
                                {
                                    recommendationClicks
                                }
                            </h2>


                            <p
                                style={{
                                    margin:
                                        0,
                                    color:
                                        theme.mutedText,
                                    fontSize:
                                        "13px",
                                }}
                            >
                                Recommendation clicks
                            </p>

                        </div>


                        {/* CTR */}

                        <div
                            style={{
                                ...cardStyle,
                                borderTop:
                                    "4px solid #28a745",
                            }}
                            onMouseEnter={
                                handleCardEnter
                            }
                            onMouseLeave={
                                handleCardLeave
                            }
                        >

                            <div
                                style={{
                                    display:
                                        "flex",
                                    justifyContent:
                                        "space-between",
                                }}
                            >

                                <span
                                    style={{
                                        color:
                                            theme.secondaryText,
                                        fontWeight:
                                            "600",
                                    }}
                                >
                                    CTR
                                </span>

                                <span
                                    style={{
                                        fontSize:
                                            "28px",
                                    }}
                                >
                                    📈
                                </span>

                            </div>


                            <h2
                                style={{
                                    fontSize:
                                        "36px",
                                    margin:
                                        "12px 0 5px",
                                }}
                            >
                                {
                                    recommendationCTR.toFixed(
                                        2
                                    )
                                }%
                            </h2>


                            <p
                                style={{
                                    margin:
                                        0,
                                    color:
                                        theme.mutedText,
                                    fontSize:
                                        "13px",
                                }}
                            >
                                Click-through rate
                            </p>


                            <div
                                style={{
                                    marginTop:
                                        "12px",
                                    height:
                                        "7px",
                                    backgroundColor:
                                        theme.progressBg,
                                    borderRadius:
                                        "10px",
                                    overflow:
                                        "hidden",
                                }}
                            >

                                <div
                                    style={{
                                        width:
                                            `${Math.min(
                                                100,
                                                recommendationCTR
                                            )}%`,
                                        height:
                                            "100%",
                                        backgroundColor:
                                            "#28a745",
                                        borderRadius:
                                            "10px",
                                        transition:
                                            "width 0.6s ease",
                                    }}
                                />

                            </div>

                        </div>


                        {/* CONVERSION SIGNAL */}

                        <div
                            style={{
                                ...cardStyle,
                                borderTop:
                                    "4px solid #fd7e14",
                            }}
                            onMouseEnter={
                                handleCardEnter
                            }
                            onMouseLeave={
                                handleCardLeave
                            }
                        >

                            <div
                                style={{
                                    display:
                                        "flex",
                                    justifyContent:
                                        "space-between",
                                }}
                            >

                                <span
                                    style={{
                                        color:
                                            theme.secondaryText,
                                        fontWeight:
                                            "600",
                                    }}
                                >
                                    Purchases
                                </span>

                                <span
                                    style={{
                                        fontSize:
                                            "28px",
                                    }}
                                >
                                    🛍️
                                </span>

                            </div>


                            <h2
                                style={{
                                    fontSize:
                                        "36px",
                                    margin:
                                        "12px 0 5px",
                                }}
                            >
                                {
                                    recommendationPurchaseTracked
                                }
                            </h2>


                            <p
                                style={{
                                    margin:
                                        0,
                                    color:
                                        theme.mutedText,
                                    fontSize:
                                        "13px",
                                }}
                            >
                                Recommendation purchases
                            </p>

                        </div>

                    </div>


                    {/* ================================================= */}
                    {/* EXISTING RECOMMENDATION SUMMARY */}
                    {/* ================================================= */}

                    <div
                        style={{
                            display:
                                "grid",
                            gridTemplateColumns:
                                "repeat(auto-fit, minmax(200px, 1fr))",
                            gap:
                                "20px",
                            marginBottom:
                                "25px",
                        }}
                    >

                        {[
                            {
                                title:
                                    "Total Interactions",
                                value:
                                    totalRecommendationInteractions,
                                icon:
                                    "⚡",
                            },
                            {
                                title:
                                    "Product Views",
                                value:
                                    recommendationViews,
                                icon:
                                    "👁️",
                            },
                            {
                                title:
                                    "Wishlist",
                                value:
                                    recommendationWishlist,
                                icon:
                                    "❤️",
                            },
                            {
                                title:
                                    "Cart",
                                value:
                                    recommendationCart,
                                icon:
                                    "🛒",
                            },
                            {
                                title:
                                    "Purchase",
                                value:
                                    recommendationPurchase,
                                icon:
                                    "🛍️",
                            },
                        ].map(
                            (item) => (

                                <div
                                    key={
                                        item.title
                                    }
                                    style={{
                                        ...cardStyle,
                                    }}
                                    onMouseEnter={
                                        handleCardEnter
                                    }
                                    onMouseLeave={
                                        handleCardLeave
                                    }
                                >

                                    <div
                                        style={{
                                            display:
                                                "flex",
                                            justifyContent:
                                                "space-between",
                                        }}
                                    >

                                        <p
                                            style={{
                                                margin:
                                                    0,
                                                color:
                                                    theme.secondaryText,
                                            }}
                                        >
                                            {
                                                item.title
                                            }
                                        </p>

                                        <span>
                                            {
                                                item.icon
                                            }
                                        </span>

                                    </div>


                                    <h2
                                        style={{
                                            margin:
                                                "10px 0 0",
                                            fontSize:
                                                "32px",
                                        }}
                                    >
                                        {
                                            item.value
                                        }
                                    </h2>

                                </div>

                            )
                        )}

                    </div>


                    {/* ================================================= */}
                    {/* INTERACTION DISTRIBUTION */}
                    {/* ================================================= */}

                    <div
                        style={{
                            ...cardStyle,
                            marginBottom:
                                "25px",
                        }}
                    >

                        <h3
                            style={{
                                marginTop:
                                    0,
                                marginBottom:
                                    "25px",
                            }}
                        >
                            Interaction Distribution
                        </h3>


                        {[
                            {
                                label:
                                    "👁️ Views",
                                value:
                                    recommendationViews,
                                percentage:
                                    recommendationViewPercentage,
                                color:
                                    "#007bff",
                            },
                            {
                                label:
                                    "❤️ Wishlist",
                                value:
                                    recommendationWishlist,
                                percentage:
                                    recommendationWishlistPercentage,
                                color:
                                    "#e83e8c",
                            },
                            {
                                label:
                                    "🛒 Cart",
                                value:
                                    recommendationCart,
                                percentage:
                                    recommendationCartPercentage,
                                color:
                                    "#6f42c1",
                            },
                            {
                                label:
                                    "🛍️ Purchase",
                                value:
                                    recommendationPurchase,
                                percentage:
                                    recommendationPurchasePercentage,
                                color:
                                    "#28a745",
                            },
                        ].map(
                            (item) => (

                                <div
                                    key={
                                        item.label
                                    }
                                    style={{
                                        marginBottom:
                                            "20px",
                                    }}
                                >

                                    <div
                                        style={{
                                            display:
                                                "flex",
                                            justifyContent:
                                                "space-between",
                                            marginBottom:
                                                "7px",
                                        }}
                                    >

                                        <span>
                                            {
                                                item.label
                                            }
                                        </span>

                                        <strong>
                                            {
                                                item.value
                                            }{" "}
                                            (
                                            {
                                                item.percentage
                                            }%)
                                        </strong>

                                    </div>


                                    <div
                                        style={{
                                            width:
                                                "100%",
                                            height:
                                                "10px",
                                            backgroundColor:
                                                theme.progressBg,
                                            borderRadius:
                                                "10px",
                                            overflow:
                                                "hidden",
                                        }}
                                    >

                                        <div
                                            style={{
                                                width:
                                                    `${item.percentage}%`,
                                                height:
                                                    "100%",
                                                backgroundColor:
                                                    item.color,
                                                borderRadius:
                                                    "10px",
                                                transition:
                                                    "width 0.6s ease",
                                            }}
                                        />

                                    </div>

                                </div>

                            )
                        )}

                    </div>


                    {/* ================================================= */}
                    {/* TOP PRODUCTS */}
                    {/* ================================================= */}

                    <div
                        style={{
                            ...cardStyle,
                            overflowX:
                                "auto",
                        }}
                    >

                        <h3
                            style={{
                                marginTop:
                                    0,
                                marginBottom:
                                    "25px",
                            }}
                        >
                            Top Products by User
                            Interactions 🔥
                        </h3>


                        {
                            recommendationTopProducts.length ===
                            0 ? (

                                <div
                                    style={{
                                        padding:
                                            "30px",
                                        textAlign:
                                            "center",
                                        color:
                                            theme.secondaryText,
                                        border:
                                            `1px dashed ${theme.border}`,
                                        borderRadius:
                                            "10px",
                                    }}
                                >
                                    No recommendation
                                    interaction data
                                    available yet.
                                </div>

                            ) : (

                                <table
                                    style={{
                                        width:
                                            "100%",
                                        borderCollapse:
                                            "collapse",
                                        minWidth:
                                            "850px",
                                    }}
                                >

                                    <thead>

                                        <tr>

                                            {[
                                                "Product ID",
                                                "Product",
                                                "Views",
                                                "Wishlist",
                                                "Cart",
                                                "Purchase",
                                                "Total",
                                            ].map(
                                                (
                                                    heading
                                                ) => (

                                                    <th
                                                        key={
                                                            heading
                                                        }
                                                        style={{
                                                            border:
                                                                `1px solid ${theme.border}`,
                                                            padding:
                                                                "12px",
                                                            textAlign:
                                                                heading ===
                                                                "Product"
                                                                    ? "left"
                                                                    : "center",
                                                            backgroundColor:
                                                                theme.tableHeader,
                                                            color:
                                                                theme.text,
                                                        }}
                                                    >
                                                        {
                                                            heading
                                                        }
                                                    </th>

                                                )
                                            )}

                                        </tr>

                                    </thead>


                                    <tbody>

                                        {
                                            recommendationTopProducts.map(
                                                (
                                                    product
                                                ) => {

                                                    const interactionWidth =
                                                        getProductInteractionWidth(
                                                            product.total_interactions
                                                        );


                                                    return (

                                                        <tr
                                                            key={
                                                                product.product_id
                                                            }
                                                            onMouseEnter={(
                                                                event
                                                            ) => {
                                                                event.currentTarget.style.backgroundColor =
                                                                    theme.tableHover;
                                                            }}
                                                            onMouseLeave={(
                                                                event
                                                            ) => {
                                                                event.currentTarget.style.backgroundColor =
                                                                    "transparent";
                                                            }}
                                                        >

                                                            <td
                                                                style={{
                                                                    border:
                                                                        `1px solid ${theme.border}`,
                                                                    padding:
                                                                        "12px",
                                                                    textAlign:
                                                                        "center",
                                                                }}
                                                            >
                                                                #
                                                                {
                                                                    product.product_id
                                                                }
                                                            </td>


                                                            <td
                                                                style={{
                                                                    border:
                                                                        `1px solid ${theme.border}`,
                                                                    padding:
                                                                        "12px",
                                                                    minWidth:
                                                                        "220px",
                                                                }}
                                                            >

                                                                <div
                                                                    style={{
                                                                        fontWeight:
                                                                            "600",
                                                                        marginBottom:
                                                                            "8px",
                                                                    }}
                                                                >
                                                                    {
                                                                        product.product_name
                                                                    }
                                                                </div>


                                                                <div
                                                                    style={{
                                                                        width:
                                                                            "100%",
                                                                        height:
                                                                            "7px",
                                                                        backgroundColor:
                                                                            theme.progressBg,
                                                                        borderRadius:
                                                                            "10px",
                                                                        overflow:
                                                                            "hidden",
                                                                    }}
                                                                >

                                                                    <div
                                                                        style={{
                                                                            width:
                                                                                `${interactionWidth}%`,
                                                                            height:
                                                                                "100%",
                                                                            backgroundColor:
                                                                                "#007bff",
                                                                            borderRadius:
                                                                                "10px",
                                                                            transition:
                                                                                "width 0.5s ease",
                                                                        }}
                                                                    />

                                                                </div>

                                                            </td>


                                                            <td
                                                                style={{
                                                                    border:
                                                                        `1px solid ${theme.border}`,
                                                                    padding:
                                                                        "12px",
                                                                    textAlign:
                                                                        "center",
                                                                }}
                                                            >
                                                                {
                                                                    product.views ??
                                                                    0
                                                                }
                                                            </td>


                                                            <td
                                                                style={{
                                                                    border:
                                                                        `1px solid ${theme.border}`,
                                                                    padding:
                                                                        "12px",
                                                                    textAlign:
                                                                        "center",
                                                                }}
                                                            >
                                                                {
                                                                    product.wishlist ??
                                                                    0
                                                                }
                                                            </td>


                                                            <td
                                                                style={{
                                                                    border:
                                                                        `1px solid ${theme.border}`,
                                                                    padding:
                                                                        "12px",
                                                                    textAlign:
                                                                        "center",
                                                                }}
                                                            >
                                                                {
                                                                    product.cart ??
                                                                    0
                                                                }
                                                            </td>


                                                            <td
                                                                style={{
                                                                    border:
                                                                        `1px solid ${theme.border}`,
                                                                    padding:
                                                                        "12px",
                                                                    textAlign:
                                                                        "center",
                                                                }}
                                                            >
                                                                {
                                                                    product.purchase ??
                                                                    0
                                                                }
                                                            </td>


                                                            <td
                                                                style={{
                                                                    border:
                                                                        `1px solid ${theme.border}`,
                                                                    padding:
                                                                        "12px",
                                                                    textAlign:
                                                                        "center",
                                                                    fontWeight:
                                                                        "700",
                                                                }}
                                                            >
                                                                {
                                                                    product.total_interactions ??
                                                                    0
                                                                }
                                                            </td>

                                                        </tr>

                                                    );

                                                }
                                            )
                                        }

                                    </tbody>

                                </table>

                            )
                        }

                    </div>

                </div>


                {/* ================================================= */}
                {/* ANALYTICS OVERVIEW */}
                {/* ================================================= */}

                <h2
                    style={{
                        marginBottom:
                            "20px",
                    }}
                >
                    Analytics Overview 📈
                </h2>


                <div
                    style={{
                        display:
                            "grid",
                        gridTemplateColumns:
                            "repeat(auto-fit, minmax(350px, 1fr))",
                        gap:
                            "25px",
                        marginBottom:
                            "40px",
                    }}
                >

                    {/* ORDER STATUS */}

                    <div
                        style={{
                            ...cardStyle,
                        }}
                    >

                        <h3
                            style={{
                                marginTop:
                                    0,
                                marginBottom:
                                    "25px",
                            }}
                        >
                            Orders by Status
                        </h3>


                        {[
                            {
                                name:
                                    "Pending",
                                value:
                                    pendingOrders,
                                percentage:
                                    pendingPercentage,
                                color:
                                    "#f0ad4e",
                            },
                            {
                                name:
                                    "Confirmed",
                                value:
                                    confirmedOrders,
                                percentage:
                                    confirmedPercentage,
                                color:
                                    "#007bff",
                            },
                            {
                                name:
                                    "Shipped",
                                value:
                                    shippedOrders,
                                percentage:
                                    shippedPercentage,
                                color:
                                    "#6f42c1",
                            },
                            {
                                name:
                                    "Delivered",
                                value:
                                    deliveredOrders,
                                percentage:
                                    deliveredPercentage,
                                color:
                                    "#28a745",
                            },
                            {
                                name:
                                    "Cancelled",
                                value:
                                    cancelledOrders,
                                percentage:
                                    cancelledPercentage,
                                color:
                                    "#dc3545",
                            },
                        ].map(
                            (item) => (

                                <div
                                    key={
                                        item.name
                                    }
                                    style={{
                                        marginBottom:
                                            "20px",
                                    }}
                                >

                                    <div
                                        style={{
                                            display:
                                                "flex",
                                            justifyContent:
                                                "space-between",
                                            marginBottom:
                                                "7px",
                                        }}
                                    >

                                        <span>
                                            {
                                                item.name
                                            }
                                        </span>

                                        <strong>
                                            {
                                                item.value
                                            }{" "}
                                            (
                                            {
                                                item.percentage
                                            }%)
                                        </strong>

                                    </div>


                                    <div
                                        style={{
                                            height:
                                                "10px",
                                            backgroundColor:
                                                theme.progressBg,
                                            borderRadius:
                                                "10px",
                                            overflow:
                                                "hidden",
                                        }}
                                    >

                                        <div
                                            style={{
                                                width:
                                                    `${item.percentage}%`,
                                                height:
                                                    "100%",
                                                backgroundColor:
                                                    item.color,
                                                borderRadius:
                                                    "10px",
                                                transition:
                                                    "width 0.5s ease",
                                            }}
                                        />

                                    </div>

                                </div>

                            )
                        )}

                    </div>


                    {/* PAYMENT STATUS */}

                    <div
                        style={{
                            ...cardStyle,
                        }}
                    >

                        <h3
                            style={{
                                marginTop:
                                    0,
                                marginBottom:
                                    "25px",
                            }}
                        >
                            Payment Status
                        </h3>


                        {[
                            {
                                name:
                                    "Successful",
                                value:
                                    successfulPayments,
                                color:
                                    "#28a745",
                            },
                            {
                                name:
                                    "Pending",
                                value:
                                    pendingPayments,
                                color:
                                    "#f0ad4e",
                            },
                            {
                                name:
                                    "Failed",
                                value:
                                    failedPayments,
                                color:
                                    "#dc3545",
                            },
                        ].map(
                            (item) => (

                                <div
                                    key={
                                        item.name
                                    }
                                    style={{
                                        marginBottom:
                                            "20px",
                                    }}
                                >

                                    <div
                                        style={{
                                            display:
                                                "flex",
                                            justifyContent:
                                                "space-between",
                                            marginBottom:
                                                "7px",
                                        }}
                                    >

                                        <span>
                                            {
                                                item.name
                                            }
                                        </span>

                                        <strong>
                                            {
                                                item.value
                                            }
                                        </strong>

                                    </div>


                                    <div
                                        style={{
                                            height:
                                                "10px",
                                            backgroundColor:
                                                theme.progressBg,
                                            borderRadius:
                                                "10px",
                                            overflow:
                                                "hidden",
                                        }}
                                    >

                                        <div
                                            style={{
                                                width:
                                                    `${Math.min(
                                                        100,
                                                        Number(
                                                            item.value
                                                        )
                                                    )}%`,
                                                height:
                                                    "100%",
                                                backgroundColor:
                                                    item.color,
                                                borderRadius:
                                                    "10px",
                                            }}
                                        />

                                    </div>

                                </div>

                            )
                        )}

                    </div>

                </div>


                {/* ================================================= */}
                {/* RECENT SALES */}
                {/* ================================================= */}

                <div
                    style={{
                        ...cardStyle,
                        marginBottom:
                            "40px",
                    }}
                >

                    <h3
                        style={{
                            marginTop:
                                0,
                            marginBottom:
                                "25px",
                        }}
                    >
                        Recent Orders Revenue 📊
                    </h3>


                    {
                        orders.length === 0 ? (

                            <p
                                style={{
                                    color:
                                        theme.secondaryText,
                                }}
                            >
                                No sales data available.
                            </p>

                        ) : (

                            orders.map(
                                (order) => {

                                    const orderId =
                                        order.order_id ||
                                        order.id;


                                    const amount =
                                        Number(
                                            order.total_amount
                                        ) || 0;


                                    const width =
                                        getSalesWidth(
                                            amount
                                        );


                                    return (

                                        <div
                                            key={
                                                orderId
                                            }
                                            style={{
                                                marginBottom:
                                                    "18px",
                                            }}
                                        >

                                            <div
                                                style={{
                                                    display:
                                                        "flex",
                                                    justifyContent:
                                                        "space-between",
                                                    marginBottom:
                                                        "7px",
                                                }}
                                            >

                                                <span>
                                                    Order #
                                                    {
                                                        orderId
                                                    }
                                                </span>

                                                <strong>
                                                    ₹
                                                    {
                                                        amount
                                                    }
                                                </strong>

                                            </div>


                                            <div
                                                style={{
                                                    width:
                                                        "100%",
                                                    height:
                                                        "12px",
                                                    backgroundColor:
                                                        theme.progressBg,
                                                    borderRadius:
                                                        "10px",
                                                    overflow:
                                                        "hidden",
                                                }}
                                            >

                                                <div
                                                    style={{
                                                        width:
                                                            `${width}%`,
                                                        height:
                                                            "100%",
                                                        backgroundColor:
                                                            "#007bff",
                                                        borderRadius:
                                                            "10px",
                                                        transition:
                                                            "width 0.5s ease",
                                                    }}
                                                />

                                            </div>

                                        </div>

                                    );

                                }
                            )

                        )
                    }

                </div>


                {/* ================================================= */}
                {/* RECENT ORDERS */}
                {/* ================================================= */}

                <div>

                    <h2
                        style={{
                            marginBottom:
                                "20px",
                        }}
                    >
                        Recent Orders 📦
                    </h2>


                    {
                        orders.length === 0 ? (

                            <div
                                style={{
                                    ...cardStyle,
                                    textAlign:
                                        "center",
                                }}
                            >

                                <p>
                                    No recent orders found.
                                </p>

                            </div>

                        ) : (

                            <div
                                style={{
                                    overflowX:
                                        "auto",
                                    borderRadius:
                                        "16px",
                                }}
                            >

                                <table
                                    style={{
                                        width:
                                            "100%",
                                        borderCollapse:
                                            "collapse",
                                        minWidth:
                                            "900px",
                                        backgroundColor:
                                            theme.card,
                                        color:
                                            theme.text,
                                    }}
                                >

                                    <thead>

                                        <tr>

                                            {[
                                                "Order ID",
                                                "Customer",
                                                "Email",
                                                "Amount",
                                                "Status",
                                                "Date",
                                            ].map(
                                                (
                                                    heading
                                                ) => (

                                                    <th
                                                        key={
                                                            heading
                                                        }
                                                        style={{
                                                            border:
                                                                `1px solid ${theme.border}`,
                                                            padding:
                                                                "12px",
                                                            textAlign:
                                                                "left",
                                                            backgroundColor:
                                                                theme.tableHeader,
                                                            color:
                                                                theme.text,
                                                        }}
                                                    >
                                                        {
                                                            heading
                                                        }
                                                    </th>

                                                )
                                            )}

                                        </tr>

                                    </thead>


                                    <tbody>

                                        {
                                            orders.map(
                                                (
                                                    order
                                                ) => {

                                                    const orderId =
                                                        order.order_id ||
                                                        order.id;


                                                    const customer =
                                                        order.customer ||
                                                        order.username ||
                                                        order.user ||
                                                        "-";


                                                    const email =
                                                        order.email ||
                                                        "-";


                                                    return (

                                                        <tr
                                                            key={
                                                                orderId
                                                            }
                                                            onMouseEnter={(
                                                                event
                                                            ) => {
                                                                event.currentTarget.style.backgroundColor =
                                                                    theme.tableHover;
                                                            }}
                                                            onMouseLeave={(
                                                                event
                                                            ) => {
                                                                event.currentTarget.style.backgroundColor =
                                                                    "transparent";
                                                            }}
                                                        >

                                                            <td
                                                                style={{
                                                                    border:
                                                                        `1px solid ${theme.border}`,
                                                                    padding:
                                                                        "12px",
                                                                }}
                                                            >
                                                                #
                                                                {
                                                                    orderId
                                                                }
                                                            </td>


                                                            <td
                                                                style={{
                                                                    border:
                                                                        `1px solid ${theme.border}`,
                                                                    padding:
                                                                        "12px",
                                                                }}
                                                            >
                                                                {
                                                                    customer
                                                                }
                                                            </td>


                                                            <td
                                                                style={{
                                                                    border:
                                                                        `1px solid ${theme.border}`,
                                                                    padding:
                                                                        "12px",
                                                                }}
                                                            >
                                                                {
                                                                    email
                                                                }
                                                            </td>


                                                            <td
                                                                style={{
                                                                    border:
                                                                        `1px solid ${theme.border}`,
                                                                    padding:
                                                                        "12px",
                                                                    fontWeight:
                                                                        "600",
                                                                }}
                                                            >
                                                                ₹
                                                                {
                                                                    order.total_amount ??
                                                                    0
                                                                }
                                                            </td>


                                                            <td
                                                                style={{
                                                                    border:
                                                                        `1px solid ${theme.border}`,
                                                                    padding:
                                                                        "12px",
                                                                }}
                                                            >

                                                                <select
                                                                    value={
                                                                        order.status ||
                                                                        "Pending"
                                                                    }
                                                                    disabled={
                                                                        updatingOrder ===
                                                                        orderId
                                                                    }
                                                                    onChange={(
                                                                        event
                                                                    ) =>
                                                                        handleStatusChange(
                                                                            orderId,
                                                                            event.target.value
                                                                        )
                                                                    }
                                                                    style={{
                                                                        padding:
                                                                            "8px 10px",
                                                                        borderRadius:
                                                                            "7px",
                                                                        border:
                                                                            `1px solid ${theme.border}`,
                                                                        backgroundColor:
                                                                            theme.input,
                                                                        color:
                                                                            theme.text,
                                                                        cursor:
                                                                            updatingOrder ===
                                                                            orderId
                                                                                ? "not-allowed"
                                                                                : "pointer",
                                                                    }}
                                                                >

                                                                    <option value="Pending">
                                                                        Pending
                                                                    </option>

                                                                    <option value="Confirmed">
                                                                        Confirmed
                                                                    </option>

                                                                    <option value="Shipped">
                                                                        Shipped
                                                                    </option>

                                                                    <option value="Delivered">
                                                                        Delivered
                                                                    </option>

                                                                    <option value="Cancelled">
                                                                        Cancelled
                                                                    </option>

                                                                </select>

                                                            </td>


                                                            <td
                                                                style={{
                                                                    border:
                                                                        `1px solid ${theme.border}`,
                                                                    padding:
                                                                        "12px",
                                                                }}
                                                            >

                                                                {
                                                                    order.created_at
                                                                        ? new Date(
                                                                            order.created_at
                                                                        ).toLocaleString()
                                                                        : "-"
                                                                }

                                                            </td>

                                                        </tr>

                                                    );

                                                }
                                            )
                                        }

                                    </tbody>

                                </table>

                            </div>

                        )
                    }

                </div>

            </div>

        </div>

    );

}


export default AdminDashboard;