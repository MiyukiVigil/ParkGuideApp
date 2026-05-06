import AsyncStorage from "@react-native-async-storage/async-storage";

const PROFILE_KEY = "userProfile";

const DEFAULT_PROFILE = {
  name: "Miyuki Vigil",
  email: "miyuki.vigil@sfc.com",
  phone: "+60 12-345 6789",
  role: "Senior Park Guide",
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