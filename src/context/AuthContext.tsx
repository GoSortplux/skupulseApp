import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { loginUser } from '../utils/api';
import { saveSession, clearSession, getSession } from '../utils/storage';

interface AuthContextType {
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  isAdmin: false,
  login: async () => false,
  logout: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if user is already logged in on app start
    const loadSession = async () => {
      try {
        const { token } = await getSession();
        if (token) {
          setIsAdmin(true);
        }
      } catch (err) {
        console.error('Error loading session state:', err);
      }
    };
    loadSession();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const data = await loginUser(username, password);

      if (data.token && data.user && data.user.userId) {
        await saveSession(data.token, data.user.userId);
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
      await clearSession();
      setIsAdmin(false);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};