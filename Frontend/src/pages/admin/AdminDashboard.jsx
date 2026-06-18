import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/admin/tomorrow-summary"), api.get("/admin/users")])
      .then(([s, u]) => { setSummary(s.data.summary); setUsers(u.data.users || []); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading dashboard...</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="page-header">Admin Dashboard 🛡️</h1>
        <p className="page-sub">FreshBox operations overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: users.length, icon: "👥", color: "blue" },
          { label: "Active Users", value: users.filter(u => u.status === "active").length, icon: "✅", color: "green" },
          { label: "Tomorrow's Deliveries", value: summary?.total_customers || 0, icon: "🚚", color: "yellow" },
          { label: "Admins", value: users.filter(u => u.role === "admin").length, icon: "🛡️", color: "red" },
        ].map(stat => (
          <div key={stat.label} className="card">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{stat.icon}</span>
              <div>
                <p className="text-gray-400 text-xs">{stat.label}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tomorrow's summary */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Tomorrow's Deliveries ({summary?.date})</h2>
        {summary?.deliveries?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="text-left p-3 rounded-tl-xl">Customer</th>
                  <th className="text-left p-3">Package</th>
                  <th className="text-right p-3 rounded-tr-xl">Schedule ID</th>
                </tr>
              </thead>
              <tbody>
                {summary.deliveries.map(d => (
                  <tr key={d.schedule_id} className="table-row">
                    <td className="p-3 text-white">{d.user?.name}</td>
                    <td className="p-3 text-gray-400">{d.package}</td>
                    <td className="p-3 text-right text-gray-500">#{d.schedule_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">No deliveries scheduled for tomorrow</p>
        )}
      </div>

      {/* Recent users */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Users</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="text-left p-3 rounded-tl-xl">Name</th>
                <th className="text-left p-3">Phone</th>
                <th className="text-left p-3">Role</th>
                <th className="text-right p-3">Wallet</th>
                <th className="text-right p-3 rounded-tr-xl">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.slice(0, 10).map(u => (
                <tr key={u.id} className="table-row">
                  <td className="p-3 text-white font-medium">{u.name}</td>
                  <td className="p-3 text-gray-400">{u.phone}</td>
                  <td className="p-3"><span className={`badge ${u.role === "admin" ? "badge-red" : u.role === "delivery" ? "badge-blue" : "badge-green"}`}>{u.role}</span></td>
                  <td className="p-3 text-right text-gray-300">₹{parseFloat(u.wallet_balance || 0).toFixed(0)}</td>
                  <td className="p-3 text-right"><span className={u.status === "active" ? "badge-green" : "badge-red"}>{u.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
