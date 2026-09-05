import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Modal, FlatList, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from '../src/utils/storage';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { startTaskStage, pauseTask, resumeTask, completeTask, acknowledgeAlarm, syncTask, getTaskBuckets, triggerAlarm, assignNextTask } from '../src/api/workerTask.api';

export default function TaskScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const batchId = params.batchId;

    // Load from memory cache synchronously
    const cachedTaskStr = SecureStore.getMemoryItem('current_task');
    const initialTask = cachedTaskStr ? JSON.parse(cachedTaskStr) : null;

    const [currentTask, setCurrentTask] = useState(initialTask);
    const [taskBuckets, setTaskBuckets] = useState([]);
    const [timeLeft, setTimeLeft] = useState(0);
    const [loading, setLoading] = useState(false);

    // Alarm Modal State
    const [isAlarmModalOpen, setIsAlarmModalOpen] = useState(false);
    const [alarmTask, setAlarmTask] = useState(null);

    // DRYING Mode Selection Modal State
    const [isDryingModalOpen, setIsDryingModalOpen] = useState(false);

    const timerRef = useRef(null);
    const syncTimerRef = useRef(null);
    const soundRef = useRef(null);
    const alarmCheckTimerRef = useRef(null);
    const currentTaskRef = useRef(null);

    useEffect(() => {
        currentTaskRef.current = currentTask;
    }, [currentTask]);

    // Global background alarm check
    useEffect(() => {
        if (!batchId) return;
        const fetchAlarms = async () => {
            if (isAlarmModalOpen) return;
            try {
                const res = await checkAlarms(batchId);
                if (res.success && res.tasks && res.tasks.length > 0) {
                    const alarm = res.tasks[0];
                    const cTask = currentTaskRef.current;
                    
                    if (cTask && cTask.status === 'RUNNING' && cTask.id !== alarm.id) {
                        try {
                            const pauseRes = await pauseTask(cTask.id);
                            if (pauseRes.success) {
                                setCurrentTask(pauseRes.task);
                                setWasPausedByAlarm(true);
                            }
                        } catch (e) { console.error("Error pausing:", e); }
                    } else if (cTask && cTask.status === 'RUNNING' && cTask.id === alarm.id) {
                        // Already handled by timer locally
                        return;
                    }
                    
                    setAlarmTask(alarm);
                    setIsAlarmModalOpen(true);
                    playForegroundAlarm();
                }
            } catch (e) {}
        };
        alarmCheckTimerRef.current = setInterval(fetchAlarms, 10000);
        return () => {
            if (alarmCheckTimerRef.current) clearInterval(alarmCheckTimerRef.current);
        };
    }, [batchId, isAlarmModalOpen]);

    // Initial check for BUCKET_ARRANGE
    useEffect(() => {
        if (currentTask && currentTask.stage === 'BUCKET_ARRANGE') {
            getTaskBuckets(currentTask.id).then(res => {
                if (res.success) setTaskBuckets(res.buckets || []);
            }).catch(e => console.error(e));
        }
    }, [currentTask?.id, currentTask?.stage]);

    // Timer sync logic - fully frontend-driven (like web version)
    useEffect(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (syncTimerRef.current) clearInterval(syncTimerRef.current);

        if (!currentTask) return;

        const parseDateAsUTC = (dateStr) => {
            if (!dateStr) return new Date();
            if (dateStr.includes('Z') || dateStr.match(/[+-]\d{2}:\d{2}$/)) {
                return new Date(dateStr);
            }
            return new Date(dateStr.replace(' ', 'T') + 'Z');
        };

        if (currentTask.status === 'RUNNING' && currentTask.started_at) {
            const calculateRemaining = () => {
                const offsetStr = SecureStore.getMemoryItem('time_offset');
                const offset = offsetStr ? parseInt(offsetStr) : 0;
                const serverAlignedNow = new Date(Date.now() + offset);

                const startedAt = parseDateAsUTC(currentTask.started_at);
                let elapsed = Math.floor((serverAlignedNow.getTime() - startedAt.getTime()) / 1000);

                // Clock drift safety clamp
                if (elapsed < 0) elapsed = 0;
                if (elapsed > 86400) elapsed = 0; // if >24h something is wrong

                let remaining = currentTask.remaining_seconds - elapsed;
                if (remaining < 0) remaining = 0;
                setTimeLeft(remaining);

                // Schedule OS Local Push Notification for background/killed state
                if (!timerRef.current && remaining > 0) { // Only do this once when starting the timer
                    const scheduleLocalAlarm = async () => {
                        try {
                            const userId = await SecureStore.getItemAsync('user_id') || '1';
                            let numId = parseInt(userId);
                            let soundIdx = numId % 5;
                            if (soundIdx === 0) soundIdx = 5;
                            const channelId = `worker-channel-${soundIdx}`;
                            
                            await Notifications.scheduleNotificationAsync({
                                identifier: `task-${currentTask.id}`,
                                content: {
                                    title: '🚨 Stage Complete!',
                                    body: `${currentTask.Product?.name} - ${currentTask.stage} stage is complete!`,
                                    sound: true
                                },
                                trigger: {
                                    seconds: remaining,
                                    channelId: channelId
                                }
                            });
                        } catch (e) {
                            console.error("Failed to schedule local notification:", e);
                        }
                    };
                    scheduleLocalAlarm();
                }

                // Frontend timer is the SOLE trigger for alarm modal (like web)
                if (remaining <= 0) {
                    clearInterval(timerRef.current);
                    handleTimerEnd(currentTask);
                }
            };

            calculateRemaining();
            timerRef.current = setInterval(calculateRemaining, 1000);

            // Sync from server every 5 seconds - only update time, never trigger modal
            syncTimerRef.current = setInterval(async () => {
                try {
                    const res = await syncTask(currentTask.id);
                    if (res.success && res.task) {
                        if (res.task.status === 'DONE') {
                            router.back();
                        } else if (res.task.status === 'ALARM' || res.task.status === 'RUNNING') {
                            // Recalculate remaining from server data to keep in sync
                            const offsetStr = SecureStore.getMemoryItem('time_offset');
                            const offset = offsetStr ? parseInt(offsetStr) : 0;
                            const serverAlignedNow = new Date(Date.now() + offset);

                            const sStart = parseDateAsUTC(res.task.started_at);
                            let serverElapsed = Math.floor((serverAlignedNow.getTime() - sStart.getTime()) / 1000);
                            if (serverElapsed < 0) serverElapsed = 0;
                            if (serverElapsed > 86400) serverElapsed = 0;

                            const serverRemaining = res.task.remaining_seconds - serverElapsed;

                            // Only update state if drift is significant (>3 sec) to avoid flicker
                            if (Math.abs(serverRemaining - timeLeft) > 3) {
                                setCurrentTask(prev => ({ ...prev, remaining_seconds: res.task.remaining_seconds, started_at: res.task.started_at }));
                            }
                        }
                    }
                } catch (e) {
                    console.error("Sync error:", e);
                }
            }, 5000);
        } else {
            setTimeLeft(currentTask?.remaining_seconds || 0);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (syncTimerRef.current) clearInterval(syncTimerRef.current);
        };
    }, [currentTask?.id, currentTask?.status, currentTask?.started_at, currentTask?.remaining_seconds]);


    const playForegroundAlarm = async () => {
        try {
            const userId = await SecureStore.getItemAsync('user_id') || '1';
            let numId = parseInt(userId);
            let soundIdx = numId % 5;
            if (soundIdx === 0) soundIdx = 5;

            if (soundRef.current) {
                await soundRef.current.unloadAsync();
            }

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
            console.error("Audio play error", e);
        }
    };

    const stopForegroundAlarm = async () => {
        if (soundRef.current) {
            await soundRef.current.stopAsync();
            await soundRef.current.unloadAsync();
            soundRef.current = null;
        }
        await Notifications.dismissAllNotificationsAsync();
    };

    const handleTimerEnd = (task) => {
        if (!isAlarmModalOpen) {
            setAlarmTask(task);
            setIsAlarmModalOpen(true);
            playForegroundAlarm();
        }
    };

    // Navigate to next task or go back to dashboard
    const handleNextTaskOrBack = (nextTask, batchIdForAssign) => {
        if (nextTask) {
            // Directly show the next task on this same screen
            SecureStore.setMemoryItem('current_task', JSON.stringify(nextTask));
            setCurrentTask(nextTask);
            setIsAlarmModalOpen(false);
            setAlarmTask(null);
            setTimeLeft(nextTask.remaining_seconds || 0);
        } else {
            // No next task - go to dashboard
            router.back();
        }
    };

    // ─── DRYING Mode Selection ────────────────────────────────────────────
    const handleStartStageDrying = () => {
        // Show drying mode selection modal first
        setIsDryingModalOpen(true);
    };

    const handleDryingModeSelected = async (mode) => {
        setIsDryingModalOpen(false);
        setLoading(true);
        try {
            const res = await startTaskStage(currentTask.id, { drying_mode: mode });
            if (res.success) {
                setCurrentTask(res.task);
            }
        } catch (e) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    };

    // ─── Start Stage (non-DRYING) ─────────────────────────────────────────
    const handleStartStage = async () => {
        // DRYING gets its own flow
        if (currentTask.stage === 'DRYING') {
            handleStartStageDrying();
            return;
        }

        setLoading(true);
        try {
            const res = await startTaskStage(currentTask.id, {});
            if (res.success) {
                setCurrentTask(res.task);
            }
        } catch (e) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePauseStage = async () => {
        setLoading(true);
        try {
            const res = await pauseTask(currentTask.id);
            if (res.success) {
                setCurrentTask(res.task);
                await Notifications.cancelScheduledNotificationAsync(`task-${currentTask.id}`);
            }
        } catch (e) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResumeStage = async () => {
        setLoading(true);
        try {
            const res = await resumeTask(currentTask.id);
            if (res.success) {
                setCurrentTask(res.task);
            }
        } catch (e) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    };

    // ─── Complete Task (for manual/hands-on stages) ───────────────────────
    const handleCompleteTask = async () => {
        setLoading(true);
        try {
            const res = await completeTask(currentTask.id);
            if (res.success) {
                await Notifications.cancelScheduledNotificationAsync(`task-${currentTask.id}`);
                if (res.nextTask) {
                    // Next task returned directly - show it
                    SecureStore.setMemoryItem('current_task', JSON.stringify(res.nextTask));
                    setCurrentTask(res.nextTask);
                    setTimeLeft(res.nextTask.remaining_seconds || 0);
                    Alert.alert('✅ Stage Complete!', `Next: ${res.nextTask.stage} stage ready to start.`);
                } else {
                    // No immediate next task - try to get one from server
                    if (batchId) {
                        try {
                            const assignRes = await assignNextTask(batchId);
                            if (assignRes.success && assignRes.task) {
                                SecureStore.setMemoryItem('current_task', JSON.stringify(assignRes.task));
                                setCurrentTask(assignRes.task);
                                setTimeLeft(assignRes.task.remaining_seconds || 0);
                                Alert.alert('✅ Stage Complete!', `Next task: ${assignRes.task.stage} for ${assignRes.task.Product?.name}`);
                                return;
                            }
                        } catch (assignErr) {
                            console.error("Assign next task error:", assignErr);
                        }
                    }
                    Alert.alert('✅ Done!', 'Stage marked complete!');
                    router.back();
                }
            }
        } catch (e) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    };

    // ─── Acknowledge Alarm (for timer-based stages) ────────────────────────
    const handleAcknowledgeAlarm = async () => {
        setLoading(true);
        try {
            await stopForegroundAlarm();
            const res = await acknowledgeAlarm(alarmTask.id);
            if (res.success) {
                setIsAlarmModalOpen(false);
                setAlarmTask(null);
                if (wasPausedByAlarm && currentTask) {
                    setWasPausedByAlarm(false);
                    const resumeRes = await resumeTask(currentTask.id);
                    if (resumeRes.success) {
                        setCurrentTask(resumeRes.task);
                    }
                } else if (!currentTask || currentTask.id === alarmTask.id) {
                    if (res.nextTask) {
                        // Backend gave us the next task directly - show it
                        SecureStore.setMemoryItem('current_task', JSON.stringify(res.nextTask));
                        setCurrentTask(res.nextTask);
                        setTimeLeft(res.nextTask.remaining_seconds || 0);
                        Alert.alert('✅ Alarm Acknowledged!', `Next: ${res.nextTask.stage} stage ready. Press "Start Stage" to begin.`);
                    } else {
                        // No direct next task - try assignNextTask to get what's available
                        if (batchId) {
                        try {
                            const assignRes = await assignNextTask(batchId);
                            if (assignRes.success && assignRes.task) {
                                SecureStore.setMemoryItem('current_task', JSON.stringify(assignRes.task));
                                setCurrentTask(assignRes.task);
                                setTimeLeft(assignRes.task.remaining_seconds || 0);
                                Alert.alert('✅ Alarm Acknowledged!', `Next task: ${assignRes.task.stage} for ${assignRes.task.Product?.name}`);
                                return;
                            }
                        } catch (assignErr) {
                            console.error("Assign next task after acknowledge error:", assignErr);
                        }
                    }
                    Alert.alert('✅ Done!', 'Alarm acknowledged & stage complete!');
                    router.back();
                }
            }
        } // Missing brace added here to close if (res.success)
        } catch (e) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSkipTimer = async () => {
        setLoading(true);
        try {
            const res = await triggerAlarm(currentTask.id);
            if (res.success) {
                await Notifications.cancelScheduledNotificationAsync(`task-${currentTask.id}`);
                const taskToAlarm = res.task || currentTask;
                setCurrentTask(taskToAlarm);
                handleTimerEnd(taskToAlarm);
            }
        } catch (e) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // Determine if this stage can run in background
    const canRunInBackground = currentTask && (
        currentTask.stage === 'SOAKING' ||
        (currentTask.stage === 'DRYING' && (!currentTask.drying_mode || currentTask.drying_mode === 'machine'))
    );

    if (!currentTask) return <View style={styles.center}><Text>No task assigned.</Text></View>;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Task Details</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.infoCard}>
                    <Text style={styles.stageText}>{currentTask.stage}</Text>
                    <Text style={styles.statusBadge}>{currentTask.status}</Text>

                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.label}>Product</Text>
                            <Text style={styles.value}>{currentTask.Product?.name}</Text>
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.label}>Quantity</Text>
                            <Text style={styles.value}>{currentTask.quantity_grams}g</Text>
                        </View>
                    </View>

                    {currentTask.stage === 'DRYING' && currentTask.drying_mode && (
                        <View style={styles.dryingModeBadge}>
                            <Text style={styles.dryingModeText}>
                                🔥 Mode: {currentTask.drying_mode === 'machine' ? 'Machine' : currentTask.drying_mode === 'piece' ? 'Per Piece' : 'Per 25g'}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Timer - for all timed stages including BUCKET_ARRANGE */}
                {['SOAKING', 'DRYING', 'WEIGHING', 'CUTTING', 'BUCKET_ARRANGE'].includes(currentTask.stage) && (
                    <View style={styles.timerSection}>
                        <Text style={styles.label}>Time Remaining</Text>
                        <Text style={[styles.timerText, timeLeft <= 30 && currentTask.status === 'RUNNING' && styles.timerTextWarning]}>
                            {formatTime(timeLeft)}
                        </Text>
                        {currentTask.status === 'RUNNING' && timeLeft <= 60 && timeLeft > 0 && (
                            <Text style={styles.almostDoneText}>⚠️ Almost done!</Text>
                        )}
                    </View>
                )}

                {/* BUCKET_ARRANGE - show user list */}
                {currentTask.stage === 'BUCKET_ARRANGE' && (
                    <View style={styles.bucketSection}>
                        <Text style={styles.sectionTitle}>User Bucket List (Demands)</Text>
                        <FlatList
                            data={taskBuckets}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={({ item, index }) => (
                                <View style={styles.bucketRow}>
                                    <View style={styles.bucketNumber}><Text style={styles.bucketNumberText}>#{item.sortId}</Text></View>
                                    <Text style={styles.bucketUser}>{item.userName}</Text>
                                    <Text style={styles.bucketQty}>{item.quantity}g</Text>
                                </View>
                            )}
                            ListEmptyComponent={<Text style={styles.label}>Loading buckets...</Text>}
                        />
                    </View>
                )}
            </View>

            {/* Footer Buttons */}
            <View style={styles.footer}>
                {currentTask.status === 'NOT_STARTED' && (
                    <TouchableOpacity style={styles.primaryBtn} onPress={handleStartStage} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>
                            {currentTask.stage === 'DRYING' ? '🔥 Select Drying Mode & Start' : '▶ Start Stage'}
                        </Text>}
                    </TouchableOpacity>
                )}

                {currentTask.status === 'RUNNING' && (
                    <>
                        <TouchableOpacity style={styles.warningBtn} onPress={handlePauseStage} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>⏸ Pause</Text>}
                        </TouchableOpacity>

                        {/* Skip Timer - not needed for BUCKET_ARRANGE */}
                        {currentTask.stage !== 'BUCKET_ARRANGE' && (
                            <TouchableOpacity style={styles.dangerBtnOutline} onPress={handleSkipTimer} disabled={loading}>
                                {loading ? <ActivityIndicator color="#d32f2f" /> : <Text style={styles.dangerBtnText}>⚡ Skip Timer (Test)</Text>}
                            </TouchableOpacity>
                        )}

                        {/* Background button ONLY for machine drying and soaking */}
                        {canRunInBackground ? (
                            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.back()}>
                                <Text style={styles.btnText}>🏃 Run in Background & Next Task</Text>
                            </TouchableOpacity>
                        ) : currentTask.stage !== 'BUCKET_ARRANGE' ? (
                            /* Manual stages: per piece, per 25g, weighing, cutting - NOT bucket_arrange (has its own btn) */
                            <TouchableOpacity style={styles.primaryBtn} onPress={handleCompleteTask} disabled={loading}>
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>✅ Mark Complete</Text>}
                            </TouchableOpacity>
                        ) : null}
                    </>
                )}

                {currentTask.status === 'PAUSED' && (
                    <TouchableOpacity style={styles.successBtn} onPress={handleResumeStage} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>▶ Resume Task</Text>}
                    </TouchableOpacity>
                )}

                {/* BUCKET_ARRANGE complete button */}
                {currentTask.stage === 'BUCKET_ARRANGE' && currentTask.status === 'RUNNING' && (
                    <TouchableOpacity style={styles.successBtn} onPress={handleCompleteTask} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>✅ Buckets Ready - Done!</Text>}
                    </TouchableOpacity>
                )}
            </View>

            {/* ─── DRYING MODE SELECTION MODAL ─────────────────────────── */}
            <Modal visible={isDryingModalOpen} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.dryingModalContent}>
                        <Text style={styles.modalTitle}>🔥 Select Drying Method</Text>
                        <Text style={styles.modalSubText}>Choose how you want to dry this product</Text>

                        <TouchableOpacity
                            style={styles.dryingOption}
                            onPress={() => handleDryingModeSelected('machine')}
                            disabled={loading}
                        >
                            <Text style={styles.dryingOptionIcon}>🏭</Text>
                            <View style={styles.dryingOptionText}>
                                <Text style={styles.dryingOptionTitle}>Machine Drying</Text>
                                <Text style={styles.dryingOptionSub}>Timer-based • Can run in background</Text>
                            </View>
                            {loading && <ActivityIndicator color="#1976D2" />}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.dryingOption}
                            onPress={() => handleDryingModeSelected('piece')}
                            disabled={loading}
                        >
                            <Text style={styles.dryingOptionIcon}>✋</Text>
                            <View style={styles.dryingOptionText}>
                                <Text style={styles.dryingOptionTitle}>Per Piece</Text>
                                <Text style={styles.dryingOptionSub}>Manual • Stay on screen</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.dryingOption}
                            onPress={() => handleDryingModeSelected('gram')}
                            disabled={loading}
                        >
                            <Text style={styles.dryingOptionIcon}>⚖️</Text>
                            <View style={styles.dryingOptionText}>
                                <Text style={styles.dryingOptionTitle}>Per 25g</Text>
                                <Text style={styles.dryingOptionSub}>Manual • Stay on screen</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={() => setIsDryingModalOpen(false)}
                        >
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ─── ALARM MODAL ──────────────────────────────────────────── */}
            <Modal visible={isAlarmModalOpen} transparent={true} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.alarmEmoji}>🚨</Text>
                        <Text style={styles.modalTitle}>Timer Finished!</Text>
                        <Text style={styles.modalText}>
                            The <Text style={styles.bold}>{alarmTask?.stage}</Text> stage for <Text style={styles.bold}>{alarmTask?.Product?.name}</Text> is complete.
                        </Text>
                        <TouchableOpacity style={styles.dangerBtn} onPress={handleAcknowledgeAlarm} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Acknowledge & Start Next Stage</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff', elevation: 2 },
    backBtn: { padding: 10, marginRight: 10 },
    backText: { color: '#4CAF50', fontWeight: 'bold', fontSize: 16 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    content: { flex: 1, padding: 20 },
    infoCard: { backgroundColor: '#fff', borderRadius: 15, padding: 20, elevation: 3, marginBottom: 20 },
    stageText: { fontSize: 24, fontWeight: 'bold', color: '#2E7D32', marginBottom: 5 },
    statusBadge: { alignSelf: 'flex-start', backgroundColor: '#E8F5E9', color: '#2E7D32', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontWeight: 'bold', fontSize: 12, overflow: 'hidden', marginBottom: 10 },
    dryingModeBadge: { marginTop: 10, backgroundColor: '#FFF3E0', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#FFE0B2' },
    dryingModeText: { color: '#E65100', fontWeight: 'bold', fontSize: 13 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    col: { flex: 1 },
    label: { fontSize: 14, color: '#6B7280', fontWeight: '600', marginBottom: 5 },
    value: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    timerSection: { alignItems: 'center', marginVertical: 20 },
    timerText: { fontSize: 64, fontWeight: 'bold', color: '#1976D2', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
    timerTextWarning: { color: '#D32F2F' },
    almostDoneText: { color: '#F57C00', fontWeight: 'bold', fontSize: 14, marginTop: 5 },
    bucketSection: { flex: 1, backgroundColor: '#E8F5E9', borderRadius: 15, padding: 15, borderWidth: 1, borderColor: '#C8E6C9' },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20', marginBottom: 15 },
    bucketRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#C8E6C9' },
    bucketNumber: { backgroundColor: '#4CAF50', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    bucketNumberText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
    bucketUser: { flex: 1, fontSize: 16, color: '#333', fontWeight: '500' },
    bucketQty: { fontSize: 16, fontWeight: 'bold', color: '#1B5E20' },
    footer: { padding: 20, backgroundColor: '#fff', elevation: 10, gap: 10 },
    primaryBtn: { backgroundColor: '#1976D2', padding: 15, borderRadius: 10, alignItems: 'center' },
    secondaryBtn: { backgroundColor: '#424242', padding: 15, borderRadius: 10, alignItems: 'center' },
    warningBtn: { backgroundColor: '#F57C00', padding: 15, borderRadius: 10, alignItems: 'center' },
    successBtn: { backgroundColor: '#388E3C', padding: 15, borderRadius: 10, alignItems: 'center' },
    dangerBtn: { backgroundColor: '#D32F2F', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 },
    dangerBtnOutline: { backgroundColor: '#fff', padding: 15, borderRadius: 10, alignItems: 'center', borderWidth: 2, borderColor: '#D32F2F', borderStyle: 'dashed' },
    dangerBtnText: { color: '#D32F2F', fontSize: 16, fontWeight: 'bold' },
    btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    cancelBtn: { marginTop: 15, padding: 12, alignItems: 'center' },
    cancelBtnText: { color: '#6B7280', fontSize: 16, fontWeight: '600' },
    // Modal styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', alignItems: 'center', padding: 0 },
    modalContent: { backgroundColor: '#fff', width: '100%', borderRadius: 20, padding: 30, alignItems: 'center', borderWidth: 5, borderColor: '#D32F2F', marginBottom: 0 },
    alarmEmoji: { fontSize: 64, marginBottom: 10 },
    modalTitle: { fontSize: 26, fontWeight: 'bold', color: '#D32F2F', marginBottom: 10 },
    modalSubText: { fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' },
    modalText: { fontSize: 18, color: '#555', textAlign: 'center', marginBottom: 20, lineHeight: 26 },
    bold: { fontWeight: 'bold', color: '#000' },
    // Drying modal styles
    dryingModalContent: { backgroundColor: '#fff', width: '100%', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, paddingBottom: 40 },
    dryingOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 15, marginBottom: 12 },
    dryingOptionIcon: { fontSize: 32, marginRight: 15 },
    dryingOptionText: { flex: 1 },
    dryingOptionTitle: { fontSize: 17, fontWeight: 'bold', color: '#111827' },
    dryingOptionSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
});
