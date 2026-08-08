import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X } from "lucide-react";
import api from "../../api/axios";

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [allZones, setAllZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedViewUser, setSelectedViewUser] = useState(null);
  const [isDeliveryZoneModalOpen, setIsDeliveryZoneModalOpen] = useState(false);
  const [deliveryZoneUser, setDeliveryZoneUser] = useState(null);
  const [selectedDeliveryZones, setSelectedDeliveryZones] = useState([]);
  const [savingZones, setSavingZones] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", password: "", role: "user", delivery_zones: [] });
  const [creating, setCreating] = useState(false);

  const fetchUsers = () => {
    api.get("/admin/user-analytics/users").then(r => setUsers(r.data.users || [])).finally(() => setLoading(false));
  };
  const fetchZones = () => {
    api.get("/zones").then(r => setAllZones(r.data || [])).catch(e => console.error(e));
  };
  useEffect(() => {
    fetchUsers();
    fetchZones();
  }, []);

  const handleSaveDeliveryZones = async (e) => {
    e.preventDefault();
    if (!deliveryZoneUser) return;
    setSavingZones(true);
    try {
      await api.patch(`/admin/users/${deliveryZoneUser.id}/delivery-zones`, { zones: selectedDeliveryZones });
      setMsg(`✅ Delivery zones updated for ${deliveryZoneUser.name}`);
      setIsDeliveryZoneModalOpen(false);
      fetchUsers();
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.message || err.message}`);
    } finally {
      setSavingZones(false);
    }
  };

  const toggleZoneSelection = (zoneName) => {
    if (selectedDeliveryZones.includes(zoneName)) {
      setSelectedDeliveryZones(prev => prev.filter(z => z !== zoneName));
    } else {
      setSelectedDeliveryZones(prev => [...prev, zoneName]);
    }
  };

  const toggleStatus = async (user) => {
    const newStatus = user.status === "active" ? "inactive" : "active";
    try {
      await api.patch(`/admin/user-analytics/users/${user.id}/status`, { status: newStatus });
      setMsg(`✅ User ${newStatus}`);
      fetchUsers();
    } catch (err) { setMsg(`❌ ${err.response?.data?.message}`); }
  };

  const handleRoleChange = async (user, newRole) => {
    try {
      await api.patch(`/admin/user-analytics/users/${user.id}/role`, { role: newRole });
      setMsg(`✅ Role updated to ${newRole}`);
      fetchUsers();
    } catch (err) { setMsg(`❌ ${err.response?.data?.message}`); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    setMsg("");
    try {
      await api.post("/admin/user-analytics/users", formData);
      setMsg(`✅ User ${formData.name} created successfully.`);
      setIsModalOpen(false);
      setFormData({ name: "", phone: "", email: "", password: "", role: "user", delivery_zones: [] });
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
        <div className="flex items-center gap-4">
          <select 
            className="input text-sm py-2" 
            value={filterRole} 
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="user">Users</option>
            <option value="delivery">Delivery</option>
            <option value="admin">Admin</option>
          </select>
          <select 
            className="input text-sm py-2" 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary text-sm flex items-center gap-2">
            <Plus size={16} /> Add User
          </button>
        </div>
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
                <th className="text-left p-3">Password</th>
                <th className="text-left p-3">Role</th>
                <th className="text-right p-3">Wallet</th>
                <th className="text-right p-3">Due</th>
                <th className="text-center p-3">Status</th>
                <th className="text-right p-3 rounded-tr-xl">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.filter(u => 
                (filterRole === "all" || u.role === filterRole) && 
                (filterStatus === "all" || u.status === filterStatus)
              ).map(u => (
                <tr key={u.id} className="table-row">
                  <td className="p-3 font-medium">
                    <button 
                      onClick={() => navigate("/admin/user-history", { state: { selectedUserId: u.id } })}
                      className="text-gray-900 hover:text-fresh-600 hover:underline transition-colors text-left"
                    >
                      {u.name}
                    </button>
                  </td>
                  <td className="p-3 text-gray-600">{u.phone}</td>
                  <td className="p-3 text-gray-500 text-xs">{u.email || "—"}</td>
                  <td className="p-3 text-gray-700 font-mono text-xs">{u.actual_password || "—"}</td>
                  <td className="p-3">
                    <select 
                      className={`text-xs font-semibold px-2 py-1 rounded-md border-0 bg-gray-50 focus:ring-0 cursor-pointer ${u.role === "admin" ? "text-red-700" : u.role === "delivery" ? "text-blue-700" : "text-green-700"}`}
                      value={u.role}
                      onChange={(e) => handleRoleChange(u, e.target.value)}
                    >
                      <option value="admin">Admin</option>
                      <option value="delivery">Delivery</option>
                      <option value="user">User</option>
                    </select>
                  </td>
                  <td className="p-3 text-right text-fresh-600">₹{parseFloat(u.wallet_balance || 0).toFixed(0)}</td>
                  <td className="p-3 text-right text-red-600">₹{parseFloat(u.due_amount || 0).toFixed(0)}</td>
                  <td className="p-3 text-center">
                    <span className={u.status === "active" ? "badge-green" : "badge-red"}>{u.status}</span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      {u.role === 'delivery' && (
                        <button 
                          onClick={() => {
                            setDeliveryZoneUser(u);
                            try {
                                const parsedZones = typeof u.delivery_zones === 'string' ? JSON.parse(u.delivery_zones) : u.delivery_zones;
                                setSelectedDeliveryZones(Array.isArray(parsedZones) ? parsedZones : []);
                            } catch (e) { setSelectedDeliveryZones([]); }
                            setIsDeliveryZoneModalOpen(true);
                          }}
                          className="text-xs font-medium px-3 py-1 rounded-full border border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                          Zones
                        </button>
                      )}
                      <button 
                        onClick={() => { setSelectedViewUser(u); setIsViewModalOpen(true); }}
                        className="text-xs font-medium px-3 py-1 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50"
                      >
                        View
                      </button>
                      <button onClick={() => toggleStatus(u)}
                        className={`text-xs font-medium px-3 py-1 rounded-full border ${u.status === "active" ? "text-red-600 hover:bg-red-50 border-red-200" : "text-fresh-600 hover:bg-fresh-50 border-fresh-200"}`}>
                        {u.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                    </div>
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
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
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

              {formData.role === 'delivery' && (
                <div>
                  <label className="label">Delivery Zones</label>
                  <div className="max-h-40 overflow-y-auto space-y-2 border border-gray-100 p-3 rounded-xl bg-gray-50 mt-1">
                    {allZones.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-2">No zones found.</p>
                    ) : (
                      allZones.map(z => (
                        <label key={z.id} className="flex items-center gap-3 p-2 bg-white rounded-lg shadow-sm border border-gray-100 cursor-pointer hover:border-fresh-300">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 text-fresh-600 rounded border-gray-300 focus:ring-fresh-500"
                            checked={formData.delivery_zones.includes(z.name)}
                            onChange={() => {
                              const selected = formData.delivery_zones.includes(z.name);
                              setFormData({
                                ...formData,
                                delivery_zones: selected 
                                  ? formData.delivery_zones.filter(zone => zone !== z.name)
                                  : [...formData.delivery_zones, z.name]
                              });
                            }}
                          />
                          <span className="text-sm font-medium text-gray-800">{z.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
              
              <button type="submit" disabled={creating} className="btn-primary w-full mt-2">
                {creating ? "Creating..." : "Create Verified User"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* View User Details Modal */}
      {isViewModalOpen && selectedViewUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">User Details</h2>
              <button onClick={() => { setIsViewModalOpen(false); setSelectedViewUser(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Name</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedViewUser.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Phone</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedViewUser.phone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Email</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedViewUser.email || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Role</p>
                  <p className="text-sm font-semibold text-gray-900 capitalize">{selectedViewUser.role || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Status</p>
                  <p className="text-sm font-semibold text-gray-900 capitalize">{selectedViewUser.status || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Wallet Balance</p>
                  <p className="text-sm font-semibold text-fresh-600">₹{parseFloat(selectedViewUser.wallet_balance || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Due Amount</p>
                  <p className="text-sm font-semibold text-red-600">₹{parseFloat(selectedViewUser.due_amount || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Created At</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedViewUser.created_at ? new Date(selectedViewUser.created_at).toLocaleDateString() : "N/A"}
                  </p>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-3">All Raw Details</h3>
                <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-xs text-gray-700 font-mono">
                  <pre>{JSON.stringify(selectedViewUser, null, 2)}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Zone Modal */}
      {isDeliveryZoneModalOpen && deliveryZoneUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Assign Delivery Zones</h2>
              <button onClick={() => setIsDeliveryZoneModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">Select zones for delivery boy <b>{deliveryZoneUser.name}</b></p>
            
            <form onSubmit={handleSaveDeliveryZones} className="space-y-4">
              <div className="max-h-60 overflow-y-auto space-y-2 border border-gray-100 p-3 rounded-xl bg-gray-50">
                {allZones.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">No zones found.</p>
                ) : (
                  allZones.map(z => (
                    <label key={z.id} className="flex items-center gap-3 p-2 bg-white rounded-lg shadow-sm border border-gray-100 cursor-pointer hover:border-fresh-300">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-fresh-600 rounded border-gray-300 focus:ring-fresh-500"
                        checked={selectedDeliveryZones.includes(z.name)}
                        onChange={() => toggleZoneSelection(z.name)}
                      />
                      <span className="text-sm font-medium text-gray-800">{z.name}</span>
                    </label>
                  ))
                )}
              </div>
              
              <button type="submit" disabled={savingZones} className="btn-primary w-full mt-2">
                {savingZones ? "Saving..." : "Save Zones"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
