import { useEffect, useState } from "react";
import api from "../../api/axios";

const CATEGORIES = ["vegetable", "fruit", "water", "exotic", "salad"];
const UNITS = ["gm", "ml", "piece"];

const emptyForm = {
  name: "", hindi_name: "", category: "vegetable", sub_category: "",
  purchase_price_input: "", selling_price_input: "", unit: "gm", image: null
};

const showKgToggle = (category, unit) =>
  category !== "water" && unit === "gm";

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [priceUnit, setPriceUnit] = useState("kg");

  // Tabs: "catalog" | "purchase" | "stock" | "logs"
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || "catalog";
  });

  // Purchase Entry Form State
  const [demands, setDemands] = useState([]);
  const [completedDemands, setCompletedDemands] = useState([]);
  
  const [purchaseForm, setPurchaseForm] = useState({
    product_id: "",
    quantity: "",
    total_price: "",
    selling_price_per_kg: ""
  });
  const [purchaseLogs, setPurchaseLogs] = useState([]);
  const [stockSummary, setStockSummary] = useState([]);
  const [submittingPurchase, setSubmittingPurchase] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState(null);

  const fetchProducts = () => {
    api.get("/products").then(r => setProducts(r.data.products || [])).finally(() => setLoading(false));
  };

  const fetchPurchaseLogs = () => {
    api.get("/products/purchases").then(r => setPurchaseLogs(r.data.purchases || []));
  };

  const fetchStockSummary = () => {
    api.get("/products/stock-summary").then(r => setStockSummary(r.data.products || []));
  };

  const fetchDemands = () => {
    const today = new Date().toISOString().split('T')[0];
    api.get(`/admin/demands?date=${today}`).then(r => setDemands(r.data.demands || [])).catch(err => console.error(err));
  };

  useEffect(() => {
    fetchProducts();
    fetchPurchaseLogs();
    fetchStockSummary();
    fetchDemands();
  }, []);

  useEffect(() => {
    if (activeTab === "logs") fetchPurchaseLogs();
    if (activeTab === "stock") fetchStockSummary();
    if (activeTab === "catalog") fetchProducts();
    if (activeTab === "purchase") fetchDemands();
  }, [activeTab]);

  // Catalog Form Change
  const handleFormChange = (field, value) => {
    const updated = { ...form, [field]: value };
    if (field === "category" || field === "unit") {
      const cat = field === "category" ? value : form.category;
      const unt = field === "unit" ? value : form.unit;
      if (!showKgToggle(cat, unt)) {
        setPriceUnit("gm");
      }
      if (field === "category") {
        updated.purchase_price_input = "";
        updated.selling_price_input = "";
      }
    }
    setForm(updated);
  };

  // Submit Catalog Product
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    const purchaseInput = parseFloat(form.purchase_price_input);
    const sellingInput = parseFloat(form.selling_price_input);

    const useKg = showKgToggle(form.category, form.unit) && priceUnit === "kg";
    const purchase_price_per_gm = useKg ? purchaseInput / 1000 : purchaseInput;
    const selling_price_per_gm = useKg ? sellingInput / 1000 : sellingInput;

    const payload = new FormData();
    payload.append("name", form.name);
    payload.append("hindi_name", form.hindi_name || "");
    payload.append("category", form.category);
    payload.append("sub_category", form.sub_category || "");
    payload.append("purchase_price_per_gm", purchase_price_per_gm);
    payload.append("selling_price_per_gm", selling_price_per_gm);
    payload.append("unit", form.unit);
    if (form.image) {
      payload.append("image", form.image);
    }

    try {
      if (editing) {
        await api.put(`/products/${editing}`, payload, { headers: { "Content-Type": "multipart/form-data" } });
        setMsg("✅ Product updated");
      } else {
        await api.post("/products", payload, { headers: { "Content-Type": "multipart/form-data" } });
        setMsg("✅ Product created");
      }
      setForm(emptyForm);
      setEditing(null);
      setPriceUnit("kg");
      fetchProducts();
      fetchStockSummary();
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
      fetchStockSummary();
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.message}`);
    }
  };

  const startEdit = (p) => {
    setEditing(p.id);
    const cat = p.category;
    const unt = p.unit;
    const canUseKg = showKgToggle(cat, unt);
    const mode = canUseKg ? "kg" : "gm";
    setPriceUnit(mode);

    setForm({
      name: p.name,
      hindi_name: p.hindi_name || "",
      category: cat,
      sub_category: p.sub_category || "",
      purchase_price_input: canUseKg
        ? (parseFloat(p.purchase_price_per_gm) * 1000).toFixed(2)
        : p.purchase_price_per_gm,
      selling_price_input: canUseKg
        ? (parseFloat(p.selling_price_per_gm) * 1000).toFixed(2)
        : p.selling_price_per_gm,
      unit: unt,
      image: null
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const calculateActualAvg = (productId, productName, unit) => {
    const logs = purchaseLogs.filter(log => log.product_id === productId);
    if (logs.length === 0) {
      alert(`No purchase logs found for ${productName}.`);
      return;
    }
    const totalAmount = logs.reduce((sum, log) => sum + parseFloat(log.total_amount), 0);
    const totalQty = logs.reduce((sum, log) => sum + parseFloat(log.quantity), 0);
    const avgPerBase = totalAmount / totalQty;

    alert(`Actual Average Cost for ${productName}:\n₹${avgPerBase.toFixed(2)} per ${unit === 'piece' ? 'pc' : 'kg/L'}\n(Based on ${totalQty.toFixed(2)} total quantity and ₹${totalAmount.toFixed(2)} total cost)`);
  };

  // Submit Purchase Entry
  const handlePurchaseSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setSubmittingPurchase(true);

    try {
      const qty = parseFloat(purchaseForm.quantity);
      const total = parseFloat(purchaseForm.total_price);
      // Calculate per base unit price (per kg or per piece)
      let calculated_purchase_price = 0;
      if (qty > 0) {
        calculated_purchase_price = total / qty;
      }
      
      await api.post("/products/purchase", {
        product_id: parseInt(purchaseForm.product_id),
        quantity: qty,
        purchase_price_per_kg: calculated_purchase_price,
        selling_price_per_kg: parseFloat(purchaseForm.selling_price_per_kg) || 0
      });
      setMsg("✅ Purchase entry logged and stock updated!");
      setCompletedDemands([...completedDemands, parseInt(purchaseForm.product_id)]);
      setPurchaseForm({
        product_id: "",
        quantity: "",
        total_price: "",
        selling_price_per_kg: ""
      });
      fetchStockSummary();
      fetchPurchaseLogs();
      fetchDemands();
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.message || "Failed to log purchase"}`);
    } finally {
      setSubmittingPurchase(false);
    }
  };

  const filteredProducts = products.filter(p => filterCategory === "all" || p.category === filterCategory);

  // Live preview values
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

  const isWater = form.category === "water";
  const isPiece = form.unit === "piece";
  const priceLabel = isWater
    ? "Price per Bottle (₹)"
    : isPiece
      ? "Price per Piece (₹)"
      : `Price / ${priceUnit === "kg" ? "kg" : "gm"} (₹)`;

  // Helper for displaying quantity per unit (kg or count)
  const formatQuantity = (qtyInBase, unit) => {
    const qty = parseFloat(qtyInBase || 0);
    if (unit === 'gm' || unit === 'ml') {
      return `${(qty / 1000).toFixed(2)} ${unit === 'gm' ? 'kg' : 'L'}`;
    }
    return `${qty.toFixed(0)} pcs`;
  };

  const getPricePerKgDisplay = (pricePerBase, unit) => {
    const prc = parseFloat(pricePerBase || 0);
    if (unit === 'gm' || unit === 'ml') {
      return `₹${(prc * 1000).toFixed(2)} / ${unit === 'gm' ? 'kg' : 'L'}`;
    }
    return `₹${prc.toFixed(2)} / pc`;
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-600">Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="page-header">Products & Stock Inventory 🥦</h1>
          <p className="page-sub">Catalog and Stock Purchase logs management</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex overflow-x-auto bg-gray-100 p-1 rounded-xl border border-gray-300 w-full md:w-fit whitespace-nowrap">
          {[
            { id: "catalog", label: "Product Catalog", icon: "🥦" },
            { id: "purchase", label: "Log Purchase", icon: "➕" },
            { id: "stock", label: "Stock Inventory", icon: "📦" },
            { id: "logs", label: "Purchase Logs", icon: "📋" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setMsg(""); }}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === tab.id
                ? "bg-fresh-600 text-gray-900 shadow-md shadow-fresh-900/20"
                : "text-gray-600 hover:text-gray-900"
                }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm ${msg.startsWith("✅") ? "bg-fresh-100/30 text-fresh-600 border border-fresh-700/50" : "bg-red-900/30 text-red-600 border border-red-700/50"}`}>
          {msg}
        </div>
      )}

      {/* ─── TAB 1: CATALOG MANAGEMENT ───────────────────────────────── */}
      {activeTab === "catalog" && (
        <div className="space-y-6">
          {/* Form Card */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-5">{editing ? "Edit Product Details" : "Add New Product to System"}</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

              <div>
                <label className="label">Hindi Name (Optional)</label>
                <input
                  className="input"
                  placeholder="e.g. टमाटर"
                  value={form.hindi_name || ""}
                  onChange={e => handleFormChange("hindi_name", e.target.value)}
                />
              </div>

              <div>
                <label className="label">Product Image (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  className="block w-full text-sm text-gray-600
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-gray-700 file:text-gray-900
                    hover:file:bg-gray-600
                    cursor-pointer bg-white border border-gray-300 rounded-lg p-1.5 focus:border-fresh-500 focus:outline-none transition-colors"
                  onChange={e => handleFormChange("image", e.target.files[0])}
                />
              </div>

              <div>
                <label className="label">Category</label>
                <select className="input" value={form.category} onChange={e => handleFormChange("category", e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Sub-Category</label>
                <input
                  className="input"
                  placeholder={isWater ? "glass / plastic" : "leafy, root, tropical..."}
                  value={form.sub_category}
                  onChange={e => handleFormChange("sub_category", e.target.value)}
                />
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                  <label className="label mb-0">
                    {isWater ? "Avg Cost Price per Bottle (₹)" : isPiece ? "Avg Cost Price per Piece (₹)" : `Avg Cost ${priceLabel}`}
                  </label>
                  {showKgToggle(form.category, form.unit) && (
                    <div className="flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-300 w-fit">
                      <button
                        type="button"
                        onClick={() => {
                          if (priceUnit === "kg") {
                            const newPurchase = purchaseInput ? (purchaseInput / 1000).toFixed(4) : "";
                            const newSelling = sellingInput ? (sellingInput / 1000).toFixed(4) : "";
                            setForm(f => ({ ...f, purchase_price_input: newPurchase, selling_price_input: newSelling }));
                          } else {
                            const newPurchase = purchaseInput ? (purchaseInput * 1000).toFixed(2) : "";
                            const newSelling = sellingInput ? (sellingInput * 1000).toFixed(2) : "";
                            setForm(f => ({ ...f, purchase_price_input: newPurchase, selling_price_input: newSelling }));
                          }
                          setPriceUnit(p => p === "kg" ? "gm" : "kg");
                        }}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all duration-200 ${priceUnit === "kg" ? "bg-fresh-600 text-gray-900" : "text-gray-600 hover:text-gray-900"}`}
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
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all duration-200 ${priceUnit === "gm" ? "bg-gray-600 text-gray-900" : "text-gray-600 hover:text-gray-900"}`}
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
              </div>

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
              </div>

              <div>
                <label className="label">Unit</label>
                <select className="input" value={form.unit} onChange={e => handleFormChange("unit", e.target.value)}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <div className="md:col-span-2 lg:col-span-3 flex flex-wrap items-center gap-4 pt-3">
                <button type="submit" className="btn-primary px-8">
                  {editing ? "Update Catalog Details" : "Create Product in Catalog"}
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
                  <span className="text-fresh-600 text-sm">
                    Est. Profit margin: <strong>{profit}%</strong>
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Table Card */}
          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Catalog Products ({filteredProducts.length})</h3>
              <div className="flex flex-wrap gap-1 bg-gray-850 p-1 rounded-xl border border-gray-200">
                {["all", "vegetable", "fruit", "water", "exotic", "salad"].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFilterCategory(c)}
                    className={`px-3 py-1.5 text-xs font-semibold capitalize rounded-lg transition-all ${filterCategory === c ? "bg-fresh-600 text-gray-900" : "text-gray-600 hover:text-gray-900"}`}
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
                    <th className="text-left p-3 rounded-tl-xl w-12">Image</th>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Category</th>
                    <th className="text-right p-3">Avg Cost Price</th>
                    <th className="text-right p-3">Default Sell Price</th>
                    <th className="text-right p-3">Margin</th>
                    <th className="text-right p-3">Base Unit</th>
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
                        <td className="p-3">
                          {p.image_url ? (
                            <img 
                              src={`${import.meta.env.VITE_API_URL}${p.image_url}`} 
                              alt={p.name} 
                              className="w-10 h-10 object-cover rounded-lg border border-gray-300 bg-gray-100"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-300 flex items-center justify-center text-gray-500 text-xs">
                              No Img
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-gray-900 font-medium">
                          {p.name} {p.hindi_name ? <span className="text-gray-600 font-normal">({p.hindi_name})</span> : ""}
                        </td>
                        <td className="p-3"><span className="badge-blue badge">{p.category}</span></td>
                        <td className="p-3 text-right">
                          <p className="text-gray-700 font-semibold">{getPricePerKgDisplay(p.purchase_price_per_gm, p.unit)}</p>
                          <p className="text-gray-600 text-[10px]">₹{p.purchase_price_per_gm} / {p.unit}</p>
                          <button
                            onClick={() => calculateActualAvg(p.id, p.name, p.unit)}
                            className="mt-1 px-2 py-0.5 text-[10px] bg-gray-100 text-blue-400 rounded hover:bg-gray-700 transition-colors"
                          >
                            📊 Check Actual Avg
                          </button>
                        </td>
                        <td className="p-3 text-right">
                          <p className="text-gray-900 font-semibold">{getPricePerKgDisplay(p.selling_price_per_gm, p.unit)}</p>
                          <p className="text-gray-500 text-[10px]">₹{p.selling_price_per_gm} / {p.unit}</p>
                        </td>
                        <td className="p-3 text-right text-fresh-600">{margin}%</td>
                        <td className="p-3 text-right text-gray-500">{p.unit}</td>
                        <td className="p-3 text-center">
                          <span className={p.status === "active" ? "badge-green" : "badge-red"}>{p.status}</span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => startEdit(p)} className="text-xs text-fresh-600 hover:text-fresh-700 font-medium">Edit</button>
                            <button onClick={() => handleDelete(p.id)} className="text-xs text-red-600 hover:text-red-300 font-medium">Delete</button>
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
      )}

      {/* ─── TAB 2: LOG STOCK PURCHASE ───────────────────────────────── */}
      {activeTab === "purchase" && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-5">Stock Demand List & Purchase Entry</h3>
          <p className="text-gray-600 text-xs mb-6">
            Admin jo bhi fruits/vegetables buy karega, uska wajan (kg/pieces) aur total price yahan enter karein.
            System automatically per-kg/per-piece rate calculate kar lega.
          </p>

          <div className="overflow-x-auto mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="text-left p-3 rounded-tl-xl">Product</th>
                  <th className="text-right p-3">Total Demand</th>
                  <th className="text-right p-3 rounded-tr-xl">Action</th>
                </tr>
              </thead>
              <tbody>
                {demands.filter(d => !completedDemands.includes(d.id)).map(d => {
                  const totalQty = (d.total_package_qty || 0) + (d.total_retail_qty || 0);
                  // Ensure we show unit properly
                  const isGm = d.unit === 'gm' || d.unit === 'ml';
                  const displayQty = isGm ? totalQty / 1000 : totalQty;
                  const displayUnit = isGm ? (d.unit === 'gm' ? 'kg' : 'L') : 'pcs';
                  
                  return (
                    <tr key={d.id} className="table-row">
                      <td className="p-3 text-gray-900 font-medium">{d.name}</td>
                      <td 
                        className="p-3 text-right font-bold text-blue-400 cursor-pointer hover:underline hover:text-blue-500 transition-colors" 
                        title="Click to view demand breakdown"
                        onClick={() => setSelectedDemand(d)}
                      >
                        {displayQty} {displayUnit}
                      </td>
                      <td className="p-3 text-right">
                        <button 
                          onClick={() => {
                            const matchingProduct = products.find(p => p.id === d.id);
                            const sellingPrice = matchingProduct ? (isGm ? matchingProduct.selling_price_per_gm * 1000 : matchingProduct.selling_price_per_gm) : "";
                            setPurchaseForm({ 
                              product_id: d.id, 
                              quantity: displayQty, 
                              total_price: "", 
                              selling_price_per_kg: sellingPrice || ""
                            });
                          }} 
                          className="btn-primary py-1 px-3 text-xs"
                        >
                          Submit Purchase
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {demands.filter(d => !completedDemands.includes(d.id)).length === 0 && (
                  <tr>
                    <td colSpan="3" className="text-center py-6 text-gray-500">No pending stock demand found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {purchaseForm.product_id && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-slide-up border border-gray-200 flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
                  <div>
                    <h4 className="font-bold text-lg text-gray-900">Log Purchase</h4>
                    <p className="text-sm text-gray-500">{demands.find(d => d.id === purchaseForm.product_id)?.name || "Product"}</p>
                  </div>
                  <button type="button" onClick={() => setPurchaseForm({ product_id: "", quantity: "", total_price: "", selling_price_per_kg: "" })} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">✕</button>
                </div>
                <div className="p-6 overflow-y-auto">
                  <form onSubmit={handlePurchaseSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Quantity */}
                      <div>
                        <label className="label">
                          Quantity Purchased ({purchaseForm.product_id ? (products.find(p => p.id === parseInt(purchaseForm.product_id))?.unit === 'piece' ? 'pcs' : 'kg/L') : 'kg'})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="e.g. 10"
                          className="input"
                          value={purchaseForm.quantity}
                          onChange={e => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })}
                          required
                        />
                      </div>

                      {/* Total Price */}
                      <div>
                        <label className="label">
                          Total Price (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="e.g. 500"
                          className="input"
                          value={purchaseForm.total_price}
                          onChange={e => setPurchaseForm({ ...purchaseForm, total_price: e.target.value })}
                          required
                        />
                      </div>

                      {/* Selling Price per Kg */}
                      <div>
                        <label className="label">
                          Selling Price ({purchaseForm.product_id ? (products.find(p => p.id === parseInt(purchaseForm.product_id))?.unit === 'piece' ? 'per pc' : 'per kg/L') : 'per kg'})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="e.g. 15"
                          className="input"
                          value={purchaseForm.selling_price_per_kg}
                          onChange={e => setPurchaseForm({ ...purchaseForm, selling_price_per_kg: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    {/* Auto Calculated Per Kg Live Preview */}
                    {parseFloat(purchaseForm.quantity) > 0 && parseFloat(purchaseForm.total_price) > 0 && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-sm mt-4">
                        <span className="text-gray-600">Calculated Purchase Price:</span>
                        <span className="text-lg font-bold text-gradient">
                          ₹{(parseFloat(purchaseForm.total_price) / parseFloat(purchaseForm.quantity)).toFixed(2)} / {purchaseForm.product_id && products.find(p => p.id === parseInt(purchaseForm.product_id))?.unit === 'piece' ? 'pc' : 'kg/L'}
                        </span>
                      </div>
                    )}

                    <div className="pt-4 border-t border-gray-200 mt-6 flex flex-col sm:flex-row justify-end gap-3">
                      <button type="button" onClick={() => setPurchaseForm({ product_id: "", quantity: "", total_price: "", selling_price_per_kg: "" })} className="px-5 py-2.5 rounded-xl font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors w-full sm:w-auto">Cancel</button>
                      <button
                        type="submit"
                        disabled={submittingPurchase}
                        className="btn-primary py-2.5 px-6 w-full sm:w-auto"
                      >
                        {submittingPurchase ? "Saving Entry..." : "Submit & Update stock"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: STOCK & INVENTORY SUMMARY ────────────────────────── */}
      {activeTab === "stock" && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Current Stock Levels</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="text-left p-3 rounded-tl-xl">Product ID & Name</th>
                  <th className="text-left p-3">Category</th>
                  <th className="text-right p-3">Total Purchased Qty</th>
                  <th className="text-right p-3">Total Sold Qty</th>
                  <th className="text-right p-3">Current Remaining Stock</th>
                  <th className="text-right p-3">Current Avg Buy Rate</th>
                  <th className="text-right p-3">Current Avg Sell Rate</th>
                  <th className="text-center p-3 rounded-tr-xl">Status</th>
                </tr>
              </thead>
              <tbody>
                {stockSummary.map(p => {
                  const currentStockVal = parseFloat(p.current_stock || 0);
                  const isLow = currentStockVal <= (p.unit === 'gm' ? 2000 : 2); // Less than 2kg or 2 pieces is low stock

                  return (
                    <tr key={p.id} className="table-row">
                      <td className="p-3">
                        <p className="text-gray-900 font-medium">{p.name}</p>
                        <p className="text-gray-600 text-[10px]">ID: {p.id}</p>
                      </td>
                      <td className="p-3"><span className="badge-blue badge">{p.category}</span></td>
                      <td className="p-3 text-right font-medium text-blue-400">{formatQuantity(p.total_purchased_qty, p.unit)}</td>
                      <td className="p-3 text-right font-medium text-orange-400">{formatQuantity(p.total_sold_qty, p.unit)}</td>
                      <td className={`p-3 text-right font-bold ${isLow ? 'text-red-600' : 'text-fresh-600'}`}>
                        {formatQuantity(p.current_stock, p.unit)}
                        {isLow && <span className="block text-[8px] text-red-500 font-bold uppercase animate-pulse">Low Stock</span>}
                      </td>
                      <td className="p-3 text-right text-gray-700 font-semibold">{getPricePerKgDisplay(p.purchase_price_per_gm, p.unit)}</td>
                      <td className="p-3 text-right text-gray-900 font-semibold">{getPricePerKgDisplay(p.selling_price_per_gm, p.unit)}</td>
                      <td className="p-3 text-center">
                        <span className={`badge ${currentStockVal > 0 ? "badge-green" : "badge-red"}`}>
                          {currentStockVal > 0 ? "In Stock" : "Out of Stock"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {stockSummary.length === 0 && (
                  <tr>
                    <td colSpan="8" className="text-center py-6 text-gray-500">No stock levels found in database.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 4: PURCHASE HISTORY LOGS ────────────────────────────────── */}
      {activeTab === "logs" && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Stock Purchase Transactions Logs</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="text-left p-3 rounded-tl-xl">Purchase Date</th>
                  <th className="text-left p-3">Product Name</th>
                  <th className="text-left p-3">Category</th>
                  <th className="text-right p-3">Quantity Purchased</th>
                  <th className="text-right p-3">Purchase Price / Unit</th>
                  <th className="text-right p-3">Selling Price / Unit</th>
                  <th className="text-right p-3 rounded-tr-xl">Total Paid Amount</th>
                </tr>
              </thead>
              <tbody>
                {purchaseLogs.map(log => {
                  const dateStr = new Date(log.purchase_date).toLocaleString("en-IN", {
                    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                  });

                  return (
                    <tr key={log.id} className="table-row">
                      <td className="p-3 text-gray-600">{dateStr}</td>
                      <td className="p-3 text-gray-900 font-medium">{log.Product?.name || "Unknown Product"}</td>
                      <td className="p-3"><span className="badge-blue badge">{log.Product?.category || "—"}</span></td>
                      <td className="p-3 text-right font-medium text-blue-400">
                        {formatQuantity(log.quantity, log.Product?.unit)}
                      </td>
                      <td className="p-3 text-right text-gray-700">
                        ₹{parseFloat(log.purchase_price_per_kg).toFixed(2)} / {log.Product?.unit === 'piece' ? 'pc' : 'kg/L'}
                      </td>
                      <td className="p-3 text-right text-gray-900">
                        ₹{parseFloat(log.selling_price_per_kg).toFixed(2)} / {log.Product?.unit === 'piece' ? 'pc' : 'kg/L'}
                      </td>
                      <td className="p-3 text-right font-bold text-gradient">₹{parseFloat(log.total_amount).toFixed(2)}</td>
                    </tr>
                  );
                })}
                {purchaseLogs.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center py-6 text-gray-500">No purchase logs found. Go to "Log Purchase" to add one.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Demand Breakdown Modal */}
      {selectedDemand && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up border border-gray-200 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
              <div>
                <h3 className="font-bold text-lg text-gray-900">Demand Breakdown</h3>
                <p className="text-sm text-gray-500">{selectedDemand.name}</p>
              </div>
              <button 
                onClick={() => setSelectedDemand(null)} 
                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
              >
                ✕
              </button>
            </div>
            
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-6">
              {/* Package Demands */}
              {selectedDemand.package_details && selectedDemand.package_details.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-600 p-1 rounded">📦</span>
                    Package Demands
                  </h4>
                  <div className="space-y-3">
                    {selectedDemand.package_details.map((detail, idx) => {
                      const qtyVal = parseFloat(detail.qty);
                      const isGm = selectedDemand.unit === 'gm' || selectedDemand.unit === 'ml';
                      const dispQty = isGm && qtyVal >= 1000 ? `${(qtyVal/1000).toFixed(1)} ${selectedDemand.unit === 'gm' ? 'kg' : 'L'}` : `${qtyVal} ${selectedDemand.unit === 'piece' ? 'pcs' : selectedDemand.unit}`;
                      
                      return (
                        <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-gray-900">{dispQty}</span>
                            <span className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-600 font-medium">Requested by {detail.count} user(s)</span>
                          </div>
                          {detail.orders && detail.orders.length > 0 && (
                            <div className="mt-2 pl-2 border-l-2 border-gray-300 space-y-1">
                              {detail.orders.map((u, i) => (
                                <div key={i} className="text-xs text-gray-500 flex justify-between">
                                  <span>{u.userName}</span>
                                  <span className="text-gray-400">{u.phone}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Retail Demands */}
              {selectedDemand.retail_details && selectedDemand.retail_details.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider flex items-center gap-2">
                    <span className="bg-purple-100 text-purple-600 p-1 rounded">🛒</span>
                    Retail Demands
                  </h4>
                  <div className="space-y-3">
                    {selectedDemand.retail_details.map((detail, idx) => {
                      const qtyVal = parseFloat(detail.qty);
                      const isGm = selectedDemand.unit === 'gm' || selectedDemand.unit === 'ml';
                      const dispQty = isGm && qtyVal >= 1000 ? `${(qtyVal/1000).toFixed(1)} ${selectedDemand.unit === 'gm' ? 'kg' : 'L'}` : `${qtyVal} ${selectedDemand.unit === 'piece' ? 'pcs' : selectedDemand.unit}`;
                      
                      return (
                        <div key={idx} className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-gray-900">{dispQty}</span>
                            <span className="text-xs bg-purple-200 px-2 py-1 rounded text-purple-700 font-medium">Requested by {detail.count} user(s)</span>
                          </div>
                          {detail.orders && detail.orders.length > 0 && (
                            <div className="mt-2 pl-2 border-l-2 border-purple-200 space-y-1">
                              {detail.orders.map((u, i) => (
                                <div key={i} className="text-xs text-gray-500 flex justify-between">
                                  <span>{u.userName}</span>
                                  <span className="text-gray-400">{u.phone}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(!selectedDemand.package_details?.length && !selectedDemand.retail_details?.length) && (
                <div className="text-center text-gray-500 py-4">No detailed breakdown available.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
