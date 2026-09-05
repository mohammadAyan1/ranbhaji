import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const setItemAsync = async (key, value) => {
    if (Platform.OS === 'web') {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.error('Local storage is unavailable:', e);
        }
    } else {
        await SecureStore.setItemAsync(key, value);
    }
};

export const getItemAsync = async (key) => {
    if (Platform.OS === 'web') {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.error('Local storage is unavailable:', e);
            return null;
        }
    } else {
        return await SecureStore.getItemAsync(key);
    }
};

export const deleteItemAsync = async (key) => {
    if (Platform.OS === 'web') {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('Local storage is unavailable:', e);
        }
    } else {
        await SecureStore.deleteItemAsync(key);
    }
};

// In-memory cache for large objects (bypasses SecureStore limits)
const memoryCache = {};
export const setMemoryItem = (key, value) => { memoryCache[key] = value; };
export const getMemoryItem = (key) => memoryCache[key];
