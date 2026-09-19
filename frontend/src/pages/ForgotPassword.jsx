import { useState } from "react";
import { Link } from "react-router-dom";

function ForgotPassword() {

    const [email, setEmail] = useState("");

    const [loading, setLoading] = useState(false);

    const [message, setMessage] = useState("");

    const [error, setError] = useState("");


    // =========================================
    // FORGOT PASSWORD
    // =========================================

    const handleSubmit = async (e) => {

        e.preventDefault();

        setMessage("");
        setError("");
        setLoading(true);


        try {

            const response = await fetch(
                "http://localhost:8000/api/forgot-password/",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                    },

                    body: JSON.stringify({
                        email: email,
                    }),
                }
            );


            const data = await response.json();

            console.log(
                "Forgot Password Response:",
                data
            );


            if (!response.ok) {

                let errorMessage =
                    "Unable to send reset link.";

                if (data.email) {

                    errorMessage =
                        Array.isArray(data.email)
                            ? data.email[0]
                            : data.email;

                } else if (data.error) {

                    errorMessage = data.error;

                } else if (data.detail) {

                    errorMessage = data.detail;

                }

                throw new Error(
                    errorMessage
                );
            }


            // =========================================
            // SUCCESS
            // =========================================

            setMessage(
                data.message ||
                "Password reset link has been sent to your email."
            );

            setEmail("");


        } catch (error) {

            console.error(
                "Forgot Password Error:",
                error
            );

            setError(
                error.message ||
                "Something went wrong. Please try again."
            );

        } finally {

            setLoading(false);

        }
    };


    return (

        <div className="auth-container">

            <div className="auth-card">


                {/* ========================================= */}
                {/* LOGO */}
                {/* ========================================= */}

                <div className="auth-logo">

                    <h1>
                        ShopHubAI
                    </h1>

                    <p>
                        Secure Account Recovery
                    </p>

                </div>


                {/* ========================================= */}
                {/* TITLE */}
                {/* ========================================= */}

                <div className="auth-header">

                    <h2>
                        Forgot Password?
                    </h2>

                    <p>
                        Enter your registered email address
                        and we'll send you a password reset link.
                    </p>

                </div>


                {/* ========================================= */}
                {/* SUCCESS MESSAGE */}
                {/* ========================================= */}

                {message && (

                    <div className="success-message">

                        ✓ {message}

                    </div>

                )}


                {/* ========================================= */}
                {/* ERROR MESSAGE */}
                {/* ========================================= */}

                {error && (

                    <div className="error-message">

                        {error}

                    </div>

                )}


                {/* ========================================= */}
                {/* FORM */}
                {/* ========================================= */}

                <form
                    onSubmit={handleSubmit}
                    className="auth-form"
                >


                    {/* EMAIL */}

                    <div className="form-group">

                        <label htmlFor="email">
                            Email Address
                        </label>

                        <input
                            id="email"
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) =>
                                setEmail(
                                    e.target.value
                                )
                            }
                            required
                            autoComplete="email"
                        />

                    </div>


                    {/* SUBMIT */}

                    <button
                        type="submit"
                        className="auth-button"
                        disabled={loading}
                    >

                        {loading
                            ? "Sending Reset Link..."
                            : "Send Reset Link"}

                    </button>

                </form>


                {/* ========================================= */}
                {/* BACK TO LOGIN */}
                {/* ========================================= */}

                <div className="auth-footer">

                    <p>

                        Remember your password?{" "}

                        <Link to="/login">
                            Login
                        </Link>

                    </p>

                </div>


            </div>

        </div>

    );
}


export default ForgotPassword;