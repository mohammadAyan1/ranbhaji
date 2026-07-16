import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import api from "../../api/axios";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", password: "", role: "user" });
  const [creating, setCreating] = useState(false);

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

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    setMsg("");
    try {
      await api.post("/admin/users", formData);
      setMsg(`✅ User ${formData.name} created successfully.`);
      setIsModalOpen(false);
      setFormData({ name: "", phone: "", email: "", password: "", role: "user" });
      fetchUsers();
    } catch (err) {
      setMsg(`❌ Failed to create user: ${err.response?.data?.message || err.message}`);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-600">Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-header">User Management 👥</h1>
          <p className="page-sub">View and manage all platform users</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary text-sm flex items-center gap-2">
          <Plus size={16} /> Add User
        </button>
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

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add New User</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input type="text" className="input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input type="text" className="input" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div>
                <label className="label">Email (Optional)</label>
                <input type="email" className="input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <label className="label">Password</label>
                <input type="text" className="input" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                  <option value="user">User</option>
                  <option value="delivery">Delivery</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <button type="submit" disabled={creating} className="btn-primary w-full mt-2">
                {creating ? "Creating..." : "Create Verified User"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
