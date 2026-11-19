import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { Menu, Monitor, X, LogIn } from "lucide-react";
import useAuthStore from "../store/authStore";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isTvMode, setIsTvMode] = useState(false);
  const { token } = useAuthStore();
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-900 font-sans">
      {/* Mobile Overlay */}
      {token && sidebarOpen && !isTvMode && (
        <div 
          className="fixed inset-0 bg-gray-900/10 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - only for authenticated users */}
      {token && !isTvMode && (
        <div className={`fixed inset-y-0 left-0 z-50 transform lg:transform-none lg:relative transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-gray-50 to-fresh-50/30 relative">
        {/* Unauthenticated Header */}
        {!token && (
          <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white/95 backdrop-blur-md sticky top-0 z-30 shadow-xs">
            <div className="flex items-center gap-6">
              <img src="/logo.png" alt="RamBhaji Logo" className="h-10 w-auto max-w-[160px] object-contain" />
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/log-purchase"
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                    location.pathname.includes("purchase") || location.pathname === "/log-purchase"
                      ? "bg-fresh-100 text-fresh-700 font-bold"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  Today Purchases
                </Link>
                <Link
                  to="/admin/today-work/assign-delivery"
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                    location.pathname.includes("assign-delivery")
                      ? "bg-fresh-100 text-fresh-700 font-bold"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  Assign Delivery Boy
                </Link>
              </div>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-4 py-2 bg-fresh-600 hover:bg-fresh-700 text-gray-900 font-semibold text-xs rounded-xl transition-all shadow-sm"
            >
              <LogIn size={15} />
              <span>Admin Login</span>
            </Link>
          </header>
        )}
        {/* Mobile Header */}
        {!isTvMode && (
          <header className="lg:hidden flex items-center justify-between p-3.5 border-b border-gray-200/50 bg-white/80 backdrop-blur-md z-30 sticky top-0">
            <div className="flex items-center">
              <img src="/logo.png" alt="RamBhaji Logo" className="h-9 w-auto max-w-[140px] object-contain" />
            </div>
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-600 hover:text-gray-900 bg-gray-100/80 rounded-lg backdrop-blur-sm border border-gray-300 transition-colors"
            >
              <Menu size={24} />
            </button>
          </header>
        )}

        <div className={`flex-1 overflow-auto p-4 sm:p-6 lg:p-8 animate-fade-in relative w-full ${isTvMode ? 'max-w-full' : 'max-w-[1600px]'} mx-auto`}>
          <Outlet />
        </div>
        
        {/* Floating TV Mode Toggle */}
        <button
          onClick={() => setIsTvMode(!isTvMode)}
          title={isTvMode ? "Exit TV Mode" : "TV Mode (Hide Sidebar)"}
          className="fixed bottom-6 right-6 p-3 bg-gray-900 text-white rounded-full shadow-2xl hover:bg-gray-800 transition-all z-50 flex items-center justify-center hover:scale-110"
        >
          {isTvMode ? <X size={24} /> : <Monitor size={24} />}
        </button>
      </main>
    </div>
  );
}
