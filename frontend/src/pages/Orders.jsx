import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    getOrderHistory,
    downloadInvoice,
} from "../services/orderApi";


function Orders() {

    const navigate = useNavigate();

    const [orders, setOrders] = useState([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [downloadingInvoice, setDownloadingInvoice] =
        useState(null);

    // =====================================
    // UI STATES
    // =====================================

    const [searchTerm, setSearchTerm] =
        useState("");

    const [statusFilter, setStatusFilter] =
        useState("All");

    const [expandedOrders, setExpandedOrders] =
        useState({});

    const [refreshing, setRefreshing] =
        useState(false);


    // =====================================
    // LOAD ORDERS
    // =====================================

    const loadOrders = async (
        showRefreshLoader = false
    ) => {

        try {

            if (showRefreshLoader) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError("");

            const data =
                await getOrderHistory();

            console.log(
                "Order History:",
                data
            );

            const orderList =
                Array.isArray(data)
                    ? data
                    : data?.results || [];

            console.log(
                "ORDERS WITH PAYMENT DATA:",
                orderList
            );

            setOrders(orderList);

        } catch (error) {

            console.error(
                "Order History Error:",
                error
            );

            setError(
                error.message ||
                "Failed to load orders."
            );

        } finally {

            setLoading(false);
            setRefreshing(false);

        }
    };


    useEffect(() => {

        loadOrders();

    }, []);


    // =====================================
    // DOWNLOAD INVOICE
    // =====================================

    const handleDownloadInvoice = async (
        paymentId
    ) => {

        if (!paymentId) {

            alert(
                "Invoice is not available for this order."
            );

            return;
        }

        try {

            setDownloadingInvoice(
                paymentId
            );

            console.log(
                "Downloading Invoice for Payment ID:",
                paymentId
            );

            await downloadInvoice(
                paymentId
            );

            console.log(
                "Invoice downloaded successfully."
            );

        } catch (error) {

            console.error(
                "Invoice Download Error:",
                error
            );

            alert(
                error.message ||
                "Failed to download invoice."
            );

        } finally {

            setDownloadingInvoice(
                null
            );

        }
    };


    // =====================================
    // TOGGLE ORDER ITEMS
    // =====================================

    const toggleOrder = (orderId) => {

        setExpandedOrders(
            (previous) => ({
                ...previous,
                [orderId]:
                    !previous[orderId],
            })
        );
    };


    // =====================================
    // STATUS NORMALIZER
    // =====================================

    const normalizeStatus = (status) => {

        return String(
            status || "Pending"
        )
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-");
    };


    // =====================================
    // FILTERED ORDERS
    // =====================================

    const filteredOrders = useMemo(() => {

        const search =
            searchTerm
                .trim()
                .toLowerCase();

        return orders.filter(
            (order) => {

                const orderStatus =
                    String(
                        order.status || "Pending"
                    ).toLowerCase();

                const orderId =
                    String(
                        order.id || ""
                    ).toLowerCase();

                const productNames =
                    (order.items || [])
                        .map(
                            (item) =>
                                item.product_name ||
                                item.product ||
                                ""
                        )
                        .join(" ")
                        .toLowerCase();

                const matchesSearch =
                    !search ||
                    orderId.includes(search) ||
                    orderStatus.includes(search) ||
                    productNames.includes(search);

                const matchesStatus =
                    statusFilter === "All" ||
                    orderStatus ===
                        statusFilter.toLowerCase();

                return (
                    matchesSearch &&
                    matchesStatus
                );
            }
        );

    }, [
        orders,
        searchTerm,
        statusFilter,
    ]);


    // =====================================
    // DYNAMIC STATISTICS
    // =====================================

    const orderStats = useMemo(() => {

        const total =
            orders.length;

        const pending =
            orders.filter(
                (order) =>
                    normalizeStatus(
                        order.status
                    ) === "pending"
            ).length;

        const confirmed =
            orders.filter(
                (order) =>
                    normalizeStatus(
                        order.status
                    ) === "confirmed"
            ).length;

        const shipped =
            orders.filter(
                (order) =>
                    normalizeStatus(
                        order.status
                    ) === "shipped"
            ).length;

        const delivered =
            orders.filter(
                (order) =>
                    normalizeStatus(
                        order.status
                    ) === "delivered"
            ).length;

        const cancelled =
            orders.filter(
                (order) =>
                    normalizeStatus(
                        order.status
                    ) === "cancelled"
            ).length;

        const totalAmount =
            orders.reduce(
                (sum, order) =>
                    sum +
                    Number(
                        order.total_amount || 0
                    ),
                0
            );

        return {
            total,
            pending,
            confirmed,
            shipped,
            delivered,
            cancelled,
            totalAmount,
        };

    }, [orders]);


    // =====================================
    // STATUS FILTER OPTIONS
    // =====================================

    const statusOptions = [
        "All",
        "Pending",
        "Confirmed",
        "Shipped",
        "Delivered",
        "Cancelled",
    ];


    // =====================================
    // LOADING
    // =====================================

    if (loading) {

        return (

            <div className="orders-page">

                <div className="orders-state-card">

                    <div className="orders-loading-icon">
                        ⟳
                    </div>

                    <h2>
                        Loading orders...
                    </h2>

                    <p>
                        Please wait while we fetch
                        your orders.
                    </p>

                </div>

            </div>
        );
    }


    // =====================================
    // ERROR
    // =====================================

    if (error) {

        return (

            <div className="orders-page">

                <div className="orders-state-card">

                    <div className="orders-state-icon">
                        ⚠️
                    </div>

                    <h2 className="orders-error-title">
                        Unable to Load Orders
                    </h2>

                    <p>
                        {error}
                    </p>

                    <button
                        type="button"
                        className="orders-primary-button"
                        onClick={() =>
                            loadOrders()
                        }
                    >
                        Try Again
                    </button>

                </div>

            </div>
        );
    }


    // =====================================
    // NO ORDERS
    // =====================================

    if (orders.length === 0) {

        return (

            <div className="orders-page">

                <div className="orders-state-card">

                    <div className="orders-state-icon">
                        📦
                    </div>

                    <h1>
                        My Orders
                    </h1>

                    <h2>
                        No orders found
                    </h2>

                    <p>
                        You haven't placed any
                        orders yet.
                    </p>

                    <button
                        type="button"
                        className="orders-primary-button"
                        onClick={() =>
                            navigate("/")
                        }
                    >
                        Continue Shopping
                    </button>

                </div>

            </div>
        );
    }


    // =====================================
    // MAIN RENDER
    // =====================================

    return (

        <div className="orders-page">

            <div className="orders-container">


                {/* ================================= */}
                {/* PAGE HEADER */}
                {/* ================================= */}

                <div className="orders-page-header">

                    <div>

                        <span className="orders-eyebrow">
                            SHOPHUBAI
                        </span>

                        <h1>
                            My Orders 📦
                        </h1>

                        <p>
                            Track and manage all your
                            orders in one place.
                        </p>

                    </div>


                    <button
                        type="button"
                        className="orders-refresh-button"
                        onClick={() =>
                            loadOrders(true)
                        }
                        disabled={refreshing}
                    >
                        {refreshing
                            ? "⟳ Refreshing..."
                            : "↻ Refresh"}
                    </button>

                </div>


                {/* ================================= */}
                {/* DYNAMIC SUMMARY */}
                {/* ================================= */}

                <div className="orders-stats-grid">


                    <div className="order-stat-card">

                        <div className="order-stat-icon">
                            📦
                        </div>

                        <div>
                            <span>
                                Total Orders
                            </span>

                            <strong>
                                {orderStats.total}
                            </strong>
                        </div>

                    </div>


                    <div className="order-stat-card">

                        <div className="order-stat-icon">
                            ⏳
                        </div>

                        <div>
                            <span>
                                Pending
                            </span>

                            <strong>
                                {orderStats.pending}
                            </strong>
                        </div>

                    </div>


                    <div className="order-stat-card">

                        <div className="order-stat-icon">
                            🚚
                        </div>

                        <div>
                            <span>
                                Shipped
                            </span>

                            <strong>
                                {orderStats.shipped}
                            </strong>
                        </div>

                    </div>


                    <div className="order-stat-card">

                        <div className="order-stat-icon">
                            ✅
                        </div>

                        <div>
                            <span>
                                Delivered
                            </span>

                            <strong>
                                {orderStats.delivered}
                            </strong>
                        </div>

                    </div>


                    <div className="order-stat-card order-stat-total">

                        <div className="order-stat-icon">
                            💰
                        </div>

                        <div>
                            <span>
                                Total Value
                            </span>

                            <strong>
                                ₹
                                {orderStats.totalAmount.toLocaleString(
                                    "en-IN"
                                )}
                            </strong>
                        </div>

                    </div>

                </div>


                {/* ================================= */}
                {/* SEARCH + FILTER */}
                {/* ================================= */}

                <div className="orders-toolbar">

                    <div className="orders-search-wrapper">

                        <span className="orders-search-icon">
                            🔎
                        </span>

                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) =>
                                setSearchTerm(
                                    event.target.value
                                )
                            }
                            placeholder="Search by order ID, status or product..."
                            className="orders-search-input"
                        />

                        {searchTerm && (

                            <button
                                type="button"
                                className="orders-clear-search"
                                onClick={() =>
                                    setSearchTerm("")
                                }
                            >
                                ✕
                            </button>

                        )}

                    </div>


                    <div className="orders-filter-wrapper">

                        <label htmlFor="order-status-filter">
                            Filter:
                        </label>

                        <select
                            id="order-status-filter"
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(
                                    event.target.value
                                )
                            }
                            className="orders-status-filter"
                        >

                            {statusOptions.map(
                                (status) => (

                                    <option
                                        key={status}
                                        value={status}
                                    >
                                        {status}
                                    </option>

                                )
                            )}

                        </select>

                    </div>

                </div>


                {/* ================================= */}
                {/* RESULT INFORMATION */}
                {/* ================================= */}

                <div className="orders-result-info">

                    <span>
                        Showing{" "}
                        <strong>
                            {filteredOrders.length}
                        </strong>{" "}
                        of{" "}
                        <strong>
                            {orders.length}
                        </strong>{" "}
                        orders
                    </span>


                    {(searchTerm ||
                        statusFilter !== "All") && (

                        <button
                            type="button"
                            className="orders-reset-filter"
                            onClick={() => {
                                setSearchTerm("");
                                setStatusFilter("All");
                            }}
                        >
                            Clear Filters
                        </button>

                    )}

                </div>


                {/* ================================= */}
                {/* NO FILTER RESULTS */}
                {/* ================================= */}

                {filteredOrders.length === 0 && (

                    <div className="orders-empty-filter">

                        <div>
                            🔍
                        </div>

                        <h2>
                            No matching orders
                        </h2>

                        <p>
                            Try changing your search
                            or status filter.
                        </p>

                        <button
                            type="button"
                            className="orders-primary-button"
                            onClick={() => {
                                setSearchTerm("");
                                setStatusFilter("All");
                            }}
                        >
                            Show All Orders
                        </button>

                    </div>

                )}


                {/* ================================= */}
                {/* ORDER LIST */}
                {/* ================================= */}

                <div className="orders-list">

                    {filteredOrders.map(
                        (order) => {

                            const isExpanded =
                                Boolean(
                                    expandedOrders[
                                        order.id
                                    ]
                                );

                            const orderStatus =
                                order.status ||
                                "Pending";

                            const statusClass =
                                normalizeStatus(
                                    orderStatus
                                );

                            const itemCount =
                                order.items?.reduce(
                                    (
                                        total,
                                        item
                                    ) =>
                                        total +
                                        Number(
                                            item.quantity ||
                                            0
                                        ),
                                    0
                                ) || 0;


                            return (

                                <div
                                    key={order.id}
                                    className={`order-list-card ${
                                        isExpanded
                                            ? "order-card-expanded"
                                            : ""
                                    }`}
                                >


                                    {/* ========================= */}
                                    {/* ORDER HEADER */}
                                    {/* ========================= */}

                                    <div className="order-list-header">

                                        <div className="order-heading-left">

                                            <div className="order-box-icon">
                                                📦
                                            </div>

                                            <div>

                                                <span className="order-number-label">
                                                    ORDER
                                                </span>

                                                <h2>
                                                    #{order.id}
                                                </h2>

                                            </div>

                                        </div>


                                        <div className="order-heading-right">

                                            <span
                                                className={`order-status-badge status-${statusClass}`}
                                            >
                                                {orderStatus}
                                            </span>


                                            <button
                                                type="button"
                                                className="order-expand-button"
                                                onClick={() =>
                                                    toggleOrder(
                                                        order.id
                                                    )
                                                }
                                                aria-label={
                                                    isExpanded
                                                        ? "Collapse order"
                                                        : "Expand order"
                                                }
                                            >
                                                {isExpanded
                                                    ? "⌃"
                                                    : "⌄"}
                                            </button>

                                        </div>

                                    </div>


                                    {/* ========================= */}
                                    {/* ORDER META */}
                                    {/* ========================= */}

                                    <div className="order-meta-grid">

                                        <div className="order-meta-item">

                                            <span>
                                                📅 Order Date
                                            </span>

                                            <strong>
                                                {order.created_at
                                                    ? new Date(
                                                        order.created_at
                                                    ).toLocaleString(
                                                        "en-IN"
                                                    )
                                                    : "-"
                                                }
                                            </strong>

                                        </div>


                                        <div className="order-meta-item">

                                            <span>
                                                💳 Payment
                                            </span>

                                            <strong>
                                                {order.payment_status ||
                                                    "Not Available"}
                                            </strong>

                                        </div>


                                        <div className="order-meta-item">

                                            <span>
                                                🛍️ Items
                                            </span>

                                            <strong>
                                                {itemCount}
                                            </strong>

                                        </div>

                                    </div>


                                    {/* ========================= */}
                                    {/* ITEMS */}
                                    {/* ========================= */}

                                    <div className="order-items-preview">

                                        <div className="order-items-title">

                                            <strong>
                                                Order Items
                                            </strong>

                                            <span>
                                                {order.items?.length ||
                                                    0}{" "}
                                                product(s)
                                            </span>

                                        </div>


                                        <div
                                            className={
                                                isExpanded
                                                    ? "order-items-expanded"
                                                    : "order-items-collapsed"
                                            }
                                        >

                                            {order.items &&
                                                order.items.map(
                                                    (
                                                        item
                                                    ) => (

                                                        <div
                                                            key={
                                                                item.id
                                                            }
                                                            className="order-item-row"
                                                        >

                                                            <span className="order-item-name">

                                                                {
                                                                    item.product_name ||
                                                                    item.product ||
                                                                    "Product"
                                                                }

                                                                {" × "}

                                                                {
                                                                    item.quantity
                                                                }

                                                            </span>


                                                            <span className="order-item-price">

                                                                ₹
                                                                {
                                                                    item.total_price ??
                                                                    0
                                                                }

                                                            </span>

                                                        </div>

                                                    )
                                                )}

                                        </div>


                                        {order.items?.length >
                                            1 && (

                                            <button
                                                type="button"
                                                className="order-items-toggle"
                                                onClick={() =>
                                                    toggleOrder(
                                                        order.id
                                                    )
                                                }
                                            >
                                                {isExpanded
                                                    ? "Show Less ↑"
                                                    : `View All ${order.items.length} Items ↓`}
                                            </button>

                                        )}

                                    </div>


                                    {/* ========================= */}
                                    {/* FOOTER */}
                                    {/* ========================= */}

                                    <div className="order-list-footer">


                                        <div className="order-total">

                                            <span>
                                                Order Total
                                            </span>

                                            <strong>
                                                ₹
                                                {Number(
                                                    order.total_amount ||
                                                    0
                                                ).toLocaleString(
                                                    "en-IN"
                                                )}
                                            </strong>

                                        </div>


                                        <div className="order-action-buttons">


                                            {/* VIEW DETAILS */}

                                            <button
                                                type="button"
                                                className="orders-secondary-button"
                                                onClick={() =>
                                                    navigate(
                                                        `/orders/${order.id}`
                                                    )
                                                }
                                            >
                                                👁 View Details
                                            </button>


                                            {/* DOWNLOAD INVOICE */}

                                            {order.payment_id ? (

                                                <button
                                                    type="button"
                                                    className="orders-success-button"
                                                    onClick={() =>
                                                        handleDownloadInvoice(
                                                            order.payment_id
                                                        )
                                                    }
                                                    disabled={
                                                        downloadingInvoice ===
                                                        order.payment_id
                                                    }
                                                >

                                                    {downloadingInvoice ===
                                                    order.payment_id

                                                        ? "⟳ Downloading..."

                                                        : "📄 Download Invoice"}

                                                </button>

                                            ) : (

                                                <button
                                                    type="button"
                                                    className="orders-disabled-button"
                                                    disabled
                                                >
                                                    Invoice Not Available
                                                </button>

                                            )}

                                        </div>

                                    </div>

                                </div>

                            );

                        }
                    )}

                </div>

            </div>

        </div>
    );
}


export default Orders;