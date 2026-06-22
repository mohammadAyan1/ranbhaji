import { useEffect, useState } from "react";
import api from "../../api/axios";

const CATEGORIES = ["vegetable", "fruit", "water", "exotic", "salad"];
const UNITS = ["gm", "ml", "piece"];

const emptyForm = {
  name: "", category: "vegetable", sub_category: "",
  purchase_price_input: "", selling_price_input: "", unit: "gm"
};

// Helper: kya is category/unit ke liye per-kg toggle dikhana chahiye?
const showKgToggle = (category, unit) =>
  category !== "water" && unit === "gm";

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  // 🆕 Price unit toggle: "kg" (default) ya "gm"
  const [priceUnit, setPriceUnit] = useState("kg");

  const fetchProducts = () => {
    api.get("/products").then(r => setProducts(r.data.products || [])).finally(() => setLoading(false));
  };
  useEffect(fetchProducts, []);

  // Category/unit change hone pe priceUnit reset karo
  const handleFormChange = (field, value) => {
    const updated = { ...form, [field]: value };

    // Agar category ya unit change hui — priceUnit reset
    if (field === "category" || field === "unit") {
      const cat = field === "category" ? value : form.category;
      const unt = field === "unit" ? value : form.unit;
      if (!showKgToggle(cat, unt)) {
        setPriceUnit("gm"); // water/piece ke liye force gm
      }
      // Reset price inputs on category change
      if (field === "category") {
        updated.purchase_price_input = "";
        updated.selling_price_input = "";
      }
    }
    setForm(updated);
  };

  // Submit pe conversion: kg → gm (divide by 1000) agar priceUnit === "kg"
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    const purchaseInput = parseFloat(form.purchase_price_input);
    const sellingInput = parseFloat(form.selling_price_input);

    const useKg = showKgToggle(form.category, form.unit) && priceUnit === "kg";
    const purchase_price_per_gm = useKg ? purchaseInput / 1000 : purchaseInput;
    const selling_price_per_gm = useKg ? sellingInput / 1000 : sellingInput;

    const payload = {
      name: form.name,
      category: form.category,
      sub_category: form.sub_category,
      purchase_price_per_gm,
      selling_price_per_gm,
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
      setForm(emptyForm);
      setEditing(null);
      setPriceUnit("kg");
      fetchProducts();
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Deactivate this product?")) return;
    try {
      await api.delete(`/products/${id}`);
      setMsg("✅ Product deactivated");
      fetchProducts();
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.message}`);
    }
  };

  // Edit mode: backend se per_gm aata hai → display ke liye per_kg mein convert karo
  const startEdit = (p) => {
    setEditing(p.id);
    const cat = p.category;
    const unt = p.unit;
    const canUseKg = showKgToggle(cat, unt);

    // Default: kg mode mein dikho (agar applicable)
    const mode = canUseKg ? "kg" : "gm";
    setPriceUnit(mode);

    setForm({
      name: p.name,
      category: cat,
      sub_category: p.sub_category || "",
      // Reverse conversion: per_gm × 1000 = per_kg
      purchase_price_input: canUseKg
        ? (parseFloat(p.purchase_price_per_gm) * 1000).toFixed(2)
        : p.purchase_price_per_gm,
      selling_price_input: canUseKg
        ? (parseFloat(p.selling_price_per_gm) * 1000).toFixed(2)
        : p.selling_price_per_gm,
      unit: unt
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredProducts = products.filter(p => filterCategory === "all" || p.category === filterCategory);

  // Live preview calculations
  const purchaseInput = parseFloat(form.purchase_price_input) || 0;
  const sellingInput = parseFloat(form.selling_price_input) || 0;
  const useKgMode = showKgToggle(form.category, form.unit) && priceUnit === "kg";

  const purchasePerGm = useKgMode ? purchaseInput / 1000 : purchaseInput;
  const sellingPerGm = useKgMode ? sellingInput / 1000 : sellingInput;
  const purchasePerKg = useKgMode ? purchaseInput : purchaseInput * 1000;
  const sellingPerKg = useKgMode ? sellingInput : sellingInput * 1000;

  const profit = sellingInput && purchaseInput
    ? (((sellingPerGm - purchasePerGm) / sellingPerGm) * 100).toFixed(1)
    : null;

  // Label for price inputs
  const isWater = form.category === "water";
  const isPiece = form.unit === "piece";
  const priceLabel = isWater
    ? "Price per Bottle (₹)"
    : isPiece
      ? "Price per Piece (₹)"
      : `Price / ${priceUnit === "kg" ? "kg" : "gm"} (₹)`;

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

      {/* ─── FORM ─────────────────────────────────────────────────── */}
      <div className="card">
        <h3 className="font-semibold text-white mb-5">{editing ? "Edit Product" : "Add New Product"}</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Product Name */}
          <div>
            <label className="label">Product Name</label>
            <input
              className="input"
              placeholder={isWater ? "Alkaline Health Water (Glass)" : "Tomato"}
              value={form.name}
              onChange={e => handleFormChange("name", e.target.value)}
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={e => handleFormChange("category", e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Sub-Category */}
          <div>
            <label className="label">Sub-Category</label>
            <input
              className="input"
              placeholder={isWater ? "glass / plastic" : "leafy, root, tropical..."}
              value={form.sub_category}
              onChange={e => handleFormChange("sub_category", e.target.value)}
            />
          </div>

          {/* Purchase Price */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">
                {isWater ? "Purchase Price per Bottle (₹)" : isPiece ? "Purchase Price per Piece (₹)" : `Purchase ${priceLabel}`}
              </label>
              {/* KG/GM Toggle — sirf gm unit wale non-water products ke liye */}
              {showKgToggle(form.category, form.unit) && (
                <div className="flex items-center bg-gray-800 rounded-lg p-0.5 border border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      // Switch karte samay convert karo value bhi
                      if (priceUnit === "kg") {
                        // kg → gm: divide by 1000
                        const newPurchase = purchaseInput ? (purchaseInput / 1000).toFixed(4) : "";
                        const newSelling = sellingInput ? (sellingInput / 1000).toFixed(4) : "";
                        setForm(f => ({ ...f, purchase_price_input: newPurchase, selling_price_input: newSelling }));
                      } else {
                        // gm → kg: multiply by 1000
                        const newPurchase = purchaseInput ? (purchaseInput * 1000).toFixed(2) : "";
                        const newSelling = sellingInput ? (sellingInput * 1000).toFixed(2) : "";
                        setForm(f => ({ ...f, purchase_price_input: newPurchase, selling_price_input: newSelling }));
                      }
                      setPriceUnit(p => p === "kg" ? "gm" : "kg");
                    }}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all duration-200 ${priceUnit === "kg"
                      ? "bg-fresh-600 text-white"
                      : "text-gray-400 hover:text-white"
                      }`}
                  >
                    /kg
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (priceUnit === "gm") return;
                      const newPurchase = purchaseInput ? (purchaseInput / 1000).toFixed(4) : "";
                      const newSelling = sellingInput ? (sellingInput / 1000).toFixed(4) : "";
                      setForm(f => ({ ...f, purchase_price_input: newPurchase, selling_price_input: newSelling }));
                      setPriceUnit("gm");
                    }}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all duration-200 ${priceUnit === "gm"
                      ? "bg-gray-600 text-white"
                      : "text-gray-400 hover:text-white"
                      }`}
                  >
                    /gm
                  </button>
                </div>
              )}
            </div>
            <input
              type="number"
              step="0.0001"
              min="0"
              className="input"
              placeholder={useKgMode ? "e.g. 15 (per kg)" : "e.g. 0.015 (per gm)"}
              value={form.purchase_price_input}
              onChange={e => handleFormChange("purchase_price_input", e.target.value)}
              required
            />
            {/* Live preview */}
            {purchaseInput > 0 && showKgToggle(form.category, form.unit) && (
              <p className="text-[10px] text-gray-500 mt-1">
                {priceUnit === "kg"
                  ? <span>₹{purchaseInput}/kg → <span className="text-fresh-400 font-semibold">₹{purchasePerGm.toFixed(4)}/gm</span> (stored)</span>
                  : <span>₹{purchaseInput}/gm → <span className="text-blue-400 font-semibold">₹{purchasePerKg.toFixed(2)}/kg</span></span>
                }
              </p>
            )}
          </div>

          {/* Selling Price */}
          <div>
            <label className="label">
              {isWater ? "Selling Price per Bottle (₹)" : isPiece ? "Selling Price per Piece (₹)" : `Selling ${priceLabel}`}
            </label>
            <input
              type="number"
              step="0.0001"
              min="0"
              className="input"
              placeholder={useKgMode ? "e.g. 20 (per kg)" : "e.g. 0.020 (per gm)"}
              value={form.selling_price_input}
              onChange={e => handleFormChange("selling_price_input", e.target.value)}
              required
            />
            {/* Live preview */}
            {sellingInput > 0 && showKgToggle(form.category, form.unit) && (
              <p className="text-[10px] text-gray-500 mt-1">
                {priceUnit === "kg"
                  ? <span>₹{sellingInput}/kg → <span className="text-fresh-400 font-semibold">₹{sellingPerGm.toFixed(4)}/gm</span> (stored)</span>
                  : <span>₹{sellingInput}/gm → <span className="text-blue-400 font-semibold">₹{sellingPerKg.toFixed(2)}/kg</span></span>
                }
              </p>
            )}
          </div>

          {/* Unit */}
          <div>
            <label className="label">Unit</label>
            <select className="input" value={form.unit} onChange={e => handleFormChange("unit", e.target.value)}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          {/* Submit row */}
          <div className="md:col-span-2 lg:col-span-3 flex flex-wrap items-center gap-4">
            <button type="submit" className="btn-primary px-8">
              {editing ? "Update Product" : "Add Product"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => { setEditing(null); setForm(emptyForm); setPriceUnit("kg"); }}
                className="btn-secondary"
              >
                Cancel
              </button>
            )}
            {profit && (
              <span className="text-fresh-400 text-sm">
                Profit margin: <strong>{profit}%</strong>
              </span>
            )}
            {/* Summary box — dono units mein */}
            {purchaseInput > 0 && sellingInput > 0 && showKgToggle(form.category, form.unit) && (
              <div className="ml-auto bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-2 text-xs flex gap-6">
                <div>
                  <p className="text-gray-500 uppercase tracking-wider">Purchase</p>
                  <p className="text-white font-semibold">
                    ₹{purchasePerKg.toFixed(2)}<span className="text-gray-500">/kg</span>
                    <span className="text-gray-600 mx-1">·</span>
                    ₹{purchasePerGm.toFixed(4)}<span className="text-gray-500">/gm</span>
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase tracking-wider">Selling</p>
                  <p className="text-white font-semibold">
                    ₹{sellingPerKg.toFixed(2)}<span className="text-gray-500">/kg</span>
                    <span className="text-gray-600 mx-1">·</span>
                    ₹{sellingPerGm.toFixed(4)}<span className="text-gray-500">/gm</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* ─── PRODUCTS TABLE ───────────────────────────────────────── */}
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
                className={`px-3 py-1.5 text-xs font-semibold capitalize rounded-lg transition-all ${filterCategory === c ? "bg-fresh-600 text-white" : "text-gray-400 hover:text-white"
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

                // Per kg values (non-water, gm unit only)
                const canShowKg = p.unit === "gm" && p.category !== "water";
                const buyPerKg = canShowKg ? (parseFloat(p.purchase_price_per_gm) * 1000).toFixed(2) : null;
                const sellPerKg = canShowKg ? (parseFloat(p.selling_price_per_gm) * 1000).toFixed(2) : null;

                return (
                  <tr key={p.id} className="table-row">
                    <td className="p-3 text-white font-medium">{p.name}</td>
                    <td className="p-3"><span className="badge-blue badge">{p.category}</span></td>
                    <td className="p-3 text-right">
                      <p className="text-gray-400">₹{p.purchase_price_per_gm}<span className="text-gray-600 text-[10px]">/gm</span></p>
                      {buyPerKg && <p className="text-gray-600 text-[10px]">₹{buyPerKg}/kg</p>}
                    </td>
                    <td className="p-3 text-right">
                      <p className="text-gray-300">₹{p.selling_price_per_gm}<span className="text-gray-500 text-[10px]">/gm</span></p>
                      {sellPerKg && <p className="text-gray-600 text-[10px]">₹{sellPerKg}/kg</p>}
                    </td>
                    <td className="p-3 text-right text-fresh-400">{margin}%</td>
                    <td className="p-3 text-right text-gray-500">{p.unit}</td>
                    <td className="p-3 text-center">
                      <span className={p.status === "active" ? "badge-green" : "badge-red"}>{p.status}</span>
                    </td>
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
