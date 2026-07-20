import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AdminUserAddresses() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    user_id: "",
    address_line: "",
    city: "Nagpur",
    pincode: "",
    landmark: "",
    zone: ""
  });

  const fetchUsers = () => {
    api.get("/admin/users")
      .then(r => setUsers(r.data.users || []))
      .catch(err => setMsg(`❌ ${err.response?.data?.message || err.message}`))
      .finally(() => setLoading(false));
  };
  
  useEffect(fetchUsers, []);

  const handleAddAddress = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      await api.post("/addresses/admin/create", formData);
      setMsg("✅ Address added successfully!");
      setShowModal(false);
      setFormData({ user_id: "", address_line: "", city: "Nagpur", pincode: "", landmark: "", zone: "" });
      fetchUsers();
    } catch (err) {
      setMsg(`❌ Failed to add address: ${err.response?.data?.message || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-600">Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="page-header">User Addresses 📍</h1>
          <p className="page-sub">View all users and their registered addresses</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary text-sm">
          ➕ Create Address for User
        </button>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm border ${msg.includes('✅') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
          {msg}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Create Address for User</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✖</button>
            </div>
            <form onSubmit={handleAddAddress} className="p-6 space-y-4">
              <div>
                <label className="label text-xs uppercase tracking-wider mb-1 block">Select User</label>
                <select 
                  className="input w-full text-sm" 
                  value={formData.user_id} 
                  onChange={e => setFormData({...formData, user_id: e.target.value})}
                  required
                >
                  <option value="">-- Choose User --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.phone})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label text-xs uppercase tracking-wider mb-1 block">Address Line</label>
                <textarea 
                  className="input w-full text-sm" 
                  rows="2"
                  value={formData.address_line} 
                  onChange={e => setFormData({...formData, address_line: e.target.value})}
                  required
                ></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs uppercase tracking-wider mb-1 block">City</label>
                  <input type="text" className="input w-full text-sm" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} required />
                </div>
                <div>
                  <label className="label text-xs uppercase tracking-wider mb-1 block">Pincode</label>
                  <input type="text" className="input w-full text-sm" value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs uppercase tracking-wider mb-1 block">Landmark</label>
                  <input type="text" className="input w-full text-sm" value={formData.landmark} onChange={e => setFormData({...formData, landmark: e.target.value})} />
                </div>
                <div>
                  <label className="label text-xs uppercase tracking-wider mb-1 block">Zone (Optional)</label>
                  <input type="text" className="input w-full text-sm" value={formData.zone} onChange={e => setFormData({...formData, zone: e.target.value})} />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary text-sm px-6">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary text-sm px-6">
                  {saving ? "Saving..." : "Save Address"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="text-left p-3 rounded-tl-xl">User Name</th>
                <th className="text-left p-3">Phone</th>
                <th className="text-left p-3">Role</th>
                <th className="text-left p-3">Addresses</th>
                <th className="text-left p-3 rounded-tr-xl">Coordinates (Lat, Lng)</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const addresses = u.Addresses || [];
                
                return (
                  <tr key={u.id} className="table-row">
                    <td className="p-3 text-gray-900 font-medium align-top">{u.name}</td>
                    <td className="p-3 text-gray-600 align-top">{u.phone}</td>
                    <td className="p-3 align-top">
                      <span className={`badge ${u.role === "admin" ? "badge-red" : u.role === "delivery" ? "badge-blue" : "badge-green"}`}>{u.role}</span>
                    </td>
                    <td className="p-3 text-gray-700 align-top">
                      {addresses.length === 0 ? (
                        <span className="text-gray-500 italic">No addresses found</span>
                      ) : (
                        <ul className="space-y-2">
                          {addresses.map(addr => (
                            <li key={addr.id} className="pb-2 border-b border-gray-200 last:border-0 last:pb-0">
                              <p className="font-medium text-gray-900">{addr.address_line}</p>
                              <p className="text-xs text-gray-600">{addr.city} - {addr.pincode}</p>
                              {addr.landmark && <p className="text-xs text-gray-500">Landmark: {addr.landmark}</p>}
                              {addr.is_default && <span className="text-[10px] bg-fresh-100 text-fresh-600 px-2 py-0.5 rounded-full mt-1 inline-block">Default</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="p-3 text-gray-600 align-top">
                      {addresses.length === 0 ? (
                        "—"
                      ) : (
                        <ul className="space-y-2">
                          {addresses.map(addr => (
                            <li key={addr.id} className="pb-2 border-b border-gray-200 last:border-0 last:pb-0">
                                {addr.latitude && addr.longitude ? (
                                    <div className="flex items-center gap-2">
                                        <a 
                                            href={`https://www.google.com/maps/search/?api=1&query=${addr.latitude},${addr.longitude}`} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="text-fresh-600 hover:underline"
                                        >
                                            {addr.latitude}, {addr.longitude}
                                        </a>
                                    </div>
                                ) : (
                                    <span className="text-gray-500">Not set</span>
                                )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
