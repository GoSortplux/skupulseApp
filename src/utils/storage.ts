// src/utils/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import * as Papa from 'papaparse';
import * as Sharing from 'expo-sharing';

export interface Student {
  rfid: string;
  name: string;
  admissionNumber: string;
  parentPhone: string;
  parentPhone2?: string;
  lastEvent: { event: 'in' | 'out'; timestamp: number } | null;
}

export interface AttendanceLog {
  rfid: string;
  event: 'in' | 'out';
  timestamp: number;
  studentName?: string;
  manual?: boolean;
}

export interface MessageLog {
  rfid: string;
  phoneNumber: string;
  message: string;
  status: 'sent' | 'failed';
  timestamp: number;
  studentName?: string;
}

const STUDENTS_KEY = '@skupulseApp:students';
const ATTENDANCE_KEY = '@skupulseApp:attendance';
const MESSAGE_KEY = '@skupulseApp:messages';
const LAST_RESET_KEY = '@skupulseApp:lastResetTimestamp';

export const registerStudent = async (student: Student): Promise<void> => {
  const students = await getAllStudents();
  if (students.find((s) => s.rfid === student.rfid)) {
    throw new Error('Student with this RFID already exists');
  }
  await AsyncStorage.setItem(STUDENTS_KEY, JSON.stringify([...students, student]));
};

export const getAllStudents = async (): Promise<Student[]> => {
  const jsonValue = await AsyncStorage.getItem(STUDENTS_KEY);
  return jsonValue ? JSON.parse(jsonValue) : [];
};

export const getStudent = async (rfid: string): Promise<Student | null> => {
  const students = await getAllStudents();
  return students.find((student) => student.rfid === rfid) || null;
};

export const updateStudent = async (rfid: string, student: Student): Promise<void> => {
  const students = await getAllStudents();
  const updatedStudents = students.map((s) => (s.rfid === rfid ? student : s));
  await AsyncStorage.setItem(STUDENTS_KEY, JSON.stringify(updatedStudents));
};

export const deleteStudent = async (rfid: string): Promise<void> => {
  const students = await getAllStudents();
  const updatedStudents = students.filter((student) => student.rfid !== rfid);
  await AsyncStorage.setItem(STUDENTS_KEY, JSON.stringify(updatedStudents));
};

export const resetStudentStatuses = async (): Promise<void> => {
  const lastResetTimestamp = await AsyncStorage.getItem(LAST_RESET_KEY);
  const currentDate = new Date().toISOString().split('T')[0];
  const lastResetDate = lastResetTimestamp ? new Date(parseInt(lastResetTimestamp)).toISOString().split('T')[0] : null;

  if (lastResetDate !== currentDate) {
    const students = await getAllStudents();
    const updatedStudents = students.map((student) => ({
      ...student,
      lastEvent: null,
    }));
    await AsyncStorage.setItem(STUDENTS_KEY, JSON.stringify(updatedStudents));
    await AsyncStorage.setItem(LAST_RESET_KEY, Date.now().toString());
    console.log('Student statuses reset for new day:', currentDate);
  }
};

export const importStudentsFromCSV = async (uri: string): Promise<void> => {
  try {
    console.log('Starting CSV import from URI:', uri);
    const content = await FileSystem.readAsStringAsync(uri);
    console.log('CSV content:', content);

    const { data, errors } = Papa.parse(content, { header: true, skipEmptyLines: true });
    if (errors.length > 0) {
      console.error('Papa Parse errors:', errors);
      throw new Error('Failed to parse CSV file: ' + errors[0].message);
    }
    console.log('Parsed CSV data:', data);

    const students: Student[] = data
      .filter((row: any) => {
        const isValid = row.rfid && row.name && row.admissionNumber && row.parentPhone;
        if (!isValid) {
          console.warn('Skipping invalid row:', row);
        }
        return isValid;
      })
      .map((row: any) => {
        let lastEvent = null;
        try {
          lastEvent = row.lastEvent ? JSON.parse(row.lastEvent) : null;
        } catch (error) {
          console.warn(`Failed to parse lastEvent for student ${row.rfid}:`, error);
        }
        return {
          rfid: row.rfid.trim(),
          name: row.name.trim(),
          admissionNumber: row.admissionNumber.trim(),
          parentPhone: row.parentPhone.trim(),
          parentPhone2: row.parentPhone2 ? row.parentPhone2.trim() : undefined,
          lastEvent,
        };
      });

    if (students.length === 0) {
      throw new Error('No valid students found in CSV file');
    }

    const existingStudents = await getAllStudents();
    const existingRfids = new Set(existingStudents.map((s) => s.rfid));
    const newStudents = students.filter((student) => {
      if (existingRfids.has(student.rfid)) {
        console.warn(`Duplicate RFID found: ${student.rfid}. Skipping this student.`);
        return false;
      }
      existingRfids.add(student.rfid);
      return true;
    });

    console.log('New students to import:', newStudents);

    if (newStudents.length === 0) {
      throw new Error('No new students to import (all RFIDs already exist)');
    }

    const updatedStudents = [...existingStudents, ...newStudents];
    await AsyncStorage.setItem(STUDENTS_KEY, JSON.stringify(updatedStudents));
    console.log('Students successfully imported. Total students:', updatedStudents.length);
  } catch (error) {
    console.error('Error importing students from CSV:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to import students from CSV');
  }
};

