import { Platform } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../utils/api";

export const GUIDE_LOCATION_TASK = "guide-work-location-task";
export const WORK_TRACKING_KEY = "guideWorkLocationSharingEnabled";
const roundCoordinate = (value) => Math.round(Number(value) * 1000000) / 1000000;
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const publishGuideLocation = async (coords) => {
  await api.post("/accounts/guides/locations/", {
    latitude: roundCoordinate(coords.latitude),
    longitude: roundCoordinate(coords.longitude),
    accuracy: coords.accuracy,
    heading: coords.heading,
    speed: coords.speed,
  });
};

const publishCurrentGuideLocation = async () => {
  const lastKnownLocation = await Location.getLastKnownPositionAsync({
    maxAge: 5 * 60 * 1000,
    requiredAccuracy: 250,
  }).catch(() => null);

  if (lastKnownLocation?.coords) {
    await publishGuideLocation(lastKnownLocation.coords);
    return true;
  }

  let lastError = null;
  for (const waitMs of [0, 750, 1500]) {
    if (waitMs > 0) {
      await sleep(waitMs);
    }

    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        mayShowUserSettingsDialog: true,
      });
      if (currentLocation?.coords) {
        await publishGuideLocation(currentLocation.coords);
        return true;
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Current location is not available.");
};

if (Platform.OS !== "web" && !TaskManager.isTaskDefined(GUIDE_LOCATION_TASK)) {
  TaskManager.defineTask(GUIDE_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      console.log("Background location task error:", error);
      return;
    }
    const isEnabled = await AsyncStorage.getItem(WORK_TRACKING_KEY);
    if (isEnabled !== "true") {
      return;
    }
    const locations = data?.locations || [];
    const latestLocation = locations[locations.length - 1];
    if (!latestLocation?.coords) {
      return;
    }
    const { coords } = latestLocation;
    try {
      await publishGuideLocation(coords);
    } catch (err) {
      console.log("Failed to publish background guide location:", err.response?.data || err.message || err);
    }
  });
}

export async function startGuideWorkLocationSharing() {
  if (Platform.OS === "web") {
    throw new Error("Background location sharing is only available on Android or iOS.");
  }
  const foregroundPermission = await Location.requestForegroundPermissionsAsync();
  if (foregroundPermission.status !== "granted") {
    throw new Error("Foreground location permission was not granted.");
  }
  const backgroundPermission = await Location.requestBackgroundPermissionsAsync();
  if (backgroundPermission.status !== "granted") {
    throw new Error("Background location permission was not granted.");
  }

  await AsyncStorage.setItem(WORK_TRACKING_KEY, "true");

  try {
    const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(GUIDE_LOCATION_TASK);
    if (!alreadyStarted) {
      await Location.startLocationUpdatesAsync(GUIDE_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000,
        distanceInterval: 30,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: "ParkGuide location sharing active",
          notificationBody: "Your work location is being shared while you are on duty.",
          killServiceOnDestroy: false,
        },
      });
    }

    await publishCurrentGuideLocation();
  } catch (err) {
    await AsyncStorage.setItem(WORK_TRACKING_KEY, "false");
    const started = await Location.hasStartedLocationUpdatesAsync(GUIDE_LOCATION_TASK).catch(() => false);
    if (started) {
      await Location.stopLocationUpdatesAsync(GUIDE_LOCATION_TASK).catch(() => {});
    }
    throw err;
  }
}

export async function stopGuideWorkLocationSharing() {
  await AsyncStorage.setItem(WORK_TRACKING_KEY, "false");
  let stopError = null;

  if (Platform.OS !== "web") {
    try {
      const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(GUIDE_LOCATION_TASK);
      if (alreadyStarted) {
        await Location.stopLocationUpdatesAsync(GUIDE_LOCATION_TASK);
      }
    } catch (err) {
      stopError = err;
    }
  }

  await clearGuideWorkLocation();

  if (stopError) {
    console.log("Stopped publishing guide location, but native location updates reported an error:", stopError.message || stopError);
  }
}

export async function clearGuideWorkLocation() {
  await api.delete("/accounts/guides/locations/");
}

export async function isGuideWorkLocationSharingEnabled() {
  const value = await AsyncStorage.getItem(WORK_TRACKING_KEY);
  if (Platform.OS === "web") {
    return false;
  }
  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(GUIDE_LOCATION_TASK).catch(() => false);
  return value === "true" && alreadyStarted;
}
