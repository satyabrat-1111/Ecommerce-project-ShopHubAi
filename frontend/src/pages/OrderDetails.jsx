import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
getOrderDetail,
downloadInvoice,
getDeliveryIssueClaims,
createDeliveryIssueClaim,
} from "../services/orderApi";
import CustomerLiveTracking from "./CustomerLiveTracking";

function OrderDetails() {

const { id } = useParams();
const navigate = useNavigate();

const [order, setOrder] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");
const [invoiceLoading, setInvoiceLoading] = useState(false);
const [invoiceMessage, setInvoiceMessage] = useState("");
const [claims, setClaims] = useState([]);
const [activeClaimItem, setActiveClaimItem] = useState(null);
const [claimIssueType, setClaimIssueType] = useState("damaged");
const [claimDescription, setClaimDescription] = useState("");
const [claimImage, setClaimImage] = useState(null);
const [claimSubmitting, setClaimSubmitting] = useState(false);
const [claimError, setClaimError] = useState("");


// =====================================
// LOAD ORDER
// =====================================

useEffect(() => {

    const loadOrder = async () => {

        try {

            setLoading(true);
            setError("");

            const data =
                await getOrderDetail(id);

            console.log(
                "Order Details:",
                data
            );

            setOrder(data);

            try {
                const issueClaims = await getDeliveryIssueClaims(id);
                setClaims(issueClaims);
            } catch (claimLoadError) {
                console.error(
                    "Delivery Issue Claims Error:",
                    claimLoadError
                );
            }

        } catch (error) {

            console.error(
                "Order Details Error:",
                error
            );

            setError(
                error.message ||
                "Unable to load order details."
            );

        } finally {

            setLoading(false);

        }
    };

    loadOrder();

}, [id]);


// =====================================
// DOWNLOAD INVOICE
// =====================================

const handleDownloadInvoice = async () => {

    /*
     * Backend response may contain payment/payment_id.
     * We try common field names.
     */

    const paymentId =
        order?.payment_id ||
        order?.payment?.id ||
        order?.payment?.payment_id;

    if (!paymentId) {

        setInvoiceMessage(
            "Invoice is not available for this order yet."
        );

        return;
    }

    try {

        setInvoiceLoading(true);
        setInvoiceMessage("");

        await downloadInvoice(
            paymentId
        );

        setInvoiceMessage(
            "Invoice downloaded successfully."
        );

    } catch (error) {

        console.error(
            "Invoice Error:",
            error
        );

        setInvoiceMessage(
            error.message ||
            "Failed to download invoice."
        );

    } finally {

        setInvoiceLoading(false);

    }
};


const handleSubmitDeliveryClaim = async (event, itemId) => {
    event.preventDefault();

    if (!claimImage) {
        setClaimError("Choose a photo of the item you received.");
        return;
    }

    const formData = new FormData();
    formData.append("order_item_id", String(itemId));
    formData.append("issue_type", claimIssueType);
    formData.append("description", claimDescription);
    formData.append("evidence_image", claimImage);

    try {
        setClaimSubmitting(true);
        setClaimError("");
        const claim = await createDeliveryIssueClaim(id, formData);
        setClaims((previous) => [claim, ...previous]);
        setActiveClaimItem(null);
        setClaimDescription("");
        setClaimImage(null);
    } catch (submitError) {
        setClaimError(
            submitError.message || "Unable to submit the delivery issue report."
        );
    } finally {
        setClaimSubmitting(false);
    }
};


// =====================================
// STATUS HELPERS
// =====================================

const getStatusClass = (status) => {

    if (!status) {
        return "status-default";
    }

    return status
        .toLowerCase()
        .replace(/\s+/g, "-");
};


const getPaymentStatus = () => {

    if (
        order?.payment_status
    ) {
        return order.payment_status;
    }

    if (
        order?.payment?.status
    ) {
        return order.payment.status;
    }

    if (
        order?.payment?.payment_status
    ) {
        return order.payment.payment_status;
    }

    return "Pending";
};


const paymentStatus =
    getPaymentStatus();


// =====================================
// LOADING
// =====================================

if (loading) {

    return (

        <div className="order-page">

            <div className="order-loading">

                <div className="loading-spinner">
                    ⟳
                </div>

                <h2>
                    Loading your order...
                </h2>

                <p>
                    Please wait while we fetch
                    your order details.
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

        <div className="order-page">

            <div className="order-error">

                <div className="error-icon">
                    ⚠️
                </div>

                <h2>
                    Unable to Load Order
                </h2>

                <p>
                    {error}
                </p>

                <div className="error-actions">

                    <button
                        type="button"
                        className="primary-order-button"
                        onClick={() =>
                            window.location.reload()
                        }
                    >
                        Try Again
                    </button>

                    <button
                        type="button"
                        className="secondary-order-button"
                        onClick={() =>
                            navigate("/orders")
                        }
                    >
                        Back to Orders
                    </button>

                </div>

            </div>

        </div>
    );
}


// =====================================
// ORDER NOT FOUND
// =====================================

if (!order) {

    return (

        <div className="order-page">

            <div className="order-error">

                <div className="error-icon">
                    📦
                </div>

                <h2>
                    Order Not Found
                </h2>

                <p>
                    We could not find this order.
                </p>

                <button
                    type="button"
                    className="primary-order-button"
                    onClick={() =>
                        navigate("/orders")
                    }
                >
                    Back to Orders
                </button>

            </div>

        </div>
    );
}


// =====================================
// ORDER STATUS
// =====================================

const orderStatus =
    order.status || "Pending";


const statusSteps = [
    "Pending",
    "Confirmed",
    "Shipped",
    "Delivered",
];


const currentStatusIndex =
    statusSteps.findIndex(
        (status) =>
            status.toLowerCase() ===
            orderStatus.toLowerCase()
    );


// =====================================
// RENDER
// =====================================

return (

    <div className="order-page">

        <div className="order-container">


            {/* ================================= */}
            {/* HEADER */}
            {/* ================================= */}

            <div className="order-header">

                <div>

                    <span className="order-eyebrow">
                        SHOPHUBAI
                    </span>

                    <h1>
                        Order #{order.id}
                    </h1>

                    <p>
                        Thank you for shopping
                        with us! 🎉
                    </p>

                </div>

                <div className="order-header-actions">

                    <button
                        type="button"
                        className="secondary-order-button"
                        onClick={() =>
                            navigate("/orders")
                        }
                    >
                        ← My Orders
                    </button>

                    <button
                        type="button"
                        className="primary-order-button"
                        onClick={
                            handleDownloadInvoice
                        }
                        disabled={
                            invoiceLoading
                        }
                    >
                        {invoiceLoading
                            ? "Downloading..."
                            : "📄 Download Invoice"}
                    </button>

                </div>

            </div>


            {/* ================================= */}
            {/* INVOICE MESSAGE */}
            {/* ================================= */}

            {invoiceMessage && (

                <div
                    className={
                        invoiceMessage
                            .toLowerCase()
                            .includes("success")
                            ? "order-success-message"
                            : "order-warning-message"
                    }
                >
                    {invoiceMessage}
                </div>

            )}

            {orderStatus === "Shipped" && (
                <CustomerLiveTracking orderId={id} />
            )}


            {/* ================================= */}
            {/* STATUS CARDS */}
            {/* ================================= */}

            <div className="order-status-grid">


                {/* ORDER STATUS */}

                <div className="status-card">

                    <div className="status-card-icon">
                        📦
                    </div>

                    <div>

                        <span>
                            Order Status
                        </span>

                        <strong
                            className={`status-pill ${getStatusClass(
                                orderStatus
                            )}`}
                        >
                            {orderStatus}
                        </strong>

                    </div>

                </div>


                {/* PAYMENT STATUS */}

                <div className="status-card">

                    <div className="status-card-icon">
                        💳
                    </div>

                    <div>

                        <span>
                            Payment Status
                        </span>

                        <strong
                            className={`status-pill ${getStatusClass(
                                paymentStatus
                            )}`}
                        >
                            {paymentStatus}
                        </strong>

                    </div>

                </div>


                {/* ORDER DATE */}

                <div className="status-card">

                    <div className="status-card-icon">
                        📅
                    </div>

                    <div>

                        <span>
                            Order Date
                        </span>

                        <strong>
                            {order.created_at
                                ? new Date(
                                    order.created_at
                                ).toLocaleDateString(
                                    "en-IN",
                                    {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                    }
                                )
                                : "N/A"}
                        </strong>

                    </div>

                </div>


                {/* TOTAL */}

                <div className="status-card">

                    <div className="status-card-icon">
                        💰
                    </div>

                    <div>

                        <span>
                            Order Total
                        </span>

                        <strong>
                            ₹
                            {Number(
                                order.total_amount || 0
                            ).toLocaleString(
                                "en-IN"
                            )}
                        </strong>

                    </div>

                </div>

            </div>


            {/* ================================= */}
            {/* ORDER PROGRESS */}
            {/* ================================= */}

            {orderStatus.toLowerCase() !==
                "cancelled" && (

                <div className="order-progress-card">

                    <h2>
                        Order Progress
                    </h2>

                    <div className="order-progress">

                        {statusSteps.map(
                            (
                                status,
                                index
                            ) => {

                                const completed =
                                    currentStatusIndex >=
                                    index;

                                return (

                                    <div
                                        className={`progress-step ${
                                            completed
                                                ? "completed"
                                                : ""
                                        }`}
                                        key={status}
                                    >

                                        <div className="progress-circle">

                                            {completed
                                                ? "✓"
                                                : index + 1}

                                        </div>

                                        <span>
                                            {status}
                                        </span>

                                        {index <
                                            statusSteps.length -
                                                1 && (

                                            <div
                                                className={`progress-line ${
                                                    currentStatusIndex >
                                                    index
                                                        ? "completed"
                                                        : ""
                                                }`}
                                            />

                                        )}

                                    </div>
                                );
                            }
                        )}

                    </div>

                </div>

            )}


            {/* ================================= */}
            {/* MAIN CONTENT */}
            {/* ================================= */}

            <div className="order-main-grid">


                {/* ================================= */}
                {/* ORDER ITEMS */}
                {/* ================================= */}

                <div className="order-section">

                    <div className="section-heading">

                        <div>

                            <span>
                                YOUR PURCHASE
                            </span>

                            <h2>
                                Order Items
                            </h2>

                        </div>

                        <span className="item-count">
                            {order.items?.length || 0} Items
                        </span>

                    </div>


                    <div className="order-items">

                        {order.items &&
                            order.items.map(
                                (item) => (

                                    <div
                                        className="order-item"
                                        key={item.id}
                                    >

                                        {/* IMAGE */}

                                        <div className="order-item-image">

                                            {item.product_image ? (

                                                <img
                                                    src={
                                                        item.product_image
                                                    }
                                                    alt={
                                                        item.product_name ||
                                                        "Product"
                                                    }
                                                />

                                            ) : (

                                                <span>
                                                    📦
                                                </span>

                                            )}

                                        </div>


                                        {/* DETAILS */}

                                        <div className="order-item-details">

                                            <h3>
                                                {
                                                    item.product_name ||
                                                    item.product ||
                                                    "Product"
                                                }
                                            </h3>

                                            <p>
                                                Price: ₹
                                                {Number(
                                                    item.price || 0
                                                ).toLocaleString(
                                                    "en-IN"
                                                )}
                                            </p>

                                            <p>
                                                Quantity:{" "}
                                                {item.quantity}
                                            </p>

                                            {orderStatus === "Delivered" && (() => {
                                                const itemClaim = claims.find(
                                                    (claim) =>
                                                        Number(claim.order_item) ===
                                                        Number(item.id)
                                                );

                                                if (itemClaim) {
                                                    return (
                                                        <div
                                                            style={{
                                                                marginTop: "12px",
                                                                padding: "12px",
                                                                border: "1px solid #d1d5db",
                                                                borderRadius: "8px",
                                                            }}
                                                        >
                                                            <strong>
                                                                Issue report: {itemClaim.status.replace("_", " ")}
                                                            </strong>
                                                            {itemClaim.customer_message && (
                                                                <p>{itemClaim.customer_message}</p>
                                                            )}
                                                            {!itemClaim.customer_message && (
                                                                <p>
                                                                    {itemClaim.ai_analysis?.summary ||
                                                                        "Your report is waiting for admin review."}
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                }

                                                if (activeClaimItem === item.id) {
                                                    return (
                                                        <form
                                                            onSubmit={(event) =>
                                                                handleSubmitDeliveryClaim(event, item.id)
                                                            }
                                                            style={{
                                                                display: "grid",
                                                                gap: "8px",
                                                                marginTop: "12px",
                                                                maxWidth: "420px",
                                                            }}
                                                        >
                                                            <label>
                                                                Issue type
                                                                <select
                                                                    value={claimIssueType}
                                                                    onChange={(event) =>
                                                                        setClaimIssueType(event.target.value)
                                                                    }
                                                                    style={{
                                                                        display: "block",
                                                                        width: "100%",
                                                                        padding: "9px",
                                                                        marginTop: "4px",
                                                                    }}
                                                                >
                                                                    <option value="damaged">Damaged</option>
                                                                    <option value="broken">Broken</option>
                                                                    <option value="wrong_product">Wrong product</option>
                                                                    <option value="other">Other issue</option>
                                                                </select>
                                                            </label>
                                                            <label>
                                                                Photo of the received item
                                                                <input
                                                                    type="file"
                                                                    accept="image/jpeg,image/png,image/webp"
                                                                    onChange={(event) =>
                                                                        setClaimImage(event.target.files?.[0] || null)
                                                                    }
                                                                    required
                                                                    style={{
                                                                        display: "block",
                                                                        width: "100%",
                                                                        marginTop: "4px",
                                                                    }}
                                                                />
                                                            </label>
                                                            <label>
                                                                Details (optional)
                                                                <textarea
                                                                    value={claimDescription}
                                                                    onChange={(event) =>
                                                                        setClaimDescription(event.target.value)
                                                                    }
                                                                    maxLength={2000}
                                                                    rows={3}
                                                                    style={{
                                                                        display: "block",
                                                                        width: "100%",
                                                                        padding: "9px",
                                                                        marginTop: "4px",
                                                                    }}
                                                                />
                                                            </label>
                                                            {claimError && (
                                                                <p role="alert" style={{ color: "#b91c1c" }}>
                                                                    {claimError}
                                                                </p>
                                                            )}
                                                            <div style={{ display: "flex", gap: "8px" }}>
                                                                <button
                                                                    type="submit"
                                                                    className="primary-order-button"
                                                                    disabled={claimSubmitting}
                                                                >
                                                                    {claimSubmitting ? "Submitting..." : "Submit report"}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="secondary-order-button"
                                                                    onClick={() => {
                                                                        setActiveClaimItem(null);
                                                                        setClaimError("");
                                                                    }}
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </form>
                                                    );
                                                }

                                                return (
                                                    <button
                                                        type="button"
                                                        className="secondary-order-button"
                                                        onClick={() => {
                                                            setClaimIssueType("damaged");
                                                            setClaimError("");
                                                            setActiveClaimItem(item.id);
                                                        }}
                                                        style={{ marginTop: "10px" }}
                                                    >
                                                        Report a delivery issue
                                                    </button>
                                                );
                                            })()}

                                        </div>


                                        {/* TOTAL */}

                                        <div className="order-item-total">

                                            ₹
                                            {Number(
                                                item.total_price ||
                                                Number(
                                                    item.price || 0
                                                ) *
                                                    Number(
                                                        item.quantity || 0
                                                    )
                                            ).toLocaleString(
                                                "en-IN"
                                            )}

                                        </div>

                                    </div>

                                )
                            )}

                    </div>

                </div>


                {/* ================================= */}
                {/* DELIVERY ADDRESS */}
                {/* ================================= */}

                <div className="order-section address-section">

                    <div className="section-heading">

                        <div>

                            <span>
                                DELIVERY
                            </span>

                            <h2>
                                Shipping Address
                            </h2>

                        </div>

                        <span className="address-icon">
                            📍
                        </span>

                    </div>


                    <div className="address-box">

                        <p className="address-main">
                            {order.shipping_address}
                        </p>

                        <p>
                            {order.city},{" "}
                            {order.state}
                        </p>

                        <p>
                            {order.country || "India"}
                            {" - "}
                            {order.pincode}
                        </p>

                    </div>

                </div>

            </div>


            {/* ================================= */}
            {/* PRICE SUMMARY */}
            {/* ================================= */}

            <div className="order-summary">

                <div className="section-heading">

                    <div>

                        <span>
                            PAYMENT SUMMARY
                        </span>

                        <h2>
                            Order Summary
                        </h2>

                    </div>

                    <span className="summary-icon">
                        💰
                    </span>

                </div>


                <div className="summary-row">

                    <span>
                        Items
                    </span>

                    <span>
                        {order.items?.length || 0}
                    </span>

                </div>


                <div className="summary-row">

                    <span>
                        Payment
                    </span>

                    <span>
                        {paymentStatus}
                    </span>

                </div>


                <div className="summary-divider" />


                <div className="summary-total">

                    <span>
                        Grand Total
                    </span>

                    <strong>
                        ₹
                        {Number(
                            order.total_amount || 0
                        ).toLocaleString(
                            "en-IN"
                        )}
                    </strong>

                </div>

            </div>


            {/* ================================= */}
            {/* BOTTOM ACTIONS */}
            {/* ================================= */}

            <div className="order-bottom-actions">

                <button
                    type="button"
                    className="secondary-order-button"
                    onClick={() =>
                        navigate("/orders")
                    }
                >
                    ← View My Orders
                </button>

                <button
                    type="button"
                    className="primary-order-button"
                    onClick={() =>
                        navigate("/products")
                    }
                >
                    Continue Shopping →
                </button>

            </div>

        </div>

    </div>
);


}

export default OrderDetails;
