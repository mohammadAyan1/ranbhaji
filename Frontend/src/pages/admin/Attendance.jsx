import React, { useState, useEffect } from "react";
import api from "../../api/axios";

export default function Attendance() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Delivery Boy Attendance</h1>
        <div className="flex gap-2">
          <input 
            type="date" 
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="input-primary"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No attendance records found for this date.</div>
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
                {logs.map((log) => (
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
