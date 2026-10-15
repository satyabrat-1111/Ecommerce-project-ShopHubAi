const API_BASE_URL = "http://localhost:8000/api";

const clearAuthState = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("is_admin");
    localStorage.removeItem("is_delivery_person");
    window.dispatchEvent(new Event("auth-updated"));
};

const fetchWithOtpAuth = async (url, options) => {
    const accessToken = localStorage.getItem("access_token");

    if (!accessToken) {
        clearAuthState();
        throw new Error("Please login as admin.");
    }

    const request = (token) =>
        fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                Authorization: `Bearer ${token}`,
            },
        });

    let response = await request(accessToken);

    if (response.status !== 401) {
        return response;
    }

    const refreshToken = localStorage.getItem("refresh_token");

    if (!refreshToken) {
        clearAuthState();
        throw new Error("Your session expired. Please login again.");
    }

    const refreshResponse = await fetch(
        `${API_BASE_URL}/token/refresh/`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                refresh: refreshToken,
            }),
        }
    );

    const refreshData = await refreshResponse.json();

    if (!refreshResponse.ok || !refreshData.access) {
        clearAuthState();
        throw new Error(
            refreshData.detail ||
                "Your session expired. Please login again."
        );
    }

    localStorage.setItem("access_token", refreshData.access);

    if (refreshData.refresh) {
        localStorage.setItem("refresh_token", refreshData.refresh);
    }

    return request(refreshData.access);
};

export const getAdminDashboard = async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
        throw new Error("Please login as admin.");
    }

    try {
        const response = await fetch(`${API_BASE_URL}/admin/dashboard/`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
            const text = await response.text();
            console.error("Admin Dashboard Response:", text);
            throw new Error(
                `Admin Dashboard API returned HTTP ${response.status}`
            );
        }

        const data = await response.json();

        console.log(
            "ADMIN DASHBOARD RAW DATA:",
            JSON.stringify(data, null, 2)
        );

        if (!response.ok) {
            throw new Error(
                data.detail ||
                data.error ||
                "Failed to load admin dashboard"
            );
        }

        return data;
    } catch (error) {
        console.error("Admin Dashboard Error:", error);
        throw error;
    }
};

export const getRecentOrders = async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
        throw new Error("Please login as admin.");
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/admin/orders/recent/`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
            const text = await response.text();
            console.error("Recent Orders Response:", text);
            throw new Error(
                `Recent Orders API returned HTTP ${response.status}`
            );
        }

        const data = await response.json();

        console.log("Recent Orders Response:", data);

        if (!response.ok) {
            throw new Error(
                data.detail ||
                data.error ||
                "Failed to load recent orders"
            );
        }

        return data;
    } catch (error) {
        console.error("Recent Orders Error:", error);
        throw error;
    }
};

export const updateOrderStatus = async (orderId, newStatus) => {
    const token = localStorage.getItem("access_token");

    if (!token) {
        throw new Error("Please login as admin.");
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/admin/orders/${orderId}/status/`,
            {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    status: newStatus,
                }),
            }
        );

        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
            const text = await response.text();
            console.error("Order Status Response:", text);
            throw new Error(
                `Order Status API returned HTTP ${response.status}`
            );
        }

        const data = await response.json();

        console.log("Order Status Update Response:", data);

        if (!response.ok) {
            throw new Error(
                data.detail ||
                data.error ||
                "Failed to update order status"
            );
        }

        return data;
    } catch (error) {
        console.error("Order Status Update Error:", error);
        throw error;
    }
};

export const sendDeliveryOTP = async (orderId, phone) => {
    const token = localStorage.getItem("access_token");

    if (!token) {
        throw new Error("Please login as admin.");
    }

    if (!phone || !String(phone).trim()) {
        throw new Error("Delivery phone number is required.");
    }

    try {
        const response = await fetchWithOtpAuth(
            `${API_BASE_URL}/orders/${orderId}/delivery/send-otp/`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    phone: String(phone).trim(),
                }),
            }
        );

        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
            const text = await response.text();
            console.error("Send Delivery OTP Response:", text);
            throw new Error(
                `Send Delivery OTP API returned HTTP ${response.status}`
            );
        }

        const data = await response.json();

        console.log("SEND DELIVERY OTP RESPONSE:", data);

        if (!response.ok) {
            throw new Error(
                data.detail ||
                data.error ||
                data.message ||
                "Failed to send delivery OTP."
            );
        }

        return data;
    } catch (error) {
        console.error("Send Delivery OTP Error:", error);
        throw error;
    }
};

export const verifyDeliveryOTP = async (orderId, otp) => {
    const token = localStorage.getItem("access_token");

    if (!token) {
        throw new Error("Please login as admin.");
    }

    if (!otp || !String(otp).trim()) {
        throw new Error("OTP is required.");
    }

    try {
        const response = await fetchWithOtpAuth(
            `${API_BASE_URL}/orders/${orderId}/delivery/verify-otp/`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    otp: String(otp).trim(),
                }),
            }
        );

        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
            const text = await response.text();
            console.error("Verify Delivery OTP Response:", text);
            throw new Error(
                `Verify Delivery OTP API returned HTTP ${response.status}`
            );
        }

        const data = await response.json();

        console.log("VERIFY DELIVERY OTP RESPONSE:", data);

        if (!response.ok) {
            throw new Error(
                data.detail ||
                data.error ||
                data.message ||
                "Failed to verify delivery OTP."
            );
        }

        return data;
    } catch (error) {
        console.error("Verify Delivery OTP Error:", error);
        throw error;
    }
};


