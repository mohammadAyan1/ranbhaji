import { useEffect, useState } from "react";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";
import { Users, CheckCircle, Truck, ShieldAlert, Calendar, ShoppingBag, Undo2, AlertTriangle, Package, CheckSquare, Clock } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.get("/admin/dashboard-stats"), api.get("/admin/users")])
      .then(([s, u]) => { 
        setStats(s.data.stats); 
        setUsers(u.data.users || []); 
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-12 h-12 border-4 border-fresh-500/20 border-t-fresh-500 rounded-full animate-spin"></div>
    </div>
  );

  const metricCards = [
    { 
      label: "Orders Today", 
      value: stats?.ordersToday || 0, 
      icon: <ShoppingBag size={24} />, 
      color: "bg-blue-500/20 text-blue-600", 
      cardBorder: "hover:border-blue-500/50 hover:shadow-blue-900/20 border-l-4 border-l-blue-500",
      onClick: () => navigate("/admin/all-orders?date=today")
    },
    { 
      label: "Pending Returns", 
      value: stats?.pendingReturns || 0, 
      icon: <Undo2 size={24} />, 
      color: "bg-orange-500/20 text-orange-600", 
      cardBorder: "hover:border-orange-500/50 hover:shadow-orange-900/20 border-l-4 border-l-orange-500",
      onClick: () => navigate("/admin/returns")
    },
    { 
      label: "Missing Items", 
      value: stats?.missingItems || 0, 
      icon: <AlertTriangle size={24} />, 
      color: "bg-red-500/20 text-red-600", 
      cardBorder: "hover:border-red-500/50 hover:shadow-red-900/20 border-l-4 border-l-red-500",
      onClick: () => navigate("/admin/missed-products")
    },
    { 
      label: "Pending Purchases", 
      value: stats?.pendingRequests || 0, 
      icon: <Package size={24} />, 
      color: "bg-purple-500/20 text-purple-600", 
      cardBorder: "hover:border-purple-500/50 hover:shadow-purple-900/20 border-l-4 border-l-purple-500",
      onClick: () => navigate("/admin/products?tab=purchase")
    },
    { 
      label: "Delivered", 
      value: stats?.deliveredCount || 0, 
      icon: <CheckSquare size={24} />, 
      color: "bg-green-500/20 text-green-600", 
      cardBorder: "hover:border-green-500/50 hover:shadow-green-900/20 border-l-4 border-l-green-500",
      onClick: () => navigate("/admin/deliveries")
    },
    { 
      label: "Not Ready (Packing)", 
      value: stats?.notReadyCount || 0, 
      icon: <Clock size={24} />, 
      color: "bg-yellow-500/20 text-yellow-600", 
      cardBorder: "hover:border-yellow-500/50 hover:shadow-yellow-900/20 border-l-4 border-l-yellow-500",
      onClick: () => navigate("/admin/all-orders?status=pending")
    },
    { 
      label: "Ready (Unassigned)", 
      value: stats?.readyUnacceptedCount || 0, 
      icon: <Truck size={24} />, 
      color: "bg-cyan-500/20 text-cyan-600", 
      cardBorder: "hover:border-cyan-500/50 hover:shadow-cyan-900/20 border-l-4 border-l-cyan-500",
      onClick: () => navigate("/admin/all-orders?status=ready")
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-7xl mx-auto">
      <div>
        <h1 className="page-header flex items-center gap-2">Admin Dashboard <ShieldAlert className="text-red-600" size={28} /></h1>
        <p className="page-sub">Live operations overview and quick navigation</p>
      </div>

      {/* Main Operational Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {metricCards.map(stat => (
          <div 
            key={stat.label} 
            onClick={stat.onClick}
            className={`card cursor-pointer border transition-all duration-300 ${stat.cardBorder} bg-white`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                <p className="text-3xl font-black text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                {stat.icon}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] text-gray-400 font-semibold uppercase">Click to view details &rarr;</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
        
        {/* System Health / Users Overview */}
        <div className="card-glass">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Users size={20} className="text-blue-400" /> Platform Overview
            </h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-gray-100 text-center">
              <p className="text-gray-500 text-xs font-bold uppercase">Total Users</p>
              <p className="text-2xl font-black text-gray-900">{users.length}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 text-center">
              <p className="text-gray-500 text-xs font-bold uppercase">Active Users</p>
              <p className="text-2xl font-black text-fresh-600">{users.filter(u => u.status === "active").length}</p>
            </div>
          </div>

          <div className="table-container">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="text-left p-4 rounded-tl-xl">Name & Phone</th>
                  <th className="text-left p-4">Role</th>
                  <th className="text-right p-4 rounded-tr-xl">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.slice(0, 5).map(u => (
                  <tr key={u.id} className="table-row">
                    <td className="p-4">
                      <p className="text-gray-900 font-medium">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.phone}</p>
                    </td>
                    <td className="p-4"><span className={`badge ${u.role === "admin" ? "badge-red" : u.role === "delivery" ? "badge-blue" : "badge-green"}`}>{u.role}</span></td>
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
