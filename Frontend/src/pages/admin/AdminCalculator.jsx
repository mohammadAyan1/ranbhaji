import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AdminCalculator() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([
    { id: 1, filterCategory: "", product_id: "", qty: "" }
  ]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.get("/products")
      .then((res) => {
        setProducts(res.data.products?.filter(p => p.status === "active") || []);
      })
      .catch((err) => {
        setMsg(`❌ Failed to load products: ${err.message}`);
      })
      .finally(() => setLoading(false));
  }, []);

  const addRow = () => {
    const nextId = items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
    setItems([...items, { id: nextId, filterCategory: "", product_id: "", qty: "" }]);
  };

  const updateRow = (id, field, value) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          // Reset product_id if category changes
          if (field === "filterCategory") {
            return { ...item, [field]: value, product_id: "", qty: "" };
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const deleteRow = (id) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const clearCalculator = () => {
    setItems([{ id: 1, filterCategory: "", product_id: "", qty: "" }]);
  };

  // Calculate totals
  let totalPurchase = 0;
  let totalSelling = 0;

  const calculatedItems = items.map((item) => {
    const product = products.find((p) => p.id === parseInt(item.product_id));
    const qty = parseFloat(item.qty || 0);

    let unitLabel = product ? product.unit : "";
    let purchasePrice = product ? parseFloat(product.purchase_price_per_gm || 0) : 0;
    let sellingPrice = product ? parseFloat(product.selling_price_per_gm || 0) : 0;

    const purchaseCost = qty * purchasePrice;
    const sellingRevenue = qty * sellingPrice;
    const profit = sellingRevenue - purchaseCost;
    const profitPercent = sellingRevenue > 0 ? (profit / sellingRevenue) * 100 : 0;

    totalPurchase += purchaseCost;
    totalSelling += sellingRevenue;

    return {
      ...item,
      product,
      unitLabel,
      purchasePrice,
      sellingPrice,
      purchaseCost,
      sellingRevenue,
      profit,
      profitPercent
    };
  });

  const totalProfit = totalSelling - totalPurchase;
  const overallProfitPercent = totalSelling > 0 ? (totalProfit / totalSelling) * 100 : 0;

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading products...</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-header">Price Calculator 🧮</h1>
          <p className="page-sub">Simulate and calculate purchasing costs, selling revenues, and profits in real-time.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={clearCalculator} className="btn-secondary text-sm">
            🧹 Clear All
          </button>
          <button onClick={addRow} className="btn-primary text-sm">
            ➕ Add Product Row
          </button>
        </div>
      </div>

      {msg && (
        <div className="rounded-xl px-4 py-3 text-sm bg-red-900/30 text-red-400 border border-red-700/50">
          {msg}
        </div>
      )}

      {/* ─── SUMMARY CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Purchase Card */}
        <div className="card p-5 border-gray-800 bg-gray-900/50 hover:border-gray-700 transition-all duration-300">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Total Purchase Cost</p>
          <p className="text-2xl font-bold text-white">₹{totalPurchase.toFixed(2)}</p>
          <span className="text-[10px] text-gray-500">Based on catalog purchase prices</span>
        </div>

        {/* Total Selling Card */}
        <div className="card p-5 border-gray-800 bg-gray-900/50 hover:border-gray-700 transition-all duration-300">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Total Selling Revenue</p>
          <p className="text-2xl font-bold text-fresh-400">₹{totalSelling.toFixed(2)}</p>
          <span className="text-[10px] text-gray-500">Gross revenue from customers</span>
        </div>

        {/* Profit Card */}
        <div className="card p-5 border-gray-800 bg-gray-900/50 hover:border-gray-700 transition-all duration-300">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Net Margin Profit</p>
          <p className={`text-2xl font-bold ${totalProfit >= 0 ? "text-yellow-400" : "text-red-400"}`}>
            ₹{totalProfit.toFixed(2)}
          </p>
          <span className="text-[10px] text-gray-500">Selling minus purchasing</span>
        </div>

        {/* Profit Margin % Card */}
        <div className="card p-5 border-gray-800 bg-gray-900/50 hover:border-gray-700 transition-all duration-300">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Overall Profit Margin</p>
          <p className={`text-2xl font-bold ${overallProfitPercent >= 0 ? "text-fresh-400" : "text-red-400"}`}>
            {overallProfitPercent.toFixed(1)}%
          </p>
          <span className="text-[10px] text-gray-500">Profit as % of selling revenue</span>
        </div>
      </div>

      {/* ─── CALCULATOR ROW BUILDER ───────────────────────────────── */}
      <div className="card border-gray-800 bg-gray-900/30 p-6 space-y-4">
        <h3 className="font-semibold text-white text-lg">Calculator Simulation Table</h3>
        {calculatedItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-3">🧮</p>
            <p className="mb-4">No rows added yet. Click Add Product Row to start calculating.</p>
            <button onClick={addRow} className="btn-primary inline-block text-xs">+ Add Row</button>
          </div>
        ) : (
          <div className="space-y-3">
            {calculatedItems.map((item, idx) => {
              // Filter products based on row category selection
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
                    <label className="text-[10px] text-gray-400 block mb-1 uppercase tracking-wider">Filter Category</label>
                    <select
                      className="input py-1.5 px-3 text-xs w-full sm:w-36 bg-gray-900"
                      value={item.filterCategory}
                      onChange={(e) => updateRow(item.id, "filterCategory", e.target.value)}
                    >
                      <option value="">All Categories</option>
                      <option value="vegetable">Vegetables</option>
                      <option value="fruit">Fruits</option>
                      <option value="exotic">Exotic Veg</option>
                      <option value="salad">Salad</option>
                      <option value="water">Alkaline Water</option>
                    </select>
                  </div>

                  {/* Product Select */}
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] text-gray-400 block mb-1 uppercase tracking-wider">Select Product</label>
                    <select
                      className="input py-1.5 px-3 text-sm w-full bg-gray-900"
                      value={item.product_id}
                      onChange={(e) => updateRow(item.id, "product_id", e.target.value)}
                      required
                    >
                      <option value="">Choose item...</option>
                      {rowProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.category})
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
                        onChange={(e) => updateRow(item.id, "qty", e.target.value)}
                        className="w-full bg-transparent text-white border-none py-1.5 focus:outline-none text-sm text-center"
                        required
                      />
                      <span className="text-xs text-gray-500 font-medium ml-1">
                        {item.unitLabel || "gm"}
                      </span>
                    </div>
                  </div>

                  {/* Pricing per gm / unit */}
                  {item.product && (
                    <div className="flex gap-4 border-l border-gray-800 pl-4 py-1.5 w-full md:w-auto md:border-l md:pl-4">
                      {/* Purchasing Cost details */}
                      <div className="text-left w-24">
                        <span className="text-[10px] text-gray-400 block uppercase">Purchasing</span>
                        <span className="text-xs font-semibold text-white block">
                          ₹{item.purchaseCost.toFixed(2)}
                        </span>
                        <span className="text-[9px] text-gray-500 block">
                          (₹{item.purchasePrice}/{item.unitLabel || "gm"})
                        </span>
                      </div>

                      {/* Selling Revenue details */}
                      <div className="text-left w-24">
                        <span className="text-[10px] text-gray-400 block uppercase text-fresh-400">Selling</span>
                        <span className="text-xs font-semibold text-fresh-400 block">
                          ₹{item.sellingRevenue.toFixed(2)}
                        </span>
                        <span className="text-[9px] text-gray-500 block">
                          (₹{item.sellingPrice}/{item.unitLabel || "gm"})
                        </span>
                      </div>

                      {/* Profit margin details */}
                      <div className="text-left w-24">
                        <span className="text-[10px] text-gray-400 block uppercase text-yellow-400">Profit</span>
                        <span className={`text-xs font-semibold block ${item.profit >= 0 ? "text-yellow-400" : "text-red-400"}`}>
                          ₹{item.profit.toFixed(2)}
                        </span>
                        <span className="text-[9px] text-gray-500 block">
                          ({item.profitPercent.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center ml-auto">
                    <button
                      type="button"
                      onClick={() => deleteRow(item.id)}
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
        )}
      </div>
    </div>
  );
}
