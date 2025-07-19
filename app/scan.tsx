// app/scan.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { startNfc, stopNfc, NfcSuccessData } from '../src/nfc/nfcManager';
import { resetStudentStatuses } from '../src/utils/storage';
import Tts from 'react-native-tts';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ScanScreen() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<NfcSuccessData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Tts.getInitStatus()
      .then(() => {
        Tts.setDefaultLanguage('en-US');
        Tts.setDefaultRate(0.5);
        console.log('TTS initialized');
      })
      .catch((err) => {
        console.error('TTS init failed:', err);
      });

    handleScan();

    return () => {
      stopNfc().catch((err) => console.log('Error stopping NFC:', err));
      Tts.stop();
    };
  }, []);

  const handleScan = async () => {
    setScanning(true);
    setResult(null);
    setError(null);

    try {
      await resetStudentStatuses();
    } catch (err) {
      console.error('Error resetting student statuses:', err);
      setError('Failed to reset student statuses. Please try again.');
      setScanning(false);
      return;
    }

    const continuousScan = (await AsyncStorage.getItem('@SchoolRFIDApp:continuousScanEnabled')) !== 'false';

    await startNfc(
      (data: NfcSuccessData) => {
        setResult(data);
        setScanning(false);
        if (continuousScan) {
          setTimeout(handleScan, 2000);
        }
      },
      (err: string) => {
        setError(err);
        setScanning(false);
        if (continuousScan) {
          setTimeout(handleScan, 2000);
        }
      }
    );
  };

  const copyToClipboard = async (rfid: string) => {
    await Clipboard.setStringAsync(rfid);
    Alert.alert('Success', 'RFID copied to clipboard!');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan RFID Card</Text>
      {scanning ? (
        <Text style={styles.message}>Place RFID card near your device...</Text>
      ) : (
        <Button title="Start Scanning" onPress={handleScan} color="#007AFF" />
      )}
      {result && (
        <View style={styles.resultContainer}>
          <TouchableOpacity onPress={() => copyToClipboard(result.rfid)}>
            <Text style={[styles.resultText, styles.clickableText]}>RFID: {result.rfid}</Text>
          </TouchableOpacity>
          <Text style={styles.resultText}>Student: {result.student?.name}</Text>
          <Text style={styles.resultText}>Admission: {result.student?.admissionNumber}</Text>
          <Text style={styles.resultText}>
            Event: {result.event === 'in' ? 'Clock In' : 'Clock Out'}
          </Text>
          <Text style={styles.resultText}>Message sent to: {result.student?.parentPhone}</Text>
          {result.student?.parentPhone2 && (
            <Text style={styles.resultText}>Also sent to: {result.student?.parentPhone2}</Text>
          )}
          <Text style={styles.resultText}>Message: {result.message}</Text>
          {result.smsError && <Text style={styles.errorText}>SMS Error: {result.smsError}</Text>}
        </View>
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  message: { fontSize: 18, color: '#333', marginBottom: 20 },
  resultContainer: { marginTop: 20, padding: 10, backgroundColor: '#e0e0e0', borderRadius: 5, alignItems: 'center' },
  resultText: { fontSize: 16, marginVertical: 5 },
  clickableText: { color: '#007AFF', textDecorationLine: 'underline' },
  errorText: { fontSize: 16, color: 'red', marginTop: 10 },
});