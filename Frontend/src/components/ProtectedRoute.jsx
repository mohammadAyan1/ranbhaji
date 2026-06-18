import { Navigate, useLocation } from "react-router-dom";
import useAuthStore from "../store/authStore";

export const ProtectedRoute = ({ children, roles }) => {
  const { user, token } = useAuthStore();
  const location = useLocation();

  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!user) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;

  return children;
};

export const PublicRoute = ({ children }) => {
  const { token, user } = useAuthStore();
  if (token && user) {
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.role === "delivery") return <Navigate to="/delivery" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};