export const getDeliveryIssueClaims = async () => {
    const response = await fetchWithOtpAuth(
        `${API_BASE_URL}/orders/admin/delivery-claims/`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        }
    );
    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.detail || data.error || "Failed to load delivery issue reports."
        );
    }

    return data;
};


export const reviewDeliveryIssueClaim = async (claimId, review) => {
    const response = await fetchWithOtpAuth(
        `${API_BASE_URL}/orders/admin/delivery-claims/${claimId}/review/`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(review),
        }
    );
    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.detail || data.error || "Failed to review delivery issue report."
        );
    }

    return data;
};

export const getAdminAnalytics = async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
        throw new Error("Please login as admin.");
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/admin/analytics/`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const data = await response.json();

        console.log("ADMIN ANALYTICS RESPONSE:", data);

        if (!response.ok) {
            throw new Error(
                data.detail ||
                data.error ||
                "Failed to load admin analytics"
            );
        }

        return data;
    } catch (error) {
        console.error("Admin Analytics Error:", error);
        throw error;
    }
};

export const getAdminProducts = async ({
    search = "",
    category = "",
    brand = "",
    is_active = "",
    ordering = "-created_at",
} = {}) => {
    const token = localStorage.getItem("access_token");

    if (!token) {
        throw new Error("Please login as admin.");
    }

    try {
        const params = new URLSearchParams();

        if (search) {
            params.append("search", search);
        }

        if (category) {
            params.append("category", category);
        }

        if (brand) {
            params.append("brand", brand);
        }

        if (is_active !== "") {
            params.append("is_active", is_active);
        }

        if (ordering) {
            params.append("ordering", ordering);
        }

        const queryString = params.toString();

        const url =
            `${API_BASE_URL}/admin/products/` +
            (queryString ? `?${queryString}` : "");

        const response = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
            const text = await response.text();
            console.error("Admin Products Response:", text);
            throw new Error(
                `Admin Products API returned HTTP ${response.status}`
            );
        }

        const data = await response.json();

        console.log("ADMIN PRODUCTS RESPONSE:", data);

        if (!response.ok) {
            throw new Error(
                data.detail ||
                data.error ||
                "Failed to load admin products"
            );
        }

        return data;
    } catch (error) {
        console.error("Get Admin Products Error:", error);
        throw error;
    }
};

export const createAdminProduct = async (productData) => {
    const token = localStorage.getItem("access_token");

    if (!token) {
        throw new Error("Please login as admin.");
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/admin/products/`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: productData,
            }
        );

        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
            const text = await response.text();
            console.error("Create Product Response:", text);
            throw new Error(
                `Create Product API returned HTTP ${response.status}`
            );
        }

        const data = await response.json();

        console.log("CREATE PRODUCT RESPONSE:", data);

        if (!response.ok) {
            const errorMessage =
                data.detail ||
                data.error ||
                data.message ||
                Object.values(data).flat().join(" ") ||
                "Failed to create product";

            throw new Error(errorMessage);
        }

        return data;
    } catch (error) {
        console.error("Create Product Error:", error);
        throw error;
    }
};

export const updateAdminProduct = async (productId, productData) => {
    const token = localStorage.getItem("access_token");

    if (!token) {
        throw new Error("Please login as admin.");
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/admin/products/${productId}/`,
            {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: productData,
            }
        );

        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
            const text = await response.text();
            console.error("Update Product Response:", text);
            throw new Error(
                `Update Product API returned HTTP ${response.status}`
            );
        }

        const data = await response.json();

        console.log("UPDATE PRODUCT RESPONSE:", data);

        if (!response.ok) {
            const errorMessage =
                data.detail ||
                data.error ||
                data.message ||
                Object.values(data).flat().join(" ") ||
                "Failed to update product";

            throw new Error(errorMessage);
        }

        return data;
    } catch (error) {
        console.error("Update Product Error:", error);
        throw error;
    }
};

export const deleteAdminProduct = async (productId) => {
    const token = localStorage.getItem("access_token");

    if (!token) {
        throw new Error("Please login as admin.");
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/admin/products/${productId}/`,
            {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        if (response.status === 204) {
            return {
                success: true,
                message: "Product deleted successfully.",
            };
        }

        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.detail ||
                    data.error ||
                    data.message ||
                    "Failed to delete product"
                );
            }

            return data;
        }

        if (!response.ok) {
            throw new Error(
                `Delete Product API returned HTTP ${response.status}`
            );
        }

        return {
            success: true,
            message: "Product deleted successfully.",
        };
    } catch (error) {
        console.error("Delete Product Error:", error);
        throw error;
    }
};

export const getAdminProduct = async (productId) => {
    const token = localStorage.getItem("access_token");

    if (!token) {
        throw new Error("Please login as admin.");
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/admin/products/${productId}/`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
            const text = await response.text();
            console.error("Product Details Response:", text);
            throw new Error(
                `Product Details API returned HTTP ${response.status}`
            );
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail ||
                data.error ||
                "Failed to load product"
            );
        }

        return data;
    } catch (error) {
        console.error("Get Admin Product Error:", error);
        throw error;
    }
};

export const getRecommendationAnalytics = async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
        throw new Error("Please login as admin.");
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/recommendations/analytics/`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
            const text = await response.text();
            console.error(
                "Recommendation Analytics Response:",
                text
            );
            throw new Error(
                `Recommendation Analytics API returned HTTP ${response.status}`
            );
        }

        const data = await response.json();

        console.log(
            "RECOMMENDATION ANALYTICS RESPONSE:",
            data
        );

        if (!response.ok) {
            throw new Error(
                data.detail ||
                data.error ||
                "Failed to load recommendation analytics"
            );
        }

        return data;
    } catch (error) {
        console.error(
            "Recommendation Analytics Error:",
            error
        );
        throw error;
    }
};