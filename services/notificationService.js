import api from "../utils/api";
import * as AlertService from "./alertService";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { getAccessToken } from "../utils/tokenStorage";
import Constants from 'expo-constants';

const PUSH_TOKEN_KEY = "pushNotificationToken";
const NOTIFICATION_CHANNEL_KEY = "parkguide_notifications";
const LOCAL_ALERT_READ_KEY = "parkguide_alert_notification_read_ids";
const LOCAL_ALERT_CLEARED_KEY = "parkguide_alert_notification_cleared_ids";

// Use secure storage for sensitive push tokens on native, AsyncStorage on web
const secureStorage = Platform.OS === 'web'
  ? AsyncStorage
  : {
      getItem: SecureStore.getItemAsync,
      setItem: SecureStore.setItemAsync,
      removeItem: SecureStore.deleteItemAsync,
    };

const getStoredIdList = async (key) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.log(`Failed to read stored list ${key}:`, err.message);
    return [];
  }
};

const setStoredIdList = async (key, ids) => {
  try {
    const uniqueIds = [...new Set(ids.filter(Boolean))];
    await AsyncStorage.setItem(key, JSON.stringify(uniqueIds));
  } catch (err) {
    console.log(`Failed to save stored list ${key}:`, err.message);
  }
};

const getAlertNotificationId = (alert) => `camera-alert-notification-${alert.id}`;

const buildAlertNotification = (alert, readIds = []) => {
  const notificationId = getAlertNotificationId(alert);

  return {
    id: notificationId,
    title: alert.title,
    description: alert.summary,
    fullText: `${alert.summary}\n\nSeverity: ${alert.severity}\nStatus: ${alert.status}\nDetected Activity: ${alert.detectedActivity}\nConfidence: ${alert.confidence}\nReceived: ${alert.receivedAt}`,
    time: alert.receivedAt,
    type: "alerts",
    isRead: readIds.includes(notificationId),
    backendId: null,
    isLocalAlert: true,
    alertId: alert.id,
    alert,
  };
};

const isViolationNotification = (item = {}) => {
  const haystack = [
    item.type,
    item.category,
    item.notification_type,
    item.title,
    item.description,
    item.fullText,
    item.full_text,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    haystack.includes("violation") ||
    haystack.includes("anomaly") ||
    haystack.includes("monitoring alert") ||
    haystack.includes("camera alert") ||
    haystack.includes("ai detection") ||
    haystack.includes("detected activity") ||
    Boolean(item.violation) ||
    Boolean(item.violation_id) ||
    Boolean(item.detected_class) ||
    Boolean(item.confidence_score) ||
    Boolean(item.evidence_video_url)
  );
};

export const markLocalAlertNotificationAsRead = async (notificationId) => {
  const readIds = await getStoredIdList(LOCAL_ALERT_READ_KEY);
  await setStoredIdList(LOCAL_ALERT_READ_KEY, [...readIds, notificationId]);
};

// Simple event emitter for notification updates
const notificationEventListeners = new Set();

export const onNotificationUpdate = (callback) => {
  notificationEventListeners.add(callback);
  return () => notificationEventListeners.delete(callback);
};

const emitNotificationUpdate = () => {
  notificationEventListeners.forEach((callback) => {
    try {
      callback();
    } catch (err) {
      console.log("Error in notification listener:", err);
    }
  });
};

/**
 * Set up notification handler (when app receives a notification)
 */
export const setupNotificationHandler = () => {
  // Handle notifications when app is in foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
};

/**
 * Register for push notifications and get push token
 * Sends token to backend for storing
 */
export const registerForPushNotifications = async () => {
  try {
    // Check if user is authenticated
    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.log("User not authenticated, skipping push notification registration");
      return null;
    }

    // Request permission
    const { status: finalStatus } = await Notifications.requestPermissionsAsync();
    if (finalStatus !== "granted") {
      console.log("Notification permissions not granted");
      return null;
    }

    // Get push token
    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.expoProjectId || process.env.EXPO_PROJECT_ID,
      })
    ).data;

    console.log("Push token obtained:", token);

    // Store token locally
    await secureStorage.setItem(PUSH_TOKEN_KEY, token);

    // Detect device type
    const deviceType = Platform.OS === 'ios' ? 'ios' : 'android';

    // Send token to backend
    try {
      const response = await api.post("/notifications/push-tokens/", { token, device_type: deviceType });
      console.log("Push token registered with backend:", response.data);
    } catch (err) {
      console.log("Failed to register push token with backend:", err.message);
    }

    return token;
  } catch (err) {
    console.log("Failed to register for push notifications:", err);
    return null;
  }
};

