import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AdminSeasonalSelections() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [date, setDate] = useState(tomorrowStr);
  const [selections, setSelections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchSelections = async (targetDate) => {
    setLoading(true);
    setMsg("");
    try {
      const res = await api.get(`/admin/seasonal-selections?date=${targetDate}`);
      setSelections(res.data.selections || []);
    } catch (err) {
      setMsg(`❌ Failed to load seasonal selections: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSelections(date);
  }, [date]);

  const filteredSelections = selections.filter(s => 
    s.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.user.phone.includes(searchTerm) ||
    s.package_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status, isAuto) => {
    if (status === 'selected') {
      return isAuto 
        ? <span className="badge badge-yellow text-xs">🤖 Auto-filled</span>
        : <span className="badge badge-green text-xs">✅ User Selected</span>;
    }
    if (status === 'fallback') {
      return <span className="badge badge-blue text-xs">📋 Default Fallback</span>;
    }
    return <span className="badge badge-gray text-xs">⏳ Selection Pending</span>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-header">Seasonal Picks 🥦</h1>
          <p className="page-sub">Monitor customer seasonal vegetable choices per service date</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Target Date:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input text-sm py-1.5 px-3 max-w-[180px]"
            />
          </div>
          <input
            type="text"
            placeholder="🔍 Search name, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input text-sm py-1.5 px-3 max-w-[200px]"
          />
        </div>
      </div>

      {msg && (
        <div className="rounded-xl px-4 py-3 text-sm bg-red-900/30 text-red-400 border border-red-700/50">
          {msg}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-gray-400 text-xs font-medium">Total Seasonal Deliveries</p>
          <p className="text-3xl font-extrabold text-white mt-1">{selections.length}</p>
        </div>
        <div className="card">
          <p className="text-gray-400 text-xs font-medium">User Selected</p>
          <p className="text-3xl font-extrabold text-fresh-400 mt-1">
            {selections.filter(s => s.status === 'selected' && !s.is_auto).length}
          </p>
        </div>
        <div className="card">
          <p className="text-gray-400 text-xs font-medium">Auto-filled / Default Fallback</p>
          <p className="text-3xl font-extrabold text-blue-400 mt-1">
            {selections.filter(s => s.is_auto || s.status === 'fallback').length}
          </p>
        </div>
      </div>

      {/* List of customer picks */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <span className="animate-pulse">Loading seasonal selections...</span>
        </div>
      ) : filteredSelections.length === 0 ? (
        <div className="card text-center py-16 text-gray-500">
          <p className="text-5xl mb-4">🥦</p>
          <p className="text-lg font-medium text-white">No seasonal packages scheduled</p>
          <p className="text-sm">No customers with active seasonal configuration have deliveries scheduled on this date.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSelections.map((sel) => (
            <div key={sel.schedule_id} className="card flex flex-col justify-between space-y-4 font-gradient-border">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold text-white">{sel.user.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{sel.user.phone}</p>
                  </div>
                  {getStatusBadge(sel.status, sel.is_auto)}
                </div>

                <div className="border-t border-gray-800 my-2 pt-2">
                  <p className="text-xs text-gray-400 font-semibold mb-1">Package: <span className="text-gray-300 font-normal">{sel.package_name}</span></p>
                  <p className="text-xs text-gray-400 font-semibold">Schedule ID: <span className="text-gray-300 font-normal">#{sel.schedule_id}</span></p>
                </div>

                {/* Fixed items display */}
                <div className="space-y-1.5">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Fixed Items:</p>
                  {sel.fixed_items && sel.fixed_items.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {sel.fixed_items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center bg-gray-800/40 px-2.5 py-1.5 rounded-lg border border-gray-700/50 text-xs">
                          <span className="text-gray-300 font-medium">{item.name} ({parseFloat(item.qty_gm)}{item.unit})</span>
                          <span className="text-fresh-400 font-semibold">₹{parseFloat(item.amount || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No fixed items.</p>
                  )}
                </div>

                {/* Seasonal items display */}
                <div className="space-y-1.5 pt-2">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Seasonal Items:</p>
                  {sel.seasonal_items && sel.seasonal_items.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {sel.seasonal_items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center bg-fresh-950/20 px-2.5 py-1.5 rounded-lg border border-fresh-800/20 text-xs">
                          <span className="text-fresh-300 font-medium">🌿 {item.name} ({parseFloat(item.qty_gm)}{item.unit})</span>
                          <span className="text-fresh-400 font-semibold">₹{parseFloat(item.amount || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No seasonal items.</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
