import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
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
  const [numPersonsMax, setNumPersonsMax] = useState("");
  const [personRangeModeCalc, setPersonRangeModeCalc] = useState(false);

  // Global category filters
  const [fixedCategoryFilter, setFixedCategoryFilter] = useState("");
  const [seasonalCategoryFilter, setSeasonalCategoryFilter] = useState("");

  // Lists of products
  const [fixedItems, setFixedItems] = useState([
    { id: 1, product_id: "", qty: "", search: "" },
    { id: 2, product_id: "", qty: "", search: "" }
  ]);
  const [seasonalItems, setSeasonalItems] = useState([
    { id: 1, product_id: "", qty: "", search: "" },
    { id: 2, product_id: "", qty: "", search: "" },
    { id: 3, product_id: "", qty: "", search: "" }
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

  const updateFixedRow = (id, field, value) => {
    setFixedItems((prev) => prev.map((item) => item.id === id ? { ...item, [field]: value } : item));
  };

  const updateSeasonalRow = (id, field, value) => {
    setSeasonalItems((prev) => prev.map((item) => item.id === id ? { ...item, [field]: value } : item));
  };

  const clearCalculator = () => {
    setFixedCount(2);
    setSeasonalCount(3);
    setFixedItems(Array.from({length: 2}).map((_, i) => ({ id: i + 1, product_id: "", qty: "", search: "" })));
    setSeasonalItems(Array.from({length: 3}).map((_, i) => ({ id: i + 1, product_id: "", qty: "", search: "" })));
    setDraftName("");
    setNumPersonsMax("");
    setPersonRangeModeCalc(false);
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
      num_persons_max: personRangeModeCalc && numPersonsMax ? parseInt(numPersonsMax) : null,
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

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-600">Loading products...</div>;

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
            ? "bg-fresh-100/30 text-fresh-600 border-fresh-700/50" 
            : "bg-red-900/30 text-red-600 border-red-700/50"
        }`}>
          {msg}
        </div>
      )}

      {/* ─── SETTINGS PANEL ───────────────────────────────────────── */}
      <div className="card grid grid-cols-2 md:grid-cols-5 gap-4 border-gray-200 bg-white/50">
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
          <div className="flex items-center justify-between mb-1">
            <label className="label text-xs uppercase tracking-wider mb-0">For Persons</label>
            <button
              type="button"
              onClick={() => {
                setPersonRangeModeCalc(!personRangeModeCalc);
                if (personRangeModeCalc) setNumPersonsMax("");
              }}
              className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border transition-all ${
                personRangeModeCalc
                  ? "bg-fresh-100/50 border-fresh-600/50 text-fresh-600"
                  : "bg-gray-100 border-gray-300 text-gray-600 hover:text-gray-900"
              }`}
            >
              {personRangeModeCalc ? "📏 Range" : "→ Range?"}
            </button>
          </div>
          {personRangeModeCalc ? (
            <div className="flex items-center gap-1.5">
              <input
                type="number" min="1" max="20"
                className="input text-sm text-center"
                placeholder="Min"
                value={numPersons}
                onChange={(e) => setNumPersons(e.target.value)}
              />
              <span className="text-gray-600 text-xs font-bold">–</span>
              <input
                type="number" min="1" max="20"
                className="input text-sm text-center"
                placeholder="Max"
                value={numPersonsMax}
                onChange={(e) => setNumPersonsMax(e.target.value)}
              />
            </div>
          ) : (
            <input
              type="number"
              min="1"
              max="20"
              className="input text-sm"
              value={numPersons}
              onChange={(e) => setNumPersons(e.target.value)}
            />
          )}
          {personRangeModeCalc && numPersons && numPersonsMax && (
            <p className="text-[10px] text-fresh-600 mt-1">{numPersons}–{numPersonsMax} persons</p>
          )}
        </div>
        <div>
          <label className="label text-xs uppercase tracking-wider">Max Fixed Products</label>
          <input
            type="number"
            min="0"
            className="input text-sm"
            value={fixedCount}
            onChange={(e) => {
              const newCount = parseInt(e.target.value) || 0;
              if (newCount < fixedCount) {
                 const removedItems = fixedItems.slice(newCount);
                 const hasProductSelected = removedItems.some(item => item.product_id);
                 if (hasProductSelected) {
                    const confirmRemove = window.confirm("You have selected products in the rows being removed. Are you sure you want to remove them?");
                    if (!confirmRemove) return;
                 }
              }
              setFixedCount(newCount);
              const newItems = [...fixedItems];
              if (newCount > newItems.length) {
                for (let i = newItems.length; i < newCount; i++) {
                   const nextId = newItems.length > 0 ? Math.max(...newItems.map((it) => it.id)) + 1 : 1;
                   newItems.push({ id: nextId, product_id: "", qty: "", search: "" });
                }
              } else if (newCount < newItems.length) {
                newItems.splice(newCount);
              }
              setFixedItems(newItems);
            }}
          />
        </div>
        <div>
          <label className="label text-xs uppercase tracking-wider">Max Seasonal Products</label>
          <input
            type="number"
            min="0"
            className="input text-sm"
            value={seasonalCount}
            onChange={(e) => {
              const newCount = parseInt(e.target.value) || 0;
              if (newCount < seasonalCount) {
                 const removedItems = seasonalItems.slice(newCount);
                 const hasProductSelected = removedItems.some(item => item.product_id);
                 if (hasProductSelected) {
                    const confirmRemove = window.confirm("You have selected products in the rows being removed. Are you sure you want to remove them?");
                    if (!confirmRemove) return;
                 }
              }
              setSeasonalCount(newCount);
              const newItems = [...seasonalItems];
              if (newCount > newItems.length) {
                for (let i = newItems.length; i < newCount; i++) {
                   const nextId = newItems.length > 0 ? Math.max(...newItems.map((it) => it.id)) + 1 : 1;
                   newItems.push({ id: nextId, product_id: "", qty: "", search: "" });
                }
              } else if (newCount < newItems.length) {
                newItems.splice(newCount);
              }
              setSeasonalItems(newItems);
            }}
          />
        </div>
      </div>

      {/* ─── SUMMARY CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Base Cost */}
        <div className="card p-5 border-gray-200 bg-white/50 hover:border-gray-300 transition-all duration-300">
          <p className="text-xs text-gray-600 font-medium uppercase tracking-wider mb-1">Total Base Purchase Cost</p>
          <p className="text-2xl font-bold text-gray-900">₹{totalBasePurchaseCost.toFixed(2)}</p>
          <span className="text-[10px] text-gray-500">Fixed: ₹{totalFixedPurchaseCost.toFixed(2)} · Seasonal: ₹{totalSeasonalPurchaseCost.toFixed(2)}</span>
        </div>

        {/* Per-Service Margin Price */}
        <div className="card p-5 border-gray-200 bg-white/50 hover:border-gray-300 transition-all duration-300">
          <p className="text-xs text-gray-600 font-medium uppercase tracking-wider mb-1">Selling Price Per Service</p>
          <p className="text-2xl font-bold text-yellow-400">₹{pricePerService.toFixed(2)}</p>
          <span className="text-[10px] text-gray-500">Base Cost + {marginPercent}% Margin</span>
        </div>

        {/* Deliveries */}
        <div className="card p-5 border-gray-200 bg-white/50 hover:border-gray-300 transition-all duration-300">
          <p className="text-xs text-gray-600 font-medium uppercase tracking-wider mb-1">Deliveries Count</p>
          <p className="text-2xl font-bold text-blue-400">{servicesCount}</p>
          <span className="text-[10px] text-gray-500">Deliveries per package cycle</span>
        </div>

        {/* Final Price */}
        <div className="card p-5 border-gray-200 bg-white/50 hover:border-gray-300 transition-all duration-300">
          <p className="text-xs text-gray-600 font-medium uppercase tracking-wider mb-1">Calculated Package Price</p>
          <p className="text-2xl font-bold text-fresh-600">₹{finalPackagePrice.toFixed(2)}</p>
          <span className="text-[10px] text-gray-500">₹{pricePerService.toFixed(2)} * {servicesCount} services</span>
        </div>
      </div>

      {/* ─── FIXED PRODUCTS BUILDER ───────────────────────────────── */}
      <div className="card border-gray-200 bg-white/30 p-6 space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">1. Fixed Products Simulation</h3>
            <p className="text-xs text-gray-500">Configure {fixedCount} products to be included in every delivery.</p>
          </div>
          <div>
            <select
              className="input py-1.5 px-3 text-xs w-full sm:w-48 bg-white"
              value={fixedCategoryFilter}
              onChange={(e) => setFixedCategoryFilter(e.target.value)}
            >
              <option value="">Filter by Category (All)</option>
              <option value="vegetable">Vegetables</option>
              <option value="fruit">Fruits</option>
              <option value="exotic">Exotic Veg</option>
              <option value="salad">Salad</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {fixedItems.map((item, index) => {
            const selectedSeasonalIds = seasonalItems.map(item => parseInt(item.product_id)).filter(id => !isNaN(id));
            const rowProducts = products.filter(
              (p) => (!fixedCategoryFilter || p.category === fixedCategoryFilter) && !selectedSeasonalIds.includes(p.id)
            );

            return (
              <div
                key={item.id}
                className="flex flex-wrap items-center gap-4 bg-gray-100/40 rounded-xl p-4 border border-gray-200 hover:border-gray-300 transition-all duration-200"
              >
                <div className="w-8 flex items-center justify-center font-bold text-gray-600">
                  {index + 1}.
                </div>

                {/* Product Search */}
                <div className="flex-1 min-w-[200px]">
                  <label className="text-[10px] text-gray-600 block mb-1 uppercase tracking-wider">Search & Select Product</label>
                  <input
                    type="text"
                    list={`fixed-products-list-${item.id}`}
                    className="input py-1.5 px-3 text-sm w-full bg-white"
                    placeholder="Type to search..."
                    value={item.search || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateFixedRow(item.id, "search", val);
                      const p = rowProducts.find(prod => `${prod.name} (${prod.category})` === val);
                      if (p) updateFixedRow(item.id, "product_id", p.id);
                      else updateFixedRow(item.id, "product_id", "");
                    }}
                    required
                  />
                  <datalist id={`fixed-products-list-${item.id}`}>
                    {rowProducts.map((p) => (
                      <option key={p.id} value={`${p.name} (${p.category})`} />
                    ))}
                  </datalist>
                </div>

                {/* Quantity Input */}
                <div className="w-full sm:w-32">
                  <label className="text-[10px] text-gray-600 block mb-1 uppercase tracking-wider">Quantity</label>
                  <div className="flex items-center bg-white rounded-xl border border-gray-300 px-2.5">
                    <input
                      type="number"
                      min="0"
                      placeholder="Qty"
                      value={item.qty}
                      onChange={(e) => updateFixedRow(item.id, "qty", e.target.value)}
                      className="w-full bg-transparent text-gray-900 border-none py-1.5 focus:outline-none text-sm text-center"
                      required
                    />
                    <span className="text-xs text-gray-500 font-medium ml-1">
                      {item.unitLabel || "gm"}
                    </span>
                  </div>
                </div>

                {/* Pricing per gm / unit */}
                {item.product_id && products.find(p => p.id === parseInt(item.product_id)) && (
                  <div className="flex gap-4 border-l border-gray-200 pl-4 py-1.5 w-full md:w-auto md:border-l md:pl-4">
                    {/* Cost details */}
                    <div className="text-left w-32">
                      <span className="text-[10px] text-gray-600 block uppercase">Base Purchase Cost</span>
                      <span className="text-xs font-semibold text-gray-900 block">
                        ₹{(parseFloat(item.qty || 0) * parseFloat(products.find(p => p.id === parseInt(item.product_id))?.purchase_price_per_gm || 0)).toFixed(2)}
                      </span>
                      <span className="text-[9px] text-gray-500 block">
                        (₹{(parseFloat(products.find(p => p.id === parseInt(item.product_id))?.purchase_price_per_gm || 0) * 1000).toFixed(0)}/kg)
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Remove Row Button */}
                <div className="ml-auto md:ml-0 flex items-center justify-end">
                  <button 
                    type="button"
                    onClick={() => {
                      if (item.product_id) {
                        const confirmRemove = window.confirm("Are you sure you want to remove this row?");
                        if (!confirmRemove) return;
                      }
                      setFixedItems(prev => prev.filter(p => p.id !== item.id));
                      setFixedCount(prev => Math.max(0, prev - 1));
                    }}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove Row"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── SEASONAL PRODUCTS BUILDER ────────────────────────────── */}
      <div className="card border-gray-200 bg-white/30 p-6 space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">2. Seasonal Pool Simulation</h3>
            <p className="text-xs text-gray-500">Configure {seasonalCount} seasonal products for customer options.</p>
          </div>
          <div>
            <select
              className="input py-1.5 px-3 text-xs w-full sm:w-48 bg-white"
              value={seasonalCategoryFilter}
              onChange={(e) => setSeasonalCategoryFilter(e.target.value)}
            >
              <option value="">Filter by Category (All)</option>
              <option value="vegetable">Vegetables</option>
              <option value="fruit">Fruits</option>
              <option value="exotic">Exotic Veg</option>
              <option value="salad">Salad</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {seasonalItems.map((item, index) => {
            const selectedFixedIds = fixedItems.map(item => parseInt(item.product_id)).filter(id => !isNaN(id));
            const rowProducts = products.filter(
              (p) => (!seasonalCategoryFilter || p.category === seasonalCategoryFilter) && !selectedFixedIds.includes(p.id)
            );

            return (
              <div
                key={item.id}
                className="flex flex-wrap items-center gap-4 bg-gray-100/40 rounded-xl p-4 border border-gray-200 hover:border-gray-300 transition-all duration-200"
              >
                <div className="w-8 flex items-center justify-center font-bold text-gray-600">
                  {index + 1}.
                </div>

                {/* Product Search */}
                <div className="flex-1 min-w-[200px]">
                  <label className="text-[10px] text-gray-600 block mb-1 uppercase tracking-wider">Search & Select Product</label>
                  <input
                    type="text"
                    list={`seasonal-products-list-${item.id}`}
                    className="input py-1.5 px-3 text-sm w-full bg-white"
                    placeholder="Type to search..."
                    value={item.search || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateSeasonalRow(item.id, "search", val);
                      const p = rowProducts.find(prod => `${prod.name} (${prod.category})` === val);
                      if (p) updateSeasonalRow(item.id, "product_id", p.id);
                      else updateSeasonalRow(item.id, "product_id", "");
                    }}
                    required
                  />
                  <datalist id={`seasonal-products-list-${item.id}`}>
                    {rowProducts.map((p) => (
                      <option key={p.id} value={`${p.name} (${p.category})`} />
                    ))}
                  </datalist>
                </div>

                {/* Quantity Input */}
                <div className="w-full sm:w-32">
                  <label className="text-[10px] text-gray-600 block mb-1 uppercase tracking-wider">Quantity</label>
                  <div className="flex items-center bg-white rounded-xl border border-gray-300 px-2.5">
                    <input
                      type="number"
                      min="0"
                      placeholder="Qty"
                      value={item.qty}
                      onChange={(e) => updateSeasonalRow(item.id, "qty", e.target.value)}
                      className="w-full bg-transparent text-gray-900 border-none py-1.5 focus:outline-none text-sm text-center"
                      required
                    />
                    <span className="text-xs text-gray-500 font-medium ml-1">
                      {item.unitLabel || "gm"}
                    </span>
                  </div>
                </div>

                {/* Pricing per gm / unit */}
                {item.product_id && products.find(p => p.id === parseInt(item.product_id)) && (
                  <div className="flex gap-4 border-l border-gray-200 pl-4 py-1.5 w-full md:w-auto md:border-l md:pl-4">
                    {/* Cost details */}
                    <div className="text-left w-32">
                      <span className="text-[10px] text-gray-600 block uppercase">Base Purchase Cost</span>
                      <span className="text-xs font-semibold text-gray-900 block">
                        ₹{(parseFloat(item.qty || 0) * parseFloat(products.find(p => p.id === parseInt(item.product_id))?.purchase_price_per_gm || 0)).toFixed(2)}
                      </span>
                      <span className="text-[9px] text-gray-500 block">
                        (₹{(parseFloat(products.find(p => p.id === parseInt(item.product_id))?.purchase_price_per_gm || 0) * 1000).toFixed(0)}/kg)
                      </span>
                    </div>
                  </div>
                )}

                {/* Remove Row Button */}
                <div className="ml-auto md:ml-0 flex items-center justify-end">
                  <button 
                    type="button"
                    onClick={() => {
                      if (item.product_id) {
                        const confirmRemove = window.confirm("Are you sure you want to remove this row?");
                        if (!confirmRemove) return;
                      }
                      setSeasonalItems(prev => prev.filter(p => p.id !== item.id));
                      setSeasonalCount(prev => Math.max(0, prev - 1));
                    }}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove Row"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── DRAFT SAVING BAR ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 bg-white border border-gray-200 p-6 rounded-2xl">
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
