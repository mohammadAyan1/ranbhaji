import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = () => {
    api.get("/notifications").then(r => setNotifs(r.data.notifications || [])).finally(() => setLoading(false));
  };
  useEffect(fetchNotifs, []);

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/mark-read`);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const typeIcon = (type) => ({ reminder: "⏰", alert: "📢", recharge: "💰" }[type] || "🔔");

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-600">Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-header">Notifications 🔔</h1>
        <p className="page-sub">{notifs.filter(n => !n.is_read).length} unread</p>
      </div>

      {notifs.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <p className="text-4xl mb-3">🔔</p>
          <p>No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifs.map(n => (
            <div key={n.id} onClick={() => !n.is_read && markRead(n.id)}
              className={`card cursor-pointer transition-all hover:border-gray-300 ${!n.is_read ? "border-fresh-700/50 bg-fresh-100/10" : "opacity-70"}`}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                  {typeIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900">{n.title}</p>
                    {!n.is_read && <span className="w-2 h-2 bg-fresh-400 rounded-full flex-shrink-0"></span>}
                  </div>
                  <p className="text-gray-600 text-sm">{n.message}</p>
                  <p className="text-gray-600 text-xs mt-1">{new Date(n.scheduled_at).toLocaleString("en-IN")}</p>
                </div>
                <span className={`badge ${n.type === "reminder" ? "badge-blue" : n.type === "recharge" ? "badge-yellow" : "badge-green"}`}>
                  {n.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
