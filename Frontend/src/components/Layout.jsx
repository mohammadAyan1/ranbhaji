import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { Menu } from "lucide-react";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/10 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 transform lg:transform-none lg:relative transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-gray-50 to-fresh-50/30">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200/50 bg-white/80 backdrop-blur-md z-30 sticky top-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-fresh-400 to-fresh-600 shadow-lg shadow-fresh-500/20 rounded-lg flex items-center justify-center text-sm">🥦</div>
            <span className="font-bold text-lg tracking-tight text-gray-900">FreshBox</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-600 hover:text-gray-900 bg-gray-100/80 rounded-lg backdrop-blur-sm border border-gray-300 transition-colors"
          >
            <Menu size={24} />
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 animate-fade-in relative w-full max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
