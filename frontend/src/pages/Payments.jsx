import { useEffect, useState } from "react";

function Payments() {

    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {

        const loadPayments = async () => {

            try {

                const token =
                    localStorage.getItem("access_token");

                const response = await fetch(
                    "http://localhost:8000/api/payments/",
                    {
                        method: "GET",
                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                        },
                    }
                );

                const data =
                    await response.json();

                console.log(
                    "Payment History:",
                    data
                );

                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        "Failed to load payments"
                    );
                }

                setPayments(
                    data.results || []
                );

            } catch (error) {

                console.error(
                    "Payment History Error:",
                    error
                );

                setError(
                    error.message
                );

            } finally {

                setLoading(false);
            }
        };

        loadPayments();

    }, []);


    if (loading) {

        return (
            <div
                style={{
                    padding: "50px",
                    textAlign: "center",
                }}
            >
                <h2>
                    Loading payments...
                </h2>
            </div>
        );
    }


    if (error) {

        return (
            <div
                style={{
                    padding: "50px",
                    textAlign: "center",
                }}
            >
                <h2 style={{ color: "red" }}>
                    {error}
                </h2>
            </div>
        );
    }


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

            {payments.length === 0 ? (

                <p>
                    No payments found.
                </p>

            ) : (

                payments.map((payment) => (

                    <div
                        key={payment.id}
                        style={{
                            border: "1px solid #ddd",
                            borderRadius: "10px",
                            padding: "20px",
                            marginBottom: "15px",
                        }}
                    >

                        <h3>
                            Payment #{payment.id}
                        </h3>

                        <p>
                            <strong>
                                Order:
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
                                Method:
                            </strong>{" "}
                            {payment.payment_method}
                        </p>

                        <p>
                            <strong>
                                Status:
                            </strong>{" "}
                            {payment.payment_status}
                        </p>

                        {payment.razorpay_payment_id && (

                            <p>
                                <strong>
                                    Razorpay Payment ID:
                                </strong>{" "}
                                {payment.razorpay_payment_id}
                            </p>

                        )}

                        <p>
                            <strong>
                                Date:
                            </strong>{" "}
                            {new Date(
                                payment.created_at
                            ).toLocaleString()}
                        </p>

                    </div>

                ))

            )}

        </div>
    );
}
export default Payments;