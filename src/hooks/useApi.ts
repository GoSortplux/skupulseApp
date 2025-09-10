import { useContext, useCallback } from 'react';
import { Alert } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { SessionExpiredError } from '../utils/errors';
import { router } from 'expo-router';

export const useApi = () => {
  const { logout } = useContext(AuthContext);

  const callApi = useCallback(async <T>(apiCall: () => Promise<T>): Promise<T | null> => {
    try {
      return await apiCall();
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again.',
          [{ text: 'OK', onPress: () => router.push('/') }]
        );
        await logout();
      } else {
        console.error('API call error:', error);
        Alert.alert('Error', 'An unexpected error occurred.');
      }
      return null;
    }
  }, [logout]);

  return callApi;
};
