const API_BASE_URL = "http://localhost:8000/api";

export const getCustomerInsights = async (signal) => {
    const token = localStorage.getItem("access_token");
    if (!token) {
        throw new Error("Sign in to view your shopping insights.");
    }

    const response = await fetch(`${API_BASE_URL}/orders/insights/`, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        signal,
    });
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detail || "Unable to load your shopping insights.");
    }

    return data;
};