import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import api from "../../api/axios";

export default function AdminUnits() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", abbreviation: "", status: "active" });
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState("");

  const fetchUnits = () => {
    api.get("/units").then(r => setUnits(r.data.units || [])).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      if (editing) {
        await api.put(`/units/${editing}`, form);
        setMsg("✅ Unit updated successfully");
      } else {
        await api.post("/units", form);
        setMsg("✅ Unit created successfully");
      }
      setForm({ name: "", abbreviation: "", status: "active" });
      setEditing(null);
      fetchUnits();
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.message || "Something went wrong"}`);
    }
  };

  const startEdit = (unit) => {
    setEditing(unit.id);
    setForm({
      name: unit.name,
      abbreviation: unit.abbreviation,
      status: unit.status
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to deactivate this unit?")) return;
    try {
      await api.delete(`/units/${id}`);
      setMsg("✅ Unit deactivated successfully");
      fetchUnits();
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.message || "Failed to deactivate unit"}`);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-600">Loading units...</div>;

  const filteredUnits = units.filter(u => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.name || "").toLowerCase().includes(q) ||
      (u.abbreviation || "").toLowerCase().includes(q) ||
      String(u.id).includes(q) ||
      (u.status || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-header">Units Management ⚖️</h1>
        <p className="page-sub">Manage measurement units for products</p>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm ${msg.startsWith("✅") ? "bg-fresh-100/30 text-fresh-600 border border-fresh-700/50" : "bg-red-900/30 text-red-600 border border-red-700/50"}`}>
          {msg}
        </div>
      )}

      {/* Form Card */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-5">{editing ? "Edit Unit" : "Add New Unit"}</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Unit Name</label>
            <input
              className="input"
              placeholder="e.g. Kilogram"
              value={form.name}
              onChange={e => handleFormChange("name", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Abbreviation</label>
            <input
              className="input"
              placeholder="e.g. kg"
              value={form.abbreviation}
              onChange={e => handleFormChange("abbreviation", e.target.value)}
              required
            />
          </div>
          {editing && (
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => handleFormChange("status", e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}
          <div className="md:col-span-3 flex items-center gap-4 pt-3">
            <button type="submit" className="btn-primary px-8">
              {editing ? "Update Unit" : "Create Unit"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => { setEditing(null); setForm({ name: "", abbreviation: "", status: "active" }); }}
                className="btn-secondary"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Table Card */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-900">All Units</h3>
            <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-2.5 py-1 rounded-full">
              Showing {filteredUnits.length} of {units.length}
            </span>
          </div>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search units by name, abbrev, or ID..."
              className="w-full pl-10 pr-9 py-2 text-sm bg-gray-50/50 hover:bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-800 placeholder-gray-400 shadow-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="text-left p-3 rounded-tl-xl">ID</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Abbreviation</th>
                <th className="text-center p-3">Status</th>
                <th className="text-right p-3 rounded-tr-xl">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUnits.map(u => (
                <tr key={u.id} className="table-row">
                  <td className="p-3 text-gray-500">#{u.id}</td>
                  <td className="p-3 font-medium text-gray-900">{u.name}</td>
                  <td className="p-3 text-gray-600">{u.abbreviation}</td>
                  <td className="p-3 text-center">
                    <span className={u.status === "active" ? "badge-green" : "badge-red"}>{u.status}</span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => startEdit(u)} className="text-xs text-fresh-600 hover:text-fresh-700 font-medium">Edit</button>
                      <button onClick={() => handleDelete(u.id)} className="text-xs text-red-600 hover:text-red-300 font-medium">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {units.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-6 text-gray-500">No units found.</td>
                </tr>
              )}
              {units.length > 0 && filteredUnits.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-6 text-gray-500">
                    No units matching "<span className="text-gray-700 font-semibold">{search}</span>"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
