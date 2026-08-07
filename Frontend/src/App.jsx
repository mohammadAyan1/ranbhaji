import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import useAuthStore from "./store/authStore";
import { ProtectedRoute, PublicRoute } from "./components/ProtectedRoute";
import Layout from "./components/Layout";

// Auth pages
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyOTPPage from "./pages/VerifyOTPPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";

// User pages
import UserDashboard from "./pages/user/UserDashboard";
import PackagesPage from "./pages/user/PackagesPage";
import MySubscriptions from "./pages/user/MySubscriptions";
import WalletPage from "./pages/user/WalletPage";
import WaterPage from "./pages/user/WaterPage";
import NotificationsPage from "./pages/user/NotificationsPage";
import DeliveryHistory from "./pages/user/DeliveryHistory";
import AddressPage from "./pages/user/AddressPage";
import UserPreferences from "./pages/user/UserPreferences";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminFranchises from "./pages/admin/AdminFranchises";
import AdminUserAddresses from "./pages/admin/AdminUserAddresses";
import AdminPackages from "./pages/admin/AdminPackages";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminReturns from "./pages/admin/AdminReturns";
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
import AdminProductSales from "./pages/admin/AdminProductSales";
import AdminUserHistory from "./pages/admin/AdminUserHistory";
import AdminUnits from "./pages/admin/AdminUnits";
import AdminUserPreferences from "./pages/admin/AdminUserPreferences";
import Attendance from "./pages/admin/Attendance";

// Reports
import ItemPurchaseReport from "./pages/admin/Reports/ItemPurchaseReport";
import ItemDeliveryReport from "./pages/admin/Reports/ItemDeliveryReport";
import CustomerRegisterReport from "./pages/admin/Reports/CustomerRegisterReport";
import SubscriptionConvertedReport from "./pages/admin/Reports/SubscriptionConvertedReport";
import LostCustomerReport from "./pages/admin/Reports/LostCustomerReport";
import LossReport from "./pages/admin/Reports/LossReport";
import LossDetail from "./pages/admin/Reports/LossDetail";
import WorkingLogs from "./pages/admin/WorkingLogs";
import Landing from "./pages/Landing/Landing";

// Master
import AdminCategories from "./pages/admin/Master/AdminCategories";
import AdminSubCategories from "./pages/admin/Master/AdminSubCategories";
import AdminZones from "./pages/admin/Master/AdminZones";
import AdminWaste from "./pages/admin/AdminWaste";

// Calculators
import PackageCalculator from "./pages/admin/Calculators/PackageCalculator";
import MarginCalculator from "./pages/admin/Calculators/MarginCalculator";
import BatchAssign from "./pages/admin/TodayWork/BatchAssign";
import Missing from "./pages/admin/TodayWork/Missing";

// Package Management
import DraftPackages from "./pages/admin/PackageManagement/DraftPackages";
import ActivePackages from "./pages/admin/PackageManagement/ActivePackages";
import InactivePackages from "./pages/admin/PackageManagement/InactivePackages";

// Today Work
import ReadyForDeliver from "./pages/admin/TodayWork/ReadyForDeliver";
import DispatchOrders from "./pages/admin/TodayWork/DispatchOrders";
import AssignDeliveryBoy from "./pages/admin/TodayWork/AssignDeliveryBoy";
import ReturnItem from "./pages/admin/TodayWork/ReturnItem";

// Customers
import ActiveCustomers from "./pages/admin/Customers/ActiveCustomers";
import SubscribeCustomers from "./pages/admin/Customers/SubscribeCustomers";
import LostCustomers from "./pages/admin/Customers/LostCustomers";
import RetailCustomers from "./pages/admin/Customers/RetailCustomers";
import NonActiveCustomers from "./pages/admin/Customers/NonActiveCustomers";
import CustomerProfile from "./pages/admin/Customers/CustomerProfile";


// Delivery pages
import DeliveryHome from "./pages/delivery/DeliveryHome";
import DeliveryBoyHistory from "./pages/delivery/DeliveryBoyHistory";

