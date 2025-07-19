import Constants from 'expo-constants';
import { logMessage } from './storage';
import * as FileSystem from 'expo-file-system';

const SMSLIVE247_API_KEY = Constants.expoConfig?.extra?.SMSLIVE247_API_KEY;
const SMSLIVE247_SENDER = Constants.expoConfig?.extra?.SMSLIVE247_SENDER || 'Glisten';
const LOG_FILE = `${FileSystem.documentDirectory}sms_logs.txt`;

const appendLog = async (message: string) => {
  try {
    let existing = '';
    try {
      existing = await FileSystem.readAsStringAsync(LOG_FILE, { encoding: FileSystem.EncodingType.UTF8 });
    } catch (readError) {
      // File may not exist yet; ignore
    }
    const newLog = `${new Date().toISOString()} - ${message}\n`;
    await FileSystem.writeAsStringAsync(LOG_FILE, existing + newLog, { encoding: FileSystem.EncodingType.UTF8 });
  } catch (error) {
    console.error('Failed to write log:', error);
  }
};

export const sendSMS = async (rfid: string, phoneNumber: string, message: string): Promise<void> => {
  if (!SMSLIVE247_API_KEY) {
    const errorMsg = 'SMSLive247 API key not configured.';
    await appendLog(errorMsg);
    throw new Error(errorMsg);
  }

  const formattedPhoneNumber = `+${phoneNumber.replace(/^0/, '234')}`; // Ensure +234 prefix
  const payloadLog = JSON.stringify({
    SenderID: SMSLIVE247_SENDER,
    messageText: message,
    mobileNumber: formattedPhoneNumber,
    messageId: `${rfid}_${Date.now()}`,
  }, null, 2);
  await appendLog(`Sending SMS with payload:\n${payloadLog}`);

  const url = 'https://api.smslive247.com/api/v4/sms';
  const payload = {
    SenderID: SMSLIVE247_SENDER,
    messageText: message,
    mobileNumber: formattedPhoneNumber,
    deliveryTime: null,
    route: 'default',
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/*+json',
        'Authorization': `Bearer ${SMSLIVE247_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    await appendLog(`SMSLive247 Raw Response:\n${JSON.stringify(result, null, 2)}`);

    if (!result || typeof result !== 'object') {
      throw new Error('Invalid API response format');
    }

    // Flexible success check: Assume success unless a clear error is present
    if (response.status >= 200 && response.status < 300 && (!result.error && !result.message?.toLowerCase().includes('fail'))) {
      console.log('SMS Successfully Sent:', result);
      await logMessage(rfid, formattedPhoneNumber, message, 'sent');
      return;
    }

    const errorMessage = result.message || result.error || 'Failed to send SMS';
    switch (response.status) {
      case 401:
        throw new Error('Authentication failed: Invalid API key');
      case 400:
        throw new Error(`Validation failed: ${errorMessage}`);
      case 403:
        throw new Error('Insufficient credit or account issue');
      default:
        throw new Error(`Unexpected response: ${errorMessage} (Status: ${response.status})`);
    }
  } catch (error) {
    await logMessage(rfid, formattedPhoneNumber, message, 'failed');
    const errorMessage = error instanceof Error ? error.message : 'Unknown SMS error';
    await appendLog(`SMS Error Details: ${errorMessage}`);
    console.error('SMS Error Details:', errorMessage, error);
    throw new Error(errorMessage);
  }
};