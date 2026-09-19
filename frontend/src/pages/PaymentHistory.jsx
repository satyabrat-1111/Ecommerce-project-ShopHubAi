import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    getPaymentHistory,
    downloadInvoice,
} from "../services/paymentApi";


function PaymentHistory() {

    const navigate = useNavigate();

    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [downloadingId, setDownloadingId] =
        useState(null);


    // =====================================
    // LOAD PAYMENT HISTORY
    // =====================================

    useEffect(() => {

        const loadPayments = async () => {

            try {

                setLoading(true);
                setError("");

                const data =
                    await getPaymentHistory();

                console.log(
                    "Payment History:",
                    data
                );

                setPayments(
                    Array.isArray(data)
                        ? data
                        : data.results || []
                );

            } catch (error) {

                console.error(
                    "Payment History Error:",
                    error
                );

                setError(
                    error.message ||
                    "Unable to load payment history."
                );

            } finally {

                setLoading(false);
            }
        };

        loadPayments();

    }, []);


    // =====================================
    // DOWNLOAD INVOICE
    // =====================================

    const handleDownloadInvoice =
        async (paymentId) => {

            try {

                setDownloadingId(
                    paymentId
                );

                await downloadInvoice(
                    paymentId
                );

            } catch (error) {

                console.error(
                    "Invoice Download Error:",
                    error
                );

                alert(
                    error.message ||
                    "Unable to download invoice."
                );

            } finally {

                setDownloadingId(null);
            }
        };


    // =====================================
    // LOADING
    // =====================================

    if (loading) {

        return (
            <div
                style={{
                    padding: "60px",
                    textAlign: "center",
                }}
            >
                <h2>
                    Loading payment history...
                </h2>
            </div>
        );
    }


    // =====================================
    // ERROR
    // =====================================

    if (error) {

        return (
            <div
                style={{
                    padding: "60px",
                    textAlign: "center",
                }}
            >

                <h2
                    style={{
                        color: "red",
                    }}
                >
                    {error}
                </h2>

                <button
                    onClick={() =>
                        window.location.reload()
                    }
                >
                    Try Again
                </button>

            </div>
        );
    }


    // =====================================
    // NO PAYMENTS
    // =====================================

    if (payments.length === 0) {

        return (
            <div
                style={{
                    padding: "60px",
                    textAlign: "center",
                }}
            >

                <h1>
                    Payment History 💳
                </h1>

                <h2>
                    No payments found
                </h2>

                <p>
                    You haven't made any
                    payments yet.
                </p>

                <button
                    onClick={() =>
                        navigate("/")
                    }
                >
                    Continue Shopping
                </button>

            </div>
        );
    }


    // =====================================
    // PAYMENT LIST
    // =====================================

    return (

        <div
            style={{
                maxWidth: "1000px",
                margin: "40px auto",
                padding: "20px",
            }}
        >

            <h1>
                Payment History 💳
            </h1>

            <p>
                Total Payments:{" "}
                <strong>
                    {payments.length}
                </strong>
            </p>


            {payments.map((payment) => (

                <div
                    key={payment.id}
                    style={{
                        border:
                            "1px solid #ddd",
                        borderRadius:
                            "12px",
                        padding:
                            "25px",
                        marginBottom:
                            "20px",
                    }}
                >

                    {/* HEADER */}

                    <div
                        style={{
                            display:
                                "flex",
                            justifyContent:
                                "space-between",
                            alignItems:
                                "center",
                            marginBottom:
                                "15px",
                        }}
                    >

                        <h2>
                            Payment #{payment.id}
                        </h2>

                        <span
                            style={{
                                padding:
                                    "6px 12px",
                                borderRadius:
                                    "20px",
                                background:
                                    payment.payment_status ===
                                    "Success"
                                        ? "#d4edda"
                                        : "#f8d7da",
                                color:
                                    payment.payment_status ===
                                    "Success"
                                        ? "#155724"
                                        : "#721c24",
                                fontWeight:
                                    "bold",
                            }}
                        >
                            {payment.payment_status}
                        </span>

                    </div>


                    {/* PAYMENT INFORMATION */}

                    <p>
                        <strong>
                            Order ID:
                        </strong>{" "}
                        #{payment.order}
                    </p>

                    <p>
                        <strong>
                            Amount:
                        </strong>{" "}
                        ₹{payment.amount}
                    </p>

                    <p>
                        <strong>
                            Payment Method:
                        </strong>{" "}
                        {payment.payment_method}
                    </p>

                    <p>
                        <strong>
                            Payment Date:
                        </strong>{" "}
                        {new Date(
                            payment.created_at
                        ).toLocaleString()}
                    </p>


                    {payment.razorpay_payment_id && (

                        <p>
                            <strong>
                                Razorpay Payment ID:
                            </strong>{" "}
                            {payment.razorpay_payment_id}
                        </p>

                    )}


                    {/* ACTIONS */}

                    <div
                        style={{
                            marginTop:
                                "20px",
                            display:
                                "flex",
                            gap:
                                "10px",
                            flexWrap:
                                "wrap",
                        }}
                    >

                        <button
                            onClick={() =>
                                navigate(
                                    `/orders/${payment.order}`
                                )
                            }
                            style={{
                                padding:
                                    "10px 18px",
                                cursor:
                                    "pointer",
                            }}
                        >
                            View Order
                        </button>


                        {payment.payment_status ===
                            "Success" && (

                            <button
                                onClick={() =>
                                    handleDownloadInvoice(
                                        payment.id
                                    )
                                }
                                disabled={
                                    downloadingId ===
                                    payment.id
                                }
                                style={{
                                    padding:
                                        "10px 18px",
                                    cursor:
                                        downloadingId ===
                                        payment.id
                                            ? "not-allowed"
                                            : "pointer",
                                }}
                            >
                                {downloadingId ===
                                payment.id
                                    ? "Downloading..."
                                    : "Download Invoice"}
                            </button>

                        )}

                    </div>

                </div>

            ))}

        </div>
    );
}


export default PaymentHistory;