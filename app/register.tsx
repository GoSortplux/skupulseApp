// app/register.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { startNfc, stopNfc } from '../src/nfc/nfcManager';
import { registerStudent } from '../src/utils/storage';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentPhone2, setParentPhone2] = useState('');
  const [rfid, setRfid] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScanRfid = async () => {
    setScanning(true);
    setError(null);

    await startNfc(
      (data) => {
        setRfid(data.rfid);
        setScanning(false);
      },
      (err: string) => {
        setError(err);
        setScanning(false);
      },
      true // readOnly mode
    );
  };

  const handleRegister = async () => {
    if (!name || !admissionNumber || !parentPhone || !rfid) {
      setError('All required fields must be filled');
      return;
    }

    if (!/^\d{10}$/.test(parentPhone) || (parentPhone2 && !/^\d{10}$/.test(parentPhone2))) {
      setError('Parent phone number must be 10 digits');
      return;
    }

    try {
      await registerStudent({
        rfid,
        name,
        admissionNumber,
        parentPhone,
        parentPhone2: parentPhone2 || undefined,
        lastEvent: null,
      });
      Alert.alert('Success', 'Student registered successfully!', [
        { text: 'OK', onPress: () => router.replace('/students') },
      ]);
      setName('');
      setAdmissionNumber('');
      setParentPhone('');
      setParentPhone2('');
      setRfid('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register student');
    }
  };

  const copyToClipboard = async () => {
    if (rfid) {
      await Clipboard.setStringAsync(rfid);
      Alert.alert('Success', 'RFID copied to clipboard!');
    }
  };

  useEffect(() => {
    return () => {
      stopNfc().catch((err) => console.log('Error stopping NFC:', err));
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register Student</Text>
      {error && <Text style={styles.errorText}>{error}</Text>}
      <TextInput
        style={styles.input}
        placeholder="Name *"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Admission Number *"
        value={admissionNumber}
        onChangeText={setAdmissionNumber}
      />
      <TextInput
        style={styles.input}
        placeholder="Parent Phone (10 digits) *"
        value={parentPhone}
        onChangeText={setParentPhone}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Parent Phone 2 (optional, 10 digits)"
        value={parentPhone2}
        onChangeText={setParentPhone2}
        keyboardType="numeric"
      />
      <TouchableOpacity
        style={[styles.scanButton, scanning && styles.scanButtonActive]}
        onPress={handleScanRfid}
        disabled={scanning}
      >
        <Text style={styles.scanButtonText}>{scanning ? 'Scanning...' : 'Scan RFID *'}</Text>
      </TouchableOpacity>
      {rfid && (
        <View style={styles.rfidContainer}>
          <Text style={styles.rfidText}>RFID: {rfid}</Text>
          <TouchableOpacity style={styles.copyButton} onPress={copyToClipboard}>
            <Text style={styles.copyButtonText}>Copy</Text>
          </TouchableOpacity>
        </View>
      )}
      <Button title="Register Student" onPress={handleRegister} color="#4A90E2" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 30,
    fontFamily: 'Poppins-Bold',
  },
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
  scanButton: {
    height: 50,
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  scanButtonActive: {
    backgroundColor: '#3498DB',
    opacity: 0.7,
  },
  scanButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  rfidContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  rfidText: {
    fontSize: 16,
    color: '#2C3E50',
    fontFamily: 'Poppins-Regular',
  },
  copyButton: {
    backgroundColor: '#2ECC71',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  copyButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  errorText: {
    color: '#E74C3C',
    textAlign: 'center',
    marginBottom: 15,
    fontFamily: 'Poppins-Regular',
  },
});