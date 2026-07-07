import { useEffect, useState } from "react";
import useAuthStore from "../../store/authStore";
import api from "../../api/axios";
import { Link } from "react-router-dom";
import { Wallet, AlertTriangle, Package, ChevronRight, Bell } from "lucide-react";

export default function UserDashboard() {
  const { user } = useAuthStore();
  const [wallet, setWallet] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [walletRes, subRes, notifRes] = await Promise.all([
          api.get("/wallet"),
          api.get("/my-subscriptions"),
          api.get("/notifications"),
        ]);
        setWallet(walletRes.data);
        setSubscriptions(subRes.data.subscriptions || []);
        setNotifications(notifRes.data.notifications?.slice(0, 5) || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const statusBadge = (s) => {
    const map = { active: "badge-green", paused: "badge-yellow", cancelled: "badge-red", completed: "badge-blue" };
    return <span className={`${map[s] || "badge-gray"} badge`}>{s}</span>;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-12 h-12 border-4 border-fresh-500/20 border-t-fresh-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="page-header flex items-center gap-2">
          Welcome back, {user?.name?.split(" ")[0]} <span className="text-3xl wave">👋</span>
        </h1>
        <p className="page-sub">Here's your FreshBox overview for today</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="stat-card">
          <div className="w-12 h-12 bg-fresh-500/20 rounded-xl flex items-center justify-center text-fresh-600">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-gray-600 text-sm font-medium">Wallet Balance</p>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">₹{parseFloat(wallet?.wallet_balance || 0).toFixed(2)}</p>
          </div>
        </div>
        
        <div className="stat-card border border-red-900/30 hover:border-red-500/50 hover:shadow-red-900/20">
          <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center text-red-600">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-gray-600 text-sm font-medium">Due Amount</p>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">₹{parseFloat(wallet?.due_amount || 0).toFixed(2)}</p>
          </div>
        </div>
        
        <div className="stat-card stat-card-aqua">
          <div className="w-12 h-12 bg-aqua-500/20 rounded-xl flex items-center justify-center text-aqua-600">
            <Package size={24} />
          </div>
          <div>
            <p className="text-gray-600 text-sm font-medium">Active Subscriptions</p>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">{subscriptions.filter(s => s.status === 'active').length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Subscriptions - Takes up 2 columns on large screens */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card-glass">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">My Subscriptions</h2>
              <Link to="/packages" className="btn-primary text-sm py-2 px-4 shadow-fresh-600/30">
                + New Subscription
              </Link>
            </div>
            {subscriptions.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-white/30 rounded-xl border border-gray-200 border-dashed">
                <Package size={48} className="mx-auto mb-4 text-gray-600 opacity-50" />
                <p className="text-lg font-medium text-gray-600 mb-1">No subscriptions yet</p>
                <p className="text-sm mb-4">Start enjoying fresh vegetables and alkaline water</p>
                <Link to="/packages" className="text-fresh-600 text-sm font-semibold hover:text-fresh-700 transition-colors flex items-center justify-center gap-1">
                  Browse packages <ChevronRight size={16} />
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {subscriptions.map(sub => (
                  <div key={sub.id} className="bg-white/60 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between border border-gray-300/50 hover:border-gray-600 transition-colors gap-4">
                    <div>
                      <p className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                        {sub.Package?.name} 
                        <span className="text-xs px-2 py-1 bg-gray-100 rounded-md text-gray-600 uppercase tracking-wider">{sub.type}</span>
                      </p>
                      <p className="text-gray-600 text-sm mt-1">
                        {sub.start_date ? `${sub.start_date} → ${sub.end_date}` : "Start date pending"}
                        <span className="mx-2">•</span> 
                        <span className="text-fresh-600 font-medium">{sub.services_completed}/{sub.total_services} services</span>
                      </p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                      {statusBadge(sub.status)}
                      {sub.status === 'active' && (
                        <Link to={`/my-subscriptions`} className="btn-secondary text-xs px-4 py-2">
                          Manage
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Notifications Sidebar */}
        <div className="space-y-6">
          <div className="card-glass h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 tracking-tight">
                <Bell size={20} className="text-fresh-600" /> Notifications
              </h2>
              {notifications.length > 0 && (
                <Link to="/notifications" className="text-gray-600 text-sm hover:text-gray-900 transition-colors">
                  View all
                </Link>
              )}
            </div>
            
            {notifications.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <Bell size={32} className="mx-auto mb-3 text-gray-600 opacity-30" />
                <p className="text-sm">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map(n => (
                  <div key={n.id} className={`rounded-xl px-4 py-3 border transition-colors ${n.is_read ? "bg-gray-100/30 border-gray-200/50" : "bg-fresh-100/10 border-fresh-500/20 shadow-sm shadow-fresh-500/5"}`}>
                    <p className="font-semibold text-sm text-gray-900 mb-0.5">{n.title}</p>
                    <p className="text-gray-600 text-xs leading-relaxed">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
