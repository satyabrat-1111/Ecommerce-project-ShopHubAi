const API_BASE_URL = "http://localhost:8000/api";


// =====================================================
// GET PRODUCTS
// Advanced Search + Filters + Sorting + Pagination
// =====================================================

export const getProducts = async (params = {}) => {
    try {

        const queryParams = new URLSearchParams();

        // ---------------------------------------------
        // SEARCH
        // ---------------------------------------------

        if (params.search?.trim()) {
            queryParams.append(
                "search",
                params.search.trim()
            );
        }

        // ---------------------------------------------
        // CATEGORY
        // ---------------------------------------------

        if (params.category) {
            queryParams.append(
                "category",
                params.category
            );
        }

        // ---------------------------------------------
        // BRAND
        // ---------------------------------------------

        if (params.brand) {
            queryParams.append(
                "brand",
                params.brand
            );
        }

        // ---------------------------------------------
        // MIN PRICE
        // ---------------------------------------------

        if (
            params.min_price !== "" &&
            params.min_price !== null &&
            params.min_price !== undefined
        ) {
            queryParams.append(
                "min_price",
                params.min_price
            );
        }

        // ---------------------------------------------
        // MAX PRICE
        // ---------------------------------------------

        if (
            params.max_price !== "" &&
            params.max_price !== null &&
            params.max_price !== undefined
        ) {
            queryParams.append(
                "max_price",
                params.max_price
            );
        }

        // ---------------------------------------------
        // STOCK
        // ---------------------------------------------

        if (params.in_stock !== "" &&
            params.in_stock !== null &&
            params.in_stock !== undefined) {

            queryParams.append(
                "in_stock",
                params.in_stock
            );
        }

        // ---------------------------------------------
        // SORTING
        // ---------------------------------------------

        if (params.ordering) {
            queryParams.append(
                "ordering",
                params.ordering
            );
        }

        // ---------------------------------------------
        // PAGINATION
        // ---------------------------------------------

        if (params.page) {
            queryParams.append(
                "page",
                params.page
            );
        }

        const queryString =
            queryParams.toString();

        const url = queryString
            ? `${API_BASE_URL}/products/?${queryString}`
            : `${API_BASE_URL}/products/`;

        console.log(
            "Products API URL:",
            url
        );

        const response = await fetch(url);

        console.log(
            "Response Status:",
            response.status
        );

        if (!response.ok) {
            throw new Error(
                `API Error: ${response.status}`
            );
        }

        const data =
            await response.json();

        console.log(
            "Products Data:",
            data
        );

        return data;

    } catch (error) {

        console.error(
            "Backend Error:",
            error
        );

        throw error;
    }
};


// =====================================================
// ADD TO CART
// =====================================================

export const addToCart = async (
    productId,
    quantity = 1,
    token
) => {

    try {

        const response = await fetch(
            `${API_BASE_URL}/cart/add/`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",

                    Authorization:
                        `Bearer ${token}`,
                },

                body: JSON.stringify({
                    product: productId,
                    quantity: quantity,
                }),
            }
        );

        const data =
            await response.json();

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

        return data;

    } catch (error) {

        console.error(
            "Add To Cart Error:",
            error
        );

        throw error;
    }
};