import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    getAdminDashboard,
    getAdminAnalytics,
    getRecentOrders,
    updateOrderStatus,
    sendDeliveryOTP,
    verifyDeliveryOTP,
    getRecommendationAnalytics,
    getDeliveryIssueClaims,
    reviewDeliveryIssueClaim,
} from "../services/adminApi";

function AdminDashboard() {
    const navigate = useNavigate();

    const [dashboard, setDashboard] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [orders, setOrders] = useState([]);
    const [deliveryClaims, setDeliveryClaims] = useState([]);
    const [refundDates, setRefundDates] = useState({});
    const [claimNotes, setClaimNotes] = useState({});
    const [reviewingClaim, setReviewingClaim] = useState(null);
    const [recommendationAnalytics, setRecommendationAnalytics] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updatingOrder, setUpdatingOrder] = useState(null);

    const [sendingOTPOrder, setSendingOTPOrder] = useState(null);
    const [verifyingOTPOrder, setVerifyingOTPOrder] = useState(null);
    const [otpInputs, setOtpInputs] = useState({});
    const [otpSentOrders, setOtpSentOrders] = useState({});
    const [deliveryPhones, setDeliveryPhones] = useState({});

    const [darkMode, setDarkMode] = useState(() => {
        const savedTheme = localStorage.getItem("admin_dashboard_theme");
        return savedTheme === "dark";
    });

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
              shadow: "0 10px 30px rgba(0,0,0,0.35)",
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
              shadow: "0 8px 25px rgba(15,23,42,0.08)",
          };

    useEffect(() => {
        localStorage.setItem(
            "admin_dashboard_theme",
            darkMode ? "dark" : "light"
        );
    }, [darkMode]);

    const loadDashboard = async () => {
        try {
            setLoading(true);
            setError("");

            const [
                dashboardResponse,
                analyticsResponse,
                ordersResponse,
                recommendationResponse,
                claimsResponse,
            ] = await Promise.all([
                getAdminDashboard(),
                getAdminAnalytics(),
                getRecentOrders(),
                getRecommendationAnalytics(),
                getDeliveryIssueClaims().catch((claimError) => {
                    console.error("Delivery Issue Claims Error:", claimError);
                    return [];
                }),
            ]);

            const dashboardData =
                dashboardResponse?.data ||
                dashboardResponse ||
                {};

            const analyticsData =
                analyticsResponse?.data ||
                analyticsResponse ||
                {};

            const recentOrders = Array.isArray(ordersResponse)
                ? ordersResponse
                : ordersResponse?.results ||
                  ordersResponse?.recent_orders ||
                  ordersResponse?.orders ||
                  ordersResponse?.data ||
                  [];

            const recommendationData =
                recommendationResponse?.data ||
                recommendationResponse ||
                {};

            setDashboard(dashboardData);
            setAnalytics(analyticsData);
            setOrders(recentOrders);
            setDeliveryClaims(
                Array.isArray(claimsResponse)
                    ? claimsResponse
                    : claimsResponse?.results || []
            );
            setRecommendationAnalytics(recommendationData);
        } catch (error) {
            console.error("Admin Dashboard Error:", error);

            setError(
                error.message ||
                    "Failed to load admin dashboard."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem("access_token");

        if (!token) {
            setLoading(false);
            setError(
                "Please login to access Admin Dashboard."
            );
            return;
        }

        loadDashboard();
    }, []);

    const handleStatusChange = async (orderId, newStatus) => {
        if (newStatus === "Delivered") {
            alert(
                "Order can only be marked as Delivered after successful delivery OTP verification."
            );
            return;
        }

        try {
            setUpdatingOrder(orderId);

            await updateOrderStatus(orderId, newStatus);

            setDeliveryPhones((previous) => ({
                ...previous,
                [orderId]: "",
            }));

            setOtpInputs((previous) => ({
                ...previous,
                [orderId]: "",
            }));

            setOtpSentOrders((previous) => ({
                ...previous,
                [orderId]: false,
            }));

            await loadDashboard();

            alert("Order status updated successfully.");
        } catch (error) {
            console.error("Status Update Error:", error);

            alert(
                error.message ||
                    "Failed to update order status."
            );
        } finally {
            setUpdatingOrder(null);
        }
    };

    const handleSendDeliveryOTP = async (orderId) => {
        const phone = String(
            deliveryPhones[orderId] || ""
        ).trim();

        if (!phone) {
            alert("Please enter the delivery phone number.");
            return;
        }

        try {
            setSendingOTPOrder(orderId);

            const response = await sendDeliveryOTP(
                orderId,
                phone
            );

            setOtpSentOrders((previous) => ({
                ...previous,
                [orderId]: true,
            }));

            setOtpInputs((previous) => ({
                ...previous,
                [orderId]: "",
            }));

            alert(
                response?.message ||
                    "Delivery OTP sent successfully to the entered phone number."
            );
        } catch (error) {
            console.error(
                "Send Delivery OTP Error:",
                error
            );

            alert(
                error.message ||
                    "Failed to send delivery OTP."
            );
        } finally {
            setSendingOTPOrder(null);
        }
    };

    const handleVerifyDeliveryOTP = async (orderId) => {
        const otp = String(
            otpInputs[orderId] || ""
        ).trim();

        if (!otp) {
            alert(
                "Please enter the 6-digit delivery OTP."
            );
            return;
        }

        if (!/^\d{6}$/.test(otp)) {
            alert(
                "Delivery OTP must be a valid 6-digit number."
            );
            return;
        }

        try {
            setVerifyingOTPOrder(orderId);

            const response = await verifyDeliveryOTP(
                orderId,
                otp
            );

            setOtpInputs((previous) => ({
                ...previous,
                [orderId]: "",
            }));

            setOtpSentOrders((previous) => ({
                ...previous,
                [orderId]: false,
            }));

            await loadDashboard();

            alert(
                response?.message ||
                    "Delivery OTP verified successfully. Order has been marked as Delivered."
            );
        } catch (error) {
            console.error(
                "Verify Delivery OTP Error:",
                error
            );

            alert(
                error.message ||
                    "Failed to verify delivery OTP."
            );
        } finally {
            setVerifyingOTPOrder(null);
        }
    };

    const handleReviewDeliveryClaim = async (claim, decision) => {
        const defaultRefundDate = new Date();
        defaultRefundDate.setDate(defaultRefundDate.getDate() + 7);

        const refundDate =
            refundDates[claim.id] ||
            defaultRefundDate.toISOString().slice(0, 10);

        try {
            setReviewingClaim(claim.id);
            const updatedClaim = await reviewDeliveryIssueClaim(
                claim.id,
                {
                    decision,
                    refund_processing_date:
                        decision === "approved" ? refundDate : null,
                    admin_note: claimNotes[claim.id] || "",
                }
            );

            setDeliveryClaims((previous) =>
                previous.map((item) =>
                    item.id === claim.id ? updatedClaim : item
                )
            );
        } catch (reviewError) {
            alert(
                reviewError.message ||
                    "Unable to update this delivery issue report."
            );
        } finally {
            setReviewingClaim(null);
        }
    };

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
                }}
            >
                <div style={{ textAlign: "center" }}>
                    <div
                        style={{
                            width: "50px",
                            height: "50px",
                            borderRadius: "50%",
                            border: `4px solid ${theme.border}`,
                            borderTopColor: "#007bff",
                            animation:
                                "adminSpin 1s linear infinite",
                            margin: "0 auto 20px",
                        }}
                    />

                    <h2>
                        Loading Admin Dashboard...
                    </h2>

                    <p
                        style={{
                            color: theme.secondaryText,
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

    if (error) {
        return (
            <div
                style={{
                    minHeight: "70vh",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "20px",
                    backgroundColor: theme.page,
                    color: theme.text,
                }}
            >
                <div
                    style={{
                        width: "100%",
                        maxWidth: "600px",
                        padding: "35px",
                        textAlign: "center",
                        border: `1px solid ${theme.border}`,
                        borderRadius: "18px",
                        backgroundColor: theme.card,
                        boxShadow: theme.shadow,
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
                            color: theme.secondaryText,
                            marginBottom: "25px",
                        }}
                    >
                        {error}
                    </p>

                    <button
                        onClick={loadDashboard}
                        style={{
                            padding: "12px 24px",
                            cursor: "pointer",
                            border: "none",
                            borderRadius: "8px",
                            backgroundColor: "#007bff",
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

    const totalOrders =
        dashboard?.total_orders ?? 0;

    const totalRevenue =
        dashboard?.total_sales ??
        dashboard?.total_revenue ??
        0;

    const pendingOrders =
        dashboard?.pending_orders ?? 0;

    const confirmedOrders =
        dashboard?.confirmed_orders ?? 0;

    const shippedOrders =
        dashboard?.shipped_orders ?? 0;

    const deliveredOrders =
        dashboard?.delivered_orders ?? 0;

    const cancelledOrders =
        dashboard?.cancelled_orders ?? 0;

    const successfulPayments =
        analytics?.successful_payments ?? 0;

    const pendingPayments =
        analytics?.pending_payments ?? 0;

    const failedPayments =
        analytics?.failed_payments ?? 0;

    const totalSales =
        analytics?.total_sales ?? 0;

    const recommendationSummary =
        recommendationAnalytics?.summary || {};

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

    const recommendationPurchaseTracked =
        Number(
            recommendationSummary.recommendation_purchase
        ) || 0;

    const getRecommendationPercentage = (value) => {
        if (
            totalRecommendationInteractions ===
            0
        ) {
            return 0;
        }

        return Math.round(
            (Number(value) /
                totalRecommendationInteractions) *
                100
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

    const getProductInteractionWidth = (amount) => {
        if (
            maximumProductInteractions ===
            0
        ) {
            return 0;
        }

        return Math.max(
            5,
            Math.round(
                (Number(amount) /
                    maximumProductInteractions) *
                    100
            )
        );
    };

    const safeTotalOrders =
        Number(totalOrders) || 0;

    const getOrderPercentage = (value) => {
        if (safeTotalOrders === 0) {
            return 0;
        }

        return Math.round(
            (Number(value) /
                safeTotalOrders) *
                100
        );
    };

    const pendingPercentage =
        getOrderPercentage(pendingOrders);

    const confirmedPercentage =
        getOrderPercentage(confirmedOrders);

    const shippedPercentage =
        getOrderPercentage(shippedOrders);

    const deliveredPercentage =
        getOrderPercentage(deliveredOrders);

    const cancelledPercentage =
        getOrderPercentage(cancelledOrders);

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

    const getSalesWidth = (amount) => {
        if (
            maximumRecentOrderAmount ===
            0
        ) {
            return 0;
        }

        return Math.max(
            5,
            Math.round(
                (Number(amount) /
                    maximumRecentOrderAmount) *
                    100
            )
        );
    };

    const cardStyle = {
        padding: "25px",
        border: `1px solid ${theme.border}`,
        borderRadius: "16px",
        backgroundColor: theme.card,
        color: theme.text,
        boxShadow: theme.shadow,
        transition: "all 0.25s ease",
    };

    const handleCardEnter = (event) => {
        event.currentTarget.style.transform =
            "translateY(-5px)";

        event.currentTarget.style.boxShadow =
            darkMode
                ? "0 14px 35px rgba(0,0,0,0.45)"
                : "0 14px 35px rgba(15,23,42,0.12)";
    };

    const handleCardLeave = (event) => {
        event.currentTarget.style.transform =
            "translateY(0)";

        event.currentTarget.style.boxShadow =
            theme.shadow;
    };

    const getStatusStyle = (statusValue) => {
        if (statusValue === "Delivered") {
            return {
                backgroundColor: "#dcfce7",
                color: "#166534",
            };
        }

        if (statusValue === "Shipped") {
            return {
                backgroundColor: "#dbeafe",
                color: "#1d4ed8",
            };
        }

        if (statusValue === "Confirmed") {
            return {
                backgroundColor: "#fef3c7",
                color: "#92400e",
            };
        }

        if (statusValue === "Cancelled") {
            return {
                backgroundColor: "#fee2e2",
                color: "#991b1b",
            };
        }

        return {
            backgroundColor: "#f3f4f6",
            color: "#374151",
        };
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                backgroundColor: theme.page,
                color: theme.text,
                padding: "30px 20px 60px",
            }}
        >
            <div
                style={{
                    maxWidth: "1300px",
                    margin: "0 auto",
                }}
            >
                <div
                    style={{
                        marginBottom: "35px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "20px",
                            flexWrap: "wrap",
                        }}
                    >
                        <div>
                            <h1
                                style={{
                                    margin: "0 0 8px",
                                    fontSize: "34px",
                                    letterSpacing: "-0.5px",
                                }}
                            >
                                Admin Dashboard 📊
                            </h1>

                            <p
                                style={{
                                    color: theme.secondaryText,
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
                                flexWrap: "wrap",
                            }}
                        >
                            <button
                                onClick={() =>
                                    setDarkMode(
                                        (previous) =>
                                            !previous
                                    )
                                }
                                style={{
                                    padding: "12px 18px",
                                    border: `1px solid ${theme.border}`,
                                    borderRadius: "10px",
                                    backgroundColor: theme.card,
                                    color: theme.text,
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                }}
                            >
                                {darkMode
                                    ? "☀️ Light Mode"
                                    : "🌙 Dark Mode"}
                            </button>

                            <button
                                onClick={() =>
                                    navigate(
                                        "/admin/products"
                                    )
                                }
                                style={{
                                    padding: "12px 20px",
                                    border: "none",
                                    borderRadius: "10px",
                                    background:
                                        "linear-gradient(135deg, #007bff, #0056d6)",
                                    color: "#fff",
                                    fontSize: "15px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                }}
                            >
                                🛍️ Manage Products
                            </button>
                        </div>
                    </div>
                </div>

                <h2
                    style={{
                        marginBottom: "20px",
                    }}
                >
                    Order Statistics
                </h2>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: "20px",
                        marginBottom: "40px",
                    }}
                >
                    {[
                        {
                            title: "Total Orders",
                            value: totalOrders,
                            icon: "📦",
                        },
                        {
                            title: "Total Revenue",
                            value: `₹${totalRevenue}`,
                            icon: "💰",
                        },
                        {
                            title: "Pending Orders",
                            value: pendingOrders,
                            icon: "⏳",
                        },
                        {
                            title: "Confirmed Orders",
                            value: confirmedOrders,
                            icon: "✅",
                        },
                        {
                            title: "Shipped Orders",
                            value: shippedOrders,
                            icon: "🚚",
                        },
                        {
                            title: "Delivered Orders",
                            value: deliveredOrders,
                            icon: "🎉",
                        },
                    ].map((item) => (
                        <div
                            key={item.title}
                            style={{
                                ...cardStyle,
                                cursor: "default",
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
                                    display: "flex",
                                    justifyContent:
                                        "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <p
                                    style={{
                                        margin: 0,
                                        color: theme.secondaryText,
                                    }}
                                >
                                    {item.title}
                                </p>

                                <span
                                    style={{
                                        fontSize: "25px",
                                    }}
                                >
                                    {item.icon}
                                </span>
                            </div>

                            <h2
                                style={{
                                    margin:
                                        "12px 0 0",
                                    fontSize: "32px",
                                }}
                            >
                                {item.value}
                            </h2>
                        </div>
                    ))}
                </div>

                <h2
                    style={{
                        marginBottom: "20px",
                    }}
                >
                    Payment Analytics 💳
                </h2>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: "20px",
                        marginBottom: "40px",
                    }}
                >
                    {[
                        {
                            title: "Total Sales",
                            value: `₹${totalSales}`,
                            icon: "💰",
                        },
                        {
                            title: "Successful Payments",
                            value: successfulPayments,
                            icon: "✅",
                        },
                        {
                            title: "Pending Payments",
                            value: pendingPayments,
                            icon: "⏳",
                        },
                        {
                            title: "Failed Payments",
                            value: failedPayments,
                            icon: "❌",
                        },
                    ].map((item) => (
                        <div
                            key={item.title}
                            style={cardStyle}
                            onMouseEnter={
                                handleCardEnter
                            }
                            onMouseLeave={
                                handleCardLeave
                            }
                        >
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent:
                                        "space-between",
                                }}
                            >
                                <p
                                    style={{
                                        margin: 0,
                                        color: theme.secondaryText,
                                    }}
                                >
                                    {item.title}
                                </p>

                                <span
                                    style={{
                                        fontSize: "24px",
                                    }}
                                >
                                    {item.icon}
                                </span>
                            </div>

                            <h2
                                style={{
                                    margin:
                                        "12px 0 0",
                                    fontSize: "32px",
                                }}
                            >
                                {item.value}
                            </h2>
                        </div>
                    ))}
                </div>

                <div
                    style={{
                        marginBottom: "40px",
                    }}
                >
                    <h2>
                        Recommendation Analytics
                        🤖📊
                    </h2>

                    <p
                        style={{
                            color: theme.secondaryText,
                        }}
                    >
                        Monitor recommendation
                        performance and user activity.
                    </p>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(auto-fit, minmax(220px, 1fr))",
                            gap: "20px",
                            marginBottom: "25px",
                        }}
                    >
                        {[
                            {
                                title: "Impressions",
                                value:
                                    recommendationImpressions,
                                icon: "👁️",
                            },
                            {
                                title: "Clicks",
                                value:
                                    recommendationClicks,
                                icon: "🖱️",
                            },
                            {
                                title: "CTR",
                                value:
                                    `${recommendationCTR.toFixed(
                                        2
                                    )}%`,
                                icon: "📈",
                            },
                            {
                                title: "Purchases",
                                value:
                                    recommendationPurchaseTracked,
                                icon: "🛍️",
                            },
                        ].map((item) => (
                            <div
                                key={item.title}
                                style={cardStyle}
                                onMouseEnter={
                                    handleCardEnter
                                }
                                onMouseLeave={
                                    handleCardLeave
                                }
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent:
                                            "space-between",
                                    }}
                                >
                                    <span
                                        style={{
                                            color:
                                                theme.secondaryText,
                                            fontWeight: "600",
                                        }}
                                    >
                                        {item.title}
                                    </span>

                                    <span
                                        style={{
                                            fontSize: "28px",
                                        }}
                                    >
                                        {item.icon}
                                    </span>
                                </div>

                                <h2
                                    style={{
                                        fontSize: "32px",
                                        margin:
                                            "12px 0 0",
                                    }}
                                >
                                    {item.value}
                                </h2>
                            </div>
                        ))}
                    </div>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(auto-fit, minmax(200px, 1fr))",
                            gap: "20px",
                            marginBottom: "25px",
                        }}
                    >
                        {[
                            {
                                title:
                                    "Total Interactions",
                                value:
                                    totalRecommendationInteractions,
                                icon: "⚡",
                            },
                            {
                                title:
                                    "Product Views",
                                value:
                                    recommendationViews,
                                icon: "👁️",
                            },
                            {
                                title:
                                    "Wishlist",
                                value:
                                    recommendationWishlist,
                                icon: "❤️",
                            },
                            {
                                title:
                                    "Cart",
                                value:
                                    recommendationCart,
                                icon: "🛒",
                            },
                            {
                                title:
                                    "Purchase",
                                value:
                                    recommendationPurchase,
                                icon: "🛍️",
                            },
                        ].map((item) => (
                            <div
                                key={item.title}
                                style={cardStyle}
                                onMouseEnter={
                                    handleCardEnter
                                }
                                onMouseLeave={
                                    handleCardLeave
                                }
                            >
                                <div
                                    style={{
                                        display: "flex",
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
                                        {item.title}
                                    </p>

                                    <span>
                                        {item.icon}
                                    </span>
                                </div>

                                <h2
                                    style={{
                                        margin:
                                            "10px 0 0",
                                        fontSize: "32px",
                                    }}
                                >
                                    {item.value}
                                </h2>
                            </div>
                        ))}
                    </div>

                    <div
                        style={{
                            ...cardStyle,
                            marginBottom: "25px",
                        }}
                    >
                        <h3
                            style={{
                                marginTop: 0,
                                marginBottom: "25px",
                            }}
                        >
                            Interaction Distribution
                        </h3>

                        {[
                            {
                                label: "👁️ Views",
                                value:
                                    recommendationViews,
                                percentage:
                                    recommendationViewPercentage,
                            },
                            {
                                label:
                                    "❤️ Wishlist",
                                value:
                                    recommendationWishlist,
                                percentage:
                                    recommendationWishlistPercentage,
                            },
                            {
                                label: "🛒 Cart",
                                value:
                                    recommendationCart,
                                percentage:
                                    recommendationCartPercentage,
                            },
                            {
                                label:
                                    "🛍️ Purchase",
                                value:
                                    recommendationPurchase,
                                percentage:
                                    recommendationPurchasePercentage,
                            },
                        ].map((item) => (
                            <div
                                key={item.label}
                                style={{
                                    marginBottom:
                                        "20px",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent:
                                            "space-between",
                                        marginBottom:
                                            "7px",
                                    }}
                                >
                                    <span
                                        style={{
                                            color:
                                                theme.secondaryText,
                                        }}
                                    >
                                        {item.label}
                                    </span>

                                    <span
                                        style={{
                                            color:
                                                theme.text,
                                            fontWeight:
                                                "600",
                                        }}
                                    >
                                        {item.value} (
                                        {
                                            item.percentage
                                        }
                                        %)
                                    </span>
                                </div>

                                <div
                                    style={{
                                        height: "8px",
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
                                            width: `${item.percentage}%`,
                                            height: "100%",
                                            backgroundColor:
                                                "#007bff",
                                            borderRadius:
                                                "10px",
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={cardStyle}>
                        <h3
                            style={{
                                marginTop: 0,
                                marginBottom:
                                    "20px",
                            }}
                        >
                            Top Recommended Products
                        </h3>

                        {recommendationTopProducts.length ===
                        0 ? (
                            <p
                                style={{
                                    color:
                                        theme.mutedText,
                                }}
                            >
                                No recommendation
                                product data available.
                            </p>
                        ) : (
                            recommendationTopProducts.map(
                                (product, index) => {
                                    const amount =
                                        Number(
                                            product.total_interactions
                                        ) || 0;

                                    return (
                                        <div
                                            key={
                                                product.product_id ||
                                                product.id ||
                                                index
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
                                                    gap: "10px",
                                                    marginBottom:
                                                        "7px",
                                                }}
                                            >
                                                <span>
                                                    {index +
                                                        1}.{" "}
                                                    {product.product_name ||
                                                        product.name ||
                                                        `Product ${product.product_id}`}
                                                </span>

                                                <strong>
                                                    {amount}
                                                </strong>
                                            </div>

                                            <div
                                                style={{
                                                    height:
                                                        "8px",
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
                                                        width: `${getProductInteractionWidth(
                                                            amount
                                                        )}%`,
                                                        height:
                                                            "100%",
                                                        backgroundColor:
                                                            "#6f42c1",
                                                        borderRadius:
                                                            "10px",
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                }
                            )
                        )}
                    </div>
                </div>

                <h2
                    style={{
                        marginBottom: "20px",
                    }}
                >
                    Order Status Overview
                </h2>

                <div
                    style={{
                        ...cardStyle,
                        marginBottom: "40px",
                    }}
                >
                    {[
                        {
                            label: "Pending",
                            value: pendingOrders,
                            percentage:
                                pendingPercentage,
                        },
                        {
                            label: "Confirmed",
                            value: confirmedOrders,
                            percentage:
                                confirmedPercentage,
                        },
                        {
                            label: "Shipped",
                            value: shippedOrders,
                            percentage:
                                shippedPercentage,
                        },
                        {
                            label: "Delivered",
                            value: deliveredOrders,
                            percentage:
                                deliveredPercentage,
                        },
                        {
                            label: "Cancelled",
                            value: cancelledOrders,
                            percentage:
                                cancelledPercentage,
                        },
                    ].map((item) => (
                        <div
                            key={item.label}
                            style={{
                                marginBottom: "20px",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent:
                                        "space-between",
                                    marginBottom: "7px",
                                }}
                            >
                                <span>
                                    {item.label}
                                </span>

                                <strong>
                                    {item.value} (
                                    {item.percentage}%)
                                </strong>
                            </div>

                            <div
                                style={{
                                    height: "8px",
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
                                        width: `${item.percentage}%`,
                                        height: "100%",
                                        backgroundColor:
                                            "#007bff",
                                        borderRadius:
                                            "10px",
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <h2
                    style={{
                        marginBottom: "20px",
                    }}
                >
                    Recent Sales 💰
                </h2>

                <div
                    style={{
                        ...cardStyle,
                        marginBottom: "40px",
                    }}
                >
                    {orders.length === 0 ? (
                        <p
                            style={{
                                color:
                                    theme.mutedText,
                            }}
                        >
                            No recent sales available.
                        </p>
                    ) : (
                        orders.map((order) => (
                            <div
                                key={order.id}
                                style={{
                                    marginBottom:
                                        "18px",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent:
                                            "space-between",
                                        gap: "15px",
                                        marginBottom:
                                            "7px",
                                    }}
                                >
                                    <span>
                                        Order #
                                        {order.id}
                                    </span>

                                    <strong>
                                        ₹
                                        {
                                            order.total_amount
                                        }
                                    </strong>
                                </div>

                                <div
                                    style={{
                                        height: "8px",
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
                                            width: `${getSalesWidth(
                                                order.total_amount
                                            )}%`,
                                            height: "100%",
                                            backgroundColor:
                                                "#28a745",
                                            borderRadius:
                                                "10px",
                                        }}
                                    />
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div
                    style={{
                        display: "flex",
                        justifyContent:
                            "space-between",
                        alignItems: "center",
                        gap: "15px",
                        flexWrap: "wrap",
                        marginBottom: "20px",
                    }}
                >
                    <div>
                        <h2
                            style={{
                                margin: 0,
                            }}
                        >
                            Recent Orders 📦
                        </h2>

                        <p
                            style={{
                                color:
                                    theme.secondaryText,
                                marginTop: "8px",
                            }}
                        >
                            Manage order status and
                            complete delivery verification.
                        </p>
                    </div>
                </div>

                <div
                    style={{
                        overflowX: "auto",
                        border: `1px solid ${theme.border}`,
                        borderRadius: "16px",
                        backgroundColor: theme.card,
                        boxShadow: theme.shadow,
                    }}
                >
                    <table
                        style={{
                            width: "100%",
                            borderCollapse:
                                "collapse",
                            minWidth: "1250px",
                        }}
                    >
                        <thead>
                            <tr
                                style={{
                                    backgroundColor:
                                        theme.tableHeader,
                                }}
                            >
                                <th style={thStyle}>
                                    Order
                                </th>

                                <th style={thStyle}>
                                    Customer
                                </th>

                                <th style={thStyle}>
                                    Amount
                                </th>

                                <th style={thStyle}>
                                    Payment
                                </th>

                                <th style={thStyle}>
                                    Status
                                </th>

                                <th style={thStyle}>
                                    Delivery Verification
                                </th>

                                <th style={thStyle}>
                                    Date
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {orders.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan="7"
                                        style={{
                                            padding:
                                                "40px",
                                            textAlign:
                                                "center",
                                            color:
                                                theme.mutedText,
                                        }}
                                    >
                                        No recent orders
                                        found.
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => {
                                    const statusValue =
                                        order.status ||
                                        "Pending";

                                    const paymentStatus =
                                        order.payment_status ||
                                        "Pending";

                                    const isShipped =
                                        statusValue ===
                                        "Shipped";

                                    const isDelivered =
                                        statusValue ===
                                        "Delivered";

                                    const otpSent =
                                        Boolean(
                                            otpSentOrders[
                                                order.id
                                            ]
                                        );

                                    const isSending =
                                        sendingOTPOrder ===
                                        order.id;

                                    const isVerifying =
                                        verifyingOTPOrder ===
                                        order.id;

                                    return (
                                        <tr
                                            key={
                                                order.id
                                            }
                                            style={{
                                                borderTop: `1px solid ${theme.border}`,
                                            }}
                                        >
                                            <td
                                                style={
                                                    tdStyle
                                                }
                                            >
                                                <strong>
                                                    #
                                                    {
                                                        order.id
                                                    }
                                                </strong>
                                            </td>

                                            <td
                                                style={
                                                    tdStyle
                                                }
                                            >
                                                <div
                                                    style={{
                                                        fontWeight:
                                                            "600",
                                                    }}
                                                >
                                                    {order.username ||
                                                        order.user_name ||
                                                        order.user?.username ||
                                                        "Customer"}
                                                </div>

                                                <div
                                                    style={{
                                                        color:
                                                            theme.mutedText,
                                                        fontSize:
                                                            "12px",
                                                        marginTop:
                                                            "4px",
                                                    }}
                                                >
                                                    {order.city ||
                                                        ""}
                                                </div>
                                            </td>

                                            <td
                                                style={
                                                    tdStyle
                                                }
                                            >
                                                <strong>
                                                    ₹
                                                    {
                                                        order.total_amount
                                                    }
                                                </strong>
                                            </td>

                                            <td
                                                style={
                                                    tdStyle
                                                }
                                            >
                                                <span
                                                    style={{
                                                        ...getStatusStyle(
                                                            paymentStatus ===
                                                                "Success"
                                                                ? "Delivered"
                                                                : paymentStatus
                                                        ),
                                                        padding:
                                                            "6px 10px",
                                                        borderRadius:
                                                            "20px",
                                                        fontSize:
                                                            "12px",
                                                        fontWeight:
                                                            "600",
                                                    }}
                                                >
                                                    {paymentStatus}
                                                </span>
                                            </td>

                                            <td
                                                style={
                                                    tdStyle
                                                }
                                            >
                                                {isDelivered ? (
                                                    <span
                                                        style={{
                                                            ...getStatusStyle(
                                                                "Delivered"
                                                            ),
                                                            padding:
                                                                "7px 12px",
                                                            borderRadius:
                                                                "20px",
                                                            fontWeight:
                                                                "700",
                                                            fontSize:
                                                                "12px",
                                                        }}
                                                    >
                                                        Delivered
                                                    </span>
                                                ) : (
                                                    <select
                                                        value={
                                                            statusValue
                                                        }
                                                        disabled={
                                                            updatingOrder ===
                                                            order.id
                                                        }
                                                        onChange={(
                                                            event
                                                        ) =>
                                                            handleStatusChange(
                                                                order.id,
                                                                event
                                                                    .target
                                                                    .value
                                                            )
                                                        }
                                                        style={{
                                                            padding:
                                                                "9px 12px",
                                                            border: `1px solid ${theme.border}`,
                                                            borderRadius:
                                                                "8px",
                                                            backgroundColor:
                                                                theme.input,
                                                            color:
                                                                theme.text,
                                                            cursor:
                                                                "pointer",
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
                                                        <option value="Cancelled">
                                                            Cancelled
                                                        </option>
                                                    </select>
                                                )}
                                            </td>

                                            <td
                                                style={{
                                                    ...tdStyle,
                                                    minWidth:
                                                        "390px",
                                                }}
                                            >
                                                {isShipped && (
                                                    <div
                                                        style={{
                                                            display:
                                                                "flex",
                                                            flexDirection:
                                                                "column",
                                                            gap: "10px",
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                display:
                                                                    "flex",
                                                                gap: "8px",
                                                                flexWrap:
                                                                    "wrap",
                                                            }}
                                                        >
                                                            <input
                                                                type="tel"
                                                                value={
                                                                    deliveryPhones[
                                                                        order.id
                                                                    ] ||
                                                                    ""
                                                                }
                                                                onChange={(
                                                                    event
                                                                ) =>
                                                                    setDeliveryPhones(
                                                                        (
                                                                            previous
                                                                        ) => ({
                                                                            ...previous,
                                                                            [order.id]:
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                        })
                                                                    )
                                                                }
                                                                placeholder="Enter customer phone"
                                                                maxLength={
                                                                    15
                                                                }
                                                                disabled={
                                                                    isSending ||
                                                                    isVerifying
                                                                }
                                                                style={{
                                                                    flex:
                                                                        "1",
                                                                    minWidth:
                                                                        "190px",
                                                                    padding:
                                                                        "9px 10px",
                                                                    border: `1px solid ${theme.border}`,
                                                                    borderRadius:
                                                                        "8px",
                                                                    backgroundColor:
                                                                        theme.input,
                                                                    color:
                                                                        theme.text,
                                                                    outline:
                                                                        "none",
                                                                }}
                                                            />

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleSendDeliveryOTP(
                                                                        order.id
                                                                    )
                                                                }
                                                                disabled={
                                                                    isSending ||
                                                                    isVerifying
                                                                }
                                                                style={{
                                                                    padding:
                                                                        "9px 14px",
                                                                    border:
                                                                        "none",
                                                                    borderRadius:
                                                                        "8px",
                                                                    backgroundColor:
                                                                        isSending
                                                                            ? "#94a3b8"
                                                                            : "#007bff",
                                                                    color:
                                                                        "#fff",
                                                                    cursor:
                                                                        isSending
                                                                            ? "not-allowed"
                                                                            : "pointer",
                                                                    fontWeight:
                                                                        "600",
                                                                    whiteSpace:
                                                                        "nowrap",
                                                                }}
                                                            >
                                                                {isSending
                                                                    ? "Sending..."
                                                                    : otpSent
                                                                    ? "Resend OTP"
                                                                    : "Send OTP"}
                                                            </button>
                                                        </div>

                                                        {otpSent && (
                                                            <div
                                                                style={{
                                                                    display:
                                                                        "flex",
                                                                    gap: "8px",
                                                                    flexWrap:
                                                                        "wrap",
                                                                }}
                                                            >
                                                                <input
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    value={
                                                                        otpInputs[
                                                                            order.id
                                                                        ] ||
                                                                        ""
                                                                    }
                                                                    onChange={(
                                                                        event
                                                                    ) =>
                                                                        setOtpInputs(
                                                                            (
                                                                                previous
                                                                            ) => ({
                                                                                ...previous,
                                                                                [order.id]:
                                                                                    event
                                                                                        .target
                                                                                        .value
                                                                                        .replace(
                                                                                            /\D/g,
                                                                                            ""
                                                                                        )
                                                                                        .slice(
                                                                                            0,
                                                                                            6
                                                                                        ),
                                                                            })
                                                                        )
                                                                    }
                                                                    placeholder="Enter 6-digit OTP"
                                                                    maxLength={
                                                                        6
                                                                    }
                                                                    disabled={
                                                                        isVerifying
                                                                    }
                                                                    style={{
                                                                        flex:
                                                                            "1",
                                                                        minWidth:
                                                                            "190px",
                                                                        padding:
                                                                            "9px 10px",
                                                                        border: `1px solid ${theme.border}`,
                                                                        borderRadius:
                                                                            "8px",
                                                                        backgroundColor:
                                                                            theme.input,
                                                                        color:
                                                                            theme.text,
                                                                        outline:
                                                                            "none",
                                                                    }}
                                                                />

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleVerifyDeliveryOTP(
                                                                            order.id
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        isVerifying
                                                                    }
                                                                    style={{
                                                                        padding:
                                                                            "9px 14px",
                                                                        border:
                                                                            "none",
                                                                        borderRadius:
                                                                            "8px",
                                                                        backgroundColor:
                                                                            isVerifying
                                                                                ? "#94a3b8"
                                                                                : "#16a34a",
                                                                        color:
                                                                            "#fff",
                                                                        cursor:
                                                                            isVerifying
                                                                                ? "not-allowed"
                                                                                : "pointer",
                                                                        fontWeight:
                                                                            "600",
                                                                        whiteSpace:
                                                                            "nowrap",
                                                                    }}
                                                                >
                                                                    {isVerifying
                                                                        ? "Verifying..."
                                                                        : "Verify OTP"}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {isDelivered && (
                                                    <div>
                                                        <div
                                                            style={{
                                                                color:
                                                                    "#16a34a",
                                                                fontWeight:
                                                                    "700",
                                                                marginBottom:
                                                                    "5px",
                                                            }}
                                                        >
                                                            ✓ Delivery
                                                            Verified
                                                        </div>

                                                        {order.delivered_at && (
                                                            <div
                                                                style={{
                                                                    color:
                                                                        theme.mutedText,
                                                                    fontSize:
                                                                        "12px",
                                                                }}
                                                            >
                                                                {new Date(
                                                                    order.delivered_at
                                                                ).toLocaleString()}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {!isShipped &&
                                                    !isDelivered && (
                                                        <span
                                                            style={{
                                                                color:
                                                                    theme.mutedText,
                                                                fontSize:
                                                                    "13px",
                                                            }}
                                                        >
                                                            Available after
                                                            shipping
                                                        </span>
                                                    )}
                                            </td>

                                            <td
                                                style={
                                                    tdStyle
                                                }
                                            >
                                                <span
                                                    style={{
                                                        color:
                                                            theme.secondaryText,
                                                        fontSize:
                                                            "13px",
                                                    }}
                                                >
                                                    {order.created_at
                                                        ? new Date(
                                                              order.created_at
                                                          ).toLocaleString()
                                                        : "-"}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <section
                style={{
                    marginTop: "34px",
                    padding: "24px",
                    border: `1px solid ${theme.border}`,
                    borderRadius: "12px",
                    backgroundColor: theme.card,
                    boxShadow: theme.shadow,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        gap: "12px",
                        flexWrap: "wrap",
                        marginBottom: "20px",
                    }}
                >
                    <div>
                        <h2 style={{ margin: 0 }}>Delivery issue review</h2>
                        <p style={{ color: theme.secondaryText }}>
                            Compare customer evidence with the catalog image before deciding.
                        </p>
                    </div>
                    <strong>
                        {deliveryClaims.filter((claim) => claim.status === "pending").length} pending
                    </strong>
                </div>

                {deliveryClaims.length === 0 ? (
                    <p style={{ color: theme.mutedText }}>
                        No delivery issue reports have been submitted.
                    </p>
                ) : (
                    deliveryClaims.map((claim) => {
                        const defaultRefundDate = new Date();
                        defaultRefundDate.setDate(defaultRefundDate.getDate() + 7);

                        return (
                            <article
                                key={claim.id}
                                style={{
                                    padding: "20px 0",
                                    borderTop: `1px solid ${theme.border}`,
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        gap: "16px",
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <div>
                                        <strong>
                                            Order #{claim.order} · {claim.order_item_name}
                                        </strong>
                                        <div style={{ color: theme.secondaryText, marginTop: "5px" }}>
                                            {claim.customer_name} · {claim.issue_type.replace("_", " ")}
                                            {claim.created_at &&
                                                ` · ${new Date(claim.created_at).toLocaleString()}`}
                                        </div>
                                    </div>
                                    <strong style={{ textTransform: "capitalize" }}>
                                        {claim.status.replace("_", " ")}
                                    </strong>
                                </div>

                                {claim.description && (
                                    <p style={{ color: theme.secondaryText }}>
                                        {claim.description}
                                    </p>
                                )}

                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                                        gap: "16px",
                                        marginTop: "14px",
                                    }}
                                >
                                    {[
                                        ["Catalog image", claim.product_image],
                                        ["Customer evidence", claim.evidence_image],
                                    ].map(([label, imageUrl]) => (
                                        <div key={label}>
                                            <div style={{ color: theme.mutedText, marginBottom: "6px" }}>
                                                {label}
                                            </div>
                                            {imageUrl ? (
                                                <img
                                                    src={imageUrl}
                                                    alt={`${label} for order ${claim.order}`}
                                                    style={{
                                                        display: "block",
                                                        width: "100%",
                                                        height: "220px",
                                                        objectFit: "contain",
                                                        background: theme.input,
                                                        border: `1px solid ${theme.border}`,
                                                        borderRadius: "6px",
                                                    }}
                                                />
                                            ) : (
                                                <div style={{ color: theme.mutedText }}>
                                                    Image unavailable
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div
                                    style={{
                                        marginTop: "14px",
                                        padding: "12px",
                                        background: theme.tableHeader,
                                        borderRadius: "6px",
                                    }}
                                >
                                    <strong>
                                        Image analysis · {claim.ai_analysis?.provider || "manual"}
                                    </strong>
                                    <p style={{ marginBottom: "4px", color: theme.secondaryText }}>
                                        {claim.ai_analysis?.summary || "No automatic analysis is available."}
                                    </p>
                                    {claim.visual_similarity !== null &&
                                        claim.visual_similarity !== undefined && (
                                            <span style={{ color: theme.mutedText }}>
                                                Local image similarity: {claim.visual_similarity}%
                                            </span>
                                        )}
                                </div>

                                {claim.status === "pending" ? (
                                    <div
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                                            gap: "12px",
                                            marginTop: "16px",
                                            alignItems: "end",
                                        }}
                                    >
                                        <label>
                                            Refund processing date
                                            <input
                                                type="date"
                                                min={new Date().toISOString().slice(0, 10)}
                                                value={
                                                    refundDates[claim.id] ||
                                                    defaultRefundDate.toISOString().slice(0, 10)
                                                }
                                                onChange={(event) =>
                                                    setRefundDates((previous) => ({
                                                        ...previous,
                                                        [claim.id]: event.target.value,
                                                    }))
                                                }
                                                style={{
                                                    display: "block",
                                                    width: "100%",
                                                    marginTop: "5px",
                                                    padding: "9px",
                                                    border: `1px solid ${theme.border}`,
                                                    borderRadius: "6px",
                                                    background: theme.input,
                                                    color: theme.text,
                                                }}
                                            />
                                        </label>
                                        <label>
                                            Review note
                                            <textarea
                                                value={claimNotes[claim.id] || ""}
                                                onChange={(event) =>
                                                    setClaimNotes((previous) => ({
                                                        ...previous,
                                                        [claim.id]: event.target.value,
                                                    }))
                                                }
                                                rows={2}
                                                maxLength={2000}
                                                style={{
                                                    display: "block",
                                                    width: "100%",
                                                    marginTop: "5px",
                                                    padding: "9px",
                                                    border: `1px solid ${theme.border}`,
                                                    borderRadius: "6px",
                                                    background: theme.input,
                                                    color: theme.text,
                                                }}
                                            />
                                        </label>
                                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                            <button
                                                type="button"
                                                disabled={reviewingClaim === claim.id}
                                                onClick={() => handleReviewDeliveryClaim(claim, "approved")}
                                            >
                                                Approve refund
                                            </button>
                                            <button
                                                type="button"
                                                disabled={reviewingClaim === claim.id}
                                                onClick={() => handleReviewDeliveryClaim(claim, "rejected")}
                                            >
                                                Reject report
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p style={{ color: theme.secondaryText }}>
                                        {claim.customer_message}
                                    </p>
                                )}
                            </article>
                        );
                    })
                )}
            </section>
        </div>
    );
}

const thStyle = {
    padding: "15px 14px",
    textAlign: "left",
    fontSize: "13px",
    fontWeight: "700",
    whiteSpace: "nowrap",
};

const tdStyle = {
    padding: "15px 14px",
    verticalAlign: "top",
};

export default AdminDashboard;