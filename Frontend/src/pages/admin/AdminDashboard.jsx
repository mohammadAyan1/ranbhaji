import { useEffect, useState } from "react";
import api from "../../api/axios";
import { Users, CheckCircle, Truck, ShieldAlert, Calendar } from "lucide-react";

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/admin/tomorrow-summary"), api.get("/admin/users")])
      .then(([s, u]) => { setSummary(s.data.summary); setUsers(u.data.users || []); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-12 h-12 border-4 border-fresh-500/20 border-t-fresh-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-7xl mx-auto">
      <div>
        <h1 className="page-header flex items-center gap-2">Admin Dashboard <ShieldAlert className="text-red-600" size={28} /></h1>
        <p className="page-sub">FreshBox operations overview and insights</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: "Total Users", value: users.length, icon: <Users size={24} />, color: "bg-blue-500/20 text-blue-400", cardBorder: "hover:border-blue-500/50 hover:shadow-blue-900/20" },
          { label: "Active Users", value: users.filter(u => u.status === "active").length, icon: <CheckCircle size={24} />, color: "bg-fresh-500/20 text-fresh-600", cardBorder: "hover:border-fresh-500/50 hover:shadow-fresh-900/20" },
          { label: "Tomorrow's Deliveries", value: summary?.total_customers || 0, icon: <Truck size={24} />, color: "bg-yellow-500/20 text-yellow-400", cardBorder: "hover:border-yellow-500/50 hover:shadow-yellow-900/20" },
          { label: "Admins", value: users.filter(u => u.role === "admin").length, icon: <ShieldAlert size={24} />, color: "bg-red-500/20 text-red-600", cardBorder: "hover:border-red-500/50 hover:shadow-red-900/20" },
        ].map(stat => (
          <div key={stat.label} className={`card border border-transparent transition-all duration-300 ${stat.cardBorder}`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 tracking-tight">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
        {/* Tomorrow's summary */}
        <div className="card-glass">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Calendar size={20} className="text-yellow-400" /> Tomorrow's Deliveries 
              <span className="text-sm font-normal text-gray-600">({summary?.date})</span>
            </h2>
          </div>
          {summary?.deliveries?.length > 0 ? (
            <div className="table-container">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="text-left p-4 rounded-tl-xl">Customer</th>
                    <th className="text-left p-4">Package</th>
                    <th className="text-right p-4 rounded-tr-xl">Schedule ID</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.deliveries.map(d => (
                    <tr key={d.schedule_id} className="table-row">
                      <td className="p-4 text-gray-900 font-medium">{d.user?.name}</td>
                      <td className="p-4 text-gray-600">
                        <span className="bg-gray-100 px-2 py-1 rounded-md text-xs border border-gray-300">{d.package}</span>
                      </td>
                      <td className="p-4 text-right text-gray-500">#{d.schedule_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 bg-white/30 rounded-xl border border-gray-200 border-dashed">
              <Truck size={40} className="mx-auto mb-3 text-gray-600 opacity-50" />
              <p className="text-sm">No deliveries scheduled for tomorrow</p>
            </div>
          )}
        </div>

        {/* Recent users */}
        <div className="card-glass">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Users size={20} className="text-blue-400" /> Recent Users
            </h2>
          </div>
          <div className="table-container">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="text-left p-4 rounded-tl-xl">Name & Phone</th>
                  <th className="text-left p-4">Role</th>
                  <th className="text-right p-4">Wallet</th>
                  <th className="text-right p-4 rounded-tr-xl">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.slice(0, 8).map(u => (
                  <tr key={u.id} className="table-row">
                    <td className="p-4">
                      <p className="text-gray-900 font-medium">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.phone}</p>
                    </td>
                    <td className="p-4"><span className={`badge ${u.role === "admin" ? "badge-red" : u.role === "delivery" ? "badge-blue" : "badge-green"}`}>{u.role}</span></td>
                    <td className="p-4 text-right text-gray-700 font-medium tracking-tight">₹{parseFloat(u.wallet_balance || 0).toFixed(0)}</td>
                    <td className="p-4 text-right"><span className={u.status === "active" ? "badge-green" : "badge-red"}>{u.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