export const exportStudentsToExcel = async (): Promise<void> => {
  const students = await getAllStudents();
  const ws = XLSX.utils.json_to_sheet(students);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const fileName = `students_${new Date().toISOString().split('T')[0]}.xlsx`;
  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
  
  await FileSystem.writeAsStringAsync(fileUri, wbout, { encoding: FileSystem.EncodingType.Base64 });
  
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device');
  }
  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: 'Save Students Excel File',
    UTI: 'org.openxmlformats.spreadsheetml.sheet',
  });
};

export const exportAttendanceToExcel = async (): Promise<void> => {
  const logs = await getAttendanceLogs();
  const ws = XLSX.utils.json_to_sheet(logs);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const fileName = `attendance_${new Date().toISOString().split('T')[0]}.xlsx`;
  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
  
  await FileSystem.writeAsStringAsync(fileUri, wbout, { encoding: FileSystem.EncodingType.Base64 });
  
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device');
  }
  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: 'Save Attendance Excel File',
    UTI: 'org.openxmlformats.spreadsheetml.sheet',
  });
};

export const logAttendance = async (rfid: string, event: 'in' | 'out', manual: boolean = false): Promise<void> => {
  const student = await getStudent(rfid);
  const log: AttendanceLog = { rfid, event, timestamp: Date.now(), studentName: student?.name, manual };
  const logs = await getAttendanceLogs();
  await AsyncStorage.setItem(ATTENDANCE_KEY, JSON.stringify([...logs, log]));
};

export const getAttendanceLogs = async (): Promise<AttendanceLog[]> => {
  const jsonValue = await AsyncStorage.getItem(ATTENDANCE_KEY);
  return jsonValue ? JSON.parse(jsonValue) : [];
};

export const deleteAttendanceLogs = async (timestamps: number[]): Promise<void> => {
  const logs = await getAttendanceLogs();
  const updatedLogs = logs.filter((log) => !timestamps.includes(log.timestamp));
  await AsyncStorage.setItem(ATTENDANCE_KEY, JSON.stringify(updatedLogs));
};

export const deleteAllAttendanceLogs = async (): Promise<void> => {
  await AsyncStorage.setItem(ATTENDANCE_KEY, JSON.stringify([]));
};

export const logMessage = async (rfid: string, phoneNumber: string, message: string, status: 'sent' | 'failed'): Promise<void> => {
  const student = await getStudent(rfid);
  const log: MessageLog = { 
    rfid, 
    phoneNumber, 
    message, 
    status, 
    timestamp: Date.now(),
    studentName: student?.name || 'Unknown',
  };
  const logs = await getMessageLogs();
  await AsyncStorage.setItem(MESSAGE_KEY, JSON.stringify([...logs, log]));
};

export const getMessageLogs = async (): Promise<MessageLog[]> => {
  const jsonValue = await AsyncStorage.getItem(MESSAGE_KEY);
  const logs: MessageLog[] = jsonValue ? JSON.parse(jsonValue) : [];
  const students = await getAllStudents();
  const studentMap = new Map(students.map((student) => [student.rfid, student.name]));
  return logs.map((log) => ({
    ...log,
    studentName: log.studentName || studentMap.get(log.rfid) || 'Unknown',
  }));
};

export const deleteMessageLogs = async (timestamps: number[]): Promise<void> => {
  const logs = await getMessageLogs();
  const updatedLogs = logs.filter((log) => !timestamps.includes(log.timestamp));
  await AsyncStorage.setItem(MESSAGE_KEY, JSON.stringify(updatedLogs));
};

export const deleteAllMessageLogs = async (): Promise<void> => {
  await AsyncStorage.setItem(MESSAGE_KEY, JSON.stringify([]));
};

export const getStudents = getAllStudents;