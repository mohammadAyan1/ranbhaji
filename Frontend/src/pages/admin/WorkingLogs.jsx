import React, { useState, useEffect } from "react";
import api from "../../api/axios";
import { Calendar, Activity, Clock, Layers, Leaf, Droplet, Sun, Scissors, Sparkles } from "lucide-react";

export default function WorkingLogs() {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [date]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/processing-logs?date=${date}`);
      if (response.data.success) {
        setLogs(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching working logs:", error);
      alert("Failed to load working logs");
    } finally {
      setLoading(false);
    }
  };

  const getProcessIcon = (process) => {
    switch (process.toLowerCase()) {
      case 'soaking': return <Droplet className="text-blue-500" size={18} />;
      case 'drying': return <Sun className="text-yellow-500" size={18} />;
      case 'cutting': return <Scissors className="text-red-500" size={18} />;
      case 'cleaning': return <Sparkles className="text-teal-500" size={18} />;
      default: return <Activity className="text-fresh-500" size={18} />;
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 pb-24">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <Activity className="text-fresh-500" size={32} />
            Working Logs
          </h1>
          <p className="text-gray-500 mt-2 text-sm md:text-base">
            Detailed session logs for product processing.
          </p>
        </div>
        
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 w-fit">
          <div className="p-2.5 bg-fresh-50 text-fresh-600 rounded-xl">
            <Calendar size={20} />
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border-none bg-transparent focus:ring-0 text-sm font-semibold text-gray-700 cursor-pointer w-40"
          />
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fresh-600"></div>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mb-4">
            <Layers className="text-gray-400" size={32} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No logs found</h3>
          <p className="text-gray-500">No working logs recorded for {new Date(date).toDateString()}.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {logs.map((productGroup) => (
            <div key={productGroup.product_id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Leaf className="text-fresh-500" size={20} />
                  {productGroup.product_name}
                </h2>
              </div>
              
              <div className="p-5 grid gap-6">
                {Object.entries(productGroup.processes).map(([processType, sessions]) => (
                  <div key={processType} className="space-y-3">
                    <h3 className="text-md font-semibold text-gray-800 capitalize flex items-center gap-2">
                       <Activity className="text-fresh-500" size={16} /> 
                       Process: {processType}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 font-medium">
                          <tr>
                            <th className="px-4 py-3 rounded-l-lg">Session</th>
                            <th className="px-4 py-3">Batch</th>
                            <th className="px-4 py-3">Quantity</th>
                            <th className="px-4 py-3">Time Taken</th>
                            <th className="px-4 py-3 rounded-r-lg">Recorded At</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {sessions.map((session, index) => (
                            <tr key={session.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-4 py-3 font-medium text-gray-900">
                                Session {index + 1}
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {session.batch_name}
                              </td>
                              <td className="px-4 py-3 font-semibold text-gray-700">
                                {session.qty_gm >= 1000 
                                  ? `${(session.qty_gm / 1000).toFixed(2)} kg` 
                                  : `${session.qty_gm} gm`}
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-medium text-xs">
                                  <Clock size={14} />
                                  {session.time_taken_minutes} mins
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-500 text-xs">
                                {new Date(session.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
