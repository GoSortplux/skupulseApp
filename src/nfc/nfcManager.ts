// src/nfc/nfcManager.ts
import NfcManager, { NfcEvents, NfcTech } from 'react-native-nfc-manager';
import { getStudent, updateStudent, logAttendance, logMessage } from '../utils/storage';
import { sendSMS } from '../utils/sms';
import Tts from 'react-native-tts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { debounce } from 'lodash';
import { Student, NfcSuccessData } from '../../types';

const DEBOUNCE_DELAY = 2000;

const handleNfcScan = debounce(
  async (
    tag: { id?: string },
    onSuccess: (data: NfcSuccessData) => void,
    onError: (error: string) => void,
    readOnly: boolean
  ) => {
    if (!tag?.id) {
      onError('Failed to read RFID tag.');
      return;
    }

    const rfid = tag.id;

    if (readOnly) {
      onSuccess({ rfid });
      return;
    }

    const student = await getStudent(rfid);
    if (!student) {
      onError('Student not registered with this RFID.');
      return;
    }

    const currentDate = new Date().toISOString().split('T')[0];
    if (student.lastEvent) {
      const lastEventDate = new Date(student.lastEvent.timestamp).toISOString().split('T')[0];
      if (lastEventDate === currentDate) {
        onError(`Student has already signed ${student.lastEvent.event} today.`);
        return;
      }
    }

    const now = new Date();
    const event = now.getHours() < 12 ? 'in' : 'out';

    const message = `Dear Parent, ${student.name} has ${
      event === 'in' ? 'entered' : 'exited'
    } the school on ${now.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })} at ${now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })}`;

    await logAttendance(rfid, event);
    await updateStudent(rfid, { ...student, lastEvent: { event, timestamp: now.getTime() } });

    const ttsEnabled = (await AsyncStorage.getItem('@SchoolRFIDApp:ttsEnabled')) !== 'false';
    if (ttsEnabled) {
      Tts.speak(event === 'in' ? `Hello ${student.name}, welcome to school` : `Bye bye ${student.name}`);
    }

    let smsError;
    try {
      const smsPromises = [sendSMS(rfid, student.parentPhone, message)];
      if (student.parentPhone2) {
        smsPromises.push(sendSMS(rfid, student.parentPhone2, message));
      }
      await Promise.all(smsPromises);
      await logMessage(rfid, student.parentPhone, message, 'sent');
      if (student.parentPhone2) {
        await logMessage(rfid, student.parentPhone2, message, 'sent');
      }
    } catch (err) {
      smsError = err instanceof Error ? err.message : 'SMS failed';
      await logMessage(rfid, student.parentPhone, message, 'failed');
      if (student.parentPhone2) {
        await logMessage(rfid, student.parentPhone2, message, 'failed');
      }
    }

    onSuccess({ rfid, student, event, message, smsError });
  },
  DEBOUNCE_DELAY,
  { leading: true, trailing: false }
);

export const startNfc = async (
  onSuccess: (data: NfcSuccessData) => void,
  onError: (error: string) => void,
  readOnly: boolean
) => {
  try {
    const isSupported = await NfcManager.isSupported();
    if (!isSupported) throw new Error('This device does not support NFC.');

    const isEnabled = await NfcManager.isEnabled();
    if (!isEnabled) throw new Error('NFC is not enabled. Please enable it in settings.');

    await NfcManager.start();
    await NfcManager.requestTechnology(NfcTech.NfcA);

    NfcManager.setEventListener(NfcEvents.DiscoverTag, (tag) => {
      handleNfcScan(tag, onSuccess, onError, readOnly);
    });
  } catch (error) {
    onError(error instanceof Error ? error.message : 'NFC initialization failed.');
  }
};

export const stopNfc = async () => {
  try {
    NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
    await NfcManager.cancelTechnologyRequest();
  } catch (err) {
    console.log('Error stopping NFC:', err);
  }
};
