import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";

function ResetPassword() {

    const { uid, token } = useParams();
    const navigate = useNavigate();

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleResetPassword = async (e) => {

        e.preventDefault();

        setError("");
        setMessage("");

        if (newPassword !== confirmPassword) {

            setError(
                "Passwords do not match."
            );

            return;
        }

        setLoading(true);

        try {

            const response = await fetch(
                `http://localhost:8000/api/reset-password/${uid}/${token}/`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                    },

                    body: JSON.stringify({
                        new_password: newPassword,
                        confirm_password: confirmPassword,
                    }),
                }
            );

            const data = await response.json();

            console.log(
                "Reset Password Response:",
                data
            );

            if (!response.ok) {

                throw new Error(
                    data.error ||
                    data.detail ||
                    "Unable to reset password."
                );
            }

            setMessage(
                "Password reset successfully! You can now login."
            );

            setNewPassword("");
            setConfirmPassword("");

            setTimeout(() => {
                navigate("/login");
            }, 2000);

        } catch (error) {

            console.error(
                "Reset Password Error:",
                error
            );

            setError(
                error.message
            );

        } finally {

            setLoading(false);
        }
    };


    return (

        <div className="auth-page">

            <div className="auth-card">

                {/* Logo */}

                <div className="auth-logo">

                    <span>
                        🛍️
                    </span>

                    <h1>
                        ShopHub<span>AI</span>
                    </h1>

                </div>


                {/* Heading */}

                <h2>
                    Reset Password
                </h2>

                <p className="auth-subtitle">
                    Create a new secure password
                    for your account.
                </p>


                {/* Success */}

                {message && (

                    <div className="success-message">

                        ✅ {message}

                    </div>

                )}


                {/* Error */}

                {error && (

                    <div className="error-message">

                        ❌ {error}

                    </div>

                )}


                {/* Form */}

                <form
                    onSubmit={handleResetPassword}
                >

                    {/* New Password */}

                    <div className="form-group">

                        <label>
                            New Password
                        </label>

                        <input
                            type="password"
                            placeholder="Enter new password"
                            value={newPassword}
                            onChange={(e) =>
                                setNewPassword(
                                    e.target.value
                                )
                            }
                            required
                        />

                    </div>


                    {/* Confirm Password */}

                    <div className="form-group">

                        <label>
                            Confirm Password
                        </label>

                        <input
                            type="password"
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) =>
                                setConfirmPassword(
                                    e.target.value
                                )
                            }
                            required
                        />

                    </div>


                    {/* Button */}

                    <button
                        type="submit"
                        className="auth-button"
                        disabled={loading}
                    >

                        {loading
                            ? "Resetting Password..."
                            : "Reset Password"}

                    </button>

                </form>


                {/* Login */}

                <p className="auth-footer">

                    Remember your password?{" "}

                    <Link to="/login">
                        Login
                    </Link>

                </p>

            </div>

        </div>
    );
}

export default ResetPassword;