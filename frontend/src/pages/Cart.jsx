import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    getCart,
    updateCartItem,
    removeCartItem,
    clearCart,
} from "../services/cartApi";

function Cart() {
    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updatingItem, setUpdatingItem] = useState(null);

    const navigate = useNavigate();

    // ==============================
    // LOAD CART
    // ==============================

    const loadCart = async () => {
        try {
            setLoading(true);
            setError("");

            const data = await getCart();

            console.log("Cart Data:", data);

            setCart(data);
        } catch (error) {
            console.error("Cart Error:", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCart();
    }, []);

    // ==============================
    // UPDATE QUANTITY
    // ==============================

    const handleUpdateQuantity = async (
        itemId,
        quantity
    ) => {
        if (quantity < 1) {
            return;
        }

        try {
            setUpdatingItem(itemId);
            setError("");

            console.log(
                "Updating item:",
                itemId,
                "Quantity:",
                quantity
            );

            await updateCartItem(
                itemId,
                quantity
            );

            await loadCart();
        } catch (error) {
            console.error(
                "Update Cart Error:",
                error
            );

            setError(error.message);
        } finally {
            setUpdatingItem(null);
        }
    };

    // ==============================
    // REMOVE ITEM
    // ==============================

    const handleRemove = async (itemId) => {
        try {
            setError("");

            await removeCartItem(itemId);

            await loadCart();
        } catch (error) {
            console.error(
                "Remove Cart Error:",
                error
            );

            setError(error.message);
        }
    };

    // ==============================
    // CLEAR CART
    // ==============================

    const handleClearCart = async () => {
        const confirmClear = window.confirm(
            "Are you sure you want to clear the cart?"
        );

        if (!confirmClear) {
            return;
        }

        try {
            setError("");

            await clearCart();

            await loadCart();
        } catch (error) {
            console.error(
                "Clear Cart Error:",
                error
            );

            setError(error.message);
        }
    };

    // ==============================
    // LOADING
    // ==============================

    if (loading) {
        return (
            <div
                style={{
                    padding: "40px",
                    textAlign: "center",
                }}
            >
                <h2>Loading cart...</h2>
            </div>
        );
    }

    // ==============================
    // ERROR
    // ==============================

    if (error) {
        return (
            <div
                style={{
                    padding: "40px",
                    textAlign: "center",
                }}
            >
                <h2 style={{ color: "red" }}>
                    {error}
                </h2>

                <button onClick={loadCart}>
                    Try Again
                </button>
            </div>
        );
    }

    // ==============================
    // EMPTY CART
    // ==============================

    if (
        !cart ||
        !cart.items ||
        cart.items.length === 0
    ) {
        return (
            <div
                style={{
                    padding: "60px",
                    textAlign: "center",
                }}
            >
                <h1>
                    Your Cart is Empty 🛒
                </h1>

                <p>
                    Add some products to your cart.
                </p>
            </div>
        );
    }

    // ==============================
    // CART
    // ==============================

    return (
        <div
            style={{
                padding: "40px",
                maxWidth: "1000px",
                margin: "auto",
            }}
        >
            <h1>
                Shopping Cart 🛒
            </h1>

            {/* CART ITEMS */}

            {cart.items.map((item) => (
                <div
                    key={item.id}
                    style={{
                        display: "flex",
                        justifyContent:
                            "space-between",
                        alignItems: "center",
                        gap: "20px",
                        padding: "20px",
                        marginBottom: "15px",
                        border: "1px solid #ddd",
                        borderRadius: "10px",
                    }}
                >
                    {/* PRODUCT */}

                    <div
                        style={{
                            flex: 1,
                        }}
                    >
                        <h2>
                            {item.product_name ||
                                item.product}
                        </h2>

                        <p>
                            Price: ₹
                            {item.price}
                        </p>
                    </div>

                    {/* QUANTITY */}

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                        }}
                    >
                        <button
                            onClick={() =>
                                handleUpdateQuantity(
                                    item.id,
                                    item.quantity - 1
                                )
                            }
                            disabled={
                                item.quantity <= 1 ||
                                updatingItem ===
                                    item.id
                            }
                            style={{
                                width: "35px",
                                height: "35px",
                                fontSize: "20px",
                            }}
                        >
                            -
                        </button>

                        <span
                            style={{
                                margin: "0 15px",
                                fontWeight: "bold",
                                fontSize: "18px",
                            }}
                        >
                            {updatingItem ===
                            item.id
                                ? "..."
                                : item.quantity}
                        </span>

                        <button
                            onClick={() =>
                                handleUpdateQuantity(
                                    item.id,
                                    item.quantity + 1
                                )
                            }
                            disabled={
                                updatingItem ===
                                item.id
                            }
                            style={{
                                width: "35px",
                                height: "35px",
                                fontSize: "20px",
                            }}
                        >
                            +
                        </button>
                    </div>

                    {/* TOTAL */}

                    <div>
                        <strong>
                            ₹
                            {item.total_price ||
                                (
                                    Number(
                                        item.price
                                    ) *
                                    item.quantity
                                ).toFixed(2)}
                        </strong>
                    </div>

                    {/* REMOVE */}

                    <button
                        onClick={() =>
                            handleRemove(item.id)
                        }
                        style={{
                            color: "red",
                            cursor: "pointer",
                        }}
                    >
                        Remove
                    </button>
                </div>
            ))}

            {/* CART SUMMARY */}

            <div
                style={{
                    marginTop: "30px",
                    padding: "25px",
                    border: "1px solid #ddd",
                    borderRadius: "10px",
                    textAlign: "right",
                }}
            >
                <h2>
                    Grand Total: ₹
                    {cart.grand_total}
                </h2>

                <button
                    onClick={handleClearCart}
                    style={{
                        marginRight: "10px",
                        cursor: "pointer",
                    }}
                >
                    Clear Cart
                </button>

                {/* PROCEED TO CHECKOUT */}

                <button
                    onClick={() =>
                        navigate("/checkout")
                    }
                    style={{
                        cursor: "pointer",
                    }}
                >
                    Proceed to Checkout
                </button>
            </div>
        </div>
    );
}

export default Cart;