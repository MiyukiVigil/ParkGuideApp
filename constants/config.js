/**
 * Environment Configuration Module
 * 
 * React Native doesn't support dotenv (Node.js modules like 'path' aren't available).
 * Instead, this module provides a centralized place for all configuration.
 * 
 * For development: Edit the values here or in your local environment
 * For production: Use EAS Build environment variables which override these values
 */

// Configuration values - must be set via environment variables
const CONFIG = {
  // API Configuration
  API_BASE_URL: process.env.API_BASE_URL,

  // Dashboard URLs
  DASHBOARD_BASE_URL: process.env.DASHBOARD_BASE_URL,
  DASHBOARD_URL: process.env.DASHBOARD_URL,
  SSO_URL: process.env.SSO_URL,

  // Avatar API Configuration
  AVATAR_API_URL: process.env.AVATAR_API_URL,
  DEFAULT_AVATAR_SEED: process.env.DEFAULT_AVATAR_SEED,

  // Default User Profile (for development/testing)
  DEFAULT_USER_NAME: process.env.DEFAULT_USER_NAME,
  DEFAULT_USER_EMAIL: process.env.DEFAULT_USER_EMAIL,
  DEFAULT_USER_PHONE: process.env.DEFAULT_USER_PHONE,
  DEFAULT_USER_ROLE: process.env.DEFAULT_USER_ROLE,

  // Default Password (for development only)
  DEFAULT_PASSWORD: process.env.DEFAULT_PASSWORD,

  // Environment
  NODE_ENV: process.env.NODE_ENV,
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
