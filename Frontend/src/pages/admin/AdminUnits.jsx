import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AdminUnits() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
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
        <h3 className="font-semibold text-gray-900 mb-4 pb-4 border-b border-gray-200">All Units ({units.length})</h3>
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
              {units.map(u => (
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
