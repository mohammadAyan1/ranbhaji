import React, { useState, useEffect, useRef } from 'react';
import {
    getTodayBatches, getBatchDemand, assignNextTask, startTaskStage,
    pauseTask, resumeTask, completeTask, acknowledgeAlarm, joinTask,
    markAttendance, checkAlarms, syncTask, getTaskBuckets, triggerAlarm
} from '../../api/workerTask.api';

const WorkerDashboard = () => {
    const [attendanceMarked, setAttendanceMarked] = useState(false);
    const [batches, setBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState('');
    const [demand, setDemand] = useState([]);
    const [currentTask, setCurrentTask] = useState(null);
    const [alarmTask, setAlarmTask] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isAlarmModalOpen, setIsAlarmModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [dryingModeSelection, setDryingModeSelection] = useState('machine');
    const [taskBuckets, setTaskBuckets] = useState([]);

    const timerRef = useRef(null);
    const syncTimerRef = useRef(null);

    // Initial load and Alarm Polling
    useEffect(() => {
        // Load batches
        getTodayBatches().then(res => {
            if (res.success) setBatches(res.batches);
        }).catch(console.error);

        // Poll for alarms every 10 seconds
        const alarmInterval = setInterval(() => {
            if (selectedBatch) {
                checkAlarms(selectedBatch).then(res => {
                    if (res.success && res.task && res.task.status === 'ALARM') {
                        // Only open if modal is not already open — prevents loop
                        setAlarmTask(prev => res.task);
                        setIsAlarmModalOpen(prev => { if (!prev) return true; return prev; });
                    }
                }).catch(e => console.error("Alarm poll error:", e));
            }
        }, 10000);

        return () => clearInterval(alarmInterval);
    }, [selectedBatch]);

    // Background sync of current task to catch time jumps (when another worker joins/leaves)
    useEffect(() => {
        if (currentTask && ['RUNNING', 'PAUSED'].includes(currentTask.status)) {
            syncTimerRef.current = setInterval(async () => {
                try {
                    const res = await syncTask(currentTask.id);
                    if (res.success && res.task) {
                        if (res.task.status === 'DONE') {
                            // Another worker completed this joint task. Move to next task.
                            clearInterval(syncTimerRef.current);
                            setCurrentTask(null);
                            fetchNextTask();
                        } else if (res.task.status === 'ALARM') {
                            // Backend has fired alarm — stop sync, open modal ONCE.
                            // Do NOT call setCurrentTask here, as that re-triggers
                            // the timer useEffect and reopens the modal every 5 seconds.
                            clearInterval(syncTimerRef.current);
                            setAlarmTask(res.task);
                            setIsAlarmModalOpen(true);
                        } else {
                            // Only update remaining_seconds if server value differs
                            // significantly (>2 sec) to avoid timer reset on every sync
                            setCurrentTask(prev => {
                                if (prev && prev.id === res.task.id) {
                                    const diff = Math.abs(
                                        (prev.remaining_seconds || 0) - (res.task.remaining_seconds || 0)
                                    );
                                    // Only sync if worker count changed (remaining changed a lot)
                                    // This avoids resetting the countdown timer on every poll
                                    if (diff > 5) {
                                        return res.task;
                                    }
                                }
                                return prev;
                            });
                        }
                    }
                } catch (e) {
                    // ignore sync errors
                }
            }, 5000); // Sync every 5 seconds
        }

        return () => {
            if (syncTimerRef.current) clearInterval(syncTimerRef.current);
        };
    }, [currentTask?.id, currentTask?.status]);

    // Timer logic — count down from remaining_seconds, not from started_at
    // Using started_at causes IST/UTC timezone confusion and instant alarm bug
    useEffect(() => {
        if (timerRef.current) clearInterval(timerRef.current);

        if (currentTask && currentTask.status === 'RUNNING') {
            // Set initial time from what server says
            const initialRemaining = currentTask.remaining_seconds;
            setTimeLeft(initialRemaining);

            if (initialRemaining <= 0) {
                setAlarmTask(currentTask);
                setIsAlarmModalOpen(true);
                return;
            }

            // Track when this effect started so we can count down accurately
            const effectStartTime = Date.now();
            const startingRemaining = initialRemaining;

            timerRef.current = setInterval(() => {
                const elapsedSinceSync = Math.floor((Date.now() - effectStartTime) / 1000);
                const remaining = startingRemaining - elapsedSinceSync;

                if (remaining <= 0) {
                    setTimeLeft(0);
                    clearInterval(timerRef.current);
                    setAlarmTask(currentTask);
                    setIsAlarmModalOpen(true);
                } else {
                    setTimeLeft(remaining);
                }
            }, 1000);
        } else if (currentTask) {
            setTimeLeft(currentTask.remaining_seconds);
            // Only open modal if not already open to prevent re-opening on every render
            if (currentTask.status === 'ALARM' && !isAlarmModalOpen) {
                setAlarmTask(currentTask);
                setIsAlarmModalOpen(true);
            }
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [currentTask]);

    // Fetch buckets if stage is BUCKET_ARRANGE
    useEffect(() => {
        if (currentTask && currentTask.stage === 'BUCKET_ARRANGE') {
            getTaskBuckets(currentTask.id).then(res => {
                if (res.success) {
                    setTaskBuckets(res.buckets || []);
                }
            }).catch(console.error);
        } else {
            setTaskBuckets([]);
        }
    }, [currentTask?.id, currentTask?.stage]);

    const handleMarkAttendance = async () => {
        try {
            setLoading(true);
            await markAttendance();
            setAttendanceMarked(true);
        } catch (e) {
            alert(e.response?.data?.message || 'Error marking attendance');
            // If already marked, allow proceed
            if (e.response?.data?.message?.includes('already marked')) {
                setAttendanceMarked(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSelectBatch = async (batchId) => {
        setSelectedBatch(batchId);
        try {
            const res = await getBatchDemand(batchId);
            if (res.success) setDemand(res.demand);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchNextTask = async () => {
        if (!selectedBatch) return alert("Select a batch first");
        setLoading(true);
        try {
            const res = await assignNextTask(selectedBatch);
            if (res.success) {
                if (res.task) {
                    setCurrentTask(res.task);
                    if (res.task.status === 'ALARM') {
                        setAlarmTask(res.task);
                        setIsAlarmModalOpen(true);
                    }
                } else {
                    alert("No more tasks available. You are idle.");
                    setCurrentTask(null);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleStartTask = async () => {
        if (!currentTask) return;
        try {
            const payload = {};
            if (currentTask.stage === 'DRYING') {
                payload.drying_mode = dryingModeSelection;
            }
            const res = await startTaskStage(currentTask.id, payload);
            if (res.success) setCurrentTask(res.task);
        } catch (e) {
            console.error(e);
        }
    };

    // 🧪 TESTING ONLY: Skip timer and force alarm immediately
    const handleSkipTimer = async () => {
        if (!currentTask || currentTask.status !== 'RUNNING') return;
        try {
            const res = await triggerAlarm(currentTask.id);
            if (res.success) {
                // Sync the local state to show alarm
                setAlarmTask(res.task || currentTask);
                setIsAlarmModalOpen(true);
                if (timerRef.current) clearInterval(timerRef.current);
                if (syncTimerRef.current) clearInterval(syncTimerRef.current);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handlePauseTask = async () => {
        if (!currentTask) return;
        try {
            const res = await pauseTask(currentTask.id);
            if (res.success) setCurrentTask(res.task);
        } catch (e) {
            console.error(e);
        }
    };

    const handleResumeTask = async () => {
        if (!currentTask) return;
        try {
            const res = await resumeTask(currentTask.id);
            if (res.success) setCurrentTask(res.task);
        } catch (e) {
            console.error(e);
        }
    };

    const handleCompleteTask = async () => {
        if (!currentTask) return;
        try {
            const res = await completeTask(currentTask.id);
            if (res.success) {
                setCurrentTask(null);
                // Immediately check for next task
                fetchNextTask();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleAcknowledgeAlarm = async () => {
        if (!alarmTask) return;
        try {
            const res = await acknowledgeAlarm(alarmTask.id);
            if (res.success) {
                setIsAlarmModalOpen(false);
                setAlarmTask(null);

                // Only auto-switch if the alarm was for the current active task
                if (!currentTask || currentTask.id === alarmTask.id) {
                    setCurrentTask(null);
                    fetchNextTask();
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    if (!attendanceMarked) {
        return (
            <div className="p-8 text-center max-w-md mx-auto mt-10 bg-white shadow rounded-lg">
                <h1 className="text-2xl font-bold mb-4">Worker Login</h1>
                <p className="mb-6 text-gray-600">Please mark your attendance to start the day.</p>
                <button
                    onClick={handleMarkAttendance}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? 'Processing...' : 'Mark Attendance & Start'}
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Worker Dashboard</h1>

            {!currentTask && (
                <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
                    <h2 className="text-xl font-semibold mb-4">Select Batch to Work On</h2>
                    <div className="flex gap-4 mb-4">
                        <select
                            className="flex-1 p-3 border rounded-lg"
                            value={selectedBatch}
                            onChange={(e) => handleSelectBatch(e.target.value)}
                        >
                            <option value="">-- Select Batch --</option>
                            {batches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={fetchNextTask}
                            disabled={!selectedBatch || loading}
                            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                            Start Work
                        </button>
                    </div>

                    {selectedBatch && demand.length > 0 ? (
                        <div className="mt-4">
                            <h3 className="font-semibold mb-2">Batch Demand:</h3>
                            <ul className="list-disc pl-5">
                                {demand.map((d, i) => (
                                    <li key={i}>{d.productName}: {d.quantity}g</li>
                                ))}
                            </ul>
                        </div>
                    ) : selectedBatch && demand.length === 0 ? (
                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                            <h3 className="font-semibold flex items-center gap-2">
                                <span>⚠️</span> No Products Found
                            </h3>
                            <p className="mt-1 text-sm">
                                There are currently no products assigned or pending for this batch.
                                Please ensure that product demands have been created from purchase logs by the admin.
                            </p>
                        </div>
                    ) : null}
                </div>
            )}

            {currentTask && (
                <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-blue-100">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-blue-900">Current Task: {currentTask.stage}</h2>
                        <span className={`px-4 py-1 rounded-full text-sm font-bold ${currentTask.status === 'RUNNING' ? 'bg-green-100 text-green-800' :
                            currentTask.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' :
                                currentTask.status === 'ALARM' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                            }`}>
                            {currentTask.status}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8 text-lg">
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-gray-500 text-sm font-semibold">Product</p>
                            <p className="font-bold">{currentTask.Product ? currentTask.Product.name : `Product ID: ${currentTask.product_id}`}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-gray-500 text-sm font-semibold">Quantity</p>
                            <p className="font-bold">{currentTask.quantity_grams}g</p>
                        </div>
                    </div>

                    <div className="text-center mb-8">
                        <p className="text-gray-500 font-semibold mb-2">Time Remaining</p>
                        <div className="text-6xl font-mono font-bold text-blue-600">
                            {formatTime(timeLeft)}
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 items-center justify-center">
                        {currentTask.status === 'NOT_STARTED' && currentTask.stage === 'DRYING' && (
                            <div className="mb-4 bg-gray-50 p-4 rounded-xl border border-gray-200 w-full max-w-md">
                                <p className="font-semibold text-gray-700 mb-2">Select Drying Method:</p>
                                <div className="flex flex-col gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="dryingMode" value="machine" checked={dryingModeSelection === 'machine'} onChange={() => setDryingModeSelection('machine')} className="w-5 h-5 text-blue-600" />
                                        <span>Machine (Background Process)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="dryingMode" value="piece" checked={dryingModeSelection === 'piece'} onChange={() => setDryingModeSelection('piece')} className="w-5 h-5 text-blue-600" />
                                        <span>Manual - Piece Base (Synchronous)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="dryingMode" value="gram" checked={dryingModeSelection === 'gram'} onChange={() => setDryingModeSelection('gram')} className="w-5 h-5 text-blue-600" />
                                        <span>Manual - Gram Base (Synchronous)</span>
                                    </label>
                                </div>
                            </div>
                        )}
                        {currentTask.status === 'NOT_STARTED' && (
                            <button onClick={handleStartTask} className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-green-700 w-full max-w-md">
                                Start Stage
                            </button>
                        )}
                        {currentTask.status === 'RUNNING' && (
                            <>
                                <button onClick={handlePauseTask} className="bg-yellow-500 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-yellow-600 w-full max-w-md">
                                    Pause
                                </button>
                                {/* 🧪 TESTING ONLY BUTTON — Remove before production */}
                                {import.meta.env.DEV && (
                                    <button
                                        onClick={handleSkipTimer}
                                        title="Testing only: Force complete timer now"
                                        className="bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-orange-600 w-full max-w-md border-2 border-dashed border-orange-300"
                                    >
                                        ⚡ Skip Timer (Test Only)
                                    </button>
                                )}
                                {currentTask.stage === 'BUCKET_ARRANGE' ? (
                                    <div className="w-full max-w-md bg-green-50 border border-green-200 p-4 rounded-lg mt-4 mb-4">
                                        <h3 className="font-bold text-green-800 mb-2">User Bucket List (Demands)</h3>
                                        {taskBuckets.length > 0 ? (
                                            <ul className="list-none pl-2 text-left text-sm text-green-900 font-medium space-y-2">
                                                {taskBuckets.map((bucket, idx) => (
                                                    <li key={idx} className="flex items-center">
                                                        <span className="font-bold text-green-800 bg-green-200 px-2 py-0.5 rounded-full mr-2 min-w-[30px] text-center">
                                                            #{idx + 1}
                                                        </span>
                                                        <span>{bucket.userName}: {bucket.quantity}g</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-green-700 italic">Loading buckets...</p>
                                        )}
                                    </div>
                                ) : null}
                                {['SOAKING'].includes(currentTask.stage) || (currentTask.stage === 'DRYING' && (!currentTask.drying_mode || currentTask.drying_mode === 'machine')) ? (
                                    <button
                                        onClick={() => {
                                            setCurrentTask(null);
                                            fetchNextTask();
                                        }}
                                        className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-indigo-700 w-full max-w-md"
                                    >
                                        Run in Background & Next Task
                                    </button>
                                ) : (
                                    <button onClick={handleCompleteTask} className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-blue-700 w-full max-w-md">
                                        Mark Complete
                                    </button>
                                )}
                            </>
                        )}
                        {currentTask.status === 'PAUSED' && (
                            <button onClick={handleResumeTask} className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-green-700">
                                Resume Task
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Alarm Modal */}
            {isAlarmModalOpen && alarmTask && alarmTask.status === 'ALARM' && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-8 rounded-xl max-w-sm w-full text-center shadow-2xl border-4 border-red-500">
                        <div className="text-red-500 text-6xl mb-4">🚨</div>
                        <h3 className="text-2xl font-bold mb-2">Timer Finished!</h3>
                        <p className="text-gray-600 mb-6 text-lg">
                            The <strong className="text-black">{alarmTask.stage}</strong> stage for <strong className="text-blue-700">{alarmTask.Product ? alarmTask.Product.name : `Product ID: ${alarmTask.product_id}`}</strong> has completed.
                        </p>
                        <button
                            onClick={handleAcknowledgeAlarm}
                            className="w-full bg-red-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-red-700"
                        >
                            Acknowledge & Stop Alarm
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkerDashboard;
