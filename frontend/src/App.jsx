import { useEffect, useState } from "react";
import { Link, Routes, Route, useLocation, useNavigate } from "react-router-dom";

// =====================================
// PAGES
// =====================================

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import Products from "./pages/Products";
import ProductDetails from "./pages/ProductDetails";

import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";

import Orders from "./pages/Orders";
import OrderDetails from "./pages/OrderDetails";

import Wishlist from "./pages/Wishlist";

import PaymentHistory from "./pages/PaymentHistory";

import AdminDashboard from "./pages/AdminDashboard";
import AdminProtectedRoute from "./pages/AdminProtectedRoute";
import AdminProducts from "./pages/AdminProducts";
import BusinessAnalytics from "./pages/BusinessAnalytics";
import CustomerInsights from "./pages/CustomerInsights";
import DeliveryPersonTracking from "./pages/DeliveryPersonTracking";
import AdminDeliveryTracking from "./pages/AdminDeliveryTracking";
// =====================================
// CSS
// =====================================

import "./App.css";


// =====================================
// NAVBAR
// =====================================

function Navbar({ darkMode, setDarkMode }) {

    const navigate = useNavigate();

    const [isLoggedIn, setIsLoggedIn] = useState(
        !!localStorage.getItem("access_token")
    );

    const [isAdmin, setIsAdmin] = useState(
        localStorage.getItem("is_admin") === "true"
    );
    const [isDeliveryPerson, setIsDeliveryPerson] = useState(
        localStorage.getItem("is_delivery_person") === "true"
    );


    // =====================================
    // CHECK LOGIN STATUS
    // =====================================

    useEffect(() => {

        const checkLogin = () => {

            setIsLoggedIn(
                !!localStorage.getItem("access_token")
            );

            setIsAdmin(
                localStorage.getItem("is_admin") === "true"
            );
            setIsDeliveryPerson(
                localStorage.getItem("is_delivery_person") === "true"
            );
        };

        checkLogin();

        window.addEventListener(
            "storage",
            checkLogin
        );
        window.addEventListener("auth-updated", checkLogin);

        return () => {
            window.removeEventListener(
                "storage",
                checkLogin
            );
            window.removeEventListener("auth-updated", checkLogin);
        };

    }, []);


    // =====================================
    // LOGOUT
    // =====================================

    const clearAuthState = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("is_admin");
        localStorage.removeItem("is_delivery_person");
        window.dispatchEvent(new Event("auth-updated"));
    };

    const handleLogout = () => {
        clearAuthState();

        setIsLoggedIn(false);
        setIsAdmin(false);
        setIsDeliveryPerson(false);

        navigate("/login");
    };


    return (

        <nav className="navbar">

            {/* ================================= */}
            {/* LOGO */}
            {/* ================================= */}

            <Link
                to="/"
                className="navbar-logo"
            >
                <span className="logo-icon">
                    🛍️
                </span>

                <span>
                    ShopHub<span className="logo-ai">AI</span>
                </span>
            </Link>


            {/* ================================= */}
            {/* NAV LINKS */}
            {/* ================================= */}

            <div className="nav-links">

                <Link to="/">
                    Home
                </Link>

                <Link to="/products">
                    Products
                </Link>

                <Link to="/cart">
                    🛒 Cart
                </Link>

                {isLoggedIn && (
                    <Link to="/orders">
                        Orders
                    </Link>
                )}

                {isLoggedIn && (
                    <Link to="/insights">
                        My Insights
                    </Link>
                )}

                {isLoggedIn && (
                    <Link to="/payments">
                        💳 Payments
                    </Link>
                )}


                {/* ================================= */}
                {/* ADMIN */}
                {/* ================================= */}

                {isAdmin && (
                    <Link to="/admin">
                        📊 Admin
                    </Link>
                )}

                {isAdmin && (
                    <Link to="/admin/analytics">
                        Business Analytics
                    </Link>
                )}

                {isDeliveryPerson && (
                    <Link to="/delivery/share">
                        Share Delivery Location
                    </Link>
                )}

                {isAdmin && (
                    <Link to="/admin/delivery-tracking">
                        Delivery Tracking
                    </Link>
                )}


                {/* ================================= */}
                {/* LOGIN / LOGOUT */}
                {/* ================================= */}

                {!isLoggedIn ? (

                    <Link
                        to="/login"
                        className="nav-login"
                    >
                        Login
                    </Link>

                ) : (

                    <button
                        className="nav-logout"
                        onClick={handleLogout}
                    >
                        Logout
                    </button>

                )}


                {/* ================================= */}
                {/* DARK MODE */}
                {/* ================================= */}

                <button
                    className="theme-toggle"
                    onClick={() =>
                        setDarkMode(!darkMode)
                    }
                    title={
                        darkMode
                            ? "Switch to Light Mode"
                            : "Switch to Dark Mode"
                    }
                >

                    {darkMode ? "☀️" : "🌙"}

                </button>

            </div>

        </nav>
    );
}


// =====================================
// APP
// =====================================

