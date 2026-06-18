import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AdminDemands() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [date, setDate] = useState(tomorrowStr);
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

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

  const totalWeightGm = demands
    .filter(d => d.unit === "gm" || d.unit === "ml")
    .reduce((sum, d) => sum + parseFloat(d.total_qty || 0), 0);

  const formatWeight = (qty) => {
    const kg = qty / 1000;
    return `${kg.toFixed(2)} kg/L`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-header">Stock Demands 📊</h1>
          <p className="page-sub">Aggregated product requirements for scheduled deliveries</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Target Date:</label>
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
          <p className="text-3xl font-extrabold text-white mt-1">{demands.length}</p>
        </div>
        <div className="card">
          <p className="text-gray-400 text-xs font-medium">Total Weight Demand</p>
          <p className="text-3xl font-extrabold text-fresh-400 mt-1">{formatWeight(totalWeightGm)}</p>
        </div>
        <div className="card">
          <p className="text-gray-400 text-xs font-medium">Active Deliveries Tomorrow</p>
          <p className="text-3xl font-extrabold text-white mt-1">
            {date === tomorrowStr ? "Calculate Scheduled" : "Selected Date"}
          </p>
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
        ) : demands.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-5xl mb-4">📭</p>
            <p className="text-lg font-medium text-white">No deliveries scheduled</p>
            <p className="text-sm">There are no pending delivery schedules on this date.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="text-left p-3 rounded-tl-xl w-12">No.</th>
                  <th className="text-left p-3">Category</th>
                  <th className="text-left p-3">Product Name</th>
                  <th className="text-right p-3 rounded-tr-xl">Total Needed Quantity</th>
                </tr>
              </thead>
              <tbody>
                {demands.map((d, index) => (
                  <tr key={d.id} className="table-row">
                    <td className="p-3 text-gray-500 font-medium">
                      {index + 1}.
                    </td>
                    <td className="p-3">
                      <span className="bg-gray-800 text-gray-300 text-xs px-2.5 py-1 rounded-lg border border-gray-700 font-medium">
                        {getCategoryEmoji(d.category)} {d.category}
                      </span>
                    </td>
                    <td className="p-3 text-white font-semibold">
                      {d.name}
                    </td>
                    <td className="p-3 text-right text-lg font-bold text-fresh-400">
                      {formatQuantity(d.total_qty, d.unit)}
                    </td>
                  </tr>
                ))}
                {/* Total row at footer */}
                <tr className="border-t border-gray-700 bg-gray-900/60 font-bold">
                  <td className="p-4 text-white" colSpan="3">
                    Total Weight of Weight-Based Items (gm/ml)
                  </td>
                  <td className="p-4 text-right text-lg text-fresh-400">
                    {formatWeight(totalWeightGm)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
