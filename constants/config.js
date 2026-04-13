/**
 * Environment Configuration Module
 * 
 * Loads configuration from .env file via babel-plugin-dotenv Babel plugin
 * The plugin processes .env at build time and injects values at compile time.
 */

// Determine API URL based on platform
const getApiBaseUrl = () => {
  const envUrl = process.env.API_BASE_URL;
  if (envUrl) return envUrl;

  // Default to localhost for web and iOS
  // Only use 10.0.2.2 for Android emulator if explicitly needed
  return 'http://localhost:8000/api';
};

const CONFIG = {
  // API Configuration
  API_BASE_URL: getApiBaseUrl(),

  // Dashboard URLs
  DASHBOARD_BASE_URL: process.env.DASHBOARD_BASE_URL || 'http://10.0.2.2:8000',
  DASHBOARD_URL: process.env.DASHBOARD_URL || 'http://localhost:8000/dashboard/',
  SSO_URL: process.env.SSO_URL || 'http://localhost:8000/dashboard/sso/',

  // Expo Configuration
  EXPO_PROJECT_ID: process.env.EXPO_PROJECT_ID || '50ad8a0d-3529-4b5f-8945-4114823f64f3',

  // Avatar API Configuration
  AVATAR_API_URL: process.env.AVATAR_API_URL || 'https://api.dicebear.com/7.x/avataaars/png',
  DEFAULT_AVATAR_SEED: process.env.DEFAULT_AVATAR_SEED || 'default',

  // Default User Profile (for development/testing)
  DEFAULT_USER_NAME: process.env.DEFAULT_USER_NAME || 'Test User',
  DEFAULT_USER_EMAIL: process.env.DEFAULT_USER_EMAIL || 'test@example.com',
  DEFAULT_USER_PHONE: process.env.DEFAULT_USER_PHONE || '+60 1234 5678',
  DEFAULT_USER_ROLE: process.env.DEFAULT_USER_ROLE || 'Park Guide',

  // Default Password (for development only)
  DEFAULT_PASSWORD: process.env.DEFAULT_PASSWORD || '12345678',

  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Firebase Configuration
  FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || 'AIzaSyAobrwBs_E0jWAqH4XXOLZjDaGbx2f48qU',
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'parkguideapp-c8517',
  FIREBASE_PROJECT_NUMBER: process.env.FIREBASE_PROJECT_NUMBER || '408905223058',
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || 'parkguideapp-c8517.firebasestorage.app',
  FIREBASE_ANDROID_APP_ID: process.env.FIREBASE_ANDROID_APP_ID || '1:408905223058:android:940cbaf67ff9ff6c384f4b',
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
