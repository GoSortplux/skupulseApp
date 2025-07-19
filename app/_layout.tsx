// app/_layout.tsx
import { Stack } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RootLayout() {
  const [manualClockEnabled, setManualClockEnabled] = useState(true);

  useEffect(() => {
    const cleanupOldSettings = async () => {
      try {
        await AsyncStorage.removeItem('@SchoolRFIDApp:signInStart');
        await AsyncStorage.removeItem('@SchoolRFIDApp:signInEnd');
        await AsyncStorage.removeItem('@SchoolRFIDApp:signOutStart');
        console.log('Cleaned up old time window settings');
      } catch (err) {
        console.error('Error cleaning up old settings:', err);
      }
    };
    cleanupOldSettings();

    AsyncStorage.getItem('@SchoolRFIDApp:manualClockEnabled').then((value) => setManualClockEnabled(value !== 'false'));
  }, []);

  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Home', headerShown: false }} />
        <Stack.Screen name="scan" options={{ title: 'Scan RFID' }} />
        <Stack.Screen name="register" options={{ title: 'Register Student' }} />
        <Stack.Screen name="students" options={{ title: 'View Students' }} />
        <Stack.Screen name="attendance" options={{ title: 'Attendance Logs' }} />
        <Stack.Screen name="messages" options={{ title: 'Sent Messages' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        {manualClockEnabled && (
          <Stack.Screen name="manual" options={{ title: 'Manual Clock-In/Out' }} />
        )}
      </Stack>
    </AuthProvider>
  );
}