function App() {

    const location = useLocation();
    const isAnalyticsPage = location.pathname === "/admin/analytics";

    // =====================================
    // DARK MODE STATE
    // =====================================

    const [darkMode, setDarkMode] = useState(() => {

        const savedTheme =
            localStorage.getItem("theme");

        if (savedTheme === "dark") {
            return true;
        }

        if (savedTheme === "light") {
            return false;
        }

        return window.matchMedia &&
            window.matchMedia(
                "(prefers-color-scheme: dark)"
            ).matches;

    });


    // =====================================
    // SAVE THEME
    // =====================================

    useEffect(() => {

        if (darkMode) {

            document.body.classList.add(
                "dark-mode"
            );

            document.body.classList.remove(
                "light-mode"
            );

            localStorage.setItem(
                "theme",
                "dark"
            );

        } else {

            document.body.classList.add(
                "light-mode"
            );

            document.body.classList.remove(
                "dark-mode"
            );

            localStorage.setItem(
                "theme",
                "light"
            );
        }

    }, [darkMode]);


    return (

        <div
            className={
                darkMode
                    ? "app dark-theme"
                    : "app light-theme"
            }
        >

            {/* ================================= */}
            {/* NAVBAR */}
            {/* ================================= */}

            {!isAnalyticsPage && (
                <>
                    <Navbar
                        darkMode={darkMode}
                        setDarkMode={setDarkMode}
                    />
                    <Link to="/wishlist">
                        ❤️ Wishlist
                    </Link>
                </>
            )}


            {/* ================================= */}
            {/* ROUTES */}
            {/* ================================= */}

            <main className="main-content">

                <Routes>

                    {/* ================================= */}
                    {/* HOME */}
                    {/* ================================= */}

                    <Route
                        path="/"
                        element={<Home />}
                    />


                    {/* ================================= */}
                    {/* PRODUCTS */}
                    {/* ================================= */}

                    <Route
                        path="/products"
                        element={<Products />}
                    />


                    {/* ================================= */}
                    {/* PRODUCT DETAILS */}
                    {/* ================================= */}

                    <Route
                        path="/products/:id"
                        element={<ProductDetails />}
                    />


                    {/* ================================= */}
                    {/* AUTHENTICATION */}
                    {/* ================================= */}

                    <Route
                        path="/login"
                        element={<Login />}
                    />

                    <Route
                        path="/register"
                        element={<Register />}
                    />

                    <Route
                        path="/forgot-password"
                        element={<ForgotPassword />}
                    />

                    <Route
                        path="/reset-password/:uid/:token"
                        element={<ResetPassword />}
                    />


                    {/* ================================= */}
                    {/* CART */}
                    {/* ================================= */}

                    <Route
                        path="/cart"
                        element={<Cart />}
                    />
                    <Route
                    path="/wishlist"
                    element={<Wishlist />}
                    />


                    {/* ================================= */}
                    {/* CHECKOUT */}
                    {/* ================================= */}

                    <Route
                        path="/checkout"
                        element={<Checkout />}
                    />


                    {/* ================================= */}
                    {/* ORDERS */}
                    {/* ================================= */}

                    <Route
                        path="/orders"
                        element={<Orders />}
                    />

                    <Route
                        path="/insights"
                        element={<CustomerInsights />}
                    />


                    <Route
                        path="/orders/:id"
                        element={<OrderDetails />}
                    />


                    {/* ================================= */}
                    {/* PAYMENTS */}
                    {/* ================================= */}

                    <Route
                        path="/payments"
                        element={<PaymentHistory />}
                    />

                    <Route
                        path="/delivery/share"
                        element={<DeliveryPersonTracking />}
                    />


                    {/* ================================= */}
                    {/* ADMIN PROTECTED ROUTES */}
                    {/* ================================= */}

                    <Route
                        element={
                            <AdminProtectedRoute />
                        }
                    >

                        <Route
                            path="/admin"
                            element={
                                <AdminDashboard />
                            }
                        />

                        <Route
                            path="/admin/dashboard"
                            element={
                                <AdminDashboard />
                            }
                        />
                        <Route
                            path="/admin/analytics"
                            element={<BusinessAnalytics />}
                        />
                        <Route
                            path="/admin/delivery-tracking"
                            element={<AdminDeliveryTracking />}
                        />
                        <Route
                        path="/admin/products"
                        element={<AdminProducts />}
                        />

                    </Route>


                    {/* ================================= */}
                    {/* 404 */}
                    {/* ================================= */}

                    <Route
                        path="*"
                        element={
                            <div className="not-found">

                                <h1>
                                    404
                                </h1>

                                <h2>
                                    Page Not Found
                                </h2>

                                <p>
                                    The page you're
                                    looking for doesn't
                                    exist.
                                </p>

                                <Link to="/">
                                    Go Back Home
                                </Link>

                            </div>
                        }
                    />

                </Routes>

            </main>


            {/* ================================= */}
            {/* FOOTER */}
            {/* ================================= */}

            <footer className="footer">

                <div className="footer-content">

                    <div>
                        <h3>
                            🛍️ ShopHubAI
                        </h3>

                        <p>
                            Smart shopping experience
                            powered by AI.
                        </p>
                    </div>


                    <div>

                        <h4>
                            Quick Links
                        </h4>

                        <Link to="/">
                            Home
                        </Link>

                        <Link to="/products">
                            Products
                        </Link>

                        <Link to="/cart">
                            Cart
                        </Link>

                    </div>


                    <div>

                        <h4>
                            Account
                        </h4>

                        <Link to="/login">
                            Login
                        </Link>

                        <Link to="/register">
                            Create Account
                        </Link>

                        <Link to="/forgot-password">
                            Forgot Password
                        </Link>

                    </div>

                </div>


                <div className="footer-bottom">

                    <p>
                        © {new Date().getFullYear()}{" "}
                        ShopHubAI. All rights reserved.
                    </p>

                </div>

            </footer>

        </div>
    );
}

export default App;