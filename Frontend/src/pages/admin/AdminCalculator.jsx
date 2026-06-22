import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AdminCalculator() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("error"); // "success" | "error"

  // Simulator Settings
  const [marginPercent, setMarginPercent] = useState(50);
  const [servicesCount, setServicesCount] = useState(5);
  const [fixedCount, setFixedCount] = useState(2);
  const [seasonalCount, setSeasonalCount] = useState(3);
  const [numPersons, setNumPersons] = useState(2);

  // Lists of products
  const [fixedItems, setFixedItems] = useState([
    { id: 1, filterCategory: "", product_id: "", qty: "" }
  ]);
  const [seasonalItems, setSeasonalItems] = useState([
    { id: 1, filterCategory: "", product_id: "", qty: "" }
  ]);

  // Saving state
  const [draftName, setDraftName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/products")
      .then((res) => {
        setProducts(res.data.products?.filter(p => p.status === "active") || []);
      })
      .catch((err) => {
        showMsg(`❌ Failed to load products: ${err.message}`, "error");
      })
      .finally(() => setLoading(false));
  }, []);

  const showMsg = (text, type = "error") => {
    setMsg(text);
    setMsgType(type);
  };

  const addFixedRow = () => {
    if (fixedItems.length >= fixedCount) {
      showMsg(`⚠️ Cannot add more than ${fixedCount} fixed products as configured.`, "error");
      return;
    }
    const nextId = fixedItems.length > 0 ? Math.max(...fixedItems.map((i) => i.id)) + 1 : 1;
    setFixedItems([...fixedItems, { id: nextId, filterCategory: "", product_id: "", qty: "" }]);
    setMsg("");
  };

  const addSeasonalRow = () => {
    if (seasonalItems.length >= seasonalCount) {
      showMsg(`⚠️ Cannot add more than ${seasonalCount} seasonal products as configured.`, "error");
      return;
    }
    const nextId = seasonalItems.length > 0 ? Math.max(...seasonalItems.map((i) => i.id)) + 1 : 1;
    setSeasonalItems([...seasonalItems, { id: nextId, filterCategory: "", product_id: "", qty: "" }]);
    setMsg("");
  };

  const updateFixedRow = (id, field, value) => {
    setFixedItems(
      fixedItems.map((item) => {
        if (item.id === id) {
          if (field === "filterCategory") {
            return { ...item, [field]: value, product_id: "", qty: "" };
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const updateSeasonalRow = (id, field, value) => {
    setSeasonalItems(
      seasonalItems.map((item) => {
        if (item.id === id) {
          if (field === "filterCategory") {
            return { ...item, [field]: value, product_id: "", qty: "" };
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const deleteFixedRow = (id) => {
    setFixedItems(fixedItems.filter((item) => item.id !== id));
  };

  const deleteSeasonalRow = (id) => {
    setSeasonalItems(seasonalItems.filter((item) => item.id !== id));
  };

  const clearCalculator = () => {
    setFixedItems([{ id: 1, filterCategory: "", product_id: "", qty: "" }]);
    setSeasonalItems([{ id: 1, filterCategory: "", product_id: "", qty: "" }]);
    setDraftName("");
    setMsg("");
  };

  // Helper to map and calculate costs
  const calculateListItems = (list) => {
    return list.map((item) => {
      const product = products.find((p) => p.id === parseInt(item.product_id));
      const qty = parseFloat(item.qty || 0);
      let unitLabel = product ? product.unit : "";
      let purchasePrice = product ? parseFloat(product.purchase_price_per_gm || 0) : 0;
      let sellingPrice = product ? parseFloat(product.selling_price_per_gm || 0) : 0;

      // Purchase cost at this quantity
      const purchaseCost = qty * purchasePrice;
      const sellingRevenue = qty * sellingPrice;

      return {
        ...item,
        product,
        unitLabel,
        purchasePrice,
        sellingPrice,
        purchaseCost,
        sellingRevenue
      };
    });
  };

  const calculatedFixed = calculateListItems(fixedItems);
  const calculatedSeasonal = calculateListItems(seasonalItems);

  // Totals
  const totalFixedPurchaseCost = calculatedFixed.reduce((sum, item) => sum + item.purchaseCost, 0);
  const totalSeasonalPurchaseCost = calculatedSeasonal.reduce((sum, item) => sum + item.purchaseCost, 0);
  const totalBasePurchaseCost = totalFixedPurchaseCost + totalSeasonalPurchaseCost;

  // Margin Pricing
  const pricePerService = totalBasePurchaseCost * (1 + parseFloat(marginPercent || 0) / 100);
  const finalPackagePrice = pricePerService * parseInt(servicesCount || 1);

  // Save Draft package simulation
  const saveDraft = async () => {
    if (!draftName.trim()) {
      showMsg("❌ Please enter a name for the draft", "error");
      return;
    }

    const itemsPayload = [];
    fixedItems.forEach(item => {
      if (item.product_id && item.qty) {
        itemsPayload.push({
          product_id: parseInt(item.product_id),
          qty_gm: parseFloat(item.qty),
          is_fixed: true,
          is_seasonal: false
        });
      }
    });

    seasonalItems.forEach(item => {
      if (item.product_id && item.qty) {
        itemsPayload.push({
          product_id: parseInt(item.product_id),
          qty_gm: parseFloat(item.qty),
          is_fixed: false,
          is_seasonal: true
        });
      }
    });

    if (itemsPayload.length === 0) {
      showMsg("❌ Please add at least one product with quantity to save a draft", "error");
      return;
    }

    setSaving(true);
    setMsg("");

    const payload = {
      name: draftName,
      margin_percent: parseFloat(marginPercent || 0),
      services_per_month: parseInt(servicesCount || 1),
      num_persons: parseInt(numPersons || 2),
      calculated_price: parseFloat(finalPackagePrice),
      max_fixed_count: parseInt(fixedCount || 0),
      max_seasonal_count: parseInt(seasonalCount || 0),
      items: itemsPayload
    };

    try {
      await api.post("/calculator/drafts", payload);
      showMsg("✅ Simulation draft saved successfully!", "success");
      setDraftName("");
    } catch (err) {
      showMsg(`❌ Failed to save draft: ${err.response?.data?.message || err.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading products...</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-header">Price Calculator 🧮</h1>
          <p className="page-sub">Configure base materials, define fixed/seasonal slots, apply margin, and calculate draft package pricing.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={clearCalculator} className="btn-secondary text-sm">
            🧹 Clear All
          </button>
        </div>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm border ${
          msgType === "success" 
            ? "bg-fresh-900/30 text-fresh-400 border-fresh-700/50" 
            : "bg-red-900/30 text-red-400 border-red-700/50"
        }`}>
          {msg}
        </div>
      )}

      {/* ─── SETTINGS PANEL ───────────────────────────────────────── */}
      <div className="card grid grid-cols-2 md:grid-cols-5 gap-4 border-gray-800 bg-gray-900/50">
        <div>
          <label className="label text-xs uppercase tracking-wider">Margin Percent (%)</label>
          <input
            type="number"
            min="0"
            max="200"
            className="input text-sm"
            value={marginPercent}
            onChange={(e) => setMarginPercent(e.target.value)}
          />
        </div>
        <div>
          <label className="label text-xs uppercase tracking-wider">Deliveries / Month</label>
          <input
            type="number"
            min="1"
            max="31"
            className="input text-sm"
            value={servicesCount}
            onChange={(e) => setServicesCount(e.target.value)}
          />
        </div>
        <div>
          <label className="label text-xs uppercase tracking-wider">For Persons</label>
          <input
            type="number"
            min="1"
            max="20"
            className="input text-sm"
            value={numPersons}
            onChange={(e) => setNumPersons(e.target.value)}
          />
        </div>
        <div>
          <label className="label text-xs uppercase tracking-wider">Max Fixed Products</label>
          <input
            type="number"
            min="0"
            className="input text-sm"
            value={fixedCount}
            onChange={(e) => setFixedCount(e.target.value)}
          />
        </div>
        <div>
          <label className="label text-xs uppercase tracking-wider">Max Seasonal Products</label>
          <input
            type="number"
            min="0"
            className="input text-sm"
            value={seasonalCount}
            onChange={(e) => setSeasonalCount(e.target.value)}
          />
        </div>
      </div>

      {/* ─── SUMMARY CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Base Cost */}
        <div className="card p-5 border-gray-800 bg-gray-900/50 hover:border-gray-700 transition-all duration-300">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Total Base Purchase Cost</p>
          <p className="text-2xl font-bold text-white">₹{totalBasePurchaseCost.toFixed(2)}</p>
          <span className="text-[10px] text-gray-500">Fixed: ₹{totalFixedPurchaseCost.toFixed(2)} · Seasonal: ₹{totalSeasonalPurchaseCost.toFixed(2)}</span>
        </div>

        {/* Per-Service Margin Price */}
        <div className="card p-5 border-gray-800 bg-gray-900/50 hover:border-gray-700 transition-all duration-300">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Selling Price Per Service</p>
          <p className="text-2xl font-bold text-yellow-400">₹{pricePerService.toFixed(2)}</p>
          <span className="text-[10px] text-gray-500">Base Cost + {marginPercent}% Margin</span>
        </div>

        {/* Deliveries */}
        <div className="card p-5 border-gray-800 bg-gray-900/50 hover:border-gray-700 transition-all duration-300">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Deliveries Count</p>
          <p className="text-2xl font-bold text-blue-400">{servicesCount}</p>
          <span className="text-[10px] text-gray-500">Deliveries per package cycle</span>
        </div>

        {/* Final Price */}
        <div className="card p-5 border-gray-800 bg-gray-900/50 hover:border-gray-700 transition-all duration-300">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Calculated Package Price</p>
          <p className="text-2xl font-bold text-fresh-400">₹{finalPackagePrice.toFixed(2)}</p>
          <span className="text-[10px] text-gray-500">₹{pricePerService.toFixed(2)} * {servicesCount} services</span>
        </div>
      </div>

      {/* ─── FIXED PRODUCTS BUILDER ───────────────────────────────── */}
      <div className="card border-gray-800 bg-gray-900/30 p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-white text-lg">1. Fixed Products Simulation</h3>
            <p className="text-xs text-gray-500">Add up to {fixedCount} products to be included in every delivery.</p>
          </div>
          <button 
            onClick={addFixedRow} 
            disabled={fixedItems.length >= fixedCount}
            className="btn-primary text-xs py-1.5 px-4"
          >
            ➕ Add Fixed Product Row ({fixedItems.length}/{fixedCount})
          </button>
        </div>

        <div className="space-y-3">
          {fixedItems.map((item) => {
            const rowProducts = products.filter(
              (p) => !item.filterCategory || p.category === item.filterCategory
            );

            return (
              <div
                key={item.id}
                className="flex flex-wrap items-center gap-4 bg-gray-800/40 rounded-xl p-4 border border-gray-800 hover:border-gray-700 transition-all duration-200"
              >
                {/* Category Filter */}
                <div className="w-full sm:w-auto">
                  <label className="text-[10px] text-gray-400 block mb-1 uppercase tracking-wider">Category</label>
                  <select
                    className="input py-1.5 px-3 text-xs w-full sm:w-36 bg-gray-900"
                    value={item.filterCategory}
                    onChange={(e) => updateFixedRow(item.id, "filterCategory", e.target.value)}
                  >
                    <option value="">All Categories</option>
                    <option value="vegetable">Vegetables</option>
                    <option value="fruit">Fruits</option>
                    <option value="exotic">Exotic Veg</option>
                    <option value="salad">Salad</option>
                  </select>
                </div>

                {/* Product Select */}
                <div className="flex-1 min-w-[200px]">
                  <label className="text-[10px] text-gray-400 block mb-1 uppercase tracking-wider">Select Product</label>
                  <select
                    className="input py-1.5 px-3 text-sm w-full bg-gray-900"
                    value={item.product_id}
                    onChange={(e) => updateFixedRow(item.id, "product_id", e.target.value)}
                    required
                  >
                    <option value="">Choose item...</option>
                    {rowProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Cat: {p.category})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity Input */}
                <div className="w-full sm:w-32">
                  <label className="text-[10px] text-gray-400 block mb-1 uppercase tracking-wider">Quantity</label>
                  <div className="flex items-center bg-gray-900 rounded-xl border border-gray-700 px-2.5">
                    <input
                      type="number"
                      min="0"
                      placeholder="Qty"
                      value={item.qty}
                      onChange={(e) => updateFixedRow(item.id, "qty", e.target.value)}
                      className="w-full bg-transparent text-white border-none py-1.5 focus:outline-none text-sm text-center"
                      required
                    />
                    <span className="text-xs text-gray-500 font-medium ml-1">
                      {item.unitLabel || "gm"}
                    </span>
                  </div>
                </div>

                {/* Pricing per gm / unit */}
                {item.product_id && products.find(p => p.id === parseInt(item.product_id)) && (
                  <div className="flex gap-4 border-l border-gray-800 pl-4 py-1.5 w-full md:w-auto md:border-l md:pl-4">
                    {/* Cost details */}
                    <div className="text-left w-32">
                      <span className="text-[10px] text-gray-400 block uppercase">Base Purchase Cost</span>
                      <span className="text-xs font-semibold text-white block">
                        ₹{(parseFloat(item.qty || 0) * parseFloat(products.find(p => p.id === parseInt(item.product_id))?.purchase_price_per_gm || 0)).toFixed(2)}
                      </span>
                      <span className="text-[9px] text-gray-500 block">
                        (₹{(parseFloat(products.find(p => p.id === parseInt(item.product_id))?.purchase_price_per_gm || 0) * 1000).toFixed(0)}/kg)
                      </span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center ml-auto">
                  <button
                    type="button"
                    onClick={() => deleteFixedRow(item.id)}
                    className="text-red-400 hover:text-red-300 p-2 text-lg transition-all"
                    title="Remove Row"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── SEASONAL PRODUCTS BUILDER ────────────────────────────── */}
      <div className="card border-gray-800 bg-gray-900/30 p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-white text-lg">2. Seasonal Pool Simulation</h3>
            <p className="text-xs text-gray-500">Add up to {seasonalCount} seasonal products for customer options.</p>
          </div>
          <button 
            onClick={addSeasonalRow} 
            disabled={seasonalItems.length >= seasonalCount}
            className="btn-primary text-xs py-1.5 px-4"
          >
            ➕ Add Seasonal Product Row ({seasonalItems.length}/{seasonalCount})
          </button>
        </div>

        <div className="space-y-3">
          {seasonalItems.map((item) => {
            const rowProducts = products.filter(
              (p) => !item.filterCategory || p.category === item.filterCategory
            );

            return (
              <div
                key={item.id}
                className="flex flex-wrap items-center gap-4 bg-gray-800/40 rounded-xl p-4 border border-gray-800 hover:border-gray-700 transition-all duration-200"
              >
                {/* Category Filter */}
                <div className="w-full sm:w-auto">
                  <label className="text-[10px] text-gray-400 block mb-1 uppercase tracking-wider">Category</label>
                  <select
                    className="input py-1.5 px-3 text-xs w-full sm:w-36 bg-gray-900"
                    value={item.filterCategory}
                    onChange={(e) => updateSeasonalRow(item.id, "filterCategory", e.target.value)}
                  >
                    <option value="">All Categories</option>
                    <option value="vegetable">Vegetables</option>
                    <option value="fruit">Fruits</option>
                    <option value="exotic">Exotic Veg</option>
                    <option value="salad">Salad</option>
                  </select>
                </div>

                {/* Product Select */}
                <div className="flex-1 min-w-[200px]">
                  <label className="text-[10px] text-gray-400 block mb-1 uppercase tracking-wider">Select Product</label>
                  <select
                    className="input py-1.5 px-3 text-sm w-full bg-gray-900"
                    value={item.product_id}
                    onChange={(e) => updateSeasonalRow(item.id, "product_id", e.target.value)}
                    required
                  >
                    <option value="">Choose item...</option>
                    {rowProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Cat: {p.category})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity Input */}
                <div className="w-full sm:w-32">
                  <label className="text-[10px] text-gray-400 block mb-1 uppercase tracking-wider">Quantity</label>
                  <div className="flex items-center bg-gray-900 rounded-xl border border-gray-700 px-2.5">
                    <input
                      type="number"
                      min="0"
                      placeholder="Qty"
                      value={item.qty}
                      onChange={(e) => updateSeasonalRow(item.id, "qty", e.target.value)}
                      className="w-full bg-transparent text-white border-none py-1.5 focus:outline-none text-sm text-center"
                      required
                    />
                    <span className="text-xs text-gray-500 font-medium ml-1">
                      {item.unitLabel || "gm"}
                    </span>
                  </div>
                </div>

                {/* Pricing per gm / unit */}
                {item.product_id && products.find(p => p.id === parseInt(item.product_id)) && (
                  <div className="flex gap-4 border-l border-gray-800 pl-4 py-1.5 w-full md:w-auto md:border-l md:pl-4">
                    {/* Cost details */}
                    <div className="text-left w-32">
                      <span className="text-[10px] text-gray-400 block uppercase">Base Purchase Cost</span>
                      <span className="text-xs font-semibold text-white block">
                        ₹{(parseFloat(item.qty || 0) * parseFloat(products.find(p => p.id === parseInt(item.product_id))?.purchase_price_per_gm || 0)).toFixed(2)}
                      </span>
                      <span className="text-[9px] text-gray-500 block">
                        (₹{(parseFloat(products.find(p => p.id === parseInt(item.product_id))?.purchase_price_per_gm || 0) * 1000).toFixed(0)}/kg)
                      </span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center ml-auto">
                  <button
                    type="button"
                    onClick={() => deleteSeasonalRow(item.id)}
                    className="text-red-400 hover:text-red-300 p-2 text-lg transition-all"
                    title="Remove Row"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── DRAFT SAVING BAR ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 bg-gray-900 border border-gray-800 p-6 rounded-2xl">
        <div className="flex-1 min-w-[280px]">
          <label className="label text-xs uppercase tracking-wider mb-1.5 block">Save Simulation Draft As Package</label>
          <input
            type="text"
            placeholder="Enter Draft Name (e.g. Nano Plan Regular)"
            className="input text-sm w-full"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
          />
        </div>
        <div className="flex items-end justify-end pt-5">
          <button
            onClick={saveDraft}
            disabled={saving || !draftName.trim() || totalBasePurchaseCost <= 0}
            className="btn-primary text-sm font-bold py-2.5 px-8"
          >
            {saving ? "Saving Draft..." : "💾 Save as calculated draft package"}
          </button>
        </div>
      </div>
    </div>
  );
}
