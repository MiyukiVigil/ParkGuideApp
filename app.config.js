require("dotenv/config");

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

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || "";
const passkeyApiBaseUrl = process.env.EXPO_PUBLIC_PASSKEY_API_BASE_URL || process.env.PASSKEY_API_BASE_URL || apiBaseUrl;
const dashboardBaseUrl = process.env.DASHBOARD_BASE_URL || "http://10.0.2.2:8000";
const dashboardUrl = process.env.DASHBOARD_URL || "http://localhost:8000/dashboard";
const ssoUrl = process.env.SSO_URL || "http://localhost:8000/dashboard/sso";
const androidGoogleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY || "";
const iosGoogleMapsApiKey = process.env.GOOGLE_MAPS_IOS_API_KEY || "";

const associatedWebHost = getHostFromUrl(apiBaseUrl);

module.exports = {
  expo: {
    name: "ParkGuideApp",
    slug: "parkguideapp",
    scheme: "parkguideapp",
    version: "1.3.1",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
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
      package: process.env.PACKAGE_NAME || "com.miyukivigil.parkguideapp",
      googleServicesFile: "./google-services.json",
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
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
    extra: {
      apiBaseUrl,
      passkeyApiBaseUrl,
      dashboardBaseUrl,
      dashboardUrl,
      ssoUrl,
      expoProjectId: process.env.EXPO_PROJECT_ID || "50ad8a0d-3529-4b5f-8945-4114823f64f3",
      associatedWebHost,
      router: {
        origin: false,
      },
      eas: {
        projectId: process.env.EXPO_PROJECT_ID || "50ad8a0d-3529-4b5f-8945-4114823f64f3",
      },
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    plugins: [
      "expo-camera",
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "This app needs access to your location to show park guides on the live map.",
        },
      ],
      "expo-localization",
      "expo-notifications",
      "expo-router",
      [
        "react-native-maps",
        {
          androidGoogleMapsApiKey,
          iosGoogleMapsApiKey,
        },
      ],
    ],
  },
};
