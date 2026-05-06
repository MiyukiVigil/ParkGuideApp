import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'parkguide_access_token';
const REFRESH_TOKEN_KEY = 'parkguide_refresh_token';
const ROLE_KEY = 'parkguide_user_role';
const MUST_CHANGE_PASSWORD_KEY = 'parkguide_must_change_password';

// Helper functions for platform-specific storage
const getStorage = () => {
  if (Platform.OS === 'web') {
    // Web: use localStorage
    return {
      getItem: async (key) => {
        try {
          return localStorage.getItem(key);
        } catch (e) {
          console.error('localStorage getItem error:', e);
          return null;
        }
      },
      setItem: async (key, value) => {
        try {
          localStorage.setItem(key, value);
        } catch (e) {
          console.error('localStorage setItem error:', e);
        }
      },
      removeItem: async (key) => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.error('localStorage removeItem error:', e);
        }
      },
    };
  } else {
    // Native: use secure storage
    return {
      getItem: SecureStore.getItemAsync,
      setItem: SecureStore.setItemAsync,
      removeItem: SecureStore.deleteItemAsync,
    };
  }
};

const storage = getStorage();

export const getAccessToken = async () => {
  try {
    const token = await storage.getItem(ACCESS_TOKEN_KEY);
    return token;
  } catch (error) {
    console.error('Error retrieving access token:', error);
    return null;
  }
};

export const setAccessToken = async (token) => {
  try {
    await storage.setItem(ACCESS_TOKEN_KEY, token);
  } catch (error) {
    console.error('Error storing access token:', error);
  }
};

export const getRefreshToken = async () => {
  try {
    const token = await storage.getItem(REFRESH_TOKEN_KEY);
    return token;
  } catch (error) {
    console.error('Error retrieving refresh token:', error);
    return null;
  }
};

export const setRefreshToken = async (token) => {
  try {
    await storage.setItem(REFRESH_TOKEN_KEY, token);
  } catch (error) {
    console.error('Error storing refresh token:', error);
  }
};

export const clearAuthTokens = async () => {
  try {
    await storage.removeItem(ACCESS_TOKEN_KEY);
    await storage.removeItem(REFRESH_TOKEN_KEY);
    await storage.removeItem(ROLE_KEY);
    await storage.removeItem(MUST_CHANGE_PASSWORD_KEY);
  } catch (error) {
    console.error('Error clearing auth tokens:', error);
  }
};

export const getUserRole = async () => {
  try {
    return await storage.getItem(ROLE_KEY);
  } catch (error) {
    console.error('Error retrieving user role:', error);
    return null;
  }
};

export const setUserRole = async (role) => {
  try {
    if (role) {
      await storage.setItem(ROLE_KEY, role);
    } else {
      await storage.removeItem(ROLE_KEY);
    }
  } catch (error) {
    console.error('Error storing user role:', error);
  }
};

export const getMustChangePassword = async () => {
  try {
    const value = await storage.getItem(MUST_CHANGE_PASSWORD_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error retrieving must-change-password flag:', error);
    return false;
  }
};

export const setMustChangePassword = async (mustChangePassword) => {
  try {
    await storage.setItem(MUST_CHANGE_PASSWORD_KEY, mustChangePassword ? 'true' : 'false');
  } catch (error) {
    console.error('Error storing must-change-password flag:', error);
  }
};
