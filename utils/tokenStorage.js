import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = '@parkguide_access_token';
const REFRESH_TOKEN_KEY = '@parkguide_refresh_token';
const ROLE_KEY = '@parkguide_user_role';

export const getAccessToken = async () => {
  try {
    const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    return token;
  } catch (error) {
    console.error('Error retrieving access token:', error);
    return null;
  }
};

export const setAccessToken = async (token) => {
  try {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
  } catch (error) {
    console.error('Error storing access token:', error);
  }
};

export const getRefreshToken = async () => {
  try {
    const token = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    return token;
  } catch (error) {
    console.error('Error retrieving refresh token:', error);
    return null;
  }
};

export const setRefreshToken = async (token) => {
  try {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
  } catch (error) {
    console.error('Error storing refresh token:', error);
  }
};

export const clearAuthTokens = async () => {
  try {
    await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, ROLE_KEY]);
  } catch (error) {
    console.error('Error clearing auth tokens:', error);
  }
};

export const getUserRole = async () => {
  try {
    return await AsyncStorage.getItem(ROLE_KEY);
  } catch (error) {
    console.error('Error retrieving user role:', error);
    return null;
  }
};

export const setUserRole = async (role) => {
  try {
    if (role) {
      await AsyncStorage.setItem(ROLE_KEY, role);
    } else {
      await AsyncStorage.removeItem(ROLE_KEY);
    }
  } catch (error) {
    console.error('Error storing user role:', error);
  }
};
