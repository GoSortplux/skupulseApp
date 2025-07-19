// src/nfc/useNfc.ts
import { useState, useEffect } from 'react';
import { startNfc, stopNfc, NfcSuccessData } from './nfcManager';
import { Student } from '../utils/storage';

interface UseNfcProps {
  onSuccess: (data: NfcSuccessData) => void;
  onError: (error: string) => void;
  readOnly?: boolean;
}

export const useNfc = ({ onSuccess, onError, readOnly = false }: UseNfcProps) => {
  const [isScanning, setScanning] = useState(false);

  useEffect(() => {
    return () => {
      stopNfc().catch((err) => console.log('Error stopping NFC:', err));
    };
  }, []);

  const start = async () => {
    setScanning(true);
    try {
      await startNfc(
        (data) => {
          onSuccess(data);
          setScanning(false);
        },
        (err) => {
          onError(err);
          setScanning(false);
        },
        readOnly
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : 'NFC initialization failed.');
      setScanning(false);
    }
  };

  const stop = async () => {
    try {
      await stopNfc();
      setScanning(false);
    } catch (err) {
      console.log('Error stopping NFC:', err);
    }
  };

  return { isScanning, start, stop };
};
