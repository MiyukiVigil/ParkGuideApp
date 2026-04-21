/**
 * Expo App Configuration with Environment Variables Support
 * This file generates the app configuration dynamically using environment variables.
 * 
 * Usage:
 * - Copy this configuration to app.json in your IDE/CI environment
 * - OR use: expo prebuild --clean --platform android/ios
 * 
 * Required environment variables:
 * - EXPO_PROJECT_ID: Your Expo project ID
 * - PACKAGE_NAME: Android package name
 * - IOS_BUNDLE_ID: iOS bundle identifier
 */

const getAbsoluteUrl = (value) => {
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
};

const getHostFromUrl = (value) => {
  try {
    return new URL(getAbsoluteUrl(value)).host;
  } catch {
    return "";
  }
};

const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || "";
const associatedWebHost = getHostFromUrl(apiBaseUrl);

module.exports = {
  expo: {
    name: "ParkGuideApp",
    slug: "parkguideapp",
    scheme: "parkguideapp",
    version: "1.1.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      // Use environment variable or fallback to default
      bundleIdentifier: process.env.IOS_BUNDLE_ID || "com.miyukivigil.parkguideapp",
      supportsTabletMode: true,
      supportsUpsideDownOrientation: false,
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "This app needs access to your location to show nearby parks.",
        NSCameraUsageDescription:
          "This app needs camera access for park identification features.",
        NSPhotoLibraryUsageDescription:
          "This app needs photo library access to upload park images.",
      },
    },
    android: {
      // Use environment variable or fallback to default
      package: process.env.PACKAGE_NAME || "com.miyukivigil.parkguideapp",
      googleServicesFile: "./google-services.json",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      permissions: [
        "android.permission.CAMERA",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
      ],
      intentFilters: associatedWebHost
        ? [
            {
              action: "VIEW",
              autoVerify: true,
              data: [
                {
                  scheme: "https",
                  host: associatedWebHost,
                },
              ],
              category: ["BROWSABLE", "DEFAULT"],
            },
          ]
        : [],
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    sdkVersion: "55.0.0",
    platforms: ["ios", "android", "web"],
    plugins: [
      "expo-camera",
      "expo-localization",
      "expo-notifications",
      "expo-router",
    ],
    extra: {
      eas: {
        // Use environment variable for Project ID
        // This is crucial for EAS Build to work correctly
        projectId: process.env.EXPO_PROJECT_ID || "50ad8a0d-3529-4b5f-8945-4114823f64f3",
      },
      router: {
        origin: false,
      },
      associatedWebHost,
    },
    runtimeVersion: {
      policy: "appVersion",
    },
  },
};
