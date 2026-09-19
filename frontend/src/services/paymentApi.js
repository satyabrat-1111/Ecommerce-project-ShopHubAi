const API_BASE_URL = "http://localhost:8000/api";


// =========================================
// CREATE RAZORPAY PAYMENT
// =========================================

export const createPayment = async (orderId) => {

    const token = localStorage.getItem(
        "access_token"
    );

    try {

        const response = await fetch(
            `${API_BASE_URL}/payments/create/${orderId}/`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    Authorization:
                        `Bearer ${token}`,
                },
            }
        );

        console.log(
            "Create Payment Status:",
            response.status
        );

        const data = await response.json();

        console.log(
            "Create Payment Response:",
            data
        );

        if (!response.ok) {

            throw new Error(
                data.error ||
                data.detail ||
                "Failed to create payment"
            );
        }

        return data;

    } catch (error) {

        console.error(
            "Create Payment Error:",
            error
        );

        throw error;
    }
};


// =========================================
// VERIFY RAZORPAY PAYMENT
// =========================================

export const verifyPayment = async (
    paymentData
) => {

    const token = localStorage.getItem(
        "access_token"
    );

    try {

        const response = await fetch(
            `${API_BASE_URL}/payments/verify/`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    Authorization:
                        `Bearer ${token}`,
                },

                body: JSON.stringify(
                    paymentData
                ),
            }
        );

        console.log(
            "Verify Payment Status:",
            response.status
        );

        const data = await response.json();

        console.log(
            "Verify Payment Response:",
            data
        );

        if (!response.ok) {

            throw new Error(
                data.message ||
                data.error ||
                "Payment verification failed"
            );
        }

        return data;

    } catch (error) {

        console.error(
            "Verify Payment Error:",
            error
        );

        throw error;
    }
};
// =========================================
// GET PAYMENT HISTORY
// =========================================

export const getPaymentHistory = async () => {

    const token = localStorage.getItem(
        "access_token"
    );

    try {

        const response = await fetch(
            `${API_BASE_URL}/payments/`,
            {
                method: "GET",

                headers: {
                    "Content-Type":
                        "application/json",

                    Authorization:
                        `Bearer ${token}`,
                },
            }
        );

        console.log(
            "Payment History Status:",
            response.status
        );

        const data =
            await response.json();

        console.log(
            "Payment History Response:",
            data
        );

        if (!response.ok) {

            throw new Error(
                data.detail ||
                data.error ||
                "Failed to load payment history"
            );
        }

        return data;

    } catch (error) {

        console.error(
            "Payment History Error:",
            error
        );

        throw error;
    }
};


// =========================================
// DOWNLOAD INVOICE
// =========================================

export const downloadInvoice = async (
    paymentId
) => {

    const token = localStorage.getItem(
        "access_token"
    );

    try {

        const response = await fetch(
            `${API_BASE_URL}/payments/invoice/${paymentId}/`,
            {
                method: "GET",

                headers: {
                    Authorization:
                        `Bearer ${token}`,
                },
            }
        );

        console.log(
            "Invoice Download Status:",
            response.status
        );

        if (!response.ok) {

            let errorMessage =
                "Failed to download invoice.";

            try {

                const data =
                    await response.json();

                errorMessage =
                    data.error ||
                    data.detail ||
                    errorMessage;

            } catch {
                // Response is not JSON
            }

            throw new Error(
                errorMessage
            );
        }

        const blob =
            await response.blob();

        const url =
            window.URL.createObjectURL(
                blob
            );

        const link =
            document.createElement("a");

        link.href = url;

        link.download =
            `invoice_${paymentId}.pdf`;

        document.body.appendChild(link);

        link.click();

        link.remove();

        window.URL.revokeObjectURL(
            url
        );

    } catch (error) {

        console.error(
            "Invoice Download Error:",
            error
        );

        throw error;
    }
};