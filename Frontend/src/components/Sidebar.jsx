import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import useAuthStore from "../store/authStore";
import {
  LayoutDashboard, ShoppingBag, Package, RefreshCw, Users, MapPin,
  Truck, BarChart3, Leaf, Undo2, ClipboardList, Calculator,
  ShoppingCart, Layers, ListOrdered, Wallet, Droplet, Bell, X, LogOut, TrendingUp, UserCheck, Scale, Settings, Activity, ChevronDown, Database, Briefcase
} from "lucide-react";

const adminLinks = [
  { to: "/admin", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
  {
    label: "Master",
    icon: <Database size={20} />,
    isCollapsible: true,
    children: [
      { to: "/admin/master/categories", label: "Category" },
      { to: "/admin/master/sub-categories", label: "Sub Category" },
      { to: "/admin/products?tab=catalog", label: "Products" },
      { to: "/admin/batches", label: "Batch" },
      { to: "/admin/packages", label: "Package" },
      { to: "/admin/master/zones", label: "Zone" },
      { to: "/admin/units", label: "Unit" },
      { to: "/admin/waste", label: "Waste" },
    ]
  },
  {
    label: "Calculator",
    icon: <Calculator size={20} />,
    isCollapsible: true,
    children: [
      { to: "/admin/calculators/package", label: "Package Calculator" },
      { to: "/admin/calculators/margin", label: "Margin Calculator" },
    ]
  },
  {
    label: "Package",
    icon: <Package size={20} />,
    isCollapsible: true,
    children: [
      { to: "/admin/package-management/draft", label: "Draft Package" },
      { to: "/admin/package-management/active", label: "Total Active Package" },
      { to: "/admin/package-management/inactive", label: "Non Active Package" },
    ]
  },
  {
    label: "Today Work",
    icon: <Briefcase size={20} />,
    isCollapsible: true,
    children: [
      { to: "/admin/products?tab=purchase", label: "Today Purchases" },
      { to: "/admin/today-work/batch-assign", label: "Batch Assign" },
      { to: "/admin/working-logs", label: "Current Process" },
      { to: "/admin/today-work/missing", label: "Missing" },
      { to: "/admin/today-work/ready", label: "Ready for Deliver" },
      { to: "/admin/today-work/assign-delivery", label: "Assign Delivery Boy" },
      { to: "/admin/today-work/dispatch", label: "Dispatch" },
      { to: "/admin/deliveries", label: "Delivered" },
      { to: "/admin/today-work/return-item", label: "Return Item" },
      { to: "/admin/returns", label: "Return Order" },
    ]
  },
  {
    label: "Customer",
    icon: <Users size={20} />,
    isCollapsible: true,
    children: [
      { to: "/admin/customers/active", label: "Active Customer" },
      { to: "/admin/customers/subscribe", label: "Subscribe Customer" },
      { to: "/admin/customers/lost", label: "Lost Customer" },
      { to: "/admin/customers/retail", label: "Retails Customer" },
      { to: "/admin/customers/non-active", label: "Non Active Customer" },
      { to: "/admin/user-preferences", label: "User Preferences" },
    ]
  },
  {
    label: "Reports",
    icon: <BarChart3 size={20} />,
    isCollapsible: true,
    children: [
      { to: "/admin/reports/item-purchase", label: "Total Item Purchase" },
      { to: "/admin/reports/item-delivery", label: "Total Item Delivery" },
      { to: "/admin/reports/customer-register", label: "Customer Register" },
      { to: "/admin/reports/subscription-converted", label: "Subscription Converted" },
      { to: "/admin/reports/lost-customer", label: "Total Lost Customer" },
      { to: "/admin/reports/loss", label: "Total Loss" },
    ]
  },
  {
    label: "Users & Partners",
    icon: <UserCheck size={20} />,
    isCollapsible: true,
    children: [
      { to: "/admin/users", label: "All Users" },
      { to: "/admin/franchises", label: "Franchise Partners" },
    ]
  },
  {
    label: "Attendance",
    icon: <ClipboardList size={20} />,
    isCollapsible: false,
    to: "/admin/attendance"
  }
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
  { to: "/preferences", label: "Preferences", icon: <Settings size={20} /> },
];

const deliveryLinks = [
  { to: "/delivery", label: "Today's Deliveries", icon: <Truck size={20} /> },
  { to: "/delivery/history", label: "Delivery History", icon: <Package size={20} /> },
];

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({ "Products": false });

  const toggleMenu = (label) => {
    setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

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
          if (link.isCollapsible) {
            const isOpen = expandedMenus[link.label];
            const isActiveParent = link.children.some(child => location.pathname === child.to.split('?')[0]);

            return (
              <div key={link.label} className="space-y-1">
                <button
                  onClick={() => toggleMenu(link.label)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${isActiveParent && !isOpen ? 'bg-fresh-50 text-fresh-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={isActiveParent ? "text-fresh-600" : ""}>{link.icon}</div>
                    <span>{link.label}</span>
                  </div>
                  <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen && (
                  <div className="pl-11 space-y-1 pb-1">
                    {link.children.map(child => {
                      const isExactTab = location.search === child.to.substring(child.to.indexOf('?')) || (!location.search && child.to.endsWith('?tab=catalog'));
                      const isChildActive = (location.pathname === child.to.split('?')[0]) && (child.to.includes('?') ? isExactTab : true);

                      return (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          onClick={() => onClose && onClose()}
                          className={`block px-3 py-2 rounded-lg text-sm transition-all duration-200 ${isChildActive ? "bg-fresh-100 text-fresh-700 font-semibold" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"}`}
                        >
                          {child.label}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

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
