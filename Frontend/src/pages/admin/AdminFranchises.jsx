import { useEffect, useState } from "react";
import { Plus, X, Search } from "lucide-react";
import api from "../../api/axios";

export default function AdminFranchises() {
  const [franchises, setFranchises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFranchise, setEditingFranchise] = useState(null);
  
  const [formData, setFormData] = useState({
    full_name: "",
    mobile_number: "",
    email: "",
    city: "",
    investment_capacity: "",
    message: ""
  });
  const [saving, setSaving] = useState(false);

  const fetchFranchises = () => {
    api.get("/franchises").then(r => setFranchises(r.data.franchises || [])).finally(() => setLoading(false));
  };
  useEffect(fetchFranchises, []);

  const toggleStatus = async (franchise) => {
    const newStatus = franchise.status === "active" ? "inactive" : "active";
    try {
      await api.patch(`/franchises/${franchise.id}/status`, { status: newStatus });
      setMsg(`✅ Franchise ${newStatus}`);
      fetchFranchises();
    } catch (err) { setMsg(`❌ ${err.response?.data?.message || err.message}`); }
  };

  const handleSaveFranchise = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      if (editingFranchise) {
        await api.put(`/franchises/${editingFranchise.id}`, formData);
        setMsg(`✅ Franchise ${formData.full_name} updated successfully.`);
      } else {
        await api.post("/franchises/apply", formData);
        setMsg(`✅ Franchise ${formData.full_name} created successfully.`);
      }
      setIsModalOpen(false);
      setEditingFranchise(null);
      setFormData({ full_name: "", mobile_number: "", email: "", city: "", investment_capacity: "", message: "" });
      fetchFranchises();
    } catch (err) {
      setMsg(`❌ Failed to save franchise: ${err.response?.data?.message || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (franchise) => {
    setEditingFranchise(franchise);
    setFormData({
      full_name: franchise.full_name,
      mobile_number: franchise.mobile_number,
      email: franchise.email || "",
      city: franchise.city,
      investment_capacity: franchise.investment_capacity || "",
      message: franchise.message || ""
    });
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingFranchise(null);
    setFormData({ full_name: "", mobile_number: "", email: "", city: "", investment_capacity: "", message: "" });
    setIsModalOpen(true);
  };

  const filteredFranchises = franchises.filter(f => {
    if (filterStatus !== "all" && f.status !== filterStatus) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    const name = (f.full_name || "").toLowerCase();
    const phone = (f.mobile_number || "").toLowerCase();
    const city = (f.city || "").toLowerCase();
    const email = (f.email || "").toLowerCase();
    const cap = (f.investment_capacity || "").toLowerCase();
    const msg = (f.message || "").toLowerCase();

    return name.includes(q) || phone.includes(q) || city.includes(q) || email.includes(q) || cap.includes(q) || msg.includes(q);
  });

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-600">Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center flex-wrap gap-4">
        <div>
          <h1 className="page-header">Franchise Partners 🏬</h1>
          <p className="page-sub">Manage franchise applications and active partners</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap w-full lg:w-auto">
          {/* Live Search Bar */}
          <div className="relative min-w-[220px] max-w-xs w-full sm:w-auto">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search name, phone, city..." 
              className="w-full pl-10 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-gray-800 placeholder-gray-400 shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <select 
            className="input text-sm py-2" 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button onClick={openCreateModal} className="btn-primary text-sm flex items-center gap-2 whitespace-nowrap">
            <Plus size={16} /> Add Franchise
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
                <th className="text-left p-3">City</th>
                <th className="text-left p-3">Package</th>
                <th className="text-center p-3">Status</th>
                <th className="text-right p-3 rounded-tr-xl">Action</th>
              </tr>
            </thead>
            <tbody>
              {franchises.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-500">No franchises found.</td>
                </tr>
              ) : filteredFranchises.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-500">
                    No franchises matching "<span className="text-gray-800 font-semibold">{search}</span>"
                  </td>
                </tr>
              ) : (
                filteredFranchises.map(f => (
                  <tr key={f.id} className="table-row">
                    <td className="p-3">
                      <p className="font-medium text-gray-900">{f.full_name}</p>
                      <p className="text-xs text-gray-500">{f.email || "—"}</p>
                    </td>
                    <td className="p-3 text-gray-600 font-mono">{f.mobile_number}</td>
                    <td className="p-3 text-gray-700 font-medium">{f.city}</td>
                    <td className="p-3 text-gray-700 text-xs">
                      {f.investment_capacity || "—"}
                    </td>
                    <td className="p-3 text-center">
                      <span className={f.status === "active" ? "badge-green" : "badge-red"}>{f.status}</span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2 items-center">
                        <button onClick={() => openEditModal(f)} className="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1">
                          Edit
                        </button>
                        <button onClick={() => toggleStatus(f)}
                          className={`text-xs font-medium px-3 py-1 rounded-full border ${f.status === "active" ? "text-red-600 hover:bg-red-50 border-red-200" : "text-fresh-600 hover:bg-fresh-50 border-fresh-200"}`}>
                          {f.status === "active" ? "Deactivate" : "Approve"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Franchise Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">{editingFranchise ? "Edit Franchise" : "Add Franchise"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveFranchise} className="space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input type="text" className="input" required value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
              </div>
              <div>
                <label className="label">Mobile Number *</label>
                <input type="text" className="input" required value={formData.mobile_number} onChange={e => setFormData({...formData, mobile_number: e.target.value})} />
              </div>
              <div>
                <label className="label">Email (Optional)</label>
                <input type="email" className="input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <label className="label">City *</label>
                <input type="text" className="input" required value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
              </div>
              <div>
                <label className="label">Investment Capacity (Package)</label>
                <input type="text" className="input" placeholder="e.g. 5-10 Lakhs" value={formData.investment_capacity} onChange={e => setFormData({...formData, investment_capacity: e.target.value})} />
              </div>
              <div>
                <label className="label">Message / Details</label>
                <textarea className="input min-h-[80px]" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})}></textarea>
              </div>
              
              <button type="submit" disabled={saving} className="btn-primary w-full mt-2">
                {saving ? "Saving..." : editingFranchise ? "Update Franchise" : "Create Franchise"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
