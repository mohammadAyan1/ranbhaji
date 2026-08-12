import api from './axios';

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

export const startTaskStage = async (taskId) => {
    const res = await api.post(`/worker-tasks/tasks/${taskId}/start`);
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

export const joinTask = async (taskId) => {
    const res = await api.post(`/worker-tasks/tasks/${taskId}/join`);
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
