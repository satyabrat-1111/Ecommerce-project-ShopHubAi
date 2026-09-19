const API_BASE_URL = "http://localhost:8000/api";


// =====================================
// PLACE ORDER
// =====================================

export const placeOrder = async (orderData) => {

    try {

        const token =
            localStorage.getItem("access_token");

        if (!token) {
            throw new Error(
                "Please login before placing an order."
            );
        }

        const response = await fetch(
            `${API_BASE_URL}/orders/`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },

                body: JSON.stringify(orderData),
            }
        );

        const data =
            await response.json();

        console.log(
            "Place Order Response:",
            data
        );

        if (!response.ok) {

            throw new Error(
                data.detail ||
                data.error ||
                "Failed to place order"
            );
        }

        return data;

    } catch (error) {

        console.error(
            "Place Order Error:",
            error
        );

        throw error;
    }
};


// =====================================
// ORDER HISTORY
// =====================================

export const getOrderHistory = async () => {

    try {

        const token =
            localStorage.getItem("access_token");

        if (!token) {

            throw new Error(
                "Please login before viewing orders."
            );
        }

        const response = await fetch(
            `${API_BASE_URL}/orders/history/`,
            {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        const data =
            await response.json();

        console.log(
            "Order History Response:",
            data
        );

        if (!response.ok) {

            throw new Error(
                data.detail ||
                data.error ||
                "Failed to fetch order history"
            );
        }

        return data;

    } catch (error) {

        console.error(
            "Order History Error:",
            error
        );

        throw error;
    }
};


// =====================================
// ORDER DETAIL
// =====================================

export const getOrderDetail = async (
    orderId
) => {

    try {

        const token =
            localStorage.getItem("access_token");

        if (!token) {

            throw new Error(
                "Please login before viewing order."
            );
        }

        const response = await fetch(
            `${API_BASE_URL}/orders/${orderId}/`,
            {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        const data =
            await response.json();

        console.log(
            "Order Detail Response:",
            data
        );

        if (!response.ok) {

            throw new Error(
                data.detail ||
                data.error ||
                "Failed to fetch order"
            );
        }

        return data;

    } catch (error) {

        console.error(
            "Order Detail Error:",
            error
        );

        throw error;
    }
};


// =====================================
// DOWNLOAD INVOICE
// =====================================

export const downloadInvoice = async (
    paymentId
) => {

    try {

        const token =
            localStorage.getItem("access_token");

        if (!token) {

            throw new Error(
                "Please login before downloading invoice."
            );
        }

        if (!paymentId) {

            throw new Error(
                "Payment ID is not available."
            );
        }


        console.log(
            "Downloading invoice for payment:",
            paymentId
        );


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


        if (!response.ok) {

            let errorMessage =
                "Failed to download invoice.";

            try {

                const data =
                    await response.json();

                errorMessage =
                    data.detail ||
                    data.error ||
                    errorMessage;

            } catch {
                // Response is not JSON
            }

            throw new Error(
                errorMessage
            );
        }


        // =====================================
        // PDF RESPONSE
        // =====================================

        const blob =
            await response.blob();


        // =====================================
        // CREATE TEMPORARY URL
        // =====================================

        const url =
            window.URL.createObjectURL(
                blob
            );


        // =====================================
        // CREATE DOWNLOAD LINK
        // =====================================

        const link =
            document.createElement("a");


        link.href = url;

        link.download =
            `invoice_${paymentId}.pdf`;


        document.body.appendChild(
            link
        );


        link.click();


        // =====================================
        // CLEANUP
        // =====================================

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