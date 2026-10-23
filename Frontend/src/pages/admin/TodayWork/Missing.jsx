import { useEffect, useState } from "react";
import api from "../../../api/axios";
import { Search, X, Filter, User, Package, ShoppingBag, Clock } from "lucide-react";

export default function Missing() {
  const [missingLogs, setMissingLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Date & Search Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchMissingLogs = () => {
    setLoading(true);
    let url = `/today-work/missing-items?`;
    if (fromDate) url += `fromDate=${fromDate}&`;
    if (toDate) url += `toDate=${toDate}&`;
    
    api.get(url)
      .then(res => {
        setMissingLogs(res.data.missing_logs || []);
      })
      .catch(err => {
        console.error("Failed to fetch missing logs", err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMissingLogs();
  }, [fromDate, toDate]);

  const filteredLogs = missingLogs.filter(log => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const userName = (log.user?.name || "").toLowerCase();
    const userPhone = (log.user?.phone || "").toLowerCase();
    const prodName = (log.product?.name || "").toLowerCase();
    const hindiName = (log.product?.hindi_name || "").toLowerCase();
    const pkgName = (log.service_info?.packageName || "").toLowerCase();
    const sourceType = (log.source_type || "").toLowerCase();
    const missedDate = (log.missed_date || "").toLowerCase();
    const nextDate = (log.next_schedule_date || "").toLowerCase();

    return (
      userName.includes(q) ||
      userPhone.includes(q) ||
      prodName.includes(q) ||
      hindiName.includes(q) ||
      pkgName.includes(q) ||
      sourceType.includes(q) ||
      missedDate.includes(q) ||
      nextDate.includes(q)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen">
      {/* Header & Date Pickers & Search */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Missing Items & Orders</h1>
          <p className="text-gray-500 text-sm">Track missing items and full orders</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Live Search Bar */}
          <div className="relative min-w-[220px] max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user, package, item..."
              className="w-full pl-10 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-gray-800 placeholder-gray-400 shadow-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="input-field py-2 px-3 text-sm w-36 bg-gray-50 border border-gray-200 rounded-xl outline-none" 
            />
            <span className="text-gray-400 font-medium">to</span>
            <input 
              type="date" 
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="input-field py-2 px-3 text-sm w-36 bg-gray-50 border border-gray-200 rounded-xl outline-none" 
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading missing logs...</div>
        ) : missingLogs.length === 0 ? (
          <div className="p-8 text-center text-gray-500 font-medium">No missing items found for the selected dates.</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-gray-500 font-medium">
            No missing items matching "<span className="text-gray-800 font-semibold">{searchQuery}</span>"
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="py-4 px-6 font-semibold text-gray-600 text-sm">Customer</th>
                  <th className="py-4 px-6 font-semibold text-gray-600 text-sm">Missing Item / Order</th>
                  <th className="py-4 px-6 font-semibold text-gray-600 text-sm">Type</th>
                  <th className="py-4 px-6 font-semibold text-gray-600 text-sm">Source / Service Info</th>
                  <th className="py-4 px-6 font-semibold text-gray-600 text-sm">Missed Date</th>
                  <th className="py-4 px-6 font-semibold text-gray-600 text-sm">Expected Arrival</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                          <User size={16} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{log.user?.name || "Unknown"}</p>
                          <p className="text-xs text-gray-500">{log.user?.phone}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-900 text-sm">
                        {log.is_full_order ? "Full Order Missing" : log.product?.name}
                      </div>
                      {!log.is_full_order && log.product && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          Qty: {log.missed_qty} {log.product.unit} • {log.product.hindi_name}
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                        log.is_full_order 
                          ? 'bg-red-50 text-red-600' 
                          : 'bg-orange-50 text-orange-600'
                      }`}>
                        {log.is_full_order ? "Full Order" : "Partial Item"}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1 text-sm text-gray-600">
                        {log.source_type === 'subscription' ? (
                          <>
                            <div className="flex items-center gap-1.5 font-medium text-purple-600">
                              <Package size={14} /> Subscription
                            </div>
                            {log.service_info && (
                              <div className="text-xs text-gray-500">
                                {log.service_info.packageName || 'Package'} • Service {log.service_info.servicesCompleted} / {log.service_info.totalServices}
                              </div>
                            )}
                          </>
                        ) : log.source_type === 'retail' ? (
                          <div className="flex items-center gap-1.5 font-medium text-blue-600">
                            <ShoppingBag size={14} /> Retail Order
                          </div>
                        ) : (
                          <span className="text-gray-400">Unknown</span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                        <Clock size={14} className="text-gray-400" />
                        {log.missed_date}
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      {log.next_schedule_date ? (
                        <span className="text-sm font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-md">
                          {log.next_schedule_date}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">Not scheduled yet</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
