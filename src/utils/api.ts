// src/utils/api.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Student } from './storage';
import { SessionExpiredError } from './errors';

const handleApiResponse = async (response: Response) => {
    if (response.status === 401) {
        throw new SessionExpiredError();
    }

    const responseText = await response.text();

    if (!response.ok) {
        let errorMessage = `Request failed with status: ${response.status}`;
        try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.message || errorMessage;
        } catch (e) {
            errorMessage = `${errorMessage}. Server response: ${responseText.substring(0, 200)}...`;
        }
        throw new Error(errorMessage);
    }

    try {
        return JSON.parse(responseText);
    } catch (e) {
        throw new Error(`Failed to parse successful response from server. Response: ${responseText.substring(0, 200)}...`);
    }
};

const API_URL = 'https://skupulse-8k3l.onrender.com/api';

const getAuthToken = async () => {
  return await AsyncStorage.getItem('@skupulseApp:authToken');
};

export const loginUser = async (username: string, password: string) => {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    return handleApiResponse(response);
  } catch (error) {
    console.error('Login API error:', error);
    throw error;
  }
};

export const getStudents = async (schoolId: string) => {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(`${API_URL}/students/${schoolId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleApiResponse(response);
  } catch (error) {
    console.error('Get students API error:', error);
    throw error;
  }
};

export const addStudent = async (schoolId: string, studentData: Student) => {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(`${API_URL}/students/${schoolId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(studentData),
    });
    return handleApiResponse(response);
  } catch (error) {
    console.error('Add student API error:', error);
    throw error;
  }
};
