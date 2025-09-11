import NfcManager, { NfcEvents } from 'react-native-nfc-manager';
import { getStudent, updateStudent, logAttendance, Student, logMessage } from '../utils/storage';
import { sendSMS } from '../utils/sms';
import { formatStudentName } from '../utils/format';
import Tts from 'react-native-tts';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NfcSuccessData {
  rfid: string;
  student?: Student;
  event?: 'in' | 'out';
  message?: string;
  smsError?: string;
}

let lastScanTime = 0;
const DEBOUNCE_DELAY = 2000;
const processedScans = new Set<string>();

export const startNfc = async (
  onSuccess: (data: NfcSuccessData) => void,
  onError: (error: string) => void,
  readOnly: boolean = false
) => {
  try {
    const isSupported = await NfcManager.isSupported();
    if (!isSupported) throw new Error('This device does not support NFC.');

    const isEnabled = await NfcManager.isEnabled();
    if (!isEnabled) throw new Error('NFC is not enabled. Please enable it in settings.');

    await NfcManager.start();

    NfcManager.setEventListener(NfcEvents.DiscoverTag, async (tag: { id?: string }) => {
      const scanTime = Date.now();
      const scanId = `${tag?.id}_${scanTime}`;
      if (scanTime - lastScanTime < DEBOUNCE_DELAY || processedScans.has(scanId)) return;
      lastScanTime = scanTime;
      processedScans.add(scanId);

      if (!tag?.id) {
        onError('Failed to read RFID tag.');
        await stopNfc();
        return;
      }

      const rfid = tag.id;
      const student = await getStudent(rfid);

      if (readOnly) {
        onSuccess({ rfid });
        await stopNfc();
        return;
      }

      if (!student) {
        onError('Student not registered with this RFID.');
        await stopNfc();
        return;
      }

      const currentDate = new Date().toISOString().split('T')[0];
      if (student.lastEvent) {
        const lastEventDate = new Date(student.lastEvent.timestamp).toISOString().split('T')[0];
        if (lastEventDate === currentDate) {
          onError(`Student has already signed ${student.lastEvent.event} today.`);
          await stopNfc();
          return;
        }
      }

      const now = new Date();
      const isAM = now.getHours() < 12;
      const event: 'in' | 'out' = isAM ? 'in' : 'out';

      const formatTime = (date: Date) => {
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours %= 12;
        hours = hours || 12; // the hour '0' should be '12'
        const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
        return `${hours}:${minutesStr} ${ampm}`;
      };

      const formattedName = formatStudentName(student.name);
      const message = `GoSortplux: Dear Parent, ${formattedName} has ${
        event === 'in' ? 'entered' : 'exited'
      } the school on ${now.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })} at ${formatTime(now)}`;

      await logAttendance(rfid, event);
      await updateStudent(rfid, { ...student, lastEvent: { event, timestamp: scanTime } });

      const ttsEnabled = (await AsyncStorage.getItem('@skupulseApp:ttsEnabled')) !== 'false';
      const smsEnabled = (await AsyncStorage.getItem('@skupulseApp:smsEnabled')) !== 'false';
      let smsError: string | undefined;

      if (ttsEnabled) {
        if (event === 'in') Tts.speak(`Hello ${student.name}, welcome to school`);
        else if (event === 'out') Tts.speak(`Bye bye ${student.name}`);
      }

      onSuccess({ rfid, student, event, message, smsError }); // Pass smsError to UI
      await stopNfc();

      if (smsEnabled) {
        try {
          sendSMS(rfid, student.parentPhone, message);
          if (student.parentPhone2) {
            sendSMS(rfid, student.parentPhone2, message);
          }
        } catch (err) {
          console.error('SMS sending failed:', err);
        }
      }
    });

    await NfcManager.registerTagEvent();
  } catch (error) {
    onError(error instanceof Error ? error.message : 'NFC initialization failed.');
    await stopNfc();
  }
};

export const stopNfc = async () => {
  NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
  await NfcManager.unregisterTagEvent().catch((err) => console.log('Error stopping NFC:', err));
  processedScans.clear();
};