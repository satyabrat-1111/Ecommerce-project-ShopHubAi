const API_BASE_URL = "http://localhost:8000/api/delivery-tracking";

const request = async (path, options = {}) => {
    const token = localStorage.getItem("access_token");
    if (!token) {
        throw new Error("Sign in to use delivery tracking.");
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...options.headers,
        },
    });
    const data = response.status === 204 ? null : await response.json();
    if (!response.ok) {
        throw new Error(data?.detail || data?.error || "Delivery tracking request failed.");
    }
    return data;
};

export const getDeliveryLocation = (orderId, signal) =>
    request(`/orders/${orderId}/`, { signal });

export const getAssignedDeliveries = (signal) =>
    request("/mine/", { signal });

export const startDeliverySharing = (orderId) =>
    request(`/orders/${orderId}/start/`, { method: "POST" });

export const stopDeliverySharing = (orderId, keepalive = false) =>
    request(`/orders/${orderId}/stop/`, { method: "POST", keepalive });

export const submitDeliveryLocation = (orderId, coords) =>
    request(`/orders/${orderId}/location/`, {
        method: "POST",
        body: JSON.stringify({
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy_meters: coords.accuracy,
        }),
    });

export const getAdminDeliveries = (signal) =>
    request("/admin/active/", { signal });

export const getDeliveryAssignees = (signal) =>
    request("/admin/assignees/", { signal });

export const assignDeliveryPerson = (orderId, deliveryPersonId) =>
    request(`/admin/orders/${orderId}/assignment/`, {
        method: "POST",
        body: JSON.stringify({ delivery_person_id: deliveryPersonId || null }),
    });