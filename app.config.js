require("dotenv/config");
const fs = require("fs");
const os = require("os");
const path = require("path");

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
const androidGoogleMapsApiKey =
  process.env.GOOGLE_MAPS_ANDROID_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY_ANDROID ||
  "";
const iosGoogleMapsApiKey =
  process.env.GOOGLE_MAPS_IOS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY_IOS ||
  "";
const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "";

const associatedWebHost = getHostFromUrl(apiBaseUrl);

const getGoogleServicesFile = () => {
  const rawGoogleServicesJson = process.env.GOOGLE_SERVICES_JSON;
  const base64GoogleServicesJson = process.env.GOOGLE_SERVICES_JSON_BASE64;

  if (rawGoogleServicesJson || base64GoogleServicesJson) {
    const decodedJson = base64GoogleServicesJson
      ? Buffer.from(base64GoogleServicesJson, "base64").toString("utf8")
      : rawGoogleServicesJson;
    const outputDir = path.join(os.tmpdir(), "parkguideapp-expo");
    const outputFile = path.join(outputDir, "google-services.json");

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputFile, decodedJson);

    return outputFile;
  }

  return "./google-services.json";
};

module.exports = {
  expo: {
    name: "ParkGuideApp",
    slug: "park-guide-app",
    scheme: "parkguideapp",
    version: "1.7.0",
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
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "This app needs your location while using the app to show your position on the live park map.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "This app needs background location only while you manually enable Work Location Sharing during park duty.",
        NSCameraUsageDescription:
          "This app needs camera access for tour monitoring preview.",
        NSPhotoLibraryUsageDescription:
          "This app needs photo library access to upload park images.",
      },
    },
    android: {
      package: process.env.PACKAGE_NAME || "com.miyukivigil.parkguideapp",
      googleServicesFile: getGoogleServicesFile(),
      config: {
        googleMaps: {
          apiKey: androidGoogleMapsApiKey,
        },
      },
      adaptiveIcon: {
        foregroundImage: "./assets/android-icon-foreground.png",
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
      firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
      firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",
      firebaseProjectNumber: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_NUMBER || "",
      firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
      firebaseAndroidAppId: process.env.EXPO_PUBLIC_FIREBASE_ANDROID_APP_ID || "",
      googleWebClientId,
      googleIosClientId,
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
      [
        "expo-camera",
        {
          cameraPermission:
            "Allow ParkGuide to use the camera for tour monitoring preview.",
          recordAudioAndroid: false,
          barcodeScannerEnabled: false,
        },
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "ParkGuide needs your location while using the app to show your position on the live park map.",
          locationAlwaysAndWhenInUsePermission:
            "ParkGuide needs background location only while you manually enable Work Location Sharing during park duty.",
          isIosBackgroundLocationEnabled: true,
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true,
        },
      ],
      "expo-localization",
      "expo-notifications",
      "expo-router",
      "@react-native-google-signin/google-signin",
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
