// types.ts
export interface Student {
  rfid: string;
  name: string;
  admissionNumber: string;
  parentPhone: string;
  parentPhone2?: string;
  lastEvent?: {
    event: 'in' | 'out';
    timestamp: number;
  };
}

export interface NfcSuccessData {
  rfid: string;
  student?: Student;
  event?: 'in' | 'out';
  message?: string;
  smsError?: string;
}

export interface AttendanceLog {
  rfid: string;
  event: 'in' | 'out';
  timestamp: number;
}

export interface MessageLog {
  rfid: string;
  phone: string;
  message: string;
  status: 'sent' | 'failed';
  timestamp: number;
}
