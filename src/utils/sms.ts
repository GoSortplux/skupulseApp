import Constants from 'expo-constants';
import { logMessage } from './storage';
import * as FileSystem from 'expo-file-system';

// Retrieve Termii credentials from app config
const TERMII_API_KEY = Constants.expoConfig?.extra?.TERMII_API_KEY;
const TERMII_SENDER_ID = Constants.expoConfig?.extra?.TERMII_SENDER_ID;
const TERMII_API_URL = Constants.expoConfig?.extra?.TERMII_API_URL;

const LOG_FILE = `${FileSystem.documentDirectory}sms_logs.txt`;

// The logging function remains the same
const appendLog = async (message: string) => {
  try {
    let existing = '';
    try {
      existing = await FileSystem.readAsStringAsync(LOG_FILE, { encoding: FileSystem.EncodingType.UTF8 });
    } catch (readError) {
      // File may not exist yet, which is fine.
    }
    const newLog = `${new Date().toISOString()} - ${message}\n`;
    await FileSystem.writeAsStringAsync(LOG_FILE, existing + newLog, { encoding: FileSystem.EncodingType.UTF8 });
  } catch (error) {
    console.error('Failed to write log:', error);
  }
};

export const sendSMS = async (rfid: string, phoneNumber: string, message: string): Promise<void> => {
  // Check for Termii API key, Sender ID, and Base URL
  if (!TERMII_API_KEY || !TERMII_SENDER_ID || !TERMII_API_URL) {
    const errorMsg = 'Termii API key, Sender ID, or URL not configured.';
    await appendLog(errorMsg);
    throw new Error(errorMsg);
  }

  // Format phone number for Termii (e.g., '2348012345678', no '+')
  let formattedPhoneNumber = phoneNumber;
  if (phoneNumber.startsWith('0')) {
    formattedPhoneNumber = `234${phoneNumber.substring(1)}`;
  } else if (!phoneNumber.startsWith('234')) {
    formattedPhoneNumber = `234${phoneNumber}`;
  }

  // Construct the full endpoint URL from the base URL
  const url = `${TERMII_API_URL}/api/sms/send`;

  // Construct the payload for the Termii API
  const payload = {
    to: formattedPhoneNumber,
    from: TERMII_SENDER_ID,
    sms: message,
    type: 'plain',
    channel: 'dnd', // 👈 CHANGED: Set channel to 'dnd' as requested
    api_key: TERMII_API_KEY,
  };

  // Log the request payload for debugging (hiding the API key)
  await appendLog(`Sending SMS with Termii payload:\n${JSON.stringify(payload, (key, value) => key === 'api_key' ? '***' : value, 2)}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    await appendLog(`Termii Raw Response:\n${JSON.stringify(result, null, 2)}`);

    // Check for a successful response
    if (response.ok && (result?.code === 'ok' || result?.message === 'Message sent successfully.')) {
      console.log('SMS Successfully Sent via Termii:', result);
      await logMessage(rfid, formattedPhoneNumber, message, 'sent');
      return;
    }

    // If not successful, throw an error
    const errorMessage = result?.message || 'Failed to send SMS via Termii';
    throw new Error(`${errorMessage} (Status: ${response.status})`);

  } catch (error) {
    await logMessage(rfid, formattedPhoneNumber, message, 'failed');
    const errorMessage = error instanceof Error ? error.message : 'Unknown SMS error';
    await appendLog(`Termii SMS Error Details: ${errorMessage}`);
    console.error('Termii SMS Error Details:', errorMessage, error);
    throw new Error(errorMessage);
  }
};