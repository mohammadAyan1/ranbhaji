import { NavLink, useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import { 
  LayoutDashboard, ShoppingBag, Package, RefreshCw, Users, MapPin, 
  Truck, BarChart3, Leaf, Undo2, ClipboardList, Calculator, 
  ShoppingCart, Layers, ListOrdered, Wallet, Droplet, Bell, X, LogOut, TrendingUp, UserCheck, Scale
} from "lucide-react";

const adminLinks = [
  { to: "/admin", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
  { to: "/admin/products", label: "Products", icon: <ShoppingBag size={20} /> },
  { to: "/admin/units", label: "Units Management", icon: <Scale size={20} /> },
  { to: "/admin/packages", label: "Packages", icon: <Package size={20} /> },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: <RefreshCw size={20} /> },
  { to: "/admin/users", label: "Users", icon: <Users size={20} /> },
  { to: "/admin/user-history", label: "User History", icon: <UserCheck size={20} /> },
  { to: "/admin/user-addresses", label: "User Addresses", icon: <MapPin size={20} /> },
  { to: "/admin/deliveries", label: "Delivered Orders", icon: <Truck size={20} /> },
  { to: "/admin/demands", label: "Stock Demands", icon: <BarChart3 size={20} /> },
  { to: "/admin/product-sales", label: "Product Sales", icon: <TrendingUp size={20} /> },
  { to: "/admin/seasonal-selections", label: "Seasonal Picks", icon: <Leaf size={20} /> },
  { to: "/admin/returns", label: "Returns", icon: <Undo2 size={20} /> },
  { to: "/admin/summary", label: "Daily Summary", icon: <ClipboardList size={20} /> },
  { to: "/admin/calculator", label: "Price Calculator", icon: <Calculator size={20} /> },
  { to: "/admin/reverse-calculator", label: "Reverse Calculator", icon: <Calculator size={20} /> },
  { to: "/admin/retail-orders", label: "Retail Orders", icon: <ShoppingCart size={20} /> },
  { to: "/admin/batches", label: "Batches", icon: <Layers size={20} /> },
  { to: "/admin/all-orders", label: "All Orders", icon: <ListOrdered size={20} /> },
  { to: "/admin/missed-products", label: "Missed Products", icon: <Undo2 size={20} /> },
];

const userLinks = [
  { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
  { to: "/packages", label: "Browse Packages", icon: <Package size={20} /> },
  { to: "/my-subscriptions", label: "My Subscriptions", icon: <RefreshCw size={20} /> },
  { to: "/wallet", label: "Wallet", icon: <Wallet size={20} /> },
  { to: "/deliveries", label: "Delivery History", icon: <Package size={20} /> },
  { to: "/water", label: "Water Subscription", icon: <Droplet size={20} className="text-aqua-600" /> },
  { to: "/addresses", label: "My Addresses", icon: <MapPin size={20} /> },
  { to: "/notifications", label: "Notifications", icon: <Bell size={20} /> },
  { to: "/retail-store", label: "Retail Store", icon: <ShoppingCart size={20} /> },
  { to: "/my-retail-orders", label: "My Retail Orders", icon: <ClipboardList size={20} /> },
];

const deliveryLinks = [
  { to: "/delivery", label: "Today's Deliveries", icon: <Truck size={20} /> },
  { to: "/delivery/history", label: "Delivery History", icon: <Package size={20} /> },
];

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const links = user?.role === "admin" ? adminLinks
    : user?.role === "delivery" ? deliveryLinks
      : userLinks;

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <aside className="h-screen w-64 bg-white/95 backdrop-blur-xl border-r border-gray-200/60 flex flex-col shadow-2xl z-50">
      {/* Header */}
      <div className="p-6 border-b border-gray-200/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-fresh-400 to-fresh-600 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-fresh-500/30">
            🥦
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-lg leading-none tracking-tight">RamBhaji</h1>
            <p className="text-xs text-fresh-600 font-medium capitalize tracking-wide">{user?.role} Panel</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-gray-600 hover:text-gray-900 transition-colors p-1 bg-gray-100 rounded-md">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto scrollbar-thin">
        {links.map((link) => {
          const isAqua = link.to === "/water";
          return (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => onClose && onClose()}
              end={link.to === "/admin" || link.to === "/dashboard" || link.to === "/delivery"}
              className={({ isActive }) => `nav-link group relative overflow-hidden ${isActive ? (isAqua ? "nav-link-aqua active" : "active") : ""}`}
            >
              <div className={`transition-transform duration-300 group-hover:scale-110 ${link.to === "/water" ? "text-aqua-600" : ""}`}>
                {link.icon}
              </div>
              <span className="z-10">{link.label}</span>
              {/* Hover effect background */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </NavLink>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="p-4 border-t border-gray-200/60 bg-gray-50/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-gradient-to-br from-fresh-100 to-fresh-200 border border-fresh-300 rounded-full flex items-center justify-center text-fresh-700 font-bold text-sm shadow-sm">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate tracking-wide">{user?.name}</p>
            <p className="text-xs text-gray-600 truncate">{user?.phone}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full btn-secondary text-sm py-2.5 flex items-center justify-center gap-2 group border-red-200 hover:border-red-300 hover:bg-red-50 hover:text-red-600">
          <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" /> 
          <span className="font-semibold tracking-wide">Logout</span>
        </button>
      </div>
    </aside>
  );
}
