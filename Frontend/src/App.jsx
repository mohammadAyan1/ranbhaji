import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import useAuthStore from "./store/authStore";
import { ProtectedRoute, PublicRoute } from "./components/ProtectedRoute";
import Layout from "./components/Layout";

// Auth pages
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

// User pages
import UserDashboard from "./pages/user/UserDashboard";
import PackagesPage from "./pages/user/PackagesPage";
import MySubscriptions from "./pages/user/MySubscriptions";
import WalletPage from "./pages/user/WalletPage";
import WaterPage from "./pages/user/WaterPage";
import NotificationsPage from "./pages/user/NotificationsPage";
import DeliveryHistory from "./pages/user/DeliveryHistory";
import AddressPage from "./pages/user/AddressPage";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminUserAddresses from "./pages/admin/AdminUserAddresses";
import AdminPackages from "./pages/admin/AdminPackages";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminReturns from "./pages/admin/AdminReturns";
import AdminCalculator from "./pages/admin/AdminCalculator";
import AdminDeliveries from "./pages/admin/AdminDeliveries";
import AdminDemands from "./pages/admin/AdminDemands";
import AdminSeasonalSelections from "./pages/admin/AdminSeasonalSelections";
import RetailStore from "./pages/user/RetailStore";
import MyRetailOrders from "./pages/user/MyRetailOrders";
import PaymentStatusPage from "./pages/user/PaymentStatusPage";
import AdminRetailOrders from "./pages/admin/AdminRetailOrders";
import AdminBatches from "./pages/admin/AdminBatches";
import AdminAllOrders from "./pages/admin/AdminAllOrders";
import AdminMissedProducts from "./pages/admin/AdminMissedProducts";


// Delivery pages
import DeliveryHome from "./pages/delivery/DeliveryHome";

function App() {
  const { fetchMe, token } = useAuthStore();

  useEffect(() => {
    if (token) fetchMe();
  }, [token]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/unauthorized" element={
          <div className="min-h-screen flex items-center justify-center text-gray-400 flex-col gap-4 bg-gray-950">
            <p className="text-5xl">🚫</p>
            <p className="text-xl font-bold text-white">Access Denied</p>
            <a href="/login" className="text-fresh-400 hover:underline">Go to Login</a>
          </div>
        } />

        {/* ─── USER Routes ─────────────────────────────────────── */}
        <Route element={<ProtectedRoute roles={["user"]}><Layout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/packages" element={<PackagesPage />} />
          <Route path="/my-subscriptions" element={<MySubscriptions />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/water" element={<WaterPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/deliveries" element={<DeliveryHistory />} />
          <Route path="/addresses" element={<AddressPage />} />
          <Route path="/retail-store" element={<RetailStore />} />
          <Route path="/my-retail-orders" element={<MyRetailOrders />} />
          <Route path="/payment-status" element={<PaymentStatusPage />} />
        </Route>

        {/* ─── ADMIN Routes ────────────────────────────────────── */}
        <Route element={<ProtectedRoute roles={["admin"]}><Layout /></ProtectedRoute>}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/packages" element={<AdminPackages />} />
          <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/user-addresses" element={<AdminUserAddresses />} />
          <Route path="/admin/returns" element={<AdminReturns />} />
          <Route path="/admin/deliveries" element={<AdminDeliveries />} />
          <Route path="/admin/demands" element={<AdminDemands />} />
          <Route path="/admin/seasonal-selections" element={<AdminSeasonalSelections />} />
          <Route path="/admin/summary" element={<AdminDashboard />} />
          <Route path="/admin/calculator" element={<AdminCalculator />} />
          <Route path="/admin/retail-orders" element={<AdminRetailOrders />} />
          <Route path="/admin/batches" element={<AdminBatches />} />
          <Route path="/admin/all-orders" element={<AdminAllOrders />} />
          <Route path="/admin/missed-products" element={<AdminMissedProducts />} />
        </Route>

        {/* ─── DELIVERY Routes ─────────────────────────────────── */}
        <Route element={<ProtectedRoute roles={["delivery"]}><Layout /></ProtectedRoute>}>
          <Route path="/delivery" element={<DeliveryHome />} />
        </Route>

        {/* Fallback */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
