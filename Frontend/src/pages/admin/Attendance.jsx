import React, { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import api from "../../api/axios";

export default function Attendance() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchAttendance();
  }, [filterDate]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/attendance?date=${filterDate}`);
      if (res.data && res.data.success) {
        setLogs(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch attendance logs", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const name = (log.DeliveryBoy?.name || "").toLowerCase();
    const phone = (log.DeliveryBoy?.phone || "").toLowerCase();
    const date = (log.date || "").toLowerCase();
    return name.includes(q) || phone.includes(q) || date.includes(q);
  });

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Delivery Boy Attendance</h1>
          <p className="text-sm text-gray-500 mt-1">View login attendance and track delivery boy shifts</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Live Search Input */}
          <div className="relative min-w-[220px] max-w-xs w-full sm:w-auto">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search delivery boy or phone..."
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

          {/* Date Picker */}
          <input 
            type="date" 
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="input-primary py-2 px-3 text-sm rounded-xl border border-gray-200 bg-white shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchQuery.trim()
              ? `No attendance records matching "${searchQuery}".`
              : "No attendance records found for this date."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 text-sm">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">Delivery Boy</th>
                  <th className="text-left py-3 px-4 font-medium">Phone</th>
                  <th className="text-left py-3 px-4 font-medium">Date</th>
                  <th className="text-left py-3 px-4 font-medium">First Login Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4 text-gray-800 font-medium">{log.DeliveryBoy?.name || "N/A"}</td>
                    <td className="py-3 px-4 text-gray-600">{log.DeliveryBoy?.phone || "N/A"}</td>
                    <td className="py-3 px-4 text-gray-600">{log.date}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(log.login_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
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
