import { useEffect, useState } from "react";
import api from "../../../api/axios";
import { Edit2, Trash2, Plus, AlertCircle, X, AlignLeft } from "lucide-react";

export default function AdminSubCategories() {
  const [subCategories, setSubCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", category_id: "", description: "", status: "active" });
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState("");
  const [showModal, setShowModal] = useState(false);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get("/sub-categories"),
      api.get("/categories")
    ])
    .then(([subRes, catRes]) => {
      setSubCategories(subRes.data.subCategories || []);
      setCategories(catRes.data.categories || []);
    })
    .catch(err => console.error("Failed to fetch data:", err))
    .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      if (editing) {
        await api.put(`/sub-categories/${editing}`, form);
        setMsg("✅ Sub Category updated successfully");
      } else {
        await api.post("/sub-categories", form);
        setMsg("✅ Sub Category created successfully");
      }
      closeModal();
      fetchData();
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.message || "Something went wrong"}`);
    }
  };

  const openModalForEdit = (subCat) => {
    setEditing(subCat.id);
    setForm({
      name: subCat.name,
      category_id: subCat.category_id || "",
      description: subCat.description || "",
      status: subCat.status
    });
    setMsg("");
    setShowModal(true);
  };

  const openModalForAdd = () => {
    setEditing(null);
    setForm({ name: "", category_id: categories.length > 0 ? categories[0].id : "", description: "", status: "active" });
    setMsg("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm({ name: "", category_id: "", description: "", status: "active" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this sub-category?")) return;
    try {
      await api.delete(`/sub-categories/${id}`);
      setMsg("✅ Sub Category deleted successfully");
      fetchData();
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.message || "Failed to delete sub-category"}`);
    }
  };

  const getCategoryName = (id) => {
    const cat = categories.find(c => c.id === id);
    return cat ? cat.name : "Uncategorized";
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Sub Category Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage sub-categories linked to your main categories</p>
        </div>
        <button 
          onClick={openModalForAdd}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          <span>Add Sub Category</span>
        </button>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl text-sm font-medium border flex items-center gap-2 ${msg.startsWith("✅") ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          <AlertCircle size={18} />
          {msg}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 font-medium">Loading sub-categories...</div>
        ) : subCategories.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-medium">No sub-categories found. Create one above!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-sm font-semibold text-gray-600">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Parent Category</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {subCategories.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 text-sm font-medium text-gray-500">#{c.id}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900 flex items-center gap-2">
                       <AlignLeft size={16} className="text-indigo-500" />
                       {c.name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-md text-sm font-semibold border border-indigo-100">
                        {getCategoryName(c.category_id)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{c.description || "-"}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {c.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openModalForEdit(c)}
                          className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">{editing ? "Edit Sub Category" : "Add New Sub Category"}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Sub Category Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={form.name} 
                  onChange={e => handleFormChange("name", e.target.value)} 
                  className="input-field" 
                  placeholder="e.g. Exotic Vegetables"
                  required 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Parent Category <span className="text-red-500">*</span></label>
                <select 
                  value={form.category_id} 
                  onChange={e => handleFormChange("category_id", e.target.value)} 
                  className="input-field"
                  required
                >
                  <option value="" disabled>Select a Category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Description</label>
                <textarea 
                  value={form.description} 
                  onChange={e => handleFormChange("description", e.target.value)} 
                  className="input-field min-h-[100px]" 
                  placeholder="Sub category details..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Status</label>
                <select 
                  value={form.status} 
                  onChange={e => handleFormChange("status", e.target.value)} 
                  className="input-field"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={closeModal} className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-6 py-2.5">
                  {editing ? "Save Changes" : "Create Sub Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
