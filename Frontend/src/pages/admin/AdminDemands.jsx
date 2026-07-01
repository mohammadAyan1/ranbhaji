import React, { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AdminDemands() {
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [demands, setDemands] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("All");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const fetchDemands = async (targetDate) => {
    setLoading(true);
    setMsg("");
    try {
      const res = await api.get(`/admin/demands?date=${targetDate}`);
      setDemands(res.data.demands || []);
    } catch (err) {
      setMsg(`❌ Failed to load demands: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemands(date);
  }, [date]);

  // Format quantities with units
  const formatQuantity = (qty, unit) => {
    const numericQty = parseFloat(qty);
    if (unit === "gm" || unit === "ml") {
      if (numericQty >= 1000) {
        const kgVal = numericQty / 1000;
        return `${kgVal.toFixed(1)} ${unit === "gm" ? "kg" : "L"}`;
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

  const availableBatches = React.useMemo(() => {
    const batches = new Set();
    demands.forEach(d => {
      if (d.package_details) d.package_details.forEach(p => batches.add(p.batch || "Unassigned"));
      if (d.retail_details) d.retail_details.forEach(r => batches.add(r.batch || "Unassigned"));
    });
    return Array.from(batches).sort();
  }, [demands]);

  const filteredDemands = React.useMemo(() => {
    if (selectedBatch === "All") return demands;
    return demands.map(d => {
      const pDetails = (d.package_details || []).filter(p => (p.batch || "Unassigned") === selectedBatch);
      const rDetails = (d.retail_details || []).filter(r => (r.batch || "Unassigned") === selectedBatch);
      const pQty = pDetails.reduce((sum, p) => sum + (parseFloat(p.qty) * p.count), 0);
      const rQty = rDetails.reduce((sum, r) => sum + (parseFloat(r.qty) * r.count), 0);
      return { ...d, package_details: pDetails, retail_details: rDetails, total_package_qty: pQty, total_retail_qty: rQty };
    }).filter(d => d.total_package_qty > 0 || d.total_retail_qty > 0);
  }, [demands, selectedBatch]);

  const totalWeightGm = filteredDemands
    .filter(d => d.unit === "gm" || d.unit === "ml")
    .reduce((sum, d) => sum + parseFloat(d.total_package_qty || 0) + parseFloat(d.total_retail_qty || 0), 0);

  const formatWeight = (qty) => {
    const kg = qty / 1000;
    return `${kg.toFixed(2)} kg/L`;
  };

  const toggleRow = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-header">Stock Demands 📊</h1>
          <p className="page-sub">Aggregated product requirements for scheduled deliveries</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Batch:</label>
          <select 
            value={selectedBatch} 
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="input text-sm py-1.5 px-3 max-w-[150px]"
          >
            <option value="All">All Batches</option>
            {availableBatches.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider ml-2">Date:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input text-sm py-1.5 px-3 max-w-[180px]"
          />
        </div>
      </div>

      {msg && (
        <div className="rounded-xl px-4 py-3 text-sm bg-red-900/30 text-red-400 border border-red-700/50">
          {msg}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-gray-400 text-xs font-medium">Distinct Products Needed</p>
          <p className="text-3xl font-extrabold text-white mt-1">{filteredDemands.length}</p>
        </div>
        <div className="card">
          <p className="text-gray-400 text-xs font-medium">Total Weight Demand</p>
          <p className="text-3xl font-extrabold text-fresh-400 mt-1">{formatWeight(totalWeightGm)}</p>
        </div>
        <div className="card">
          <p className="text-gray-400 text-xs font-medium">Report Date</p>
          <p className="text-lg font-bold text-gray-300 mt-1.5">
            {new Date(date).toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Demands Table */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <span className="animate-pulse">Loading stock aggregates...</span>
          </div>
        ) : filteredDemands.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-5xl mb-4">📭</p>
            <p className="text-lg font-medium text-white">No deliveries scheduled</p>
            <p className="text-sm">There are no pending delivery schedules on this date for the selected batch.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="table-header">
                  <th className="p-3 w-12 rounded-tl-xl"></th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Package Qty</th>
                  <th className="p-3">Retail Qty</th>
                  <th className="p-3 rounded-tr-xl text-right">Total Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredDemands.map((d) => (
                  <React.Fragment key={d.id}>
                    <tr onClick={() => toggleRow(d.id)} className="hover:bg-gray-800/50 cursor-pointer transition-colors">
                      <td className="p-3 text-gray-400">
                        {expandedId === d.id ? '▼' : '▶'}
                      </td>
                      <td className="p-3">
                        <span className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded border border-gray-700 mr-2">
                          {getCategoryEmoji(d.category)}
                        </span>
                        <span className="text-white font-semibold">{d.name}</span>
                      </td>
                      <td className="p-3 text-blue-400 font-medium">
                        {formatQuantity(d.total_package_qty, d.unit)}
                      </td>
                      <td className="p-3 text-purple-400 font-medium">
                        {formatQuantity(d.total_retail_qty, d.unit)}
                      </td>
                      <td className="p-3 text-right text-lg font-bold text-fresh-400">
                        {formatQuantity(d.total_package_qty + d.total_retail_qty, d.unit)}
                      </td>
                    </tr>
                    
                    {expandedId === d.id && (
                      <tr className="bg-gray-900/50">
                        <td colSpan="5" className="p-4 border-l-2 border-fresh-500">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Package Details */}
                            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                              <h4 className="text-blue-400 font-bold mb-3 flex justify-between">
                                <span>📦 Package Subscriptions</span>
                                <span>{formatQuantity(d.total_package_qty, d.unit)}</span>
                              </h4>
                              {d.package_details.length > 0 ? (
                                <ul className="space-y-3">
                                  {d.package_details.map((detail, idx) => (
                                    <li key={idx} className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                                      <div className="flex justify-between items-center text-gray-300 mb-2">
                                        <span>
                                          <span className="font-semibold text-white">{formatQuantity(detail.qty, d.unit)}</span>
                                          <span className="text-gray-500 mx-2">x</span>
                                          <span className="bg-gray-700 px-2 py-0.5 rounded text-xs">{detail.count} orders</span>
                                        </span>
                                        <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded border border-blue-500/30">
                                          Batch: {detail.batch}
                                        </span>
                                      </div>
                                      {/* User List Detail */}
                                      {detail.orders && detail.orders.length > 0 && (
                                        <div className="mt-2 pl-2 border-l-2 border-gray-600 space-y-1">
                                          {detail.orders.map((u, ui) => (
                                            <div key={ui} className="flex justify-between items-center text-xs text-gray-400">
                                              <span>👤 {u.userName || 'Unknown User'}</span>
                                              <span>{u.phone || 'N/A'}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-gray-500 text-sm italic">No package orders.</p>
                              )}
                            </div>

                            {/* Retail Details */}
                            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                              <h4 className="text-purple-400 font-bold mb-3 flex justify-between">
                                <span>🛒 Retail Orders</span>
                                <span>{formatQuantity(d.total_retail_qty, d.unit)}</span>
                              </h4>
                              {d.retail_details.length > 0 ? (
                                <ul className="space-y-3">
                                  {d.retail_details.map((detail, idx) => (
                                    <li key={idx} className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                                      <div className="flex justify-between items-center text-gray-300 mb-2">
                                        <span>
                                          <span className="font-semibold text-white">{formatQuantity(detail.qty, d.unit)}</span>
                                          <span className="text-gray-500 mx-2">x</span>
                                          <span className="bg-gray-700 px-2 py-0.5 rounded text-xs">{detail.count} orders</span>
                                        </span>
                                        <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded border border-purple-500/30">
                                          Batch: {detail.batch}
                                        </span>
                                      </div>
                                      {/* User List Detail */}
                                      {detail.orders && detail.orders.length > 0 && (
                                        <div className="mt-2 pl-2 border-l-2 border-gray-600 space-y-1">
                                          {detail.orders.map((u, ui) => (
                                            <div key={ui} className="flex justify-between items-center text-xs text-gray-400">
                                              <span>👤 {u.userName || 'Unknown User'}</span>
                                              <span>{u.phone || 'N/A'}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-gray-500 text-sm italic">No retail orders.</p>
                              )}
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