function App() {
  const { fetchMe, token } = useAuthStore();

  useEffect(() => {
    if (token) fetchMe();
  }, [token]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        {/* <Route path="/" element={<Landing />} /> */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/verify-otp" element={<PublicRoute><VerifyOTPPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
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
          <Route path="/preferences" element={<UserPreferences />} />
        </Route>

        {/* ─── ADMIN Routes ────────────────────────────────────── */}
        <Route element={<ProtectedRoute roles={["admin"]}><Layout /></ProtectedRoute>}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/packages" element={<AdminPackages />} />
          <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/franchises" element={<AdminFranchises />} />
          <Route path="/admin/user-history" element={<AdminUserHistory />} />
          <Route path="/admin/user-addresses" element={<AdminUserAddresses />} />
          <Route path="/admin/returns" element={<AdminReturns />} />
          <Route path="/admin/deliveries" element={<AdminDeliveries />} />
          <Route path="/admin/demands" element={<AdminDemands />} />
          <Route path="/admin/seasonal-selections" element={<AdminSeasonalSelections />} />
          <Route path="/admin/summary" element={<AdminDashboard />} />
          <Route path="/admin/calculators/package" element={<PackageCalculator />} />
          <Route path="/admin/calculators/margin" element={<MarginCalculator />} />
          <Route path="/admin/retail-orders" element={<AdminRetailOrders />} />
          <Route path="/admin/batches" element={<AdminBatches />} />
          <Route path="/admin/all-orders" element={<AdminAllOrders />} />
          <Route path="/admin/missed-products" element={<AdminMissedProducts />} />
          <Route path="/admin/product-sales" element={<AdminProductSales />} />
          <Route path="/admin/units" element={<AdminUnits />} />
          <Route path="/admin/user-preferences" element={<AdminUserPreferences />} />

          {/* Working Logs */}
          <Route path="/admin/working-logs" element={<WorkingLogs />} />
          <Route path="/admin/master/sub-categories" element={<AdminSubCategories />} />
          <Route path="/admin/master/zones" element={<AdminZones />} />
          <Route path="/admin/waste" element={<AdminWaste />} />
          <Route path="/admin/attendance" element={<Attendance />} />

          {/* Master */}
          <Route path="/admin/master/categories" element={<AdminCategories />} />

          {/* Package Management */}
          <Route path="/admin/package-management/draft" element={<DraftPackages />} />
          <Route path="/admin/package-management/active" element={<ActivePackages />} />
          <Route path="/admin/package-management/inactive" element={<InactivePackages />} />

          {/* Today Work */}
          <Route path="/admin/today-work/batch-assign" element={<BatchAssign />} />
          <Route path="/admin/today-work/missing" element={<Missing />} />
          <Route path="/admin/today-work/ready" element={<ReadyForDeliver />} />
          <Route path="/admin/today-work/assign-delivery" element={<AssignDeliveryBoy />} />
          <Route path="/admin/today-work/dispatch" element={<DispatchOrders />} />
          <Route path="/admin/today-work/return-item" element={<ReturnItem />} />

          {/* Customers */}
          <Route path="/admin/customers/active" element={<ActiveCustomers />} />
          <Route path="/admin/customers/subscribe" element={<SubscribeCustomers />} />
          <Route path="/admin/customers/lost" element={<LostCustomers />} />
          <Route path="/admin/customers/retail" element={<RetailCustomers />} />
          <Route path="/admin/customers/non-active" element={<NonActiveCustomers />} />
          <Route path="/admin/customers/profile/:id" element={<CustomerProfile />} />

          {/* Reports */}
          <Route path="/admin/reports/item-purchase" element={<ItemPurchaseReport />} />
          <Route path="/admin/reports/item-delivery" element={<ItemDeliveryReport />} />
          <Route path="/admin/reports/customer-register" element={<CustomerRegisterReport />} />
          <Route path="/admin/reports/subscription-converted" element={<SubscriptionConvertedReport />} />
          <Route path="/admin/reports/lost-customer" element={<LostCustomerReport />} />
          <Route path="/admin/reports/loss" element={<LossReport />} />
          <Route path="/admin/reports/loss/:productId" element={<LossDetail />} />
        </Route>

        {/* 🚚 DELIVERY Routes 🚚🚚🚚🚚 */}
        <Route element={<ProtectedRoute roles={["delivery"]}><Layout /></ProtectedRoute>}>
          <Route path="/delivery" element={<DeliveryHome />} />
          <Route path="/delivery/history" element={<DeliveryBoyHistory />} />
        </Route>

        {/* Fallback */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
