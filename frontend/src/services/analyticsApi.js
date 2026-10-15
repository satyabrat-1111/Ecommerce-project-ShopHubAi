const API_BASE_URL = "http://localhost:8000/api";

export const getBusinessAnalytics = async (filters, signal) => {
    const token = localStorage.getItem("access_token");

    if (!token) {
        throw new Error("Please sign in with an administrator account.");
    }

    const query = new URLSearchParams(filters);
    const response = await fetch(
        `${API_BASE_URL}/analytics/overview/?${query}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            signal,
        }
    );
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detail || "Unable to load business analytics.");
    }

    return data;
};