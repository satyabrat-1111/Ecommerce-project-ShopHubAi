import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";

function Login() {
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [showPassword, setShowPassword] =
        useState(false);

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);


    // =====================================
    // HANDLE LOGIN
    // =====================================

    const handleLogin = async (e) => {

        e.preventDefault();

        setError("");
        setLoading(true);


        // =====================================
        // BASIC VALIDATION
        // =====================================

        if (!username.trim()) {

            setError(
                "Please enter your username."
            );

            setLoading(false);

            return;
        }


        if (!password) {

            setError(
                "Please enter your password."
            );

            setLoading(false);

            return;
        }


        try {

            const response = await fetch(
                "http://localhost:8000/api/token/",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        username:
                            username.trim(),

                        password:
                            password,
                    }),
                }
            );


            const data =
                await response.json();


            console.log(
                "Login Response:",
                data
            );


            // =====================================
            // LOGIN ERROR
            // =====================================

            if (!response.ok) {

                throw new Error(
                    data.detail ||
                    "Invalid username or password."
                );
            }


            // =====================================
            // SAVE JWT TOKENS
            // =====================================

            localStorage.setItem(
                "access_token",
                data.access
            );

            localStorage.setItem(
                "refresh_token",
                data.refresh
            );


            // =====================================
            // GET JWT PAYLOAD
            // =====================================

            const payload =
                JSON.parse(
                    atob(
                        data.access
                            .split(".")[1]
                            .replace(/-/g, "+")
                            .replace(/_/g, "/")
                    )
                );


            console.log(
                "JWT Payload:",
                payload
            );


            // =====================================
            // SAVE ADMIN STATUS
            // =====================================

            const isAdmin =
                payload.is_admin === true;


            localStorage.setItem(
                "is_admin",
                isAdmin
                    ? "true"
                    : "false"
            );

            localStorage.setItem(
                "is_delivery_person",
                payload.is_delivery_person === true ? "true" : "false"
            );
            window.dispatchEvent(new Event("auth-updated"));


            console.log(
                "Access Token Saved Successfully"
            );

            console.log(
                "Admin Status:",
                isAdmin
            );


            // =====================================
            // SUCCESS
            // =====================================

            alert(
                "Login Successful! 🎉"
            );


            // =====================================
            // REDIRECT
            // =====================================

            if (isAdmin) {

                navigate("/admin");

            } else {

                navigate("/");

            }


        } catch (error) {

            console.error(
                "Login Error:",
                error
            );


            setError(
                error.message ||
                "Unable to login. Please try again."
            );

        } finally {

            setLoading(false);
        }
    };


    return (

        <div className="login-page">

            {/* Animated Background */}

            <div className="login-background">

                <div className="floating-shape shape-one"></div>

                <div className="floating-shape shape-two"></div>

                <div className="floating-shape shape-three"></div>

                <div className="floating-shape shape-four"></div>

            </div>


            {/* Main Container */}

            <div className="login-container">


                {/* ================================= */}
                {/* LEFT BRAND SECTION */}
                {/* ================================= */}

                <div className="login-brand-section">

                    <div className="brand-content">

                        <Link
                            to="/"
                            className="login-logo"
                        >
                            <div className="login-logo-icon">
                                🛍️
                            </div>

                            <span>
                                ShopHub<span>AI</span>
                            </span>
                        </Link>


                        <div className="brand-text">

                            <div className="welcome-badge">
                                ✨ SMART SHOPPING EXPERIENCE
                            </div>

                            <h1>
                                Shop smarter.
                                <br />

                                <span>
                                    Live better.
                                </span>
                            </h1>

                            <p>
                                Discover products you love with
                                personalized recommendations powered
                                by intelligent technology.
                            </p>

                        </div>


                        {/* FEATURES */}

                        <div className="brand-features">

                            <div className="brand-feature">

                                <div className="feature-icon">
                                    🤖
                                </div>

                                <div>

                                    <h4>
                                        AI Recommendations
                                    </h4>

                                    <p>
                                        Personalized shopping experience
                                    </p>

                                </div>

                            </div>


                            <div className="brand-feature">

                                <div className="feature-icon">
                                    🔒
                                </div>

                                <div>

                                    <h4>
                                        Secure Shopping
                                    </h4>

                                    <p>
                                        Your data is safe and protected
                                    </p>

                                </div>

                            </div>


                            <div className="brand-feature">

                                <div className="feature-icon">
                                    ⚡
                                </div>

                                <div>

                                    <h4>
                                        Fast & Simple
                                    </h4>

                                    <p>
                                        Smooth and seamless experience
                                    </p>

                                </div>

                            </div>

                        </div>


                        <div className="brand-footer">

                            <span className="online-dot"></span>

                            Trusted smart shopping platform

                        </div>

                    </div>

                </div>


                {/* ================================= */}
                {/* LOGIN SECTION */}
                {/* ================================= */}

                <div className="login-form-section">


                    <div className="login-card">


                        {/* HEADER */}

                        <div className="login-header">

                            <div className="login-mobile-logo">
                                🛍️ ShopHub<span>AI</span>
                            </div>

                            <h2>
                                Welcome Back 👋
                            </h2>

                            <p>
                                Login to continue your shopping journey
                            </p>

                        </div>


                        {/* ERROR */}

                        {error && (

                            <div className="login-error">

                                <span>
                                    ⚠️
                                </span>

                                <span>
                                    {error}
                                </span>

                            </div>

                        )}


                        {/* LOGIN FORM */}

                        <form
                            onSubmit={handleLogin}
                            className="login-form"
                        >


                            {/* USERNAME */}

                            <div className="form-group">

                                <label htmlFor="username">

                                    Username

                                </label>


                                <div className="input-wrapper">

                                    <span className="input-icon">
                                        👤
                                    </span>


                                    <input
                                        id="username"
                                        type="text"
                                        placeholder="Enter your username"
                                        value={username}
                                        onChange={(e) =>
                                            setUsername(
                                                e.target.value
                                            )
                                        }
                                        autoComplete="username"
                                        disabled={loading}
                                        required
                                    />

                                </div>

                            </div>


                            {/* PASSWORD */}

                            <div className="form-group">

                                <label htmlFor="password">

                                    Password

                                </label>


                                <div className="input-wrapper">

                                    <span className="input-icon">
                                        🔒
                                    </span>


                                    <input
                                        id="password"
                                        type={
                                            showPassword
                                                ? "text"
                                                : "password"
                                        }
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(
                                                e.target.value
                                            )
                                        }
                                        autoComplete="current-password"
                                        disabled={loading}
                                        required
                                    />


                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() =>
                                            setShowPassword(
                                                !showPassword
                                            )
                                        }
                                        disabled={loading}
                                        aria-label={
                                            showPassword
                                                ? "Hide password"
                                                : "Show password"
                                        }
                                    >

                                        {showPassword
                                            ? "🙈"
                                            : "👁️"}

                                    </button>

                                </div>

                            </div>


                            {/* OPTIONS */}

                            <div className="login-options">

                                <label className="remember-login">

                                    <input type="checkbox" />

                                    <span>
                                        Remember me
                                    </span>

                                </label>


                                <Link
                                    to="/forgot-password"
                                    className="forgot-password"
                                >
                                    Forgot Password?
                                </Link>

                            </div>


                            {/* LOGIN BUTTON */}

                            <button
                                type="submit"
                                className="login-button"
                                disabled={loading}
                            >

                                {loading ? (

                                    <>

                                        <span className="spinner"></span>

                                        Logging in...

                                    </>

                                ) : (

                                    <>

                                        Login to ShopHubAI
                                        <span>
                                            →
                                        </span>

                                    </>

                                )}

                            </button>

                        </form>


                        {/* DIVIDER */}

                        <div className="login-divider">

                            <span>
                                New to ShopHubAI?
                            </span>

                        </div>


                        {/* REGISTER */}

                        <Link
                            to="/register"
                            className="register-button"
                        >

                            Create New Account

                        </Link>


                        {/* SECURITY */}

                        <div className="login-security">

                            <span>
                                🔒
                            </span>

                            Your information is securely protected

                        </div>


                    </div>

                </div>


            </div>

        </div>
    );
}


export default Login;