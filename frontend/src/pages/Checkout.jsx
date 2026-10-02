import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { placeOrder } from "../services/orderApi";
import {
    createPayment,
    verifyPayment,
} from "../services/paymentApi";

import "../styles/Checkout.css";

const ensureRazorpayLoaded = () => {
    if (window.Razorpay) {
        return Promise.resolve(true);
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        script.onload = () => {
            if (window.Razorpay) {
                resolve(true);
            } else {
                reject(new Error("Razorpay Checkout could not be initialized. Please refresh and try again."));
            }
        };
        script.onerror = () => {
            reject(new Error("Unable to load Razorpay Checkout. Check your internet connection and try again."));
        };
        document.head.appendChild(script);
    });
};

function Checkout() {

    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        shipping_address: "",
        city: "",
        state: "",
        country: "India",
        pincode: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));

        if (error) {
            setError("");
        }
    };

    const openRazorpay = async (order) => {
        try {
            console.log("Creating Razorpay Payment...");

            const payment = await createPayment(order.id);

            console.log(
                "Razorpay Payment Created:",
                payment
            );

            await ensureRazorpayLoaded();

            const options = {
                key: payment.razorpay_key_id,

                amount:
                    Number(payment.amount) * 100,

                currency: "INR",

                name: "ShopHubAI",

                description:
                    `Payment for Order #${order.id}`,

                order_id:
                    payment.razorpay_order_id,

                method: {
                    upi: true,
                    card: true,
                    netbanking: true,
                    wallet: true,
                },

                handler: async function (response) {

                    try {

                        console.log(
                            "Razorpay Response:",
                            response
                        );

                        const verificationData = {
                            razorpay_order_id:
                                response.razorpay_order_id,

                            razorpay_payment_id:
                                response.razorpay_payment_id,

                            razorpay_signature:
                                response.razorpay_signature,
                        };

                        const verification =
                            await verifyPayment(
                                verificationData
                            );

                        console.log(
                            "Payment Verification:",
                            verification
                        );

                        alert(
                            "Payment Successful! 🎉"
                        );

                        navigate(
                            `/orders/${order.id}`
                        );

                    } catch (error) {

                        console.error(
                            "Payment Verification Error:",
                            error
                        );

                        setError(
                            error.message ||
                            "Payment verification failed."
                        );

                    } finally {

                        setLoading(false);

                    }
                },

                prefill: {
                    name: "",
                    email: "",
                    contact: "",
                },

                theme: {
                    color: "#2563eb",
                },

                modal: {

                    ondismiss: function () {

                        console.log(
                            "Razorpay popup closed."
                        );

                        setLoading(false);
                    },
                },
            };

            const razorpay =
                new window.Razorpay(options);

            razorpay.on(
                "payment.failed",
                function (response) {

                    console.error(
                        "Payment Failed:",
                        response.error
                    );

                    setError(
                        response.error?.description ||
                        "Payment failed. Please try again."
                    );

                    setLoading(false);
                }
            );

            razorpay.open();

        } catch (error) {

            console.error(
                "Razorpay Error:",
                error
            );

            setError(
                error.message ||
                "Unable to start payment."
            );

            setLoading(false);
        }
    };

    const handleSubmit = async (event) => {

        event.preventDefault();

        setError("");

        if (
            !formData.shipping_address.trim() ||
            !formData.city.trim() ||
            !formData.state.trim() ||
            !formData.pincode.trim()
        ) {

            setError(
                "Please fill all required delivery details."
            );

            return;
        }

        if (
            !/^\d{6}$/.test(
                formData.pincode
            )
        ) {

            setError(
                "Please enter a valid 6-digit pincode."
            );

            return;
        }

        try {

            setLoading(true);

            console.log(
                "Checkout Data:",
                formData
            );

            const order =
                await placeOrder(
                    formData
                );

            console.log(
                "Order Created:",
                order
            );

            await openRazorpay(
                order
            );

        } catch (error) {

            console.error(
                "Checkout Error:",
                error
            );

            setError(
                error.message ||
                "Unable to place order."
            );

            setLoading(false);
        }
    };

    return (

        <div className="checkout-page">

            <div className="checkout-header">

                <div className="checkout-header-content">

                    <div>

                        <span className="checkout-eyebrow">
                            SHOPHUBAI
                        </span>

                        <h1>
                            Secure Checkout
                        </h1>

                        <p>
                            Complete your delivery details
                            and proceed to secure payment.
                        </p>

                    </div>

                    <div className="checkout-security">

                        <span className="security-icon">
                            🔒
                        </span>

                        <div>
                            <strong>
                                Secure Checkout
                            </strong>

                            <small>
                                Your payment is protected
                            </small>
                        </div>

                    </div>

                </div>

            </div>

            <main className="checkout-container">

                <div className="checkout-layout">

                    <section className="checkout-card">

                        <div className="card-heading">

                            <div className="heading-icon">
                                📍
                            </div>

                            <div>

                                <h2>
                                    Delivery Address
                                </h2>

                                <p>
                                    Where should we deliver
                                    your order?
                                </p>

                            </div>

                        </div>

                        {error && (

                            <div className="checkout-error">

                                <span className="error-icon">
                                    ⚠
                                </span>

                                <div>
                                    <strong>
                                        Checkout Error
                                    </strong>

                                    <p>
                                        {error}
                                    </p>
                                </div>

                            </div>

                        )}

                        <form
                            onSubmit={handleSubmit}
                            className="checkout-form"
                        >

                            <div className="form-group">

                                <label htmlFor="shipping_address">
                                    Full Shipping Address
                                    <span>*</span>
                                </label>

                                <textarea
                                    id="shipping_address"
                                    name="shipping_address"
                                    value={
                                        formData.shipping_address
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="House/Flat No., Street, Area, Landmark"
                                    rows="4"
                                    required
                                    disabled={loading}
                                />

                                <small>
                                    Enter your complete delivery
                                    address.
                                </small>

                            </div>

                            <div className="form-row">

                                <div className="form-group">

                                    <label htmlFor="city">
                                        City
                                        <span>*</span>
                                    </label>

                                    <input
                                        id="city"
                                        type="text"
                                        name="city"
                                        value={
                                            formData.city
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Enter city"
                                        required
                                        disabled={loading}
                                    />

                                </div>

                                <div className="form-group">

                                    <label htmlFor="state">
                                        State
                                        <span>*</span>
                                    </label>

                                    <input
                                        id="state"
                                        type="text"
                                        name="state"
                                        value={
                                            formData.state
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Enter state"
                                        required
                                        disabled={loading}
                                    />

                                </div>

                            </div>

                            <div className="form-row">

                                <div className="form-group">

                                    <label htmlFor="country">
                                        Country
                                    </label>

                                    <input
                                        id="country"
                                        type="text"
                                        name="country"
                                        value={
                                            formData.country
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        required
                                        disabled={loading}
                                    />

                                </div>

                                <div className="form-group">

                                    <label htmlFor="pincode">
                                        Pincode
                                        <span>*</span>
                                    </label>

                                    <input
                                        id="pincode"
                                        type="text"
                                        name="pincode"
                                        value={
                                            formData.pincode
                                        }
                                        onChange={(event) => {

                                            const value =
                                                event.target.value
                                                    .replace(
                                                        /\D/g,
                                                        ""
                                                    )
                                                    .slice(
                                                        0,
                                                        6
                                                    );

                                            setFormData(
                                                (previous) => ({
                                                    ...previous,
                                                    pincode:
                                                        value,
                                                })
                                            );

                                            if (error) {
                                                setError("");
                                            }

                                        }}
                                        placeholder="6-digit pincode"
                                        inputMode="numeric"
                                        maxLength="6"
                                        required
                                        disabled={loading}
                                    />

                                </div>

                            </div>

                            <div className="payment-info">

                                <div className="payment-info-icon">
                                    💳
                                </div>

                                <div>

                                    <strong>
                                        Secure Online Payment
                                    </strong>

                                    <p>
                                        You will be redirected to
                                        Razorpay after placing
                                        your order.
                                    </p>

                                    <div className="payment-methods">

                                        <span>
                                            UPI
                                        </span>

                                        <span>
                                            Cards
                                        </span>

                                        <span>
                                            Net Banking
                                        </span>

                                        <span>
                                            Wallets
                                        </span>

                                    </div>

                                </div>

                            </div>

                            <button
                                type="submit"
                                className="checkout-button"
                                disabled={loading}
                            >

                                {loading ? (

                                    <>
                                        <span className="spinner"></span>

                                        Processing Payment...
                                    </>

                                ) : (

                                    <>
                                        Proceed to Secure Payment
                                        <span className="button-arrow">
                                            →
                                        </span>
                                    </>

                                )}

                            </button>

                            <p className="checkout-note">
                                🔒 Your payment details are securely
                                processed by Razorpay.
                            </p>

                        </form>

                    </section>

                    <aside className="checkout-sidebar">

                        <div className="progress-card">

                            <h3>
                                Checkout Progress
                            </h3>

                            <div className="progress-step active">

                                <div className="step-number">
                                    ✓
                                </div>

                                <div>
                                    <strong>
                                        Delivery Details
                                    </strong>

                                    <span>
                                        Enter your address
                                    </span>
                                </div>

                            </div>

                            <div className="progress-line"></div>

                            <div className="progress-step">

                                <div className="step-number">
                                    2
                                </div>

                                <div>
                                    <strong>
                                        Payment
                                    </strong>

                                    <span>
                                        Complete secure payment
                                    </span>
                                </div>

                            </div>

                            <div className="progress-line"></div>

                            <div className="progress-step">

                                <div className="step-number">
                                    3
                                </div>

                                <div>
                                    <strong>
                                        Order Confirmation
                                    </strong>

                                    <span>
                                        View your order
                                    </span>
                                </div>

                            </div>

                        </div>

                        <div className="trust-card">

                            <div className="trust-item">

                                <span>
                                    🔒
                                </span>

                                <div>
                                    <strong>
                                        Secure Payments
                                    </strong>

                                    <p>
                                        Payments securely handled
                                        by Razorpay.
                                    </p>
                                </div>

                            </div>

                            <div className="trust-item">

                                <span>
                                    🚚
                                </span>

                                <div>
                                    <strong>
                                        Reliable Delivery
                                    </strong>

                                    <p>
                                        Your order will be delivered
                                        to the provided address.
                                    </p>
                                </div>

                            </div>

                            <div className="trust-item">

                                <span>
                                    ✓
                                </span>

                                <div>
                                    <strong>
                                        Order Tracking
                                    </strong>

                                    <p>
                                        Track your order after
                                        successful payment.
                                    </p>
                                </div>

                            </div>

                        </div>

                    </aside>

                </div>

            </main>

        </div>
    );
}

export default Checkout;
