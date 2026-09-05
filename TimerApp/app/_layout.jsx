import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  useEffect(() => {
    // Request notification permissions
    const requestPermissions = async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          console.log('Notification permission not granted.');
        }
      } catch (e) {
        console.log('Error requesting notification permissions:', e);
      }
    };
    
    // Set up notification channels for Android
    if (Platform.OS === 'android') {
      const setupChannels = async () => {
        // Channel 1
        await Notifications.setNotificationChannelAsync('worker-channel-1', {
          name: 'Worker 1 Alarm',
          importance: Notifications.AndroidImportance.MAX,
          sound: 'alarm1', // must match the file name in sounds array WITHOUT extension
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
        // Channel 2
        await Notifications.setNotificationChannelAsync('worker-channel-2', {
          name: 'Worker 2 Alarm',
          importance: Notifications.AndroidImportance.MAX,
          sound: 'alarm2',
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
        // Channel 3
        await Notifications.setNotificationChannelAsync('worker-channel-3', {
          name: 'Worker 3 Alarm',
          importance: Notifications.AndroidImportance.MAX,
          sound: 'alarm3',
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
        // Channel 4
        await Notifications.setNotificationChannelAsync('worker-channel-4', {
          name: 'Worker 4 Alarm',
          importance: Notifications.AndroidImportance.MAX,
          sound: 'alarm4',
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
        // Channel 5
        await Notifications.setNotificationChannelAsync('worker-channel-5', {
          name: 'Worker 5 Alarm',
          importance: Notifications.AndroidImportance.MAX,
          sound: 'alarm5',
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      };
      setupChannels();
    }
    
    requestPermissions();
  }, []);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false, title: 'Login' }} />
      <Stack.Screen name="dashboard" options={{ headerShown: false, title: 'Dashboard', gestureEnabled: false }} />
      <Stack.Screen name="activetask" options={{ headerShown: false, title: 'Active Task', gestureEnabled: false }} />
    </Stack>
  );
}
