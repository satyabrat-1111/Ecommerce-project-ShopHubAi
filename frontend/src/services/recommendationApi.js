const API_BASE_URL = "http://localhost:8000/api";


// ============================================================
// TRACK PRODUCT INTERACTION
// ============================================================

export const trackProductInteraction = async (
    productId,
    interactionType
) => {

    const numericProductId = Number(productId);


    // ---------------------------------------------
    // VALIDATION
    // ---------------------------------------------

    if (
        !Number.isInteger(numericProductId) ||
        numericProductId <= 0
    ) {

        console.warn(
            "Invalid product ID:",
            productId
        );

        return null;
    }


    const validInteractions = [
        "view",
        "wishlist",
        "cart",
        "purchase",
    ];


    if (
        !validInteractions.includes(
            interactionType
        )
    ) {

        console.warn(
            "Invalid interaction type:",
            interactionType
        );

        return null;
    }


    // ---------------------------------------------
    // AUTHENTICATION
    // ---------------------------------------------

    const token =
        localStorage.getItem(
            "access_token"
        );


    /*
     * Backend TrackProductInteractionView uses
     * IsAuthenticated.
     *
     * Therefore do not send anonymous tracking
     * requests.
     */

    if (!token) {

        console.log(
            "Interaction tracking skipped - user not authenticated."
        );

        return null;
    }


    // ---------------------------------------------
    // PAYLOAD
    // ---------------------------------------------

    const payload = {
        product: numericProductId,
        interaction_type: interactionType,
    };


    console.log(
        "Tracking Product Interaction:",
        payload
    );


    // ---------------------------------------------
    // REQUEST
    // ---------------------------------------------

    try {

        const response = await fetch(
            `${API_BASE_URL}/recommendations/track/`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    Accept:
                        "application/json",

                    Authorization:
                        `Bearer ${token}`,
                },

                body: JSON.stringify(
                    payload
                ),
            }
        );


        // -----------------------------------------
        // RESPONSE
        // -----------------------------------------

        let data = null;

        try {

            data =
                await response.json();

        } catch {

            data = null;
        }


        console.log(
            "Product Interaction Response:",
            {
                status: response.status,
                data,
            }
        );


        // -----------------------------------------
        // TOKEN EXPIRED
        // -----------------------------------------

        if (
            response.status === 401
        ) {

            console.warn(
                "Recommendation authentication expired."
            );

            localStorage.removeItem(
                "access_token"
            );

            return null;
        }


        // -----------------------------------------
        // VALIDATION ERROR
        // -----------------------------------------

        if (
            response.status === 400
        ) {

            console.warn(
                "Recommendation tracking validation error:",
                data
            );

            return null;
        }


        // -----------------------------------------
        // OTHER ERROR
        // -----------------------------------------

        if (!response.ok) {

            console.warn(
                "Recommendation tracking failed:",
                data
            );

            return null;
        }


        // -----------------------------------------
        // SUCCESS
        // -----------------------------------------

        console.log(
            "Product interaction tracked successfully:",
            {
                productId:
                    numericProductId,

                interactionType,
            }
        );


        return data;

    } catch (error) {

        /*
         * Tracking is non-critical.
         * Never break Product Details because
         * recommendation tracking failed.
         */

        console.warn(
            "Product interaction network error:",
            error
        );

        return null;
    }
};



// ============================================================
// TRACK RECOMMENDATION PERFORMANCE EVENT
// ============================================================

