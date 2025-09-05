import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { loginUser, updateAdminCredentials } from '../utils/api';
import { saveSession, clearSession, getSession } from '../utils/storage';

// Define the shape of the user object
interface User {
  id: string;
  schoolId: string;
  username: string;
}

// Define the shape of the context
interface AuthContextType {
  isAdmin: boolean;
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateCredentials: (username?: string, password?: string) => Promise<void>;
}

// Create the context with default values
export const AuthContext = createContext<AuthContextType>({
  isAdmin: false,
  user: null,
  login: async () => false,
  logout: async () => {},
  updateCredentials: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // On app start, check for an existing session
  useEffect(() => {
    const loadSession = async () => {
      try {
        const session = await getSession();
        if (session && session.token && session.schoolId) {
          setIsAdmin(true);
          // Note: We don't have the full user object from storage, only the schoolId.
          // This is a limitation of the current storage design.
          // For features like `updateCredentials`, the user might need to log in again
          // to get their full user object loaded into the state.
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
      // The API response should contain the token and the user object
      if (data.token && data.user && data.user.schoolId) {
        await saveSession(data.token, data.user.schoolId);
        setIsAdmin(true);
        setUser(data.user);
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
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const updateCredentials = async (username?: string, password?: string) => {
    if (!user || !user.id) {
      throw new Error('User not authenticated or user ID is missing. Please log in again.');
    }
    const updatedUserData = await updateAdminCredentials(user.id, { username, password });
    setUser(updatedUserData);
  };

  return (
    <AuthContext.Provider value={{ isAdmin, user, login, logout, updateCredentials }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for easy access to the auth context
export const useAuth = () => useContext(AuthContext);