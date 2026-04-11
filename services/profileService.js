import AsyncStorage from "@react-native-async-storage/async-storage";
import CONFIG from "../constants/config";

const PROFILE_KEY = "userProfile";

// Default user profile from configuration
// For development/testing only
const DEFAULT_PROFILE = {
  name: CONFIG.DEFAULT_USER_NAME,
  email: CONFIG.DEFAULT_USER_EMAIL,
  phone: CONFIG.DEFAULT_USER_PHONE,
  role: CONFIG.DEFAULT_USER_ROLE,
};

export async function getProfile() {
  try {
    const stored = await AsyncStorage.getItem(PROFILE_KEY);
    if (!stored) {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(DEFAULT_PROFILE));
      return DEFAULT_PROFILE;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.log("getProfile error:", error);
    return DEFAULT_PROFILE;
  }
}

export async function updateProfile(updates) {
  try {
    const current = await getProfile();
    const updated = { ...current, ...updates };
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.log("updateProfile error:", error);
    throw error;
  }
}