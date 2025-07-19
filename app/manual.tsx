import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { startNfc, stopNfc, NfcSuccessData } from '../src/nfc/nfcManager';
import { getStudent, Student, logAttendance, updateStudent, logMessage } from '../src/utils/storage';
import { sendSMS } from '../src/utils/sms';
import Tts from 'react-native-tts';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ManualScreen() {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [smsError, setSmsError] = useState<string | null>(null);

  const handleSign = async (event: 'in' | 'out') => {
    setScanning(true);
    setError(null);
    setSmsError(null);

    await startNfc(
      async (data: NfcSuccessData) => {
        const student = await getStudent(data.rfid);
        if (!student) {
          setError('Student with this RFID not found.');
          setScanning(false);
          return;
        }

        const now = new Date();
        const message = `Dear Parent, ${student.name} has ${
          event === 'in' ? 'entered' : 'exited'
        } the school on ${now.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;

        try {
          await logAttendance(data.rfid, event, true); // Mark as manual
          await updateStudent(data.rfid, { ...student, lastEvent: { event, timestamp: Date.now() } });

          await sendSMS(data.rfid, student.parentPhone, message);
          await logMessage(data.rfid, student.parentPhone, message, 'sent');
          if (student.parentPhone2) {
            await sendSMS(data.rfid, student.parentPhone2, message);
            await logMessage(data.rfid, student.parentPhone2, message, 'sent');
          }

          const ttsEnabled = (await AsyncStorage.getItem('@SchoolRFIDApp:ttsEnabled')) !== 'false';
          if (ttsEnabled) {
            Tts.speak(event === 'in' ? `Hello ${student.name}, welcome to school` : `Bye bye ${student.name}`);
          }

          Alert.alert('Success', `${student.name} has been ${event} successfully.`);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to process manual sign';
          setSmsError(errorMessage);
          await logMessage(data.rfid, student.parentPhone, message, 'failed');
          if (student.parentPhone2) {
            await logMessage(data.rfid, student.parentPhone2, message, 'failed');
          }
          Alert.alert('Error', `Failed to ${event}: ${errorMessage}`);
        } finally {
          setScanning(false);
        }
      },
      (err: string) => {
        setError(err);
        setScanning(false);
      }
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manual Clock-In/Out</Text>
      {scanning ? (
        <Text style={styles.message}>Place RFID card near your device...</Text>
      ) : (
        <View style={styles.buttonContainer}>
          <Button title="Sign In" onPress={() => handleSign('in')} color="#34C759" disabled={scanning} />
          <Button title="Sign Out" onPress={() => handleSign('out')} color="#FF9500" disabled={scanning} />
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
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  errorText: { fontSize: 16, color: 'red', marginTop: 10 },
});