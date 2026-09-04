import React, { useState, useEffect } from 'react';
import { Activity, Clock, Users, CheckCircle, Hourglass } from 'lucide-react';
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
  const [workerLogs, setWorkerLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/production/dashboard');
      if (res.data.success) {
        setBatches(res.data.batches);
      }
      
      const logsRes = await api.get('/production/detailed-worker-logs');
      if (logsRes.data.success) {
        setWorkerLogs(logsRes.data.logs);
      }
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
      // Re-fetch data whenever an update is received
      fetchDashboard();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

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
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
              <Activity className="text-green-600" size={40} />
              Live Production Dashboard
            </h1>
            <p className="text-gray-500 mt-2 text-lg">Real-time status of vegetable processing pipeline</p>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-green-700 font-medium">Live Connection Active</span>
          </div>
        </header>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6 shadow-sm border border-red-200">
            {error}
          </div>
        )}

        {batches.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Hourglass className="mx-auto text-gray-400 mb-4" size={48} />
            <h2 className="text-2xl font-semibold text-gray-700">No Active Production Batches</h2>
            <p className="text-gray-500 mt-2">Create a new batch to start the processing pipeline.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {batches.map((batch) => (
              <div key={batch.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{batch.product}</h2>
                    <p className="text-gray-500 text-sm mt-1">Batch #{batch.id} • Total: {batch.total_qty_kg} kg • Pending: {batch.pending_qty_kg} kg</p>
                  </div>
                  {batch.pending_qty_kg === 0 ? (
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                      <CheckCircle size={16} /> All splits started
                    </span>
                  ) : (
                    <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                      <Hourglass size={16} /> {batch.pending_qty_kg} kg waiting
                    </span>
                  )}
                </div>
                
                <div className="p-6">
                  {batch.splits.length === 0 ? (
                    <p className="text-gray-400 italic">No splits have started processing yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {batch.splits.map((split) => (
                        <div key={split.id} className="border border-gray-100 rounded-lg bg-gray-50 p-4 shadow-sm relative overflow-hidden">
                          {/* Top indicator bar */}
                          <div className={`absolute top-0 left-0 w-full h-1 ${split.stage === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                          
                          <div className="flex justify-between items-start mb-3 mt-1">
                            <div>
                              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Split #{split.id}</span>
                              <h3 className="font-bold text-lg text-gray-800 mt-1">{split.qty_kg} kg</h3>
                            </div>
                            <span className={`px-2 py-1 text-xs font-bold rounded-md ${
                              split.stage === 'cleaning_cutting' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                              split.stage === 'completed' ? 'bg-green-100 text-green-700 border border-green-200' :
                              'bg-blue-100 text-blue-700 border border-blue-200'
                            }`}>
                              {split.stage.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>

                          <div className="space-y-3 mt-4">
                            <div className="flex items-center text-gray-600 text-sm">
                              <Users size={16} className="mr-2 text-gray-400" />
                              <span>{split.workers.length > 0 ? split.workers.join(', ') : 'No workers assigned'}</span>
                            </div>
                            
                            {split.eta_minutes !== null && (
                              <LiveTimer startedAt={split.started_at} expectedMinutes={split.eta_minutes} />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detailed Worker Logs Section */}
        <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="text-blue-600" size={24} />
              Detailed Worker Task Logs
            </h2>
            <p className="text-gray-500 text-sm mt-1">Real-time breakdown of worker assignments and task statuses.</p>
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
                {workerLogs.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-gray-500 italic">No worker logs available yet.</td>
                  </tr>
                ) : (
                  workerLogs.map((log, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{log.worker_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{log.task}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                          log.role === 'Initiator' ? 'bg-indigo-100 text-indigo-800' : 'bg-pink-100 text-pink-800'
                        }`}>
                          {log.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                          log.status === 'DONE' ? 'bg-green-100 text-green-800' : 
                          log.status === 'ALARM' ? 'bg-red-100 text-red-800' : 
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.assigned_at ? new Date(log.assigned_at).toLocaleTimeString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.started_at ? new Date(log.started_at).toLocaleTimeString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.completed_at ? new Date(log.completed_at).toLocaleTimeString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.duration_seconds > 0 ? `${Math.floor(log.duration_seconds / 60)}m ${log.duration_seconds % 60}s` : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
