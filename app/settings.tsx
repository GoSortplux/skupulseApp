// app/settings.tsx
import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Switch, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AuthContext } from '../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const { isAdmin, logout, updateCredentials } = useContext(AuthContext);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [continuousScanEnabled, setContinuousScanEnabled] = useState(true);
  const [manualClockEnabled, setManualClockEnabled] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('@skupulseApp:ttsEnabled').then((value) => setTtsEnabled(value !== 'false'));
    AsyncStorage.getItem('@skupulseApp:continuousScanEnabled').then((value) => setContinuousScanEnabled(value !== 'false'));
    AsyncStorage.getItem('@skupulseApp:manualClockEnabled').then((value) => setManualClockEnabled(value !== 'false'));
  }, []);

  if (!isAdmin) {
    router.replace('/');
    return null;
  }

  const handleUpdateCredentials = async () => {
    try {
      await updateCredentials(newUsername, newPassword);
      Alert.alert('Success', 'Admin credentials updated!');
      setNewUsername('');
      setNewPassword('');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update credentials');
    }
  };

  const handleLogout = async () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/');
        },
      },
    ]);
  };

  const handleTtsToggle = async (value: boolean) => {
    setTtsEnabled(value);
    await AsyncStorage.setItem('@skupulseApp:ttsEnabled', value.toString());
  };

  const handleContinuousScanToggle = async (value: boolean) => {
    setContinuousScanEnabled(value);
    await AsyncStorage.setItem('@skupulseApp:continuousScanEnabled', value.toString());
  };

  const handleManualClockToggle = async (value: boolean) => {
    setManualClockEnabled(value);
    await AsyncStorage.setItem('@skupulseApp:manualClockEnabled', value.toString());
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#4A90E2" />
      </Pressable>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.settingsContent}>
        <Text style={styles.subtitle}>Update Admin Credentials</Text>
        <TextInput
          style={styles.input}
          placeholder="New Username"
          value={newUsername}
          onChangeText={setNewUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />
        <Button title="Update Credentials" onPress={handleUpdateCredentials} color="#4A90E2" />
        <View style={styles.optionContainer}>
          <Text style={styles.optionText}>Enable TTS</Text>
          <Switch value={ttsEnabled} onValueChange={handleTtsToggle} />
        </View>
        <View style={styles.optionContainer}>
          <Text style={styles.optionText}>Enable Continuous Scanning</Text>
          <Switch value={continuousScanEnabled} onValueChange={handleContinuousScanToggle} />
        </View>
        <View style={styles.optionContainer}>
          <Text style={styles.optionText}>Enable Manual Clock-In/Out</Text>
          <Switch value={manualClockEnabled} onValueChange={handleManualClockToggle} />
        </View>
        <View style={styles.logoutButton}>
          <Button title="Logout" onPress={handleLogout} color="#E74C3C" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F5F7FA' },
  backButton: { position: 'absolute', top: 20, left: 20 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 30,
    fontFamily: 'Poppins-Bold',
  },
  settingsContent: { flex: 1, justifyContent: 'center' },
  subtitle: { fontSize: 20, fontWeight: '600', color: '#34495E', marginBottom: 15, fontFamily: 'Poppins-Medium' },
  input: {
    height: 50,
    borderColor: '#D3DCE6',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#FFF',
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
  },
  optionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#FFF',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  optionText: { fontSize: 16, color: '#2C3E50', fontFamily: 'Poppins-Regular' },
  logoutButton: { marginTop: 20 },
});