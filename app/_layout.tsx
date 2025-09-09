// app/_layout.tsx
import { Stack, SplashScreen } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { MaterialIcons } from '@expo/vector-icons';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [manualClockEnabled, setManualClockEnabled] = useState(true);
  const [loaded, error] = useFonts({
    ...MaterialIcons.font,
  });

  useEffect(() => {
    const cleanupOldSettings = async () => {
      try {
        await AsyncStorage.removeItem('@skupulseApp:signInStart');
        await AsyncStorage.removeItem('@skupulseApp:signInEnd');
        await AsyncStorage.removeItem('@skupulseApp:signOutStart');
        console.log('Cleaned up old time window settings');
      } catch (err) {
        console.error('Error cleaning up old settings:', err);
      }
    };
    cleanupOldSettings();

    AsyncStorage.getItem('@skupulseApp:manualClockEnabled').then((value) => setManualClockEnabled(value !== 'false'));
  }, []);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

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