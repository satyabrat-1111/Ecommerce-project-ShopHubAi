
const API_BASE_URL = "http://localhost:8000/api";

import {
    trackProductInteraction,
} from "./recommendationApi";


// =====================================
// GET CART
// =====================================

export const getCart = async () => {
    try {
        const token = localStorage.getItem(
            "access_token"
        );

        const response = await fetch(
            `${API_BASE_URL}/cart/`,
            {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        const data = await response.json();

        console.log(
            "Cart Response:",
            data
        );

        if (!response.ok) {
            throw new Error(
                data.detail ||
                data.error ||
                "Failed to fetch cart"
            );
        }

        return data;

    } catch (error) {

        console.error(
            "Get Cart Error:",
            error
        );

        throw error;
    }
};


// =====================================
// ADD TO CART
// =====================================

export const addToCart = async (
    productId,
    quantity = 1
) => {
    try {

        const token = localStorage.getItem(
            "access_token"
        );

        const response = await fetch(
            `${API_BASE_URL}/cart/add/`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },

                body: JSON.stringify({
                    product: productId,
                    quantity: quantity,
                }),
            }
        );

        const data = await response.json();

        console.log(
            "Add To Cart Response:",
            data
        );

        if (!response.ok) {
            throw new Error(
                data.detail ||
                data.error ||
                "Failed to add product to cart"
            );
        }


        // =====================================
        // AIML CART INTERACTION TRACKING
        // =====================================

        trackProductInteraction(
            productId,
            "cart"
        ).catch((error) => {

            /*
             * Recommendation tracking is
             * non-critical.
             *
             * Cart operation should remain
             * successful even if tracking fails.
             */

            console.warn(
                "Cart interaction tracking failed:",
                error
            );
        });


        console.log(
            "Cart interaction tracking initiated:",
            {
                productId,
                interactionType: "cart",
            }
        );


        return data;

    } catch (error) {

        console.error(
            "Add To Cart Error:",
            error
        );

        throw error;
    }
};


// =====================================
// UPDATE CART ITEM
// =====================================

export const updateCartItem = async (
    itemId,
    quantity
) => {
    try {

        const token = localStorage.getItem(
            "access_token"
        );

        const response = await fetch(
            `${API_BASE_URL}/cart/update/${itemId}/`,
            {
                method: "PATCH",

                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },

                body: JSON.stringify({
                    quantity: quantity,
                }),
            }
        );

        const data = await response.json();

        console.log(
            "Update Cart Response:",
            data
        );

        if (!response.ok) {
            throw new Error(
                data.detail ||
                data.error ||
                "Failed to update cart"
            );
        }

        return data;

    } catch (error) {

        console.error(
            "Update Cart Error:",
            error
        );

        throw error;
    }
};


// =====================================
// REMOVE CART ITEM
// =====================================

export const removeCartItem = async (
    itemId
) => {

    try {

        const token = localStorage.getItem(
            "access_token"
        );

        const response = await fetch(
            `${API_BASE_URL}/cart/remove/${itemId}/`,
            {
                method: "DELETE",

                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail ||
                data.error ||
                "Failed to remove cart item"
            );
        }

        return data;

    } catch (error) {

        console.error(
            "Remove Cart Error:",
            error
        );

        throw error;
    }
};


// =====================================
// CLEAR CART
// =====================================

export const clearCart = async () => {

    try {

        const token = localStorage.getItem(
            "access_token"
        );

        const response = await fetch(
            `${API_BASE_URL}/cart/clear/`,
            {
                method: "DELETE",

                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail ||
                data.error ||
                "Failed to clear cart"
            );
        }

        return data;

    } catch (error) {

        console.error(
            "Clear Cart Error:",
            error
        );

        throw error;
    }
};

