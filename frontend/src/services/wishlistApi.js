
const API_BASE_URL = "http://localhost:8000/api";

import {
    trackProductInteraction,
} from "./recommendationApi";


// =====================================
// GET WISHLIST
// =====================================

export const getWishlist = async () => {
    try {

        const token =
            localStorage.getItem("access_token");

        if (!token) {
            throw new Error(
                "Please login to view wishlist."
            );
        }

        const response = await fetch(
            `${API_BASE_URL}/wishlist/`,
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
            "Wishlist Response:",
            data
        );

        if (!response.ok) {
            throw new Error(
                data.detail ||
                data.error ||
                "Failed to fetch wishlist"
            );
        }

        return data;

    } catch (error) {

        console.error(
            "Get Wishlist Error:",
            error
        );

        throw error;
    }
};


// =====================================
// ADD TO WISHLIST
// =====================================

export const addToWishlist = async (
    productId
) => {

    try {

        const token =
            localStorage.getItem("access_token");

        if (!token) {
            throw new Error(
                "Please login to use wishlist."
            );
        }

        const response = await fetch(
            `${API_BASE_URL}/wishlist/add/`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },

                body: JSON.stringify({
                    product: productId,
                }),
            }
        );

        const data = await response.json();

        console.log(
            "Add Wishlist Response:",
            data
        );

        if (!response.ok) {
            throw new Error(
                data.detail ||
                data.error ||
                "Failed to add product to wishlist"
            );
        }


        // =====================================
        // AIML WISHLIST INTERACTION TRACKING
        // =====================================

        trackProductInteraction(
            productId,
            "wishlist"
        ).catch((error) => {

            /*
             * Recommendation tracking is
             * non-critical.
             *
             * Wishlist operation must remain
             * successful even if AIML tracking
             * fails.
             */

            console.warn(
                "Wishlist interaction tracking failed:",
                error
            );
        });


        console.log(
            "Wishlist interaction tracking initiated:",
            {
                productId,
                interactionType: "wishlist",
            }
        );


        return data;

    } catch (error) {

        console.error(
            "Add Wishlist Error:",
            error
        );

        throw error;
    }
};


// =====================================
// REMOVE FROM WISHLIST
// =====================================

export const removeFromWishlist = async (
    itemId
) => {

    try {

        const token =
            localStorage.getItem("access_token");

        if (!token) {
            throw new Error(
                "Please login to use wishlist."
            );
        }

        const response = await fetch(
            `${API_BASE_URL}/wishlist/remove/${itemId}/`,
            {
                method: "DELETE",

                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        const data = await response.json();

        console.log(
            "Remove Wishlist Response:",
            data
        );

        if (!response.ok) {
            throw new Error(
                data.detail ||
                data.error ||
                "Failed to remove product from wishlist"
            );
        }

        return data;

    } catch (error) {

        console.error(
            "Remove Wishlist Error:",
            error
        );

        throw error;
    }
};

