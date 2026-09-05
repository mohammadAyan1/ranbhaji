import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from '../src/utils/storage';
import { login } from '../src/api/workerTask.api';

export default function LoginScreen() {
    const router = useRouter();
    const [phone, setPhone] = useState('9000000004'); // default for testing
    const [password, setPassword] = useState('pass123');
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const checkToken = async () => {
            try {
                const token = await SecureStore.getItemAsync('worker_token');
                const role = await SecureStore.getItemAsync('user_role');
                if (token && role === 'delivery') {
                    router.replace('/dashboard');
                }
            } catch (e) {
                // ignore
            } finally {
                setChecking(false);
            }
        };
        checkToken();
    }, []);

    const handleLogin = async () => {
        if (!phone || !password) return alert('Enter phone and password');
        setLoading(true);
        try {
            const data = await login(phone, password);
            if (data.success) {
                if (data.user.role !== 'delivery') {
                    alert('Access Denied. Only delivery/production workers allowed.');
                    return;
                }
                
                await SecureStore.setItemAsync('worker_token', data.token);
                await SecureStore.setItemAsync('user_id', data.user.id.toString());
                await SecureStore.setItemAsync('user_name', data.user.name);
                await SecureStore.setItemAsync('user_role', data.user.role);
                
                router.replace('/dashboard');
            }
        } catch (e) {
            console.error(e);
            alert(e.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    if (checking) return <View style={styles.center}><ActivityIndicator size="large" color="#4CAF50" /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>RamBhaji 🥦</Text>
                <Text style={styles.subtitle}>Production Worker Panel</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter phone"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                />

                <Text style={styles.label}>Password</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <TouchableOpacity 
                    style={[styles.button, loading && styles.buttonDisabled]} 
                    onPress={handleLogin} 
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Login</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
    container: { flex: 1, backgroundColor: '#F3F4F6', justifyContent: 'center', padding: 20 },
    header: { alignItems: 'center', marginBottom: 40 },
    title: { fontSize: 36, fontWeight: 'bold', color: '#2E7D32' },
    subtitle: { fontSize: 18, color: '#555', marginTop: 5 },
    card: { backgroundColor: '#fff', padding: 25, borderRadius: 15, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
    input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 16 },
    button: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
