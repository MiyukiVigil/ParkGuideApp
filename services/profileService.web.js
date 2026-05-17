import AsyncStorage from "@react-native-async-storage/async-storage";

import api from "../utils/api";
import CONFIG, { getBackendAssetUrl } from "../constants/config";
import { getAccessToken } from "../utils/tokenStorage";

const PROFILE_KEY = "userProfile";

const DEFAULT_PROFILE = {
  name: CONFIG.DEFAULT_USER_NAME,
  email: CONFIG.DEFAULT_USER_EMAIL,
  phone: CONFIG.DEFAULT_USER_PHONE,
  role: CONFIG.DEFAULT_USER_ROLE,
  profile_image_url: "",
};

const normalizeProfile = (payload = {}) => {
  const firstName = String(payload.first_name || "").trim();
  const lastName = String(payload.last_name || "").trim();
  const fullName = String(payload.name || `${firstName} ${lastName}`.trim() || payload.username || payload.email || DEFAULT_PROFILE.name).trim();
  const rawRole = String(payload.role || payload.user_type || DEFAULT_PROFILE.role || "").trim().toLowerCase();

  return {
    id: payload.id ?? null,
    username: payload.username || "",
    first_name: firstName,
    last_name: lastName,
    name: fullName || DEFAULT_PROFILE.name,
    email: String(payload.email || DEFAULT_PROFILE.email || "").trim(),
    phone: String(payload.phone || payload.phone_number || DEFAULT_PROFILE.phone || "").trim(),
    role: rawRole === "admin" ? "Administrator" : rawRole === "learner" ? "Official Park Guide" : payload.role || DEFAULT_PROFILE.role,
    user_type: payload.user_type || rawRole || "learner",
    profile_image_url: getBackendAssetUrl(payload.profile_image_url),
  };
};

const cacheProfile = async (profile) => {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile)).catch(() => null);
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
    const stored = await AsyncStorage.getItem(PROFILE_KEY);
    return stored ? normalizeProfile(JSON.parse(stored)) : null;
  } catch {
    return null;
  }
}

export async function getProfile() {
  try {
    const response = await api.get("/accounts/profile/");
    const normalized = normalizeProfile(response.data || {});
    await cacheProfile(normalized);
    return normalized;
  } catch {
    const cached = await getCachedProfile();
    if (cached) return cached;
    await cacheProfile(DEFAULT_PROFILE);
    return DEFAULT_PROFILE;
  }
}

export async function updateProfile(updates) {
  const response = await api.patch("/accounts/profile/", {
    name: updates?.name,
    email: updates?.email,
    phone: updates?.phone,
  });
  const normalized = normalizeProfile(response.data || {});
  await cacheProfile(normalized);
  return normalized;
}

export async function uploadProfileImage(file) {
  const fileUri = String(file?.uri || "").trim();
  if (!fileUri) {
    throw new Error("Selected image URI is missing.");
  }

  const formData = new FormData();
  if (file?.file instanceof File) {
    formData.append("profile_image", file.file);
  } else {
    const response = await fetch(fileUri);
    const blob = await response.blob();
    formData.append("profile_image", blob, file?.name || `profile-${Date.now()}.jpg`);
  }

  const accessToken = await getAccessToken();
  const endpoint = `${String(api.defaults.baseURL || "").replace(/\/+$/, "")}/accounts/profile/`;
  const response = await fetch(endpoint, {
    method: "PATCH",
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload?.detail || "Upload request failed.");
    error.response = { status: response.status, data: payload };
    throw error;
  }

  const normalized = normalizeProfile(payload || {});
  await cacheProfile(normalized);
  return normalized;
}
