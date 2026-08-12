import React, { useState, useEffect } from "react";
import api from "../../api/axios";
import { Calendar, Activity, Clock, Layers, Leaf, Droplet, Sun, Scissors, Sparkles, User, Play, Pause, AlertTriangle } from "lucide-react";

export default function WorkingLogs() {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [logs, setLogs] = useState([]);
  const [liveWorkers, setLiveWorkers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [date]);

  useEffect(() => {
    fetchLiveWorkers();
    const interval = setInterval(fetchLiveWorkers, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/processing-logs?date=${date}`);
      if (response.data.success) {
        setLogs(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching working logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveWorkers = async () => {
    try {
      const response = await api.get(`/admin/live-workers`);
      if (response.data.success) {
        setLiveWorkers(response.data.workers);
      }
    } catch (error) {
      console.error("Error fetching live workers:", error);
    }
  };

  const getProcessIcon = (process) => {
    if (!process) return <Activity className="text-fresh-500" size={18} />;
    switch (process.toLowerCase()) {
      case 'soaking': return <Droplet className="text-blue-500" size={18} />;
      case 'drying': return <Sun className="text-yellow-500" size={18} />;
      case 'cutting': return <Scissors className="text-red-500" size={18} />;
      case 'weighing': return <Sparkles className="text-teal-500" size={18} />;
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
            Current Process & Logs
          </h1>
          <p className="text-gray-500 mt-2 text-sm md:text-base">
            Real-time status of workers and historical session logs.
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

      {/* LIVE WORKERS SECTION */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          Live Worker Status
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {liveWorkers.length === 0 ? (
            <p className="text-gray-500 text-center col-span-full py-6">Loading live status...</p>
          ) : (
            liveWorkers.map((worker) => (
              <div key={worker.workerId} className={`p-5 border rounded-2xl ${
                worker.taskStatus === 'IDLE' ? 'border-gray-200 bg-gray-50 opacity-80' : 
                worker.taskStatus === 'ALARM' ? 'border-red-300 bg-red-50' :
                'border-green-200 bg-green-50/30 shadow-sm'
              }`}>
                <div className="flex items-center gap-3 mb-4 border-b border-gray-100 pb-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600">
                    <User size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{worker.workerName}</h3>
                    <p className="text-xs text-gray-500">{worker.workerPhone}</p>
                  </div>
                </div>

                {worker.taskStatus === 'IDLE' ? (
                  <div className="text-center py-4 text-gray-500 font-medium">
                    Currently Idle
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase text-gray-500">Task</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 ${
                        worker.taskStatus === 'RUNNING' ? 'bg-green-100 text-green-700' :
                        worker.taskStatus === 'PAUSED' ? 'bg-yellow-100 text-yellow-700' :
                        worker.taskStatus === 'ALARM' ? 'bg-red-100 text-red-700' :
                        'bg-gray-200 text-gray-700'
                      }`}>
                        {worker.taskStatus === 'RUNNING' && <Play size={12} />}
                        {worker.taskStatus === 'PAUSED' && <Pause size={12} />}
                        {worker.taskStatus === 'ALARM' && <AlertTriangle size={12} />}
                        {worker.taskStatus}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        {getProcessIcon(worker.stage)} {worker.productName}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-semibold text-gray-900">{worker.quantityGrams}g</span> - {worker.stage} Stage
                      </p>
                    </div>

                    {worker.taskStatus === 'RUNNING' && worker.remainingSeconds !== undefined && (
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Time Remaining</p>
                        <p className="text-xl font-mono font-bold text-blue-600">
                          {Math.floor(worker.remainingSeconds / 60).toString().padStart(2, '0')}:
                          {(worker.remainingSeconds % 60).toString().padStart(2, '0')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <hr className="border-gray-200 my-8" />

      {/* HISTORICAL LOGS SECTION */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Layers className="text-gray-400" size={24} />
          Historical Working Logs
        </h2>

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
                              <th className="px-4 py-3">Expected Time</th>
                              <th className="px-4 py-3">Time Taken</th>
                              <th className="px-4 py-3">Completed By</th>
                              <th className="px-4 py-3 rounded-r-lg">Ended At</th>
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
                                  {session.processed_qty_gm >= 1000 
                                    ? `${(session.processed_qty_gm / 1000).toFixed(2)} kg` 
                                    : `${session.processed_qty_gm || 0} gm`}
                                </td>
                                <td className="px-4 py-3 text-gray-500 text-sm">
                                  {session.expected_time_taken_minutes || 0} mins
                                </td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-medium text-xs">
                                    <Clock size={14} />
                                    {session.time_taken_minutes || 0} mins
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-gray-600 text-sm capitalize">
                                  {session.CompletedBy ? session.CompletedBy.fullname : (session.is_ended ? "Admin" : "Wait...")}
                                </td>
                                <td className="px-4 py-3 text-gray-500 text-xs">
                                  {session.end_time ? new Date(session.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "In Progress"}
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
    </div>
  );
}
