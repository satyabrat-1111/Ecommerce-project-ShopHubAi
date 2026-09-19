import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Register() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        username: "",
        email: "",
        phone: "",
        password: "",
        password2: "",
    });

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    // =========================================
    // HANDLE INPUT CHANGE
    // =========================================

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));

        // Remove error while user is typing
        if (error) {
            setError("");
        }
    };

    // =========================================
    // FORMAT DJANGO ERROR
    // =========================================

    const getBackendError = (data) => {
        if (!data) {
            return "Registration failed. Please try again.";
        }

        // detail
        if (data.detail) {
            return data.detail;
        }

        // message
        if (data.message) {
            return data.message;
        }

        // error
        if (typeof data.error === "string") {
            return data.error;
        }

        // Django / DRF field errors
        const fieldErrors = [];

        Object.entries(data).forEach(
            ([field, messages]) => {
                if (Array.isArray(messages)) {
                    messages.forEach((message) => {
                        fieldErrors.push(
                            `${field}: ${message}`
                        );
                    });
                } else if (
                    typeof messages === "string"
                ) {
                    fieldErrors.push(
                        `${field}: ${messages}`
                    );
                }
            }
        );

        if (fieldErrors.length > 0) {
            return fieldErrors.join(" | ");
        }

        return "Registration failed. Please check your details.";
    };

    // =========================================
    // REGISTER
    // =========================================

    const handleRegister = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");

        // =========================================
        // FRONTEND VALIDATION
        // =========================================

        if (
            !formData.username.trim() ||
            !formData.email.trim() ||
            !formData.phone.trim() ||
            !formData.password ||
            !formData.password2
        ) {
            setError(
                "Please fill all required fields."
            );
            return;
        }

        // Username length
        if (formData.username.trim().length < 3) {
            setError(
                "Username must be at least 3 characters."
            );
            return;
        }

        // Password match
        if (
            formData.password !==
            formData.password2
        ) {
            setError(
                "Passwords do not match."
            );
            return;
        }

        // Password length
        if (formData.password.length < 8) {
            setError(
                "Password must be at least 8 characters."
            );
            return;
        }

        // =========================================
        // PHONE VALIDATION
        // =========================================

        const phoneRegex = /^[0-9]{10,15}$/;

        if (!phoneRegex.test(formData.phone)) {
            setError(
                "Please enter a valid phone number."
            );
            return;
        }

        try {
            setLoading(true);

            // =========================================
            // REGISTER API
            // =========================================

            const response = await fetch(
                "http://localhost:8000/api/accounts/register/",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        username:
                            formData.username.trim(),

                        email:
                            formData.email.trim(),

                        phone:
                            formData.phone.trim(),

                        password:
                            formData.password,
                    }),
                }
            );

            // =========================================
            // SAFE JSON RESPONSE
            // =========================================

            let data = {};

            try {
                data = await response.json();
            } catch {
                data = {};
            }

            console.log(
                "Register Status:",
                response.status
            );

            console.log(
                "Register Response:",
                data
            );

            // =========================================
            // API ERROR
            // =========================================

            if (!response.ok) {
                throw new Error(
                    getBackendError(data)
                );
            }

            // =========================================
            // SUCCESS
            // =========================================

            setSuccess(
                "Account created successfully! Redirecting to login..."
            );

            // Clear form
            setFormData({
                username: "",
                email: "",
                phone: "",
                password: "",
                password2: "",
            });

            // Redirect to login
            setTimeout(() => {
                navigate("/login");
            }, 1500);

        } catch (error) {
            console.error(
                "Registration Error:",
                error
            );

            setError(
                error.message ||
                "Unable to create account."
            );

        } finally {
            setLoading(false);
        }
    };

    // =========================================
    // UI
    // =========================================

    return (
        <div className="auth-container">

            <div className="auth-card">

                {/* ================================= */}
                {/* LOGO */}
                {/* ================================= */}

                <div className="auth-logo">
                    🛍️
                </div>

                <h1>
                    ShopHubAI
                </h1>

                <h2>
                    Create Account
                </h2>

                <p className="auth-subtitle">
                    Join ShopHubAI and start
                    shopping today.
                </p>

                {/* ================================= */}
                {/* ERROR */}
                {/* ================================= */}

                {error && (
                    <div className="auth-error">
                        ❌ {error}
                    </div>
                )}

                {/* ================================= */}
                {/* SUCCESS */}
                {/* ================================= */}

                {success && (
                    <div className="auth-success">
                        ✅ {success}
                    </div>
                )}

                {/* ================================= */}
                {/* REGISTER FORM */}
                {/* ================================= */}

                <form
                    onSubmit={handleRegister}
                >

                    {/* USERNAME */}

                    <div className="form-group">

                        <label>
                            Username
                        </label>

                        <input
                            type="text"
                            name="username"
                            placeholder="Enter username"
                            value={
                                formData.username
                            }
                            onChange={
                                handleChange
                            }
                            autoComplete="username"
                            required
                        />

                    </div>

                    {/* EMAIL */}

                    <div className="form-group">

                        <label>
                            Email Address
                        </label>

                        <input
                            type="email"
                            name="email"
                            placeholder="Enter your email"
                            value={
                                formData.email
                            }
                            onChange={
                                handleChange
                            }
                            autoComplete="email"
                            required
                        />

                    </div>

                    {/* PHONE */}

                    <div className="form-group">

                        <label>
                            Phone Number
                        </label>

                        <input
                            type="tel"
                            name="phone"
                            placeholder="Enter 10 digit phone number"
                            value={
                                formData.phone
                            }
                            onChange={
                                handleChange
                            }
                            autoComplete="tel"
                            maxLength="15"
                            required
                        />

                    </div>

                    {/* PASSWORD */}

                    <div className="form-group">

                        <label>
                            Password
                        </label>

                        <input
                            type="password"
                            name="password"
                            placeholder="Create password"
                            value={
                                formData.password
                            }
                            onChange={
                                handleChange
                            }
                            autoComplete="new-password"
                            required
                        />

                        <small>
                            Use at least 8 characters.
                        </small>

                    </div>

                    {/* CONFIRM PASSWORD */}

                    <div className="form-group">

                        <label>
                            Confirm Password
                        </label>

                        <input
                            type="password"
                            name="password2"
                            placeholder="Confirm password"
                            value={
                                formData.password2
                            }
                            onChange={
                                handleChange
                            }
                            autoComplete="new-password"
                            required
                        />

                    </div>

                    {/* BUTTON */}

                    <button
                        type="submit"
                        disabled={loading}
                        className="auth-button"
                    >
                        {loading
                            ? "Creating Account..."
                            : "Create Account"}
                    </button>

                </form>

                {/* ================================= */}
                {/* LOGIN LINK */}
                {/* ================================= */}

                <div className="auth-footer">

                    Already have an account?{" "}

                    <Link to="/login">
                        Login
                    </Link>

                </div>

                {/* ================================= */}
                {/* SECURITY TEXT */}
                {/* ================================= */}

                <div className="auth-security">
                    🔒 Your information is securely
                    protected by ShopHubAI.
                </div>

            </div>

        </div>
    );
}

export default Register;