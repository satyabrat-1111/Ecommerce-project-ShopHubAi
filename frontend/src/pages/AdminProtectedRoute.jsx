import { Navigate, Outlet } from "react-router-dom";

function AdminProtectedRoute() {
    const accessToken = localStorage.getItem("access_token");
    const isAdmin = localStorage.getItem("is_admin") === "true";

    // User login nahi hai
    if (!accessToken) {
        return <Navigate to="/login" replace />;
    }

    // User admin nahi hai
    if (!isAdmin) {
        return <Navigate to="/" replace />;
    }

    // Admin hai
    return <Outlet />;
}

export default AdminProtectedRoute;