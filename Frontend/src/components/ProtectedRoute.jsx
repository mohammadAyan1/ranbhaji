import { Navigate, useLocation } from "react-router-dom";
import useAuthStore from "../store/authStore";

export const ProtectedRoute = ({ children, roles }) => {
  const { user, token } = useAuthStore();
  const location = useLocation();

  // Allow unauthenticated / unauthorized access to specific tabs:
  // 1. Log Purchase tab (/admin/products?tab=purchase or /log-purchase)
  // 2. Assign Delivery Boy tab (/admin/today-work/assign-delivery or /assign-delivery)
  const searchParams = new URLSearchParams(location.search);
  const isLogPurchaseTab = (location.pathname === "/admin/products" && searchParams.get("tab") === "purchase") || location.pathname === "/log-purchase";
  const isAssignDeliveryTab = location.pathname === "/admin/today-work/assign-delivery" || location.pathname === "/assign-delivery";

  if (isLogPurchaseTab || isAssignDeliveryTab) {
    return children;
  }

  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!user) return <div className="min-h-screen flex items-center justify-center text-gray-600">Loading...</div>;
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
