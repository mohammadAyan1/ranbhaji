import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import api from "../../../api/axios";

export default function PackageCalculator() {
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

  const [seasonalQuantities, setSeasonalQuantities] = useState([250, 250, 250]);
  const [calculationMode, setCalculationMode] = useState("highest"); // "highest", "average", "custom"
  const [customPrice, setCustomPrice] = useState("");

  // Global category filters
  const [fixedCategoryFilter, setFixedCategoryFilter] = useState("");
  const [seasonalCategoryFilter, setSeasonalCategoryFilter] = useState("");

  // Lists of products
  const [fixedItems, setFixedItems] = useState([
    { id: 1, product_id: "", qty: "", search: "" },
    { id: 2, product_id: "", qty: "", search: "" }
  ]);
  const [seasonalPool, setSeasonalPool] = useState([]);

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

  const clearCalculator = () => {
    setFixedCount(2);
    setSeasonalCount(3);
    setFixedItems(Array.from({ length: 2 }).map((_, i) => ({ id: i + 1, product_id: "", qty: "", search: "" })));
    setSeasonalPool([]);
    setSeasonalCount(3);
    setSeasonalQuantities([250, 250, 250]);
    setCalculationMode("highest");
    setCustomPrice("");
    setDraftName("");
    setNumPersonsMax("");
    setPersonRangeModeCalc(false);
    setMsg("");
  };

  // Fixed items processing
  const calculatedFixed = fixedItems.map((item) => {
    const product = products.find((p) => p.id === parseInt(item.product_id));
    const qty = parseFloat(item.qty || 0);
    let unitLabel = product ? product.unit : "";
    let purchasePrice = product ? parseFloat(product.purchase_price_per_gm || 0) : 0;
    const purchaseCost = qty * purchasePrice;
    return { ...item, product, unitLabel, purchasePrice, purchaseCost };
  });

  const totalFixedPurchaseCost = calculatedFixed.reduce((sum, item) => sum + item.purchaseCost, 0);

  // New Fixed Budget Calculation: (Total Fixed Cost + ((Total Fixed Cost / Max Fixed Count) * Margin))
  // However, user specifically answered: `(Total Fixed Cost + ((Total Fixed Cost / 2) * Margin))` where 2 is Max Fixed Count.
  const actualFixedCount = parseInt(fixedCount) || 1;
  const fixedBaseMarginPerItem = (totalFixedPurchaseCost / actualFixedCount) * (parseFloat(marginPercent || 0) / 100);
  const fixedBudget = totalFixedPurchaseCost + fixedBaseMarginPerItem;

  // Seasonal items processing
  const selectedSeasonalProducts = seasonalPool.map(id => products.find(p => p.id === id)).filter(Boolean);
  
  let baseSeasonalPricePerGm = 0;
  if (selectedSeasonalProducts.length > 0) {
    if (calculationMode === "highest") {
      baseSeasonalPricePerGm = Math.max(...selectedSeasonalProducts.map(p => parseFloat(p.purchase_price_per_gm || 0)));
    } else if (calculationMode === "average") {
      const sumPrices = selectedSeasonalProducts.reduce((sum, p) => sum + parseFloat(p.purchase_price_per_gm || 0), 0);
      baseSeasonalPricePerGm = sumPrices / selectedSeasonalProducts.length;
    }
  }

  if (calculationMode === "custom") {
    // Treat customPrice as per kg, convert to per gm
    baseSeasonalPricePerGm = parseFloat(customPrice || 0) / 1000;
  }

  // Seasonal Budget: Base Price -> Add Margin -> Multiply by Total Qty of all picks
  const marginAddedSeasonalPricePerGm = baseSeasonalPricePerGm + (baseSeasonalPricePerGm * (parseFloat(marginPercent || 0) / 100));
  const totalSeasonalQtyGm = seasonalQuantities.reduce((sum, q) => sum + (parseFloat(q) || 0), 0);
  const seasonalBudget = marginAddedSeasonalPricePerGm * totalSeasonalQtyGm;

  const pricePerService = fixedBudget + seasonalBudget;
  const finalPackagePrice = pricePerService * parseInt(servicesCount || 1);

  const toggleSeasonalProduct = (product_id) => {
    const id = parseInt(product_id);
    if (seasonalPool.includes(id)) {
      setSeasonalPool(seasonalPool.filter(p => p !== id));
    } else {
      setSeasonalPool([...seasonalPool, id]);
    }
  };

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

    seasonalPool.forEach(id => {
      itemsPayload.push({
        product_id: id,
        qty_gm: 0,
        is_fixed: false,
        is_seasonal: true
      });
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
      seasonal_quantities: seasonalQuantities.map(q => parseFloat(q) || 0),
      draft_type: "price_calculator",
      items: itemsPayload
    };

    try {
      await api.post("/calculator/drafts", payload);
      clearCalculator();
      showMsg("✅ Package create ho chuka hai draft me!", "success");
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
          <h1 className="page-header">Package Calculator 🧮</h1>
          <p className="page-sub">Configure base materials, define fixed/seasonal slots, apply margin, and calculate draft package pricing.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={clearCalculator} className="btn-secondary text-sm">
            🧹 Clear All
          </button>
        </div>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm border ${msgType === "success"
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
              className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border transition-all ${personRangeModeCalc
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
          <label className="label text-xs uppercase tracking-wider">Max Seasonal Picks</label>
          <input
            type="number"
            min="0"
            className="input text-sm"
            value={seasonalCount}
            onChange={(e) => {
              const count = parseInt(e.target.value) || 0;
              setSeasonalCount(count);
              setSeasonalQuantities(prev => {
                const newArr = [...prev];
                while(newArr.length < count) newArr.push(250);
                return newArr.slice(0, count);
              });
            }}
          />
        </div>
      </div>

      {/* ─── SUMMARY CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Base Cost (Info only) */}
        <div className="card p-5 border-gray-200 bg-white/50 hover:border-gray-300 transition-all duration-300">
          <p className="text-xs text-gray-600 font-medium uppercase tracking-wider mb-1">Calculation Budget</p>
          <p className="text-2xl font-bold text-gray-900">₹{(fixedBudget + seasonalBudget).toFixed(2)}</p>
          <span className="text-[10px] text-gray-500">Fixed: ₹{fixedBudget.toFixed(2)} · Seasonal: ₹{seasonalBudget.toFixed(2)}</span>
        </div>

        {/* Per-Service Price */}
        <div className="card p-5 border-gray-200 bg-white/50 hover:border-gray-300 transition-all duration-300">
          <p className="text-xs text-gray-600 font-medium uppercase tracking-wider mb-1">Selling Price Per Service</p>
          <p className="text-2xl font-bold text-yellow-400">₹{pricePerService.toFixed(2)}</p>
          <span className="text-[10px] text-gray-500">Includes {marginPercent}% Margin</span>
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
            const rowProducts = products.filter(
              (p) => (!fixedCategoryFilter || p.category === fixedCategoryFilter) && !seasonalPool.includes(p.id)
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

      {/* ─── SEASONAL PRODUCTS POOL ────────────────────────────── */}
      <div className="card border-gray-200 bg-white/30 p-6 space-y-4">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">2. Seasonal Pool Simulation</h3>
            <p className="text-xs text-gray-500 mb-4">Select items to form the seasonal pool. The customer can pick up to {seasonalCount} items from this pool.</p>
            
            <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl border border-gray-200">
              <div>
                <label className="text-[10px] text-gray-600 block mb-1 uppercase tracking-wider">Calculation Mode</label>
                <select className="input py-1.5 px-3 text-sm w-40" value={calculationMode} onChange={(e) => setCalculationMode(e.target.value)}>
                  <option value="highest">Highest Price</option>
                  <option value="average">Average Price</option>
                  <option value="custom">Custom Price</option>
                </select>
              </div>

              {calculationMode === "custom" && (
                <div>
                  <label className="text-[10px] text-gray-600 block mb-1 uppercase tracking-wider">Custom Price (per kg)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 200"
                    className="input py-1.5 px-3 text-sm w-32"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                  />
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                {seasonalQuantities.map((qty, idx) => (
                  <div key={idx}>
                    <label className="text-[10px] text-gray-600 block mb-1 uppercase tracking-wider">Pick {idx + 1} Qty (gm)</label>
                    <input
                      type="number" min="0" className="input py-1.5 px-3 text-sm w-24"
                      value={qty}
                      onChange={e => {
                        const newArr = [...seasonalQuantities];
                        newArr[idx] = e.target.value;
                        setSeasonalQuantities(newArr);
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-col justify-center px-4 border-l border-gray-200 ml-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Base Seasonal Ref Price</span>
                <span className="text-sm font-bold text-gray-900">₹{(baseSeasonalPricePerGm * 1000).toFixed(0)}/kg</span>
              </div>
            </div>
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

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 mt-4">
          {products
            .filter(p => (!seasonalCategoryFilter || p.category === seasonalCategoryFilter))
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
                    ? "border-gray-200 bg-gray-100/20 text-gray-600 cursor-not-allowed"
                    : inPool
                      ? "border-fresh-600/50 bg-fresh-100/30 text-fresh-700 shadow-sm"
                      : "border-gray-300 bg-white hover:border-gray-600 shadow-sm"
                    }`}
                >
                  <p className="font-medium truncate">{p.name}</p>
                  <p className="text-gray-500 text-[10px] mt-0.5">₹{parseFloat(p.purchase_price_per_gm * 1000).toFixed(0)}/kg</p>
                  {inFixed && <p className="text-yellow-600 text-[10px] mt-0.5">In fixed items</p>}
                </button>
              );
            })}
        </div>
        <p className="text-gray-500 text-xs mt-2 text-right">
          {seasonalPool.length} products in pool.
        </p>
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
            disabled={saving || !draftName.trim() || (fixedBudget + seasonalBudget) <= 0}
            className="btn-primary text-sm font-bold py-2.5 px-8"
          >
            {saving ? "Saving Draft..." : "💾 Save as calculated draft package"}
          </button>
        </div>
      </div>
    </div>
  );
}
