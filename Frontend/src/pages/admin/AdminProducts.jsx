import { useEffect, useState } from "react";
import api from "../../api/axios";

const CATEGORIES = ["vegetable", "fruit", "water", "exotic", "salad"];
const UNITS = ["gm", "ml", "piece"];

const emptyForm = { name: "", category: "vegetable", sub_category: "", purchase_price_per_gm: "", selling_price_per_gm: "", unit: "gm" };

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  const fetchProducts = () => {
    api.get("/products").then(r => setProducts(r.data.products || [])).finally(() => setLoading(false));
  };
  useEffect(fetchProducts, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    const payload = {
      name: form.name,
      category: form.category,
      sub_category: form.sub_category,
      purchase_price_per_gm: parseFloat(form.purchase_price_per_gm),
      selling_price_per_gm: parseFloat(form.selling_price_per_gm),
      unit: form.unit
    };

    try {
      if (editing) {
        await api.put(`/products/${editing}`, payload);
        setMsg("✅ Product updated");
      } else {
        await api.post("/products", payload);
        setMsg("✅ Product created");
      }
      setForm(emptyForm); setEditing(null); fetchProducts();
    } catch (err) { setMsg(`❌ ${err.response?.data?.message}`); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Deactivate this product?")) return;
    try { await api.delete(`/products/${id}`); setMsg("✅ Product deactivated"); fetchProducts(); }
    catch (err) { setMsg(`❌ ${err.response?.data?.message}`); }
  };

  const startEdit = (p) => {
    setEditing(p.id);
    setForm({
      name: p.name,
      category: p.category,
      sub_category: p.sub_category || "",
      purchase_price_per_gm: p.purchase_price_per_gm,
      selling_price_per_gm: p.selling_price_per_gm,
      unit: p.unit
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredProducts = products.filter(p => filterCategory === "all" || p.category === filterCategory);

  const profit = form.selling_price_per_gm && form.purchase_price_per_gm
    ? (((form.selling_price_per_gm - form.purchase_price_per_gm) / form.selling_price_per_gm) * 100).toFixed(1)
    : null;

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-header">Products 🥦</h1>
        <p className="page-sub">Manage your product catalog</p>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm ${msg.startsWith("✅") ? "bg-fresh-900/30 text-fresh-400 border border-fresh-700/50" : "bg-red-900/30 text-red-400 border border-red-700/50"}`}>
          {msg}
        </div>
      )}

      {/* Form */}
      <div className="card">
        <h3 className="font-semibold text-white mb-5">{editing ? "Edit Product" : "Add New Product"}</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="label">Product Name</label>
            <input className="input" placeholder={form.category === "water" ? "Alkaline Health Water (Glass)" : "Tomato"} value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Sub-Category</label>
            <input className="input" placeholder={form.category === "water" ? "glass / plastic" : "leafy, root, tropical..."} value={form.sub_category} onChange={e => setForm({...form, sub_category: e.target.value})} />
          </div>
          <div>
            <label className="label">{form.category === "water" ? "Purchase Price per Bottle (₹)" : "Purchase Price/gm (₹)"}</label>
            <input type="number" step="0.001" className="input" placeholder="15.00" value={form.purchase_price_per_gm} onChange={e => setForm({...form, purchase_price_per_gm: e.target.value})} required />
          </div>
          <div>
            <label className="label">{form.category === "water" ? "Selling Price per Bottle (₹)" : "Selling Price/gm (₹)"}</label>
            <input type="number" step="0.001" className="input" placeholder="20.00" value={form.selling_price_per_gm} onChange={e => setForm({...form, selling_price_per_gm: e.target.value})} required />
          </div>
          <div>
            <label className="label">Unit</label>
            <select className="input" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="md:col-span-2 lg:col-span-3 flex items-center gap-4">
            <button type="submit" className="btn-primary px-8">{editing ? "Update Product" : "Add Product"}</button>
            {editing && <button type="button" onClick={() => { setEditing(null); setForm(emptyForm); }} className="btn-secondary">Cancel</button>}
            {profit && <span className="text-fresh-400 text-sm">Profit margin: <strong>{profit}%</strong></span>}
          </div>
        </form>
      </div>

      {/* Products table */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-gray-800">
          <h3 className="font-semibold text-white">All Products ({filteredProducts.length})</h3>
          
          {/* Category filter tabs */}
          <div className="flex flex-wrap gap-1 bg-gray-850 p-1 rounded-xl border border-gray-800">
            {["all", "vegetable", "fruit", "water", "exotic", "salad"].map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setFilterCategory(c)}
                className={`px-3 py-1.5 text-xs font-semibold capitalize rounded-lg transition-all ${
                  filterCategory === c ? "bg-fresh-600 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                {c === "all" ? "All" : c}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="text-left p-3 rounded-tl-xl">Name</th>
                <th className="text-left p-3">Category</th>
                <th className="text-right p-3">Buy Price</th>
                <th className="text-right p-3">Sell Price</th>
                <th className="text-right p-3">Margin</th>
                <th className="text-right p-3">Unit</th>
                <th className="text-center p-3">Status</th>
                <th className="text-right p-3 rounded-tr-xl">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => {
                const margin = p.selling_price_per_gm && p.purchase_price_per_gm
                  ? (((p.selling_price_per_gm - p.purchase_price_per_gm) / p.selling_price_per_gm) * 100).toFixed(1)
                  : "—";
                return (
                  <tr key={p.id} className="table-row">
                    <td className="p-3 text-white font-medium">{p.name}</td>
                    <td className="p-3"><span className="badge-blue badge">{p.category}</span></td>
                    <td className="p-3 text-right text-gray-400">₹{p.purchase_price_per_gm}</td>
                    <td className="p-3 text-right text-gray-300">₹{p.selling_price_per_gm}</td>
                    <td className="p-3 text-right text-fresh-400">{margin}%</td>
                    <td className="p-3 text-right text-gray-500">{p.unit}</td>
                    <td className="p-3 text-center"><span className={p.status === "active" ? "badge-green" : "badge-red"}>{p.status}</span></td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => startEdit(p)} className="text-xs text-fresh-400 hover:text-fresh-300 font-medium">Edit</button>
                        <button onClick={() => handleDelete(p.id)} className="text-xs text-red-400 hover:text-red-300 font-medium">Delete</button>
                      </div>
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
