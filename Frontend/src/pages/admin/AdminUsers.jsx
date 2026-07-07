import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const fetchUsers = () => {
    api.get("/admin/users").then(r => setUsers(r.data.users || [])).finally(() => setLoading(false));
  };
  useEffect(fetchUsers, []);

  const toggleStatus = async (user) => {
    const newStatus = user.status === "active" ? "inactive" : "active";
    try {
      await api.patch(`/admin/users/${user.id}/status`, { status: newStatus });
      setMsg(`✅ User ${newStatus}`);
      fetchUsers();
    } catch (err) { setMsg(`❌ ${err.response?.data?.message}`); }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-600">Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-header">User Management 👥</h1>
        <p className="page-sub">View and manage all platform users</p>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm ${msg.startsWith("✅") ? "bg-fresh-100/30 text-fresh-600 border border-fresh-700/50" : "bg-red-900/30 text-red-600 border border-red-700/50"}`}>
          {msg}
        </div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="text-left p-3 rounded-tl-xl">Name</th>
                <th className="text-left p-3">Phone</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Role</th>
                <th className="text-right p-3">Wallet</th>
                <th className="text-right p-3">Due</th>
                <th className="text-center p-3">Status</th>
                <th className="text-right p-3 rounded-tr-xl">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="table-row">
                  <td className="p-3 text-gray-900 font-medium">{u.name}</td>
                  <td className="p-3 text-gray-600">{u.phone}</td>
                  <td className="p-3 text-gray-500 text-xs">{u.email || "—"}</td>
                  <td className="p-3">
                    <span className={`badge ${u.role === "admin" ? "badge-red" : u.role === "delivery" ? "badge-blue" : "badge-green"}`}>{u.role}</span>
                  </td>
                  <td className="p-3 text-right text-fresh-600">₹{parseFloat(u.wallet_balance || 0).toFixed(0)}</td>
                  <td className="p-3 text-right text-red-600">₹{parseFloat(u.due_amount || 0).toFixed(0)}</td>
                  <td className="p-3 text-center">
                    <span className={u.status === "active" ? "badge-green" : "badge-red"}>{u.status}</span>
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => toggleStatus(u)}
                      className={`text-xs font-medium ${u.status === "active" ? "text-red-600 hover:text-red-300" : "text-fresh-600 hover:text-fresh-700"}`}>
                      {u.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
