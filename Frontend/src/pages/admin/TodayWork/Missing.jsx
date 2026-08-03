import { useEffect, useState } from "react";
import api from "../../../api/axios";
import { Filter, User, Package, ShoppingBag, Clock } from "lucide-react";

export default function Missing() {
  const [missingLogs, setMissingLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Date Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

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

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen">
      {/* Header & Date Pickers */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Missing Items & Orders</h1>
          <p className="text-gray-500 text-sm">Track missing items and full orders</p>
        </div>
        
        <div className="flex items-center gap-3">
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
                {missingLogs.map((log) => (
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
