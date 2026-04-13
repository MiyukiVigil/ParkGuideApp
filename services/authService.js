import AsyncStorage from "@react-native-async-storage/async-storage";
import CONFIG from "../constants/config";

const PASSWORD_KEY = "userPassword";

// Default password from configuration
// For development only - should be changed in production
const DEFAULT_PASSWORD = CONFIG.DEFAULT_PASSWORD;

if (CONFIG.NODE_ENV === "development") {
  console.log("ℹ️  Using development password configuration");
}

export async function ensureMockPassword() {
  try {
    const existing = await AsyncStorage.getItem(PASSWORD_KEY);
    if (!existing) {
      await AsyncStorage.setItem(PASSWORD_KEY, DEFAULT_PASSWORD);
    }
  } catch (error) {
    console.log("ensureMockPassword error:", error);
  }
}

export async function changePassword({ currentPassword, newPassword, confirmPassword }) {
  if (!currentPassword || !newPassword || !confirmPassword) {
    const error = new Error("FILL_ALL_PASSWORD_FIELDS");
    error.code = "FILL_ALL_PASSWORD_FIELDS";
    throw error;
  }

  if (newPassword.length < 8) {
    const error = new Error("PASSWORD_MUST_BE_8");
    error.code = "PASSWORD_MUST_BE_8";
    throw error;
  }

  if (newPassword !== confirmPassword) {
    const error = new Error("PASSWORDS_DO_NOT_MATCH");
    error.code = "PASSWORDS_DO_NOT_MATCH";
    throw error;
  }

  const savedPassword = await AsyncStorage.getItem(PASSWORD_KEY);

  if (currentPassword !== savedPassword) {
    const error = new Error("CURRENT_PASSWORD_INCORRECT");
    error.code = "CURRENT_PASSWORD_INCORRECT";
    throw error;
  }

  await AsyncStorage.setItem(PASSWORD_KEY, newPassword);
  return true;
}