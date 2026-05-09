import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Environment Configuration Module
 *
 * Expo apps should prefer config values from `app.config.js` / `extra`,
 * with `process.env` only used as a secondary fallback during bundling.
 */

const extra = Constants.expoConfig?.extra ?? {};

const getConfigValue = (extraKey, envKey, fallback) => {
  const extraValue = extra[extraKey];
  if (extraValue !== undefined && extraValue !== null && extraValue !== "") {
    return extraValue;
  }

  const envValue = process.env[envKey];
  if (envValue !== undefined && envValue !== null && envValue !== "") {
    return envValue;
  }

  return fallback;
};

const normalizeUrl = (url) => {
  if (!url || typeof url !== "string") return url;

  const trimmed = url.trim().replace(/\/+$/, "");
  if (!trimmed) return trimmed;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
};

const getExpoHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost ||
    "";

  return hostUri ? hostUri.split(":")[0] : "";
};

// Determine API URL based on platform
const getApiBaseUrl = () => {
  const configuredUrl = getConfigValue("apiBaseUrl", "API_BASE_URL", "");
  if (configuredUrl) return normalizeUrl(configuredUrl);

  const expoHost = getExpoHost();
  if (expoHost && !["localhost", "127.0.0.1"].includes(expoHost)) {
    return `http://${expoHost}:8000/api`;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:8000/api";
  }

  return "http://localhost:8000/api";
};

const getPasskeyApiBaseUrl = () => {
  const configuredUrl = getConfigValue("passkeyApiBaseUrl", "PASSKEY_API_BASE_URL", "");
  if (configuredUrl) return normalizeUrl(configuredUrl);
  return getApiBaseUrl();
};

const CONFIG = {
  // API Configuration
  API_BASE_URL: getApiBaseUrl(),
  PASSKEY_API_BASE_URL: getPasskeyApiBaseUrl(),

  // Dashboard URLs
  DASHBOARD_BASE_URL: normalizeUrl(
    getConfigValue("dashboardBaseUrl", "DASHBOARD_BASE_URL", "http://10.0.2.2:8000")
  ),
  DASHBOARD_URL: normalizeUrl(
    getConfigValue(
      "dashboardUrl",
      "DASHBOARD_URL",
      "http://localhost:8000/dashboard"
    )
  ),
  SSO_URL: normalizeUrl(
    getConfigValue(
      "ssoUrl",
      "SSO_URL",
      "http://localhost:8000/dashboard/sso"
    )
  ),

  // Expo Configuration
  EXPO_PROJECT_ID: getConfigValue(
    "expoProjectId",
    "EXPO_PROJECT_ID",
    "50ad8a0d-3529-4b5f-8945-4114823f64f3"
  ),

  // Avatar API Configuration
  AVATAR_API_URL: normalizeUrl(
    getConfigValue(
      "avatarApiUrl",
      "AVATAR_API_URL",
      "https://api.dicebear.com/7.x/avataaars/png"
    )
  ),
  DEFAULT_AVATAR_SEED: getConfigValue(
    "defaultAvatarSeed",
    "DEFAULT_AVATAR_SEED",
    "default"
  ),

  // Development-only defaults. Do not place secrets here: bundled app config is readable by clients.
  DEFAULT_USER_NAME: process.env.DEFAULT_USER_NAME || "",
  DEFAULT_USER_EMAIL: process.env.DEFAULT_USER_EMAIL || "",
  DEFAULT_USER_PHONE: process.env.DEFAULT_USER_PHONE || "",
  DEFAULT_USER_ROLE: process.env.DEFAULT_USER_ROLE || "Park Guide",
  DEFAULT_PASSWORD: process.env.DEFAULT_PASSWORD || "",

  // Environment
  NODE_ENV: process.env.NODE_ENV || "development",

  // Firebase client identifiers are not private, but still keep environment-specific values out of source.
  FIREBASE_API_KEY: getConfigValue("firebaseApiKey", "EXPO_PUBLIC_FIREBASE_API_KEY", ""),
  FIREBASE_PROJECT_ID: getConfigValue("firebaseProjectId", "EXPO_PUBLIC_FIREBASE_PROJECT_ID", ""),
  FIREBASE_PROJECT_NUMBER: getConfigValue("firebaseProjectNumber", "EXPO_PUBLIC_FIREBASE_PROJECT_NUMBER", ""),
  FIREBASE_STORAGE_BUCKET: getConfigValue("firebaseStorageBucket", "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET", ""),
  FIREBASE_ANDROID_APP_ID: getConfigValue("firebaseAndroidAppId", "EXPO_PUBLIC_FIREBASE_ANDROID_APP_ID", ""),
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

  if (CONFIG.DEFAULT_PASSWORD) {
    console.warn("DEFAULT_PASSWORD is configured in the client bundle. Use backend-issued temporary passwords instead.");
  }

  return missing.length === 0;
};

export default CONFIG;
