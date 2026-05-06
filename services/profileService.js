import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import api from '../utils/api';
import CONFIG from '../constants/config';
import { getAccessToken } from '../utils/tokenStorage';

const PROFILE_KEY = 'userProfile';

// Use secure storage for sensitive profile data on native, AsyncStorage on web
const profileStorage = Platform.OS === 'web'
  ? AsyncStorage
  : {
      getItem: SecureStore.getItemAsync,
      setItem: SecureStore.setItemAsync,
      removeItem: SecureStore.deleteItemAsync,
    };

const DEFAULT_PROFILE = {
  name: CONFIG.DEFAULT_USER_NAME,
  email: CONFIG.DEFAULT_USER_EMAIL,
  phone: CONFIG.DEFAULT_USER_PHONE,
  role: CONFIG.DEFAULT_USER_ROLE,
  profile_image_url: '',
};

const normalizeProfile = (payload = {}) => {
  const firstName = String(payload.first_name || '').trim();
  const lastName = String(payload.last_name || '').trim();
  const fullName = String(payload.name || `${firstName} ${lastName}`.trim() || payload.username || payload.email || DEFAULT_PROFILE.name).trim();
  const rawRole = String(payload.role || payload.user_type || DEFAULT_PROFILE.role || '').trim().toLowerCase();

  return {
    id: payload.id ?? null,
    username: payload.username || '',
    first_name: firstName,
    last_name: lastName,
    name: fullName || DEFAULT_PROFILE.name,
    email: String(payload.email || DEFAULT_PROFILE.email || '').trim(),
    phone: String(payload.phone || payload.phone_number || DEFAULT_PROFILE.phone || '').trim(),
    role: rawRole === 'admin' ? 'Administrator' : rawRole === 'learner' ? 'Official Park Guide' : (payload.role || DEFAULT_PROFILE.role),
    user_type: payload.user_type || rawRole || 'learner',
    profile_image_url: String(payload.profile_image_url || '').trim(),
  };
};

const cacheProfile = async (profile) => {
  try {
    await profileStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.log('cacheProfile error:', error);
  }
};

export const saveProfileSnapshotFromAuthPayload = async (payload) => {
  const normalized = normalizeProfile({
    ...(payload?.user || {}),
    role: payload?.role || payload?.user?.role,
  });
  await cacheProfile(normalized);
  return normalized;
};

export async function getCachedProfile() {
  try {
    const stored = await profileStorage.getItem(PROFILE_KEY);
    if (!stored) return null;
    return normalizeProfile(JSON.parse(stored));
  } catch (error) {
    console.log('getCachedProfile error:', error);
    return null;
  }
}

export async function getProfile() {
  try {
    const response = await api.get('/accounts/profile/');
    const normalized = normalizeProfile(response.data || {});
    await cacheProfile(normalized);
    return normalized;
  } catch (error) {
    console.log('getProfile api error:', error?.response?.data || error?.message || error);
    const cached = await getCachedProfile();
    if (cached) {
      return cached;
    }
    await cacheProfile(DEFAULT_PROFILE);
    return DEFAULT_PROFILE;
  }
}

export async function updateProfile(updates) {
  try {
    const response = await api.patch('/accounts/profile/', {
      name: updates?.name,
      email: updates?.email,
      phone: updates?.phone,
    });
    const normalized = normalizeProfile(response.data || {});
    await cacheProfile(normalized);
    return normalized;
  } catch (error) {
    console.log('updateProfile api error:', error?.response?.data || error?.message || error);
    throw error;
  }
}

export async function uploadProfileImage(file) {
  const normalizeMimeType = (value) => {
    const mime = String(value || '').trim().toLowerCase();
    if (mime.startsWith('image/')) return mime;
    return 'image/jpeg';
  };

  const buildFileName = () => {
    const provided = String(file?.name || '').trim();
    if (provided) return provided;
    const mime = normalizeMimeType(file?.mimeType || file?.type);
    const extension = mime.split('/')[1] || 'jpg';
    return `profile-${Date.now()}.${extension}`;
  };

  const fileUri = String(file?.uri || '').trim();
  if (!fileUri) {
    throw new Error('Selected image URI is missing.');
  }

  const mimeType = normalizeMimeType(file?.mimeType || file?.type);
  const fileName = buildFileName();

  const formData = new FormData();
  formData.append('profile_image', {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  });

  const accessToken = await getAccessToken();
  const endpoint = `${String(api.defaults.baseURL || '').replace(/\/+$/, '')}/accounts/profile/`;

  try {
    const response = await fetch(endpoint, {
      method: 'PATCH',
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: formData,
    });

    const payload = await response.json();
    if (!response.ok) {
      const error = new Error(payload?.detail || 'Upload request failed.');
      error.response = { status: response.status, data: payload };
      throw error;
    }

    const normalized = normalizeProfile(payload || {});
    await cacheProfile(normalized);
    return normalized;
  } catch (multipartError) {
    // Fallback path for Android content:// URI or transport issues.
    const base64Data = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const dataUrl = `data:${mimeType};base64,${base64Data}`;
    const fallbackResponse = await api.patch('/accounts/profile/', {
      profile_image: dataUrl,
    });

    const normalized = normalizeProfile(fallbackResponse.data || {});
    await cacheProfile(normalized);
    return normalized;
  }
}
