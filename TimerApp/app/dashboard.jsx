import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Alert, Modal, AppState, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import * as SecureStore from '../src/utils/storage';
import { getTodayBatches, markAttendance, getBatchDemand, assignNextTask, getMyActiveTasks, acknowledgeAlarm, getStuckTasks, forceCompleteTask } from '../src/api/workerTask.api';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Live Countdown Timer Component ───────────────────────────────────────────
function LiveCountdown({ task }) {
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        if (!task || task.status !== 'RUNNING' || !task.started_at) {
            setTimeLeft(task?.remaining_seconds || 0);
            return;
        }

        const parseDateAsUTC = (dateStr) => {
            if (!dateStr) return new Date();
            if (dateStr.includes('Z') || dateStr.match(/[+-]\d{2}:\d{2}$/)) return new Date(dateStr);
            return new Date(dateStr.replace(' ', 'T') + 'Z');
        };

        const calcRemaining = () => {
            const offsetStr = SecureStore.getMemoryItem('time_offset');
            const offset = offsetStr ? parseInt(offsetStr) : 0;
            const now = new Date(Date.now() + offset);
            const startedAt = parseDateAsUTC(task.started_at);
            let elapsed = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
            if (elapsed < 0) elapsed = 0;
            if (elapsed > 86400) elapsed = 0;
            let remaining = task.remaining_seconds - elapsed;
            if (remaining < 0) remaining = 0;
            setTimeLeft(remaining);
        };

        calcRemaining();
        const interval = setInterval(calcRemaining, 1000);
        return () => clearInterval(interval);
    }, [task?.id, task?.status, task?.started_at, task?.remaining_seconds]);

    const formatTime = (secs) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const isOverdue = timeLeft <= 0 && task?.status === 'RUNNING';
    const isWarning = timeLeft <= 60 && timeLeft > 0;

    return (
        <Text style={[
            styles.taskCardTimer,
            isOverdue && styles.taskCardTimerAlarm,
            isWarning && styles.taskCardTimerWarning,
        ]}>
            {task?.status === 'ALARM' ? '🚨 ALARM!' : (task?.status === 'PAUSED' ? '⏸ PAUSED' : `⏱ ${formatTime(timeLeft)}`)}
        </Text>
    );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function DashboardScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [attendanceMarked, setAttendanceMarked] = useState(false);
    const [batches, setBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [demands, setDemands] = useState([]);
    const [myTasks, setMyTasks] = useState([]);
    const [stuckTasks, setStuckTasks] = useState([]);
    const [forcingComplete, setForcingComplete] = useState(null); // taskId being force-completed

    // Alarm state - shown on dashboard itself (not navigate to activetask)
    const [alarmTask, setAlarmTask] = useState(null);
    const [isAlarmModalOpen, setIsAlarmModalOpen] = useState(false);
    const [acknowledging, setAcknowledging] = useState(false);

    const soundRef = useRef(null);
    const alarmTaskRef = useRef(null); // avoid stale closure
    const appStateRef = useRef(AppState.currentState);

    // ─── Sound helpers ──────────────────────────────────────────────────────
    const playAlarmSound = async () => {
        try {
            if (soundRef.current) {
                await soundRef.current.unloadAsync();
            }
            const userId = await SecureStore.getItemAsync('user_id') || '1';
            let numId = parseInt(userId);
            let soundIdx = numId % 5;
            if (soundIdx === 0) soundIdx = 5;
            let soundModule;
            switch (soundIdx) {
                case 1: soundModule = require('../assets/sounds/alarm1.wav'); break;
                case 2: soundModule = require('../assets/sounds/alarm2.wav'); break;
                case 3: soundModule = require('../assets/sounds/alarm3.wav'); break;
                case 4: soundModule = require('../assets/sounds/alarm4.wav'); break;
                case 5: soundModule = require('../assets/sounds/alarm5.wav'); break;
                default: soundModule = require('../assets/sounds/alarm1.wav');
            }
            const { sound } = await Audio.Sound.createAsync(soundModule);
            soundRef.current = sound;
            await sound.setIsLoopingAsync(true);
            await sound.playAsync();
        } catch (e) {
            console.error('Dashboard alarm sound error:', e);
        }
    };

    const stopAlarmSound = async () => {
        if (soundRef.current) {
            try {
                await soundRef.current.stopAsync();
                await soundRef.current.unloadAsync();
            } catch (e) { /* ignore */ }
            soundRef.current = null;
        }
    };

    // ─── Fetch background tasks & detect ALARM ──────────────────────────────
    const fetchMyTasks = useCallback(async () => {
        try {
            const res = await getMyActiveTasks();
            if (res.success) {
                const tasks = res.tasks || [];
                setMyTasks(tasks);

                // Check for any ALARM task - show modal on dashboard itself
                const foundAlarm = tasks.find(t => t.status === 'ALARM');
                if (foundAlarm && alarmTaskRef.current?.id !== foundAlarm.id) {
                    alarmTaskRef.current = foundAlarm;
                    setAlarmTask(foundAlarm);
                    setIsAlarmModalOpen(true);
                    playAlarmSound();
                }
            }
        } catch (e) {
            console.error("fetchMyTasks error:", e);
        }
    }, []);

    // ─── AppState: re-fetch immediately when app comes to foreground ─────────
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
                // App just came to foreground - check immediately for alarms
                fetchMyTasks();
            }
            appStateRef.current = nextAppState;
        });
        return () => subscription.remove();
    }, [fetchMyTasks]);

    const fetchStuckTasksData = useCallback(async () => {
        try {
            const res = await getStuckTasks();
            if (res.success) setStuckTasks(res.tasks || []);
        } catch (e) {
            console.error('fetchStuckTasks error:', e);
        }
    }, []);

    useEffect(() => {
        loadBatches();
        fetchMyTasks();
        fetchStuckTasksData();
        const interval = setInterval(() => {
            fetchMyTasks();
            fetchStuckTasksData();
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    // Cleanup sound on unmount
    useEffect(() => {
        return () => { stopAlarmSound(); };
    }, []);

    const loadBatches = async () => {
        try {
            const res = await getTodayBatches();
            if (res.success) setBatches(res.batches);
        } catch (e) {
            console.error(e);
        }
    };

    const handleMarkAttendance = async () => {
        setLoading(true);
        try {
            await markAttendance();
            setAttendanceMarked(true);
        } catch (e) {
            if (e.response?.data?.message?.includes('already marked')) {
                setAttendanceMarked(true);
            } else {
                Alert.alert('Error', e.response?.data?.message || 'Failed to mark attendance');
            }
        } finally {
            setLoading(false);
        }
    };

    const selectBatch = async (batchId) => {
        setSelectedBatch(batchId);
        try {
            const res = await getBatchDemand(batchId);
            if (res.success) setDemands(res.demand);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchNextTask = async () => {
        if (!selectedBatch) return Alert.alert('Error', 'Please select a batch first');
        setLoading(true);
        try {
            const res = await assignNextTask(selectedBatch);
            if (res.success) {
                if (res.task) {
                    SecureStore.setMemoryItem('current_task', JSON.stringify(res.task));
                    // Show different message based on action
                    if (res.action === 'RESUME_TASK') {
                        // PAUSED task returned - tell worker to resume
                        // Navigate directly to activetask where Resume button will show
                        router.push({
                            pathname: '/activetask',
                            params: { batchId: selectedBatch }
                        });
                        return;
                    }
                    router.push({
                        pathname: '/activetask',
                        params: { batchId: selectedBatch }
                    });
                } else {
                    Alert.alert('✅ Sab Done!', 'Abhi koi kaam nahi bacha. Bucket tasks check karo ya doosre workers ka wait karo.');
                }
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to fetch task');
        } finally {
            setLoading(false);
        }
    };

    // ─── Acknowledge alarm from Dashboard modal ──────────────────────────────
    const handleAcknowledgeAlarm = async () => {
        if (!alarmTask) return;
        setAcknowledging(true);
        try {
            await stopAlarmSound();
            const res = await acknowledgeAlarm(alarmTask.id);
            if (res.success) {
                setIsAlarmModalOpen(false);
                alarmTaskRef.current = null;
                setAlarmTask(null);
                await fetchMyTasks();
            await fetchStuckTasksData();

                if (res.nextTask) {
                    // Auto-navigate to next task
                    SecureStore.setMemoryItem('current_task', JSON.stringify(res.nextTask));
                    router.push({
                        pathname: '/activetask',
                        params: { batchId: res.nextTask.batch_id }
                    });
                } else if (selectedBatch) {
                    // Try to get next task from batch
                    try {
                        const assignRes = await assignNextTask(selectedBatch);
                        if (assignRes.success && assignRes.task) {
                            SecureStore.setMemoryItem('current_task', JSON.stringify(assignRes.task));
                            router.push({
                                pathname: '/activetask',
                                params: { batchId: selectedBatch }
                            });
                            return;
                        }
                    } catch (assignErr) {
                        console.error("Assign after alarm ack error:", assignErr);
                    }
                    Alert.alert('✅ Done!', 'Alarm acknowledged! Fetch next task to continue.');
                } else {
                    Alert.alert('✅ Done!', 'Alarm acknowledged! Select a batch and fetch next task.');
                }
            }
        } catch (e) {
            Alert.alert('Error', e.response?.data?.message || e.message);
        } finally {
            setAcknowledging(false);
        }
    };

    // ─── Resume a stuck task (navigate to activetask, timer runs normally) ─────
    const handleResumeStuckTask = (task) => {
        SecureStore.setMemoryItem('current_task', JSON.stringify(task));
        router.push({ pathname: '/activetask', params: { batchId: task.batch_id } });
    };

    // ─── Open active background task ─────────────────────────────────────────
    const openTask = (task) => {
        SecureStore.setMemoryItem('current_task', JSON.stringify(task));
        router.push({ pathname: '/activetask', params: { batchId: task.batch_id } });
    };

    const handleLogout = async () => {
        await SecureStore.deleteItemAsync('worker_token');
        router.replace('/');
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'RUNNING': return '#1976D2';
            case 'PAUSED': return '#F57C00';
            case 'ALARM': return '#D32F2F';
            default: return '#388E3C';
        }
    };

    // ─── Attendance Screen ───────────────────────────────────────────────────
    if (!attendanceMarked) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <Text style={styles.title}>Welcome to Work 🥦</Text>
                    <Text style={styles.subtitle}>Please mark your attendance to start</Text>
                    <TouchableOpacity style={styles.mainBtn} onPress={handleMarkAttendance} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainBtnText}>Mark Attendance</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.mainBtn, { backgroundColor: '#f44336', marginTop: 20 }]} onPress={handleLogout}>
                        <Text style={styles.mainBtnText}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // ─── Main Dashboard ──────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Worker Dashboard 🥦</Text>
                <TouchableOpacity onPress={handleLogout}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                style={styles.scrollArea}
                data={[{ key: 'content' }]}
                keyExtractor={item => item.key}
                renderItem={() => (
                    <View style={styles.content}>

                        {/* ─── Stuck Tasks Warning Section ────────── */}
                        {stuckTasks.length > 0 && (
                            <View style={styles.stuckSection}>
                                <Text style={styles.stuckTitle}>⏸️ Ruke Hue Tasks - Resume Karo!</Text>
                                <Text style={styles.stuckSubtitle}>
                                    Yeh tasks PAUSED hain. Inhe resume karo → timer chalega → alarm → done hoga → BUCKET_ARRANGE shuru hoga.
                                </Text>
                                {stuckTasks.map(task => {
                                    const remainingMin = Math.ceil((task.remaining_seconds || 0) / 60);
                                    return (
                                        <View key={task.id.toString()} style={styles.stuckCard}>
                                            <View style={styles.stuckCardLeft}>
                                                <Text style={styles.stuckCardStage}>{task.stage}</Text>
                                                <Text style={styles.stuckCardProduct}>{task.Product?.name}</Text>
                                                <Text style={styles.stuckCardQty}>{task.quantity_grams}g</Text>
                                                <Text style={styles.stuckCardRemaining}>⏱ ~{remainingMin} min bacha</Text>
                                                <View style={[styles.stuckStatusBadge, task.status === 'PAUSED' ? styles.stuckStatusPaused : styles.stuckStatusNotStarted]}>
                                                    <Text style={styles.stuckStatusText}>{task.status}</Text>
                                                </View>
                                            </View>
                                            <TouchableOpacity
                                                style={styles.stuckResumeBtn}
                                                onPress={() => handleResumeStuckTask(task)}
                                            >
                                                <Text style={styles.stuckResumeBtnText}>▶ Resume{`\n`}Karo</Text>
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        {/* ─── Active Background Tasks ─────────────────── */}
                        {myTasks.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>⏳ Your Running Tasks</Text>
                                {myTasks.map(item => (
                                    <TouchableOpacity
                                        key={item.id.toString()}
                                        style={[
                                            styles.taskCard,
                                            { borderLeftColor: getStatusColor(item.status), borderLeftWidth: 5 },
                                            item.status === 'ALARM' && styles.taskCardAlarm
                                        ]}
                                        onPress={() => openTask(item)}
                                    >
                                        <View style={styles.taskCardLeft}>
                                            <Text style={styles.taskCardTitle}>{item.stage} - {item.Product?.name}</Text>
                                            <Text style={styles.taskCardSub}>Qty: {item.quantity_grams}g</Text>
                                            <LiveCountdown task={item} />
                                        </View>
                                        <View style={styles.taskCardRight}>
                                            <Text style={[styles.taskCardStatus, { color: getStatusColor(item.status) }]}>
                                                {item.status}
                                            </Text>
                                            <Text style={styles.taskCardTap}>Tap to View →</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* ─── Batch Selection ─────────────────────────── */}
                        <Text style={styles.sectionTitle}>📦 Select Active Batch</Text>
                        {batches.length === 0 ? (
                            <Text style={styles.emptyText}>No batches found for today.</Text>
                        ) : (
                            <FlatList
                                data={batches}
                                keyExtractor={item => item.id.toString()}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[styles.batchCard, selectedBatch === item.id && styles.batchCardActive]}
                                        onPress={() => selectBatch(item.id)}
                                    >
                                        <Text style={[styles.batchText, selectedBatch === item.id && styles.batchTextActive]}>
                                            {item.name}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            />
                        )}

                        {/* ─── Batch Demands ───────────────────────────── */}
                        {selectedBatch && (
                            <View style={styles.demandSection}>
                                <Text style={styles.sectionTitle}>📋 Batch Demands</Text>
                                <View style={styles.demandList}>
                                    {demands.length > 0 ? demands.map((d, idx) => (
                                        <View key={idx} style={styles.demandRow}>
                                            <Text style={styles.demandName}>{d.productName}</Text>
                                            <Text style={styles.demandQty}>{d.quantity}g</Text>
                                        </View>
                                    )) : <Text style={styles.emptyText}>No demands found.</Text>}
                                </View>
                            </View>
                        )}
                    </View>
                )}
            />

            {/* ─── Footer: Fetch Next Task Button ─────────────────────────── */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.mainBtn, !selectedBatch && styles.btnDisabled]}
                    onPress={fetchNextTask}
                    disabled={loading || !selectedBatch}
                >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainBtnText}>🚀 Fetch Next Task</Text>}
                </TouchableOpacity>
            </View>

            {/* ─── ALARM MODAL (shown on dashboard) ───────────────────────── */}
            <Modal visible={isAlarmModalOpen} transparent={true} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.alarmModalContent}>
                        <Text style={styles.alarmEmoji}>🚨</Text>
                        <Text style={styles.alarmTitle}>ALARM!</Text>
                        <Text style={styles.alarmStage}>{alarmTask?.stage} Stage Complete</Text>
                        <Text style={styles.alarmProduct}>{alarmTask?.Product?.name}</Text>
                        <Text style={styles.alarmQty}>{alarmTask?.quantity_grams}g</Text>

                        <TouchableOpacity
                            style={styles.alarmAckBtn}
                            onPress={handleAcknowledgeAlarm}
                            disabled={acknowledging}
                        >
                            {acknowledging
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={styles.alarmAckBtnText}>✅ Acknowledge & Start Next Stage</Text>
                            }
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.alarmViewBtn}
                            onPress={() => {
                                setIsAlarmModalOpen(false);
                                openTask(alarmTask);
                            }}
                        >
                            <Text style={styles.alarmViewBtnText}>View Task Details</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#2E7D32', marginBottom: 10 },
    subtitle: { fontSize: 16, color: '#666', marginBottom: 30, textAlign: 'center' },
    mainBtn: { backgroundColor: '#4CAF50', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30, elevation: 3, width: '100%', alignItems: 'center' },
    btnDisabled: { backgroundColor: '#A5D6A7' },
    mainBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', elevation: 2 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    logoutText: { color: '#f44336', fontWeight: 'bold' },
    scrollArea: { flex: 1 },
    content: { padding: 20 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginBottom: 12, marginTop: 10 },
    emptyText: { color: '#9CA3AF', fontStyle: 'italic' },
    // Background task cards
    taskCard: {
        flexDirection: 'row', justifyContent: 'space-between',
        backgroundColor: '#fff', padding: 15, borderRadius: 12,
        marginBottom: 10, elevation: 2,
        borderWidth: 1, borderColor: '#E5E7EB',
    },
    taskCardAlarm: { backgroundColor: '#FFF5F5', borderColor: '#FECACA' },
    taskCardLeft: { flex: 1 },
    taskCardRight: { alignItems: 'flex-end', justifyContent: 'center' },
    taskCardTitle: { fontSize: 15, fontWeight: 'bold', color: '#1F2937' },
    taskCardSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    taskCardTimer: { fontSize: 22, fontWeight: 'bold', color: '#1976D2', marginTop: 6, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
    taskCardTimerWarning: { color: '#F57C00' },
    taskCardTimerAlarm: { color: '#D32F2F' },
    taskCardStatus: { fontSize: 12, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden', backgroundColor: '#F3F4F6' },
    taskCardTap: { fontSize: 11, color: '#9CA3AF', marginTop: 6, fontStyle: 'italic' },
    // Batch cards
    batchCard: { backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, marginRight: 10, borderWidth: 1, borderColor: '#E5E7EB', height: 50, justifyContent: 'center' },
    batchCardActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
    batchText: { color: '#4B5563', fontWeight: 'bold' },
    batchTextActive: { color: '#fff' },
    // Demands
    demandSection: { marginTop: 20 },
    demandList: { backgroundColor: '#fff', borderRadius: 10, padding: 15, elevation: 1 },
    demandRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    demandName: { fontSize: 16, color: '#374151', fontWeight: '500' },
    demandQty: { fontSize: 16, color: '#2E7D32', fontWeight: 'bold' },
    // Footer
    footer: { padding: 20, backgroundColor: '#fff', elevation: 10 },
    // Alarm Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(139,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    alarmModalContent: {
        backgroundColor: '#fff', width: '100%', borderRadius: 20,
        padding: 30, alignItems: 'center',
        borderWidth: 4, borderColor: '#D32F2F',
        elevation: 20,
    },
    alarmEmoji: { fontSize: 72, marginBottom: 8 },
    alarmTitle: { fontSize: 36, fontWeight: 'bold', color: '#D32F2F', marginBottom: 8 },
    alarmStage: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 4 },
    alarmProduct: { fontSize: 18, color: '#555', marginBottom: 2 },
    alarmQty: { fontSize: 16, color: '#888', marginBottom: 25 },
    alarmAckBtn: { backgroundColor: '#D32F2F', paddingVertical: 15, paddingHorizontal: 20, borderRadius: 12, width: '100%', alignItems: 'center', marginBottom: 10 },
    alarmAckBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    alarmViewBtn: { paddingVertical: 10, width: '100%', alignItems: 'center' },
    alarmViewBtnText: { color: '#1976D2', fontSize: 15, fontWeight: '600' },
    // Stuck tasks section
    stuckSection: {
        backgroundColor: '#FFF8E1', borderRadius: 14, padding: 15,
        marginBottom: 20, borderWidth: 2, borderColor: '#FFA000',
    },
    stuckTitle: { fontSize: 16, fontWeight: 'bold', color: '#E65100', marginBottom: 4 },
    stuckSubtitle: { fontSize: 12, color: '#795548', marginBottom: 12, lineHeight: 18 },
    stuckCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#fff', borderRadius: 10, padding: 12,
        marginBottom: 8, borderWidth: 1, borderColor: '#FFCC80', elevation: 1,
    },
    stuckCardLeft: { flex: 1 },
    stuckCardStage: { fontSize: 15, fontWeight: 'bold', color: '#E65100' },
    stuckCardProduct: { fontSize: 13, color: '#333', marginTop: 1 },
    stuckCardQty: { fontSize: 12, color: '#888', marginTop: 1 },
    stuckStatusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 5 },
    stuckStatusPaused: { backgroundColor: '#FFF3E0' },
    stuckStatusNotStarted: { backgroundColor: '#F3F4F6' },
    stuckStatusText: { fontSize: 10, fontWeight: 'bold', color: '#555' },
    stuckCompleteBtn: {
        backgroundColor: '#388E3C', paddingVertical: 10, paddingHorizontal: 14,
        borderRadius: 10, alignItems: 'center', justifyContent: 'center', minWidth: 70,
    },
    stuckCompleteBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold', textAlign: 'center', lineHeight: 18 },
    stuckCardRemaining: { fontSize: 12, color: '#1976D2', fontWeight: '600', marginTop: 3 },
    stuckResumeBtn: {
        backgroundColor: '#1976D2', paddingVertical: 10, paddingHorizontal: 14,
        borderRadius: 10, alignItems: 'center', justifyContent: 'center', minWidth: 70,
    },
    stuckResumeBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold', textAlign: 'center', lineHeight: 18 },
});


