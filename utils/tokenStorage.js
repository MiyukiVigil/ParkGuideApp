import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'parkguide_access_token';
const REFRESH_TOKEN_KEY = 'parkguide_refresh_token';
const ROLE_KEY = 'parkguide_user_role';

export const getAccessToken = async () => {
  try {
    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    return token;
  } catch (error) {
    console.error('Error retrieving access token:', error);
    return null;
  }
};

export const setAccessToken = async (token) => {
  try {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  } catch (error) {
    console.error('Error storing access token:', error);
  }
};

export const getRefreshToken = async () => {
  try {
    const token = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    return token;
  } catch (error) {
    console.error('Error retrieving refresh token:', error);
    return null;
  }
};

export const setRefreshToken = async (token) => {
  try {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  } catch (error) {
    console.error('Error storing refresh token:', error);
  }
};

export const clearAuthTokens = async () => {
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(ROLE_KEY);
  } catch (error) {
    console.error('Error clearing auth tokens:', error);
  }
};

export const getUserRole = async () => {
  try {
    return await SecureStore.getItemAsync(ROLE_KEY);
  } catch (error) {
    console.error('Error retrieving user role:', error);
    return null;
  }
};

export const setUserRole = async (role) => {
  try {
    if (role) {
      await SecureStore.setItemAsync(ROLE_KEY, role);
    } else {
      await SecureStore.deleteItemAsync(ROLE_KEY);
    }
  } catch (error) {
    console.error('Error storing user role:', error);
  }
};
