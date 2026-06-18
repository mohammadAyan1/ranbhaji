import { useEffect, useState } from "react";
import useAuthStore from "../../store/authStore";
import api from "../../api/axios";
import { Link } from "react-router-dom";


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

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-header">Welcome back, {user?.name?.split(" ")[0]} 👋</h1>
        <p className="page-sub">Here's your FreshBox overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card glow-green">
          <div className="w-12 h-12 bg-fresh-900/50 rounded-xl flex items-center justify-center text-2xl">💰</div>
          <div>
            <p className="text-gray-400 text-sm">Wallet Balance</p>
            <p className="text-2xl font-bold text-white">₹{parseFloat(wallet?.wallet_balance || 0).toFixed(2)}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="w-12 h-12 bg-yellow-900/30 rounded-xl flex items-center justify-center text-2xl">⚠️</div>
          <div>
            <p className="text-gray-400 text-sm">Due Amount</p>
            <p className="text-2xl font-bold text-white">₹{parseFloat(wallet?.due_amount || 0).toFixed(2)}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="w-12 h-12 bg-blue-900/30 rounded-xl flex items-center justify-center text-2xl">📦</div>
          <div>
            <p className="text-gray-400 text-sm">Active Subscriptions</p>
            <p className="text-2xl font-bold text-white">{subscriptions.filter(s => s.status === 'active').length}</p>
          </div>
        </div>
      </div>

      {/* Subscriptions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">My Subscriptions</h2>
          <Link to="/packages" className="btn-primary text-sm py-2 px-4">+ Subscribe</Link>
        </div>
        {subscriptions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-4xl mb-3">📦</p>
            <p>No subscriptions yet.</p>
            <Link to="/packages" className="text-fresh-400 text-sm hover:underline">Browse packages →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {subscriptions.map(sub => (
              <div key={sub.id} className="bg-gray-800/50 rounded-xl p-4 flex items-center justify-between border border-gray-700/50">
                <div>
                  <p className="font-medium text-white">{sub.Package?.name} <span className="text-gray-500 text-sm">({sub.type})</span></p>
                  <p className="text-gray-400 text-sm">
                    {sub.start_date ? `${sub.start_date} → ${sub.end_date}` : "Start date pending"}
                    {" · "}{sub.services_completed}/{sub.total_services} services
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {statusBadge(sub.status)}
                  {sub.status === 'active' && (
                    <Link to={`/my-subscriptions`} className="text-xs text-fresh-400 hover:underline">Manage</Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Notifications</h2>
            <Link to="/notifications" className="text-fresh-400 text-sm hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {notifications.map(n => (
              <div key={n.id} className={`rounded-xl px-4 py-3 ${n.is_read ? "bg-gray-800/30" : "bg-fresh-900/20 border border-fresh-800/30"}`}>
                <p className="font-medium text-sm text-white">{n.title}</p>
                <p className="text-gray-400 text-xs mt-0.5">{n.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
