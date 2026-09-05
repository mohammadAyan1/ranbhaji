import axios from 'axios';
import * as SecureStore from '../utils/storage';

// Setting this to local backend for debugging
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://rambhaji.backend.shreenari.com/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

api.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync('worker_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

api.interceptors.response.use((response) => {
    if (response.headers && response.headers.date) {
        const serverTime = new Date(response.headers.date).getTime();
        const clientTime = Date.now();
        SecureStore.setMemoryItem('time_offset', (serverTime - clientTime).toString());
    }
    return response;
}, (error) => {
    return Promise.reject(error);
});

export default api;
