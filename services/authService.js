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
    throw new Error("Please fill in all password fields.");
  }

  if (newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters.");
  }

  if (newPassword !== confirmPassword) {
    throw new Error("New password and confirm password do not match.");
  }

  const savedPassword = await AsyncStorage.getItem(PASSWORD_KEY);

  if (currentPassword !== savedPassword) {
    throw new Error("Your current password is incorrect.");
  }

  await AsyncStorage.setItem(PASSWORD_KEY, newPassword);
  return true;
}