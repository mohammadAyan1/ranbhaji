import { NavLink, useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";

const adminLinks = [
  { to: "/admin", label: "Dashboard", icon: "🏠" },
  { to: "/admin/products", label: "Products", icon: "🥦" },
  { to: "/admin/packages", label: "Packages", icon: "📦" },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: "🔄" },
  { to: "/admin/users", label: "Users", icon: "👥" },
  { to: "/admin/deliveries", label: "Delivery Logs", icon: "🚚" },
  { to: "/admin/demands", label: "Stock Demands", icon: "📊" },
  { to: "/admin/seasonal-selections", label: "Seasonal Picks", icon: "🥦" },
  { to: "/admin/returns", label: "Returns", icon: "↩️" },
  { to: "/admin/summary", label: "Daily Summary", icon: "📋" },
  { to: "/admin/calculator", label: "Price Calculator", icon: "🧮" },
  { to: "/admin/retail-orders", label: "Retail Orders", icon: "🛒" },
];

const userLinks = [
  { to: "/dashboard", label: "Dashboard", icon: "🏠" },
  { to: "/packages", label: "Browse Packages", icon: "📦" },
  { to: "/my-subscriptions", label: "My Subscriptions", icon: "🔄" },
  { to: "/wallet", label: "Wallet", icon: "💰" },
  { to: "/deliveries", label: "Delivery History", icon: "📦" },
  { to: "/water", label: "Water Subscription", icon: "💧" },
  { to: "/addresses", label: "My Addresses", icon: "📍" },
  { to: "/notifications", label: "Notifications", icon: "🔔" },
  { to: "/retail-store", label: "Retail Store", icon: "🛒" },
  { to: "/my-retail-orders", label: "My Retail Orders", icon: "📋" },
];

const deliveryLinks = [
  { to: "/delivery", label: "Today's Deliveries", icon: "🚚" },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const links = user?.role === "admin" ? adminLinks
    : user?.role === "delivery" ? deliveryLinks
      : userLinks;

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <aside className="h-screen w-64 bg-gray-900 border-r border-gray-800 flex flex-col fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-fresh-600 rounded-xl flex items-center justify-center text-lg">🥦</div>
          <div>
            <h1 className="font-bold text-white text-lg leading-none">FreshBox</h1>
            <p className="text-xs text-gray-500 capitalize">{user?.role} Panel</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/admin" || link.to === "/dashboard" || link.to === "/delivery"}
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <span>{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-fresh-800 rounded-full flex items-center justify-center text-fresh-300 font-bold text-sm">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.phone}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full btn-secondary text-sm py-2 flex items-center justify-center gap-2">
          <span>🚪</span> Logout
        </button>
      </div>
    </aside>
  );
}
