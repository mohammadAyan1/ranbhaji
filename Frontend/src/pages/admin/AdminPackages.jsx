import { useEffect, useState } from "react";
import api from "../../api/axios";

const TYPES = ["standard", "custom", "yearly"];

export default function AdminPackages() {
  const [packages, setPackages] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "", num_persons: 2, num_persons_max: "", services_per_month: 12, price: 1200, type: "standard", target_user_id: "", margin_percent: 0,
  });
  const [personRangeMode, setPersonRangeMode] = useState(false); // toggle: single vs range
  const [fixedItems, setFixedItems] = useState([]); // [{ product_id, default_qty_gm }]
  const [seasonalPool, setSeasonalPool] = useState([]); // [product_id]
  const [maxSelectCount, setMaxSelectCount] = useState(3);
  const [drafts, setDrafts] = useState([]);
  const [selectedDraftId, setSelectedDraftId] = useState("");

  // Validation preview
  const [validationResult, setValidationResult] = useState(null);
  const [seasonalFilter, setSeasonalFilter] = useState("all");

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      api.get("/packages"),
      api.get("/products"),
      api.get("/admin/users"),
      api.get("/calculator/drafts"),
    ]).then(([p, pr, u, d]) => {
      setPackages(p.data.packages || []);
      setProducts(pr.data.products?.filter(p => p.status === "active") || []);
      setUsers(u.data.users?.filter(u => u.role === "user") || []);
      setDrafts(d.data.drafts || []);
    }).finally(() => setLoading(false));
  };
  useEffect(fetchAll, []);

  const handleApplyDraft = () => {
    if (!selectedDraftId) return;
    const draft = drafts.find(d => d.id === parseInt(selectedDraftId));
    if (!draft) return;

    setForm({
      name: draft.name,
      num_persons: draft.num_persons || 2,
      num_persons_max: "",
      services_per_month: draft.services_per_month,
      price: draft.calculated_price,
      type: "standard",
      target_user_id: "",
      margin_percent: draft.margin_percent,
    });

    const fixed = draft.Items
      .filter(item => item.is_fixed)
      .map(item => ({
        product_id: item.product_id.toString(),
        default_qty_gm: item.qty_gm.toString()
      }));
    setFixedItems(fixed);

    const seasonal = draft.Items
      .filter(item => item.is_seasonal)
      .map(item => item.product_id);
    setSeasonalPool(seasonal);

    setMaxSelectCount(draft.max_seasonal_count || 3);
    setMsg(`✅ Auto-filled package from draft calculation: "${draft.name}"`);
  };

  // Live validation: sum of fixed item costs vs per-service amount
  useEffect(() => {
    if (fixedItems.length === 0 || !form.price || !form.services_per_month) {
      setValidationResult(null); return;
    }
    const per_service = (parseFloat(form.price) / parseInt(form.services_per_month)) * (1 - parseFloat(form.margin_percent || 0) / 200);
    let fixed_cost = 0;
    fixedItems.forEach(fi => {
      const product = products.find(p => p.id === parseInt(fi.product_id));
      if (product && fi.default_qty_gm) {
        fixed_cost += parseFloat(fi.default_qty_gm) * parseFloat(product.purchase_price_per_gm);
      }
    });
    const seasonal_budget = per_service - fixed_cost;
    setValidationResult({ per_service, fixed_cost, seasonal_budget, valid: fixed_cost < per_service });
  }, [fixedItems, form.price, form.services_per_month, products]);

  const resetForm = () => {
    setForm({ name: "", num_persons: 2, num_persons_max: "", services_per_month: 12, price: 1200, type: "standard", target_user_id: "", margin_percent: 0 });
    setPersonRangeMode(false);
    setFixedItems([]);
    setSeasonalPool([]);
    setMaxSelectCount(3);
    setEditing(null);
    setShowForm(false);
    setValidationResult(null);
  };

  const startEdit = (pkg) => {
    setEditing(pkg.id);
    setForm({ name: pkg.name, num_persons: pkg.num_persons, num_persons_max: pkg.num_persons_max || "", services_per_month: pkg.services_per_month, price: pkg.price, type: pkg.type, target_user_id: pkg.target_user_id || "", margin_percent: pkg.margin_percent !== undefined ? pkg.margin_percent : 0 });
    setPersonRangeMode(!!pkg.num_persons_max); // enable range mode if max was set
    setFixedItems(pkg.FixedItems?.map(fi => ({ product_id: fi.product_id, default_qty_gm: fi.default_qty_gm })) || []);
    setSeasonalPool(pkg.SeasonalPool?.map(sp => sp.product_id) || []);
    setMaxSelectCount(pkg.SeasonalConfig?.max_select_count || 3);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validationResult && !validationResult.valid) {
      setMsg("❌ Fixed item cost exceeds per-service amount. Please adjust quantities or price.");
      return;
    }
    setSubmitting(true); setMsg("");

    const payload = {
      ...form,
      num_persons: parseInt(form.num_persons),
      num_persons_max: personRangeMode && form.num_persons_max ? parseInt(form.num_persons_max) : null,
      services_per_month: parseInt(form.services_per_month),
      price: parseFloat(form.price),
      margin_percent: parseFloat(form.margin_percent || 0),
      target_user_id: form.type === "custom" ? parseInt(form.target_user_id) : null,
      fixed_items: fixedItems.filter(fi => fi.product_id && fi.default_qty_gm).map(fi => ({
        product_id: parseInt(fi.product_id),
        default_qty_gm: parseFloat(fi.default_qty_gm),
      })),
      seasonal_pool: seasonalPool.filter(Boolean).map(id => parseInt(id)),
      max_select_count: parseInt(maxSelectCount),
    };

    try {
      if (editing) {
        await api.put(`/packages/${editing}`, payload);
        setMsg("✅ Package updated successfully");
      } else {
        await api.post("/packages", payload);
        setMsg("✅ Package created successfully");
      }
      resetForm();
      fetchAll();
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.message || "Failed to save package"}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Fixed items management
  const addFixedItem = () => setFixedItems([...fixedItems, { product_id: "", default_qty_gm: "" }]);
  const updateFixedItem = (idx, field, value) => {
    const updated = [...fixedItems]; updated[idx] = { ...updated[idx], [field]: value }; setFixedItems(updated);
  };
  const removeFixedItem = (idx) => setFixedItems(fixedItems.filter((_, i) => i !== idx));

  // Seasonal pool management
  const toggleSeasonalProduct = (product_id) => {
    const id = parseInt(product_id);
    if (seasonalPool.includes(id)) {
      setSeasonalPool(seasonalPool.filter(p => p !== id));
    } else {
      setSeasonalPool([...seasonalPool, id]);
    }
  };

  const handleDeactivate = async (id) => {
    if (!confirm("Deactivate this package?")) return;
    try {
      await api.put(`/packages/${id}`, { status: "inactive" });
      setMsg("✅ Package deactivated");
      fetchAll();
    } catch (err) { setMsg(`❌ ${err.response?.data?.message}`); }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Package Management 📦</h1>
          <p className="page-sub">Create and manage subscription packages with fixed and seasonal items</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">+ Create Package</button>
        )}
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm ${msg.startsWith("✅") ? "bg-fresh-900/30 text-fresh-400 border border-fresh-700/50" : "bg-red-900/30 text-red-400 border border-red-700/50"}`}>
          {msg}
        </div>
      )}

      {/* ─── PACKAGE FORM ─────────────────────────────────────────── */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-6 border-fresh-800/50">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-lg">{editing ? "Edit Package" : "Create New Package"}</h3>
            <button type="button" onClick={resetForm} className="text-gray-400 hover:text-white">✕ Cancel</button>
          </div>

          {/* Draft Import Dropdown */}
          {!editing && drafts.length > 0 && (
            <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/80 space-y-3">
              <label className="label text-xs uppercase tracking-wider text-fresh-400 font-semibold">💡 Import from Price Calculator Draft</label>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <select
                    className="input py-2 text-sm w-full bg-gray-900"
                    value={selectedDraftId}
                    onChange={(e) => setSelectedDraftId(e.target.value)}
                  >
                    <option value="">Select a saved draft...</option>
                    {drafts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} (₹{parseFloat(d.calculated_price).toFixed(2)} for {d.services_per_month} services, {d.margin_percent}% Margin)
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleApplyDraft}
                  disabled={!selectedDraftId}
                  className="btn-primary text-xs py-2 px-6"
                >
                  Apply Draft
                </button>
              </div>
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">Package Name *</label>
              <input className="input" placeholder="Nano / Gold / Silver" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>

            {/* Persons Field — single or range */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">For Persons *</label>
                <button
                  type="button"
                  onClick={() => {
                    setPersonRangeMode(!personRangeMode);
                    if (personRangeMode) setForm({ ...form, num_persons_max: "" });
                  }}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                    personRangeMode
                      ? "bg-fresh-900/50 border-fresh-600/50 text-fresh-400"
                      : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"
                  }`}
                >
                  {personRangeMode ? "📏 Range Mode" : "🔢 Single → Range?"}
                </button>
              </div>
              {personRangeMode ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="1" max="20"
                    className="input text-center"
                    placeholder="Min"
                    value={form.num_persons}
                    onChange={e => setForm({ ...form, num_persons: e.target.value })}
                    required
                  />
                  <span className="text-gray-500 font-bold text-sm">to</span>
                  <input
                    type="number" min="1" max="20"
                    className="input text-center"
                    placeholder="Max"
                    value={form.num_persons_max}
                    onChange={e => setForm({ ...form, num_persons_max: e.target.value })}
                    required
                  />
                </div>
              ) : (
                <input
                  type="number" min="1" max="20"
                  className="input"
                  value={form.num_persons}
                  onChange={e => setForm({ ...form, num_persons: e.target.value })}
                  required
                />
              )}
              {personRangeMode && form.num_persons && form.num_persons_max && (
                <p className="text-xs text-fresh-400 mt-1">📦 Package for {form.num_persons}–{form.num_persons_max} persons</p>
              )}
            </div>

            <div>
              <label className="label">Deliveries per Month *</label>
              <input type="number" min="1" max="31" className="input" value={form.services_per_month} onChange={e => setForm({ ...form, services_per_month: e.target.value })} required />
            </div>
            <div>
              <label className="label">Monthly Price (₹) *</label>
              <input type="number" min="1" step="0.01" className="input" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
            </div>
            <div>
              <label className="label">Margin Percentage (%) *</label>
              <input type="number" min="0" max="100" step="0.01" className="input" value={form.margin_percent} onChange={e => setForm({ ...form, margin_percent: e.target.value })} required />
            </div>
            <div>
              <label className="label">Package Type *</label>
              <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {form.type === "custom" && (
              <div>
                <label className="label">Target Customer *</label>
                <select className="input" value={form.target_user_id} onChange={e => setForm({ ...form, target_user_id: e.target.value })} required>
                  <option value="">Select customer...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.phone})</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Validation preview */}
          {validationResult && (
            <div className={`rounded-xl p-4 text-sm border ${validationResult.valid ? "bg-fresh-900/20 border-fresh-700/50" : "bg-red-900/20 border-red-700/50"}`}>
              <p className="font-semibold mb-1 text-white">💰 Price Validation</p>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-gray-400">Per-Service Amount</p>
                  <p className="font-bold text-white">₹{validationResult.per_service.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Fixed Items Cost</p>
                  <p className={`font-bold ${validationResult.valid ? "text-yellow-400" : "text-red-400"}`}>₹{validationResult.fixed_cost.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Seasonal Budget</p>
                  <p className={`font-bold ${validationResult.seasonal_budget > 0 ? "text-fresh-400" : "text-red-400"}`}>
                    ₹{validationResult.seasonal_budget.toFixed(2)}
                  </p>
                </div>
              </div>
              {!validationResult.valid && (
                <p className="text-red-400 text-xs mt-2">⚠️ Fixed item cost must be LESS than per-service amount. Increase price or reduce quantities.</p>
              )}
            </div>
          )}

          {/* Fixed Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">Fixed Items (included in every delivery)</label>
              <button type="button" onClick={addFixedItem} className="text-fresh-400 text-xs hover:text-fresh-300 font-medium">+ Add Item</button>
            </div>
            {fixedItems.length === 0 ? (
              <p className="text-gray-600 text-sm">No fixed items yet. <button type="button" onClick={addFixedItem} className="text-fresh-400 hover:underline">Add one →</button></p>
            ) : (
              <div className="space-y-2">
                {fixedItems.map((fi, idx) => {
                  const otherSelectedIds = fixedItems
                    .filter((_, i) => i !== idx)
                    .map(item => parseInt(item.product_id))
                    .filter(id => !isNaN(id));
                  const filteredRowProducts = products.filter(p => p.category !== "water" && (!fi.filterCategory || p.category === fi.filterCategory));
                  return (
                    <div key={idx} className="flex flex-wrap items-center gap-3 bg-gray-800/50 rounded-xl p-3 border border-gray-700">
                      {/* Category filter */}
                      <select
                        className="input w-36 text-xs"
                        value={fi.filterCategory || ""}
                        onChange={e => updateFixedItem(idx, "filterCategory", e.target.value)}
                      >
                        <option value="">All Categories</option>
                        <option value="vegetable">Vegetables</option>
                        <option value="fruit">Fruits</option>
                        <option value="exotic">Exotic Veg</option>
                        <option value="salad">Salad</option>
                      </select>

                      {/* Product select */}
                      <select
                        className="input flex-1 min-w-[150px]"
                        value={fi.product_id}
                        onChange={e => updateFixedItem(idx, "product_id", e.target.value)}
                        required
                      >
                        <option value="">Select product...</option>
                        {filteredRowProducts.map(p => {
                          const isAlreadySelected = otherSelectedIds.includes(p.id);
                          return (
                            <option key={p.id} value={p.id} disabled={isAlreadySelected}>
                              {p.name} ({p.category}){isAlreadySelected ? " - Already Selected" : ""}
                            </option>
                          );
                        })}
                      </select>
                      <input
                        type="number" min="1" step="1"
                        placeholder="Qty (gm)"
                        value={fi.default_qty_gm}
                        onChange={e => updateFixedItem(idx, "default_qty_gm", e.target.value)}
                        className="input w-28"
                        required
                      />
                      <span className="text-gray-500 text-xs">
                        {fi.product_id && fi.default_qty_gm && products.find(p => p.id === parseInt(fi.product_id))
                          ? `₹${(parseFloat(fi.default_qty_gm) * parseFloat(products.find(p => p.id === parseInt(fi.product_id))?.purchase_price_per_gm || 0)).toFixed(2)}`
                          : ""}
                      </span>
                      <button type="button" onClick={() => removeFixedItem(idx)} className="text-red-400 hover:text-red-300 text-xl leading-none">×</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Seasonal Pool */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">Seasonal Pool (customer picks from these)</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs">Max picks:</span>
                <input
                  type="number" min="1" max="20"
                  value={maxSelectCount}
                  onChange={e => setMaxSelectCount(e.target.value)}
                  className="input w-16 py-1 text-sm text-center"
                />
              </div>
            </div>
            {/* Category filter tabs */}
            <div className="flex flex-wrap gap-2 mb-3 bg-gray-800/40 p-1.5 rounded-xl w-fit border border-gray-800">
              {["all", "vegetable", "fruit", "exotic", "salad"].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSeasonalFilter(c)}
                  className={`px-3 py-1 text-xs font-semibold capitalize rounded-lg transition-all ${seasonalFilter === c ? "bg-fresh-600 text-white" : "text-gray-400 hover:text-white"
                    }`}
                >
                  {c === "all" ? "All Categories" : c}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {products
                .filter(p => p.category !== "water" && (seasonalFilter === "all" || p.category === seasonalFilter))
                .map(p => {
                  const inPool = seasonalPool.includes(p.id);
                  const inFixed = fixedItems.some(fi => parseInt(fi.product_id) === p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={inFixed}
                      onClick={() => !inFixed && toggleSeasonalProduct(p.id)}
                      className={`text-left p-2.5 rounded-xl border text-xs transition-all duration-200 ${inFixed
                        ? "border-gray-800 bg-gray-800/20 text-gray-600 cursor-not-allowed"
                        : inPool
                          ? "border-fresh-600/50 bg-fresh-900/30 text-fresh-300"
                          : "border-gray-700 bg-gray-800/30 text-gray-400 hover:border-gray-600"
                        }`}
                    >
                      <p className="font-medium truncate">{p.name}</p>
                      <p className="text-gray-600 capitalize mt-0.5">{p.category}</p>
                      {inFixed && <p className="text-yellow-600 mt-0.5">In fixed items</p>}
                    </button>
                  );
                })}
            </div>
            <p className="text-gray-500 text-xs mt-2">
              {seasonalPool.length} products in pool. Customer will pick up to {maxSelectCount}.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting || (validationResult && !validationResult.valid)} className="btn-primary px-8">
              {submitting ? "Saving..." : (editing ? "Update Package" : "Create Package")}
            </button>
            <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      {/* ─── PACKAGES LIST ──────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="font-semibold text-white text-lg">All Packages ({packages.length})</h3>
        {packages.length === 0 ? (
          <div className="card text-center py-12 text-gray-500">
            <p className="text-4xl mb-3">📦</p>
            <p>No packages created yet. Click "Create Package" to add one.</p>
          </div>
        ) : (
          packages.map(pkg => (
            <div key={pkg.id} className={`card ${pkg.status === "inactive" ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold text-white">{pkg.name}</h3>
                    <span className={`badge ${pkg.type === "custom" ? "badge-blue" : "badge-green"}`}>{pkg.type}</span>
                    <span className={pkg.status === "active" ? "badge-green badge" : "badge-red badge"}>{pkg.status}</span>
                  </div>
                  <p className="text-gray-400 text-sm">
                    {pkg.num_persons_max
                      ? `${pkg.num_persons}–${pkg.num_persons_max} persons`
                      : `${pkg.num_persons} persons`
                    } · {pkg.services_per_month} deliveries/month · <span className="text-white font-semibold">₹{pkg.price}/month</span> · Margin: {pkg.margin_percent || 0}%
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Raw Per-service: ₹{(parseFloat(pkg.price) / pkg.services_per_month).toFixed(2)} ·
                    Visible Budget: ₹{((parseFloat(pkg.price) / pkg.services_per_month) * (1 - (pkg.margin_percent || 0) / 200)).toFixed(2)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(pkg)} className="btn-secondary text-xs py-1.5 px-3">✏️ Edit</button>
                  {pkg.status === "active" && (
                    <button onClick={() => handleDeactivate(pkg.id)} className="btn-danger text-xs py-1.5 px-3">Deactivate</button>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {pkg.FixedItems?.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">Fixed Items</p>
                    <div className="flex flex-wrap gap-1.5">
                      {pkg.FixedItems.map(fi => (
                        <span key={fi.id} className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-lg border border-gray-700">
                          {fi.Product?.name} ({fi.default_qty_gm}g)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {pkg.SeasonalPool?.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                      Seasonal Pool (pick {pkg.SeasonalConfig?.max_select_count})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {pkg.SeasonalPool.map(sp => (
                        <span key={sp.id} className="bg-fresh-900/30 text-fresh-400 text-xs px-2 py-1 rounded-lg border border-fresh-800/50">
                          {sp.Product?.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