// Fetch all notifications for current user from backend
export const fetchNotifications = async () => {
  const readAlertIds = await getStoredIdList(LOCAL_ALERT_READ_KEY);
  const clearedAlertIds = await getStoredIdList(LOCAL_ALERT_CLEARED_KEY);
  const cameraAlerts = await AlertService.fetchAlerts();
  const alertNotifications = cameraAlerts.map((alert) => buildAlertNotification(alert, readAlertIds)).filter((item) => !clearedAlertIds.includes(item.id));

  try {
    const response = await api.get("/notifications/items/");
    if (response.data && Array.isArray(response.data)) {
      console.log("Fetched notifications from backend:", response.data.length);
      const backendNotifications = response.data
        .filter((item) => !isViolationNotification(item))
        .map((item) => ({
          id: String(item.id),
          title: item.title,
          description: item.description,
          fullText: item.fullText || item.full_text || item.description,
          time: item.time || item.created_at || "",
          type: "updates",
          isRead: Boolean(item.is_read),
          backendId: item.id,
          violation: null,
        }));
      return [...alertNotifications, ...backendNotifications];
    }
    return alertNotifications;
  } catch (err) {
    console.log("Failed to fetch notifications:", err.message);
    return alertNotifications;
  }
};

// Mark a single notification as read on backend
export const markNotificationAsRead = async (backendId) => {
  try {
    await api.post(`/notifications/items/${backendId}/mark-read/`);
    console.log("Notification marked as read:", backendId);
  } catch (err) {
    console.log("Failed to mark notification as read:", err.message);
  }
};

// Mark all notifications as read on backend
export const markAllNotificationsAsRead = async () => {
  try {
    await api.post("/notifications/items/mark-all-read/");
    console.log("All backend notifications marked as read");
  } catch (err) {
    console.log("Failed to mark all backend notifications as read:", err.message);
  }

  try {
    const alerts = await AlertService.fetchAlerts();
    const alertNotificationIds = alerts.map((alert) => getAlertNotificationId(alert));
    const readIds = await getStoredIdList(LOCAL_ALERT_READ_KEY);
    await setStoredIdList(LOCAL_ALERT_READ_KEY, [...readIds, ...alertNotificationIds]);
    console.log("All local alert notifications marked as read");
  } catch (err) {
    console.log("Failed to mark local alert notifications as read:", err.message);
  }
};

// Clear (delete) all read notifications on backend
export const clearReadNotifications = async () => {
  let backendResponse = null;
  try {
    const response = await api.post("/notifications/items/clear-read/");
    backendResponse = response.data;
    console.log("Read backend notifications cleared:", response.data);
  } catch (err) {
    console.log("Failed to clear backend read notifications:", err.message);
  }

  try {
    const readIds = await getStoredIdList(LOCAL_ALERT_READ_KEY);
    const clearedIds = await getStoredIdList(LOCAL_ALERT_CLEARED_KEY);
    await setStoredIdList(LOCAL_ALERT_CLEARED_KEY, [...clearedIds, ...readIds]);
    console.log("Read local alert notifications cleared");
  } catch (err) {
    console.log("Failed to clear local alert notifications:", err.message);
  }

  return backendResponse;
};

// Listen for incoming push notifications
export const listenToPushNotifications = (onNotification) => {
  // Handle notification received while app is in foreground
  const notificationListener = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log("Notification received:", notification);
      // Emit update so notification screen can refresh
      emitNotificationUpdate();
      if (onNotification) {
        onNotification(notification, "received");
      }
    }
  );

  // Handle notification tap/response
  const responseListener = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      console.log("Notification response:", response);
      // Emit update so notification screen can refresh
      emitNotificationUpdate();
      // You can navigate to specific screen based on notification
      if (onNotification) {
        onNotification(response.notification, "response");
      }
    }
  );

  const removeSubscription = (subscription) => {
    if (!subscription) return;

    if (typeof subscription.remove === "function") {
      subscription.remove();
      return;
    }

    if (typeof Notifications.removeNotificationSubscription === "function") {
      Notifications.removeNotificationSubscription(subscription);
    }
  };

  // Return cleanup function
  return () => {
    removeSubscription(notificationListener);
    removeSubscription(responseListener);
  };
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async () => {
  try {
    const notifications = await fetchNotifications();
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    console.log("Unread notification count:", unreadCount);
    return unreadCount;
  } catch (err) {
    console.log("Failed to get unread count:", err.message);
    return 0;
  }
};

/**
 * Unregister push notifications and remove token from backend
 * Call this during logout to prevent old tokens from receiving notifications
 */
export const unregisterPushNotifications = async () => {
  try {
    // Get the stored token
    const token = await secureStorage.getItem(PUSH_TOKEN_KEY);
    
    if (!token) {
      console.log("No push notification token found to unregister");
      return;
    }

    // Send unregister request to backend
    try {
      const response = await api.post("/notifications/push-tokens/unregister/", { token });
      console.log("Push token unregistered from backend:", response.data);
    } catch (err) {
      console.log("Failed to unregister push token from backend:", err.message);
      // Continue with local cleanup even if backend request fails
    }

    // Clear token from local storage
    await secureStorage.removeItem(PUSH_TOKEN_KEY);
    console.log("Push notification token cleared from local storage");
  } catch (err) {
    console.log("Failed to unregister push notifications:", err);
  }
};
