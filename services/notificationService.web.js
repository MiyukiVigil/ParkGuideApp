import AsyncStorage from "@react-native-async-storage/async-storage";

import api from "../utils/api";
import * as AlertService from "./alertService";

const LOCAL_ALERT_READ_KEY = "parkguide_alert_notification_read_ids";
const LOCAL_ALERT_CLEARED_KEY = "parkguide_alert_notification_cleared_ids";

const notificationEventListeners = new Set();

const getStoredIdList = async (key) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const setStoredIdList = async (key, ids) => {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  await AsyncStorage.setItem(key, JSON.stringify(uniqueIds));
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
    Boolean(item.violation) ||
    Boolean(item.violation_id) ||
    Boolean(item.detected_class) ||
    Boolean(item.confidence_score) ||
    Boolean(item.evidence_video_url)
  );
};

export const setupNotificationHandler = () => {};

export const registerForPushNotifications = async () => null;

export const listenToPushNotifications = () => () => {};

export const onNotificationUpdate = (callback) => {
  notificationEventListeners.add(callback);
  return () => notificationEventListeners.delete(callback);
};

export const markLocalAlertNotificationAsRead = async (notificationId) => {
  const readIds = await getStoredIdList(LOCAL_ALERT_READ_KEY);
  await setStoredIdList(LOCAL_ALERT_READ_KEY, [...readIds, notificationId]);
};

export const fetchNotifications = async () => {
  const readAlertIds = await getStoredIdList(LOCAL_ALERT_READ_KEY);
  const clearedAlertIds = await getStoredIdList(LOCAL_ALERT_CLEARED_KEY);
  const cameraAlerts = await AlertService.fetchAlerts();
  const alertNotifications = cameraAlerts
    .map((alert) => buildAlertNotification(alert, readAlertIds))
    .filter((item) => !clearedAlertIds.includes(item.id));

  try {
    const response = await api.get("/notifications/items/");
    if (!Array.isArray(response.data)) return alertNotifications;

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
  } catch {
    return alertNotifications;
  }
};

export const markNotificationAsRead = async (backendId) => {
  await api.post(`/notifications/items/${backendId}/mark-read/`).catch(() => null);
};

export const markAllNotificationsAsRead = async () => {
  await api.post("/notifications/items/mark-all-read/").catch(() => null);
  const alerts = await AlertService.fetchAlerts();
  const alertNotificationIds = alerts.map((alert) => getAlertNotificationId(alert));
  const readIds = await getStoredIdList(LOCAL_ALERT_READ_KEY);
  await setStoredIdList(LOCAL_ALERT_READ_KEY, [...readIds, ...alertNotificationIds]);
};

export const clearReadNotifications = async () => {
  const response = await api.post("/notifications/items/clear-read/").catch(() => null);
  const readIds = await getStoredIdList(LOCAL_ALERT_READ_KEY);
  const clearedIds = await getStoredIdList(LOCAL_ALERT_CLEARED_KEY);
  await setStoredIdList(LOCAL_ALERT_CLEARED_KEY, [...clearedIds, ...readIds]);
  return response?.data || null;
};

export const getUnreadCount = async () => {
  const notifications = await fetchNotifications();
  return notifications.filter((notification) => !notification.isRead).length;
};

export const unregisterPushNotifications = async () => {};
