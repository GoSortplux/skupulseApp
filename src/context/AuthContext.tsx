import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateCredentials: (newUsername: string, newPassword: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  isAdmin: false,
  login: async () => false,
  logout: async () => {},
  updateCredentials: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);

  // Default admin creds (can be updated later)
  const ADMIN_STORAGE_KEY = '@skupulseApp:adminCreds';
  const ADMIN_STATE_KEY = '@skupulseApp:adminState';

  useEffect(() => {
    // Check if admin is already logged in on app start
    const loadAdminState = async () => {
      try {
        const adminState = await AsyncStorage.getItem(ADMIN_STATE_KEY);
        if (adminState === 'true') {
          setIsAdmin(true);
        }
      } catch (err) {
        console.error('Error loading admin state:', err);
      }
    };
    loadAdminState();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const storedCreds = await AsyncStorage.getItem(ADMIN_STORAGE_KEY);
      let validUsername = 'admin';
      let validPassword = 'pass123';

      if (storedCreds) {
        const { username: storedUsername, password: storedPassword } = JSON.parse(storedCreds);
        validUsername = storedUsername;
        validPassword = storedPassword;
      }

      if (username === validUsername && password === validPassword) {
        await AsyncStorage.setItem(ADMIN_STATE_KEY, 'true');
        setIsAdmin(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.setItem(ADMIN_STATE_KEY, 'false');
      setIsAdmin(false);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const updateCredentials = async (newUsername: string, newPassword: string) => {
    try {
      if (!newUsername || !newPassword) {
        throw new Error('Username and password cannot be empty');
      }
      const newCreds = { username: newUsername, password: newPassword };
      await AsyncStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(newCreds));
    } catch (err) {
      console.error('Error updating credentials:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ isAdmin, login, logout, updateCredentials }}>
      {children}
    </AuthContext.Provider>
  );
};