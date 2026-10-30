import React, { useState, useEffect } from 'react';
import { Activity, Clock, Users, CheckCircle, Hourglass, Calendar, Filter, RotateCcw } from 'lucide-react';
import { io } from 'socket.io-client';
import api from "../../api/axios";

const LiveTimer = ({ startedAt, expectedMinutes }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt || expectedMinutes === null) return;

    const start = new Date(startedAt).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      setElapsed(Math.max(0, Math.floor((now - start) / 1000)));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startedAt, expectedMinutes]);

  if (!startedAt || expectedMinutes === null) {
    return (
      <div className="flex items-center text-gray-600 text-sm">
        <Clock size={16} className="mr-2 text-gray-400" />
        <span>ETA: <strong className="text-gray-900">{expectedMinutes !== null ? expectedMinutes : 0} mins</strong></span>
      </div>
    );
  }

  const expectedSeconds = expectedMinutes * 60;
  const isOverdue = elapsed > expectedSeconds;

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const expectedMins = Math.floor(expectedMinutes);
  const expectedSecs = Math.floor((expectedMinutes % 1) * 60);
  const formattedExpected = `${expectedMins.toString().padStart(2, '0')}:${expectedSecs.toString().padStart(2, '0')}`;

  return (
    <div className={`flex items-center text-sm ${isOverdue ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
      <Clock size={16} className={`mr-2 ${isOverdue ? 'text-red-600' : 'text-gray-400'}`} />
      <span>
        {formatTime(elapsed)} elapsed / {formattedExpected} expected
      </span>
    </div>
  );
};

export default function AdminProduction() {
  const [batches, setBatches] = useState([]);
  const [rawLogs, setRawLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedWorker, setSelectedWorker] = useState("all");
  const [availableWorkers, setAvailableWorkers] = useState([]);

  const fetchWorkerLogs = async (customOverrides = {}) => {
    setLoadingLogs(true);
    try {
      const activeFrom = customOverrides.fromDate !== undefined ? customOverrides.fromDate : fromDate;
      const activeTo = customOverrides.toDate !== undefined ? customOverrides.toDate : toDate;

      const params = {};
      if (activeFrom) params.from_date = activeFrom;
      if (activeTo) params.to_date = activeTo;

      const logsRes = await api.get('/production/detailed-worker-logs', { params });
      if (logsRes.data.success) {
        const fetchedLogs = logsRes.data.allLogs || logsRes.data.logs || [];
        setRawLogs(fetchedLogs);

        // Derive unique worker names from the fetched dataset
        const workers = logsRes.data.workers && logsRes.data.workers.length > 0
          ? logsRes.data.workers
          : [...new Set(fetchedLogs.map(l => l.worker_name).filter(Boolean))].sort();
        setAvailableWorkers(workers);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load worker logs.");
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/production/dashboard');
      if (res.data.success) {
        setBatches(res.data.batches);
      }
      await fetchWorkerLogs();
    } catch (err) {
      console.error(err);
      setError("Failed to load production data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();

    // Determine socket URL from axios baseURL
    const baseURL = api.defaults.baseURL || 'http://localhost:3000/api';
    const socketURL = baseURL.replace('/api', '');

    const socket = io(socketURL);

    socket.on('production:update', () => {
      fetchDashboard();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleApplyFilter = () => {
    fetchWorkerLogs();
  };

  const handleResetFilter = () => {
    setFromDate("");
    setToDate("");
    setSelectedWorker("all");
    fetchWorkerLogs({ fromDate: "", toDate: "" });
  };

  const displayedLogs = (selectedWorker === 'all' || !selectedWorker)
    ? rawLogs
    : rawLogs.filter(l => l.worker_name && l.worker_name.toLowerCase() === selectedWorker.toLowerCase());

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">

        {/* Detailed Worker Logs Section */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Users className="text-blue-600" size={24} />
                Detailed Worker Task Logs
              </h2>
              <p className="text-gray-500 text-sm mt-1">Real-time breakdown of worker assignments and task statuses.</p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full self-start sm:self-auto">
              {displayedLogs.length} {displayedLogs.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>

          {/* Filter Bar */}
          <div className="p-4 sm:p-6 border-b border-gray-100 bg-white">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1.5">
                  From Date
                </label>
                <input
                  type="date"
                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all shadow-sm"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1.5">
                  To Date
                </label>
                <input
                  type="date"
                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all shadow-sm"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1.5">
                  Worker Name
                </label>
                <select
                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all shadow-sm cursor-pointer"
                  value={selectedWorker}
                  onChange={e => setSelectedWorker(e.target.value)}
                >
                  <option value="all">All Workers ({availableWorkers.length})</option>
                  {availableWorkers.map((workerName, i) => (
                    <option key={i} value={workerName}>
                      {workerName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleApplyFilter}
                  disabled={loadingLogs}
                  className="flex-1 bg-green-600 hover:bg-green-500 active:bg-green-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 text-sm disabled:opacity-50"
                >
                  {loadingLogs ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Loading...
                    </>
                  ) : (
                    "Apply"
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleResetFilter}
                  className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl text-sm transition-all"
                  title="Reset filters and show all"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Worker Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task Details</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned At</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Started At</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed / Left</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loadingLogs ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-green-600 border-t-transparent" />
                        <span>Fetching worker logs...</span>
                      </div>
                    </td>
                  </tr>
                ) : displayedLogs.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-gray-500 italic">No worker logs available for the selected filters.</td>
                  </tr>
                ) : (
                  displayedLogs.map((log, index) => {
                    const formattedTask = (log.task || '').replace(/BUCKET_ARRANGE/gi, 'busket_arrange');

                    return (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{log.worker_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{formattedTask}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-bold rounded-full ${log.role === 'Initiator' ? 'bg-indigo-100 text-indigo-800' : 'bg-pink-100 text-pink-800'
                            }`}>
                            {log.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-bold rounded-full ${log.status === 'DONE' ? 'bg-green-100 text-green-800' :
                            log.status === 'ALARM' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.assigned_at ? (
                            <div>
                              <span className="font-medium text-gray-800">{new Date(log.assigned_at).toLocaleTimeString()}</span>
                              <span className="block text-xs text-gray-400">{new Date(log.assigned_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.started_at ? (
                            <div>
                              <span className="font-medium text-gray-800">{new Date(log.started_at).toLocaleTimeString()}</span>
                              <span className="block text-xs text-gray-400">{new Date(log.started_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.completed_at ? (
                            <div>
                              <span className="font-medium text-gray-800">{new Date(log.completed_at).toLocaleTimeString()}</span>
                              <span className="block text-xs text-gray-400">{new Date(log.completed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.duration_seconds > 0 ? `${Math.floor(log.duration_seconds / 60)}m ${log.duration_seconds % 60}s` : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