export const trackRecommendationEvent = async (
    sourceProductId,
    recommendedProductId,
    eventType
) => {

    // ---------------------------------------------
    // SOURCE PRODUCT
    // ---------------------------------------------
    //
    // Homepage recommendations do not have a
    // source product.
    //
    // Therefore:
    //
    // sourceProductId = null
    //
    // is valid.
    //

    const numericSourceProductId =
        sourceProductId === null ||
        sourceProductId === undefined ||
        sourceProductId === ""
            ? null
            : Number(sourceProductId);


    // ---------------------------------------------
    // RECOMMENDED PRODUCT
    // ---------------------------------------------

    const numericRecommendedProductId =
        Number(recommendedProductId);


    // ---------------------------------------------
    // SOURCE PRODUCT VALIDATION
    // ---------------------------------------------

    if (
        numericSourceProductId !== null &&
        (
            !Number.isInteger(
                numericSourceProductId
            ) ||
            numericSourceProductId <= 0
        )
    ) {

        console.warn(
            "Invalid source product ID:",
            sourceProductId
        );

        return null;
    }


    // ---------------------------------------------
    // RECOMMENDED PRODUCT VALIDATION
    // ---------------------------------------------

    if (
        !Number.isInteger(
            numericRecommendedProductId
        ) ||
        numericRecommendedProductId <= 0
    ) {

        console.warn(
            "Invalid recommended product ID:",
            recommendedProductId
        );

        return null;
    }


    // ---------------------------------------------
    // EVENT VALIDATION
    // ---------------------------------------------

    const validEvents = [
        "impression",
        "click",
        "view",
        "wishlist",
        "cart",
        "purchase",
    ];


    if (
        !validEvents.includes(
            eventType
        )
    ) {

        console.warn(
            "Invalid recommendation event type:",
            eventType
        );

        return null;
    }


    // ---------------------------------------------
    // AUTHENTICATION
    // ---------------------------------------------

    const token =
        localStorage.getItem(
            "access_token"
        );


    /*
     * RecommendationEventView uses AllowAny.
     *
     * Therefore anonymous users can also
     * generate recommendation events.
     *
     * If token exists, send it.
     */

    const headers = {

        "Content-Type":
            "application/json",

        Accept:
            "application/json",

    };


    if (token) {

        headers.Authorization =
            `Bearer ${token}`;

    }


    // ---------------------------------------------
    // PAYLOAD
    // ---------------------------------------------

    const payload = {

        source_product:
            numericSourceProductId,

        recommended_product:
            numericRecommendedProductId,

        event_type:
            eventType,

    };


    console.log(
        "Tracking Recommendation Event:",
        payload
    );


    // ---------------------------------------------
    // REQUEST
    // ---------------------------------------------

    try {

        const response = await fetch(
            `${API_BASE_URL}/recommendations/event/`,
            {
                method: "POST",

                headers,

                body:
                    JSON.stringify(
                        payload
                    ),
            }
        );


        // -----------------------------------------
        // RESPONSE
        // -----------------------------------------

        let data = null;

        try {

            data =
                await response.json();

        } catch {

            data = null;

        }


        console.log(
            "Recommendation Event Response:",
            {
                status:
                    response.status,

                data,
            }
        );


        // -----------------------------------------
        // TOKEN EXPIRED
        // -----------------------------------------

        if (
            response.status === 401
        ) {

            console.warn(
                "Recommendation event authentication expired."
            );

            localStorage.removeItem(
                "access_token"
            );

            return null;

        }


        // -----------------------------------------
        // VALIDATION ERROR
        // -----------------------------------------

        if (
            response.status === 400
        ) {

            console.warn(
                "Recommendation event validation error:",
                data
            );

            return null;

        }


        // -----------------------------------------
        // OTHER ERROR
        // -----------------------------------------

        if (!response.ok) {

            console.warn(
                "Recommendation event tracking failed:",
                data
            );

            return null;

        }


        // -----------------------------------------
        // SUCCESS
        // -----------------------------------------

        console.log(
            "Recommendation event tracked successfully:",
            {
                sourceProductId:
                    numericSourceProductId,

                recommendedProductId:
                    numericRecommendedProductId,

                eventType,
            }
        );


        return data;

    } catch (error) {

        /*
         * Performance tracking is non-critical.
         *
         * It must NEVER break Product Details
         * or Homepage shopping flow.
         */

        console.warn(
            "Recommendation event network error:",
            error
        );

        return null;

    }

};



// ============================================================
// HOMEPAGE RECOMMENDATIONS
// ============================================================

export const getHomeRecommendations = async () => {

    const token =
        localStorage.getItem(
            "access_token"
        );


    const headers = {
        Accept:
            "application/json",
    };


    if (token) {

        headers.Authorization =
            `Bearer ${token}`;

    }


    try {

        const response = await fetch(
            `${API_BASE_URL}/recommendations/home/`,
            {
                method: "GET",

                headers,
            }
        );


        // -----------------------------------------
        // RESPONSE
        // -----------------------------------------

        let data = null;


        try {

            data =
                await response.json();

        } catch {

            data = null;

        }


        console.log(
            "Homepage Recommendation Response:",
            {
                status:
                    response.status,

                data,
            }
        );


        // -----------------------------------------
        // TOKEN EXPIRED
        // -----------------------------------------

        if (
            response.status === 401
        ) {

            console.warn(
                "Homepage recommendation authentication expired."
            );

            localStorage.removeItem(
                "access_token"
            );
            localStorage.removeItem(
                "refresh_token"
            );
            localStorage.removeItem(
                "is_admin"
            );
            localStorage.removeItem(
                "is_delivery_person"
            );
            window.dispatchEvent(
                new Event("auth-updated")
            );

            return null;

        }


        // -----------------------------------------
        // OTHER ERROR
        // -----------------------------------------

        if (!response.ok) {

            console.warn(
                "Homepage recommendation failed:",
                data
            );

            return null;

        }


        // -----------------------------------------
        // SUCCESS
        // -----------------------------------------

        return data;


    } catch (error) {

        console.warn(
            "Homepage recommendation network error:",
            error
        );

        return null;

    }

};