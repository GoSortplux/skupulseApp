import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { startNfc, stopNfc, NfcSuccessData } from '../../src/nfc/nfcManager';
import { resetStudentStatuses } from '../../src/utils/storage';
import Tts from 'react-native-tts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function ScanScreen() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<NfcSuccessData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const colorScheme = useColorScheme();

  useEffect(() => {
    Tts.getInitStatus()
      .then(() => {
        Tts.setDefaultLanguage('en-US');
        Tts.setDefaultRate(0.5);
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

  const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: Colors[colorScheme ?? 'light'].background },
    title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: Colors[colorScheme ?? 'light'].text },
    scanButton: {
      backgroundColor: Colors[colorScheme ?? 'light'].tint,
      paddingVertical: 15,
      paddingHorizontal: 30,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      marginBottom: 20,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    scanButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
    message: { fontSize: 18, textAlign: 'center', color: Colors[colorScheme ?? 'light'].text, marginBottom: 20 },
    resultContainer: {
      marginTop: 20,
      padding: 15,
      borderRadius: 10,
      backgroundColor: Colors[colorScheme ?? 'light'].card,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.22,
      shadowRadius: 2.22,
    },
    resultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 8,
    },
    resultText: { fontSize: 16, marginLeft: 10, color: Colors[colorScheme ?? 'light'].text },
    clickableText: { color: Colors[colorScheme ?? 'light'].tint, textDecorationLine: 'underline' },
    errorText: { fontSize: 16, color: 'red', marginTop: 10, textAlign: 'center' },
    loader: {
      marginVertical: 20,
    },
  });

  return (
    <ThemedView style={styles.container}>
      <ScrollView>
        <ThemedText style={styles.title}>Scan RFID Card</ThemedText>

        {scanning ? (
          <>
            <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} style={styles.loader} />
            <ThemedText style={styles.message}>Place RFID card near your device...</ThemedText>
          </>
        ) : (
          <TouchableOpacity style={styles.scanButton} onPress={handleScan}>
            <IconSymbol name="arrow.clockwise" size={20} color="white" />
            <Text style={styles.scanButtonText}>Start Scanning</Text>
          </TouchableOpacity>
        )}

        {result && (
          <View style={styles.resultContainer}>
            <TouchableOpacity style={styles.resultRow} onPress={() => copyToClipboard(result.rfid)}>
              <IconSymbol name="creditcard.fill" size={20} color={Colors[colorScheme ?? 'light'].text} />
              <Text style={[styles.resultText, styles.clickableText]}>RFID: {result.rfid}</Text>
            </TouchableOpacity>
            <View style={styles.resultRow}>
              <IconSymbol name="person.fill" size={20} color={Colors[colorScheme ?? 'light'].text} />
              <Text style={styles.resultText}>Student: {result.student?.name}</Text>
            </View>
            <View style={styles.resultRow}>
              <IconSymbol name="number.square.fill" size={20} color={Colors[colorScheme ?? 'light'].text} />
              <Text style={styles.resultText}>Admission: {result.student?.admissionNumber}</Text>
            </View>
            <View style={styles.resultRow}>
              <IconSymbol name="calendar" size={20} color={Colors[colorScheme ?? 'light'].text} />
              <Text style={styles.resultText}>Event: {result.event === 'in' ? 'Clock In' : 'Clock Out'}</Text>
            </View>
            <View style={styles.resultRow}>
              <IconSymbol name="phone.fill" size={20} color={Colors[colorScheme ?? 'light'].text} />
              <Text style={styles.resultText}>Message sent to: {result.student?.parentPhone}</Text>
            </View>
            {result.student?.parentPhone2 && (
              <View style={styles.resultRow}>
                <IconSymbol name="phone.fill" size={20} color={Colors[colorScheme ?? 'light'].text} />
                <Text style={styles.resultText}>Also sent to: {result.student?.parentPhone2}</Text>
              </View>
            )}
            <View style={styles.resultRow}>
              <IconSymbol name="message.fill" size={20} color={Colors[colorScheme ?? 'light'].text} />
              <Text style={styles.resultText}>Message: {result.message}</Text>
            </View>
            {result.smsError && (
              <View style={styles.resultRow}>
                <IconSymbol name="exclamationmark.triangle.fill" size={20} color="red" />
                <Text style={[styles.resultText, {color: 'red'}]}>SMS Error: {result.smsError}</Text>
              </View>
            )}
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>
    </ThemedView>
  );
}
