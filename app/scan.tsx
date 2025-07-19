// app/scan.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Alert, TouchableOpacity, FlatList } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useNfc } from '../src/nfc/useNfc';
import { resetStudentStatuses } from '../src/utils/storage';
import Tts from 'react-native-tts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NfcSuccessData } from '../types';

export default function ScanScreen() {
  const [scanHistory, setScanHistory] = useState<NfcSuccessData[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Tts.getInitStatus()
      .then(() => {
        Tts.setDefaultLanguage('en-US');
        Tts.setDefaultRate(0.5);
      })
      .catch((err) => console.error('TTS init failed:', err));

    return () => {
      Tts.stop();
    };
  }, []);

  const handleSuccess = (data: NfcSuccessData) => {
    setScanHistory((prevHistory) => [data, ...prevHistory]);
    setError(null);
  };

  const handleError = (err: string) => {
    setError(err);
  };

  const { isScanning, start, stop } = useNfc({
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const handleScan = async () => {
    setError(null);
    try {
      await resetStudentStatuses();
    } catch (err) {
      console.error('Error resetting student statuses:', err);
      setError('Failed to reset student statuses. Please try again.');
      return;
    }

    const continuousScan = (await AsyncStorage.getItem('@SchoolRFIDApp:continuousScanEnabled')) !== 'false';
    if (continuousScan) {
      start();
    } else {
      await start();
      setTimeout(async () => {
        await stop();
      }, 2000);
    }
  };

  const copyToClipboard = async (rfid: string) => {
    await Clipboard.setStringAsync(rfid);
    Alert.alert('Success', 'RFID copied to clipboard!');
  };

  const renderScanItem = ({ item }: { item: NfcSuccessData }) => (
    <View style={styles.resultContainer}>
      <TouchableOpacity onPress={() => copyToClipboard(item.rfid)}>
        <Text style={[styles.resultText, styles.clickableText]}>RFID: {item.rfid}</Text>
      </TouchableOpacity>
      {item.student && (
        <>
          <Text style={styles.resultText}>Student: {item.student.name}</Text>
          <Text style={styles.resultText}>Admission: {item.student.admissionNumber}</Text>
          <Text style={styles.resultText}>Event: {item.event === 'in' ? 'Clock In' : 'Clock Out'}</Text>
          <Text style={styles.resultText}>Message sent to: {item.student.parentPhone}</Text>
          {item.student.parentPhone2 && (
            <Text style={styles.resultText}>Also sent to: {item.student.parentPhone2}</Text>
          )}
          <Text style={styles.resultText}>Message: {item.message}</Text>
          {item.smsError && <Text style={styles.errorText}>SMS Error: {item.smsError}</Text>}
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan RFID Card</Text>
      {isScanning ? (
        <Text style={styles.message}>Place RFID card near your device...</Text>
      ) : (
        <Button title="Start Scanning" onPress={handleScan} color="#007AFF" />
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}
      <FlatList
        data={scanHistory}
        renderItem={renderScanItem}
        keyExtractor={(item, index) => `${item.rfid}-${index}`}
        style={styles.historyList}
      />
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
  historyList: { width: '100%', marginTop: 20 },
});
