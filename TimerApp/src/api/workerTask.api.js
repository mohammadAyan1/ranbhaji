import api from './api';

export const login = async (phone, password) => {
    const res = await api.post('/auth/login', { phone, password });
    return res.data;
};

export const getTodayBatches = async () => {
    const res = await api.get('/worker-tasks/batches');
    return res.data;
};

export const getBatchDemand = async (batchId) => {
    const res = await api.get(`/worker-tasks/batches/${batchId}/demand`);
    return res.data;
};

export const assignNextTask = async (batchId) => {
    const res = await api.get(`/worker-tasks/assign?batchId=${batchId}`);
    return res.data;
};

export const checkAlarms = async (batchId) => {
    const res = await api.get(`/worker-tasks/alarms?batchId=${batchId}`);
    return res.data;
};

export const syncTask = async (taskId) => {
    const res = await api.get(`/worker-tasks/tasks/${taskId}/sync`);
    return res.data;
};

export const startTaskStage = async (taskId, payload = {}) => {
    const res = await api.post(`/worker-tasks/tasks/${taskId}/start`, payload);
    return res.data;
};

export const pauseTask = async (taskId) => {
    const res = await api.post(`/worker-tasks/tasks/${taskId}/pause`);
    return res.data;
};

export const resumeTask = async (taskId) => {
    const res = await api.post(`/worker-tasks/tasks/${taskId}/resume`);
    return res.data;
};

export const completeTask = async (taskId) => {
    const res = await api.post(`/worker-tasks/tasks/${taskId}/complete`);
    return res.data;
};

export const acknowledgeAlarm = async (taskId) => {
    const res = await api.post(`/worker-tasks/tasks/${taskId}/acknowledge`);
    return res.data;
};

export const joinTask = async (taskId, payload = {}) => {
    const res = await api.post(`/worker-tasks/tasks/${taskId}/join`, payload);
    return res.data;
};

export const triggerAlarm = async (taskId) => {
    const res = await api.post(`/worker-tasks/tasks/${taskId}/trigger-alarm`);
    return res.data;
};

// Attendance
export const markAttendance = async () => {
    const res = await api.post('/attendance/mark');
    return res.data;
};

export const getTaskBuckets = async (taskId) => {
    const res = await api.get(`/worker-tasks/tasks/${taskId}/buckets`);
    return res.data;
};

export const getMyActiveTasks = async () => {
    const res = await api.get(`/worker-tasks/tasks/active`);
    return res.data;
};

// Stuck tasks (PAUSED/NOT_STARTED assigned to this worker - blocking pipeline)
export const getStuckTasks = async () => {
    const res = await api.get(`/worker-tasks/tasks/stuck`);
    return res.data;
};

// Force complete a stuck task from dashboard (replaces manual SQL)
export const forceCompleteTask = async (taskId) => {
    const res = await api.post(`/worker-tasks/tasks/${taskId}/force-complete`);
    return res.data;
};

// Get the worker's task history for today
export const getMyTaskHistory = async () => {
    const res = await api.get(`/worker-tasks/tasks/history`);
    return res.data;
};

