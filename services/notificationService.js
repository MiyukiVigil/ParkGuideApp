import api from "../utils/api";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAccessToken } from "../utils/tokenStorage";
import { Platform } from "react-native";
import Constants from 'expo-constants';

const PUSH_TOKEN_KEY = "pushNotificationToken";
const NOTIFICATION_CHANNEL_KEY = "parkguide_notifications";

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
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

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

/**
 * Fetch all notifications for current user from backend
 */
export const fetchNotifications = async () => {
  try {
    const response = await api.get("/notifications/items/");
    if (response.data && Array.isArray(response.data)) {
      console.log("Fetched notifications from backend:", response.data.length);
      // Transform backend data to match app format
      return response.data.map((item) => ({
        id: String(item.id),
        title: item.title,
        description: item.description,
        fullText: item.fullText,
        time: item.time,
        type: "updates", // Backend doesn't specify type, default to updates
        isRead: item.is_read,
        backendId: item.id, // Store backend ID for marking as read
      }));
    }
    return [];
  } catch (err) {
    console.log("Failed to fetch notifications:", err.message);
    return [];
  }
};

/**
 * Mark a single notification as read on backend
 */
export const markNotificationAsRead = async (backendId) => {
  try {
    await api.post(`/notifications/items/${backendId}/mark-read/`);
    console.log("Notification marked as read:", backendId);
  } catch (err) {
    console.log("Failed to mark notification as read:", err.message);
  }
};

/**
 * Mark all notifications as read on backend
 */
export const markAllNotificationsAsRead = async () => {
  try {
    await api.post("/notifications/items/mark-all-read/");
    console.log("All notifications marked as read");
  } catch (err) {
    console.log("Failed to mark all notifications as read:", err.message);
  }
};

/**
 * Clear (delete) all read notifications on backend
 */
export const clearReadNotifications = async () => {
  try {
    const response = await api.post("/notifications/items/clear-read/");
    console.log("Read notifications cleared:", response.data);
    return response.data;
  } catch (err) {
    console.log("Failed to clear read notifications:", err.message);
  }
};

/**
 * Listen for incoming push notifications
 */
export const listenToPushNotifications = (onNotification) => {
  // Handle notification received while app is in foreground
  const notificationListener = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log("Notification received:", notification);
      // Emit update so notification screen can refresh
      emitNotificationUpdate();
      if (onNotification) {
        onNotification(notification);
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
      const data = response.notification.request.content.data;
      if (onNotification) {
        onNotification(response.notification);
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
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    
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
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    console.log("Push notification token cleared from local storage");
  } catch (err) {
    console.log("Failed to unregister push notifications:", err);
  }
};
