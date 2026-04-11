/**
 * Environment Configuration Module
 * 
 * React Native doesn't support dotenv (Node.js modules like 'path' aren't available).
 * Instead, this module provides a centralized place for all configuration.
 * 
 * For development: Edit the values here or in your local environment
 * For production: Use EAS Build environment variables which override these values
 */

// Default configuration values
// These can be overridden by EAS Build environment variables
const CONFIG = {
  // Expo Configuration
  EXPO_PROJECT_ID: process.env.EXPO_PROJECT_ID || "50ad8a0d-3529-4b5f-8945-4114823f64f3",

  // API Configuration
  API_BASE_URL: process.env.API_BASE_URL || "https://sfc-parkguidebackend-g3epa6bjcpf9hqez.malaysiawest-01.azurewebsites.net/api",

  // Dashboard URLs
  DASHBOARD_BASE_URL: process.env.DASHBOARD_BASE_URL || "https://sfc-parkguidebackend-g3epa6bjcpf9hqez.malaysiawest-01.azurewebsites.net",
  DASHBOARD_URL: process.env.DASHBOARD_URL || "https://sfc-parkguidebackend-g3epa6bjcpf9hqez.malaysiawest-01.azurewebsites.net/dashboard/",
  SSO_URL: process.env.SSO_URL || "https://sfc-parkguidebackend-g3epa6bjcpf9hqez.malaysiawest-01.azurewebsites.net/dashboard/sso/",

  // Firebase Configuration
  FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || "AIzaSyAobrwBs_E0jWAqH4XXOLZjDaGbx2f48qU",
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || "parkguideapp-c8517",
  FIREBASE_PROJECT_NUMBER: process.env.FIREBASE_PROJECT_NUMBER || "408905223058",
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || "parkguideapp-c8517.firebasestorage.app",
  FIREBASE_ANDROID_APP_ID: process.env.FIREBASE_ANDROID_APP_ID || "1:408905223058:android:940cbaf67ff9ff6c384f4b",

  // Avatar API Configuration
  AVATAR_API_URL: process.env.AVATAR_API_URL || "https://api.dicebear.com/7.x/avataaars/png",
  DEFAULT_AVATAR_SEED: process.env.DEFAULT_AVATAR_SEED || "default",

  // Default User Profile (for development/testing)
  DEFAULT_USER_NAME: process.env.DEFAULT_USER_NAME || "Test User",
  DEFAULT_USER_EMAIL: process.env.DEFAULT_USER_EMAIL || "test@example.com",
  DEFAULT_USER_PHONE: process.env.DEFAULT_USER_PHONE || "+60 1234 5678",
  DEFAULT_USER_ROLE: process.env.DEFAULT_USER_ROLE || "Park Guide",

  // Default Password (for development only)
  DEFAULT_PASSWORD: process.env.DEFAULT_PASSWORD || "12345678",

  // Environment
  NODE_ENV: process.env.NODE_ENV || "development",

  // Feature Flags
  ENABLE_MOCK_AUTH: process.env.ENABLE_MOCK_AUTH === "true" || true,
  ENABLE_NOTIFICATIONS: process.env.ENABLE_NOTIFICATIONS === "true" || true,
};

// Helper function to get avatar URL with seed
export const getAvatarUrl = (seed = CONFIG.DEFAULT_AVATAR_SEED) => {
  return `${CONFIG.AVATAR_API_URL}?seed=${encodeURIComponent(seed)}`;
};

// Validate critical configuration on app start
export const validateConfig = () => {
  const criticalVars = ["API_BASE_URL", "EXPO_PROJECT_ID", "DASHBOARD_BASE_URL"];
  const missing = [];

  criticalVars.forEach((varName) => {
    if (!CONFIG[varName]) {
      missing.push(varName);
    }
  });

  if (missing.length > 0) {
    console.warn(
      `⚠️  Missing critical configuration: ${missing.join(", ")}. 
       Please ensure your .env file is properly configured or EAS Build environment variables are set.`
    );
  }

  return missing.length === 0;
};

export default CONFIG;
