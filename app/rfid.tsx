import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { startNfc, stopNfc } from '../src/nfc/nfcManager';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export default function RfidScreen() {
  const [scanning, setScanning] = useState(false);
  const [rfid, setRfid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [smsError, setSmsError] = useState<string | null>(null);

  const handleScan = async () => {
    setScanning(true);
    setRfid(null);
    setError(null);
    setSmsError(null);

    await startNfc(
      (data) => {
        setRfid(data.rfid);
        setScanning(false);
        if (data.smsError) setSmsError(data.smsError); // Display SMS error if present
      },
      (err: string) => {
        setError(err);
        setScanning(false);
      },
      true
    );
  };

  useFocusEffect(
    React.useCallback(() => {
      handleScan();
      return () => {
        stopNfc().catch((err) => console.log('Error stopping NFC:', err));
      };
    }, [])
  );

  const copyToClipboard = async () => {
    if (rfid) {
      await Clipboard.setStringAsync(rfid);
      Alert.alert('Success', 'RFID copied to clipboard!');
    }
  };

  const navigateToRegister = () => {
    if (rfid) {
      router.push({ pathname: '/register', params: { rfid } });
    } else {
      Alert.alert('Error', 'Please scan an RFID tag first.');
    }
  };

  const shareLogs = async () => {
    const logInfo = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}sms_logs.txt`);
    if (logInfo.exists) {
      await Sharing.shareAsync(`${FileSystem.documentDirectory}sms_logs.txt`);
    } else {
      Alert.alert('No logs found');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Get RFID</Text>
      {scanning ? (
        <Text style={styles.message}>Place RFID card near your device...</Text>
      ) : (
        <Button title="Scan Again" onPress={handleScan} color="#007AFF" />
      )}
      {rfid && (
        <View style={styles.resultContainer}>
          <TouchableOpacity onPress={copyToClipboard}>
            <Text style={[styles.resultText, styles.clickableText]}>RFID: {rfid}</Text>
          </TouchableOpacity>
          <Button title="Register Student with this RFID" onPress={navigateToRegister} color="#34C759" />
          <Button title="Share Logs" onPress={shareLogs} color="#FF2D55" />
        </View>
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}
      {smsError && <Text style={styles.errorText}>SMS Error: {smsError}</Text>}
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