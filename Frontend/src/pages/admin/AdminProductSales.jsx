import React, { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AdminProductSales() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Default to first of the month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const fetchSales = async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setMsg("");
    try {
      const res = await api.get(`/products/sales?startDate=${startDate}&endDate=${endDate}`);
      setSales(res.data.data || []);
    } catch (err) {
      setMsg(`❌ Failed to load sales data: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [startDate, endDate]);

  const formatQuantity = (qty, unit) => {
    const numericQty = parseFloat(qty);
    if (unit === "gm" || unit === "ml") {
      if (numericQty >= 1000) {
        const kgVal = numericQty / 1000;
        return `${kgVal.toFixed(2)} ${unit === "gm" ? "kg" : "L"}`;
      }
      return `${numericQty.toFixed(0)} ${unit}`;
    }
    return `${numericQty.toFixed(0)} ${unit || "pieces"}`;
  };

  const getCategoryEmoji = (category) => {
    return {
      vegetable: "🥦",
      fruit: "🍎",
      water: "💧",
      exotic: "🥬",
      salad: "🥗",
    }[category] || "📦";
  };

  const toggleRow = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-header">Product Sales 📈</h1>
          <p className="page-sub">Track product ordered quantities within a date range</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
          <div className="flex flex-col">
            <label className="text-gray-500 text-[10px] font-bold uppercase tracking-wider px-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input text-sm py-1.5 px-3"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-gray-500 text-[10px] font-bold uppercase tracking-wider px-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input text-sm py-1.5 px-3"
            />
          </div>
        </div>
      </div>

      {msg && (
        <div className="rounded-xl px-4 py-3 text-sm bg-red-50 text-red-600 border border-red-200">
          {msg}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-gray-600 text-xs font-medium">Total Products Sold</p>
          <p className="text-3xl font-extrabold text-gray-900 mt-1">{sales.length}</p>
        </div>
        <div className="card">
          <p className="text-gray-600 text-xs font-medium">Selected Date Range</p>
          <p className="text-sm font-bold text-gray-700 mt-2">
            {new Date(startDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })} 
            <span className="mx-2 text-gray-400">→</span> 
            {new Date(endDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Sales Table */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-600">
            <span className="animate-pulse">Loading sales data...</span>
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-5xl mb-4">📭</p>
            <p className="text-lg font-medium text-gray-900">No sales in this period</p>
            <p className="text-sm">Try selecting a different date range.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="table-header">
                  <th className="p-3 w-12 rounded-tl-xl"></th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Total Qty</th>
                  <th className="p-3 rounded-tr-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sales.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr onClick={() => toggleRow(item.id)} className="hover:bg-gray-50 cursor-pointer transition-colors group">
                      <td className="p-3 text-gray-400 group-hover:text-fresh-500 transition-colors">
                        {expandedId === item.id ? '▼' : '▶'}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded border border-gray-200">
                            {getCategoryEmoji(item.category)}
                          </span>
                          <span className="text-gray-900 font-semibold">{item.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-lg font-bold text-fresh-600">
                        {formatQuantity(item.totalQty, item.unit)}
                      </td>
                      <td className="p-3">
                        <button className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors font-medium">
                          {expandedId === item.id ? 'Hide Details' : 'View Breakdown'}
                        </button>
                      </td>
                    </tr>
                    
                    {expandedId === item.id && (
                      <tr className="bg-gray-50/50">
                        <td colSpan="4" className="p-4 border-l-2 border-fresh-500">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Package Details */}
                            <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">📦</div>
                                <div>
                                  <h4 className="text-gray-900 font-bold text-sm">Package Orders</h4>
                                  <p className="text-xs text-gray-500">Via Subscriptions</p>
                                </div>
                              </div>
                              <div className="mt-4 pb-2 border-b border-gray-100 flex justify-between items-end">
                                <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">Ordered Qty</span>
                                <span className="text-xl font-bold text-blue-600">{formatQuantity(item.packageQty, item.unit)}</span>
                              </div>
                            </div>

                            {/* Retail Details */}
                            <div className="bg-white rounded-xl p-4 border border-purple-100 shadow-sm">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">🛒</div>
                                <div>
                                  <h4 className="text-gray-900 font-bold text-sm">Retail Orders</h4>
                                  <p className="text-xs text-gray-500">Direct Purchases</p>
                                </div>
                              </div>
                              <div className="mt-4 pb-2 border-b border-gray-100 flex justify-between items-end">
                                <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">Ordered Qty</span>
                                <span className="text-xl font-bold text-purple-600">{formatQuantity(item.retailQty, item.unit)}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
