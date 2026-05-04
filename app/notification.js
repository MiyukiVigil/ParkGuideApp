import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { View, StyleSheet, FlatList, ScrollView, Animated, RefreshControl, Alert, useWindowDimensions } from "react-native";
import { Text, Surface, TouchableRipple, Avatar, Button, Portal, Modal, Chip, SegmentedButtons, useTheme, ActivityIndicator } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import AppHeader from "../components/AppHeader";
import ThemedBackground from "../components/ThemedBackground";
import * as NotificationService from "../services/notificationService";
import { useScreenSpeech } from "../contexts/ScreenSpeechContext";

export default function Notifications() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const router = useRouter();
  const initialFilter = params?.filter === "alerts" ? "alerts" : params?.filter === "unread" ? "unread" : "all";

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [filter, setFilter] = useState(initialFilter);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.94)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  // Fetch notifications from backend
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await NotificationService.fetchNotifications();
      setNotifications(data);
    } catch (err) {
      console.log("Error loading notifications:", err);
      Alert.alert(t("error"), t("failedToLoadNotifications"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Initial load
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Focus effect to refresh notifications when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  // Keep filter synced with route params, e.g. /notification?filter=alerts
  useFocusEffect(
    useCallback(() => {
      if (params?.filter === "alerts") {
        setFilter("alerts");
      } else if (params?.filter === "unread") {
        setFilter("unread");
      } else if (params?.filter === "all") {
        setFilter("all");
      }
    }, [params?.filter])
  );

  // Listen for real-time push notification updates
  useEffect(() => {
    const unsubscribe = NotificationService.onNotificationUpdate(() => {
      console.log("Notification update received, refreshing list");
      loadNotifications();
    });
    return unsubscribe;
  }, [loadNotifications]);

  // Animation on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, [loadNotifications]);

  const filteredNotifications = useMemo(() => {
    if (filter === "unread") return notifications.filter((n) => !n.isRead);
    if (filter === "alerts") return notifications.filter((n) => n.type === "alerts");
    return notifications;
  }, [notifications, filter]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const readCount = notifications.filter((n) => n.isRead).length;

  useScreenSpeech(
    loading
      ? `${t("notiHeadline")}. ${t("loadingNotifications")}`
      : [
          t("notiHeadline"),
          `${unreadCount} ${t("unread")}`,
          filteredNotifications.length === 0 ? t("allCaughtUp") : '',
          ...filteredNotifications.map((item, index) => {
            const typeLabel = item.type === "alerts" ? t("alert") : t("update");
            return `${index + 1}. ${typeLabel}. ${item.title}. ${item.description}`;
          }),
        ]
          .filter(Boolean)
          .join('. '),
    { priority: 100 }
  );

  const openModal = async (item) => {
    setSelected({ ...item, isRead: true });
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
    );
    
    // Mark as read on backend
    if (item.isLocalAlert && !item.isRead) {
      await NotificationService.markLocalAlertNotificationAsRead(item.id);
    } else if (item.backendId && !item.isRead) {
      await NotificationService.markNotificationAsRead(item.backendId);
    }
    
    setModalVisible(true);

    Animated.parallel([
      Animated.spring(modalScale, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(modalScale, {
        toValue: 0.94,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => setModalVisible(false));
  };

  const openSelectedAlertDashboard = () => {
    if (!selected?.alertId) return;
    const targetAlertId = selected.alertId;
    closeModal();
    setTimeout(() => {
      router.push({ pathname: "/alerts", params: { alertId: targetAlertId, open: "1" } });
    }, 220);
  };

  const clearRead = async () => {
    try {
      await NotificationService.clearReadNotifications();
      setNotifications((prev) => prev.filter((n) => !n.isRead));
    } catch (err) {
      console.log("Error clearing read notifications:", err);
      Alert.alert(t("error"), t("failedToClearNotifications"));
    }
  };

  const markAllRead = async () => {
    try {
      await NotificationService.markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.log("Error marking all read:", err);
      Alert.alert(t("error"), t("failedToMarkAllRead"));
    }
  };

  const getAccent = (item) => {
    if (item.type === "alerts") return theme.colors.error;
    return theme.colors.tertiary;
  };

  const cardBg = theme.dark ? "rgba(16,38,28,0.96)" : "rgba(255,255,255,0.84)";
  const isAlertNotification = (item) => item.type === "alerts" && item.alertId;
  const modalWidth = Math.min(width - 24, 560);
  const modalMaxHeight = Math.max(height - insets.top - insets.bottom - 48, 420);

  const getViolationRows = (item) => {
    if (!item.violation) return [];
    return [
      { label: "Violation ID", value: item.violation.violationId },
      { label: "Severity", value: item.violation.severity },
      { label: "Detected Class", value: item.violation.detectedClass },
      { label: "Confidence", value: item.violation.confidence },
      { label: "Camera Source", value: item.violation.cameraSource },
      { label: "Session ID", value: item.violation.sessionId },
      { label: "Guide", value: item.violation.guideName },
      { label: "Location", value: item.violation.location },
      { label: "Evidence Status", value: item.violation.evidenceStatus },
      { label: "Review Status", value: item.violation.reviewStatus },
    ].filter((row) => row.value);
  };

  const renderItem = ({ item }) => {
    const accent = getAccent(item);
    const alertNotification = isAlertNotification(item);
    const typeLabel = alertNotification ? "Camera Alert" : item.type === "alerts" ? t("alert") : t("update");
    return (
      <Surface
        style={[
          styles.card,
          {
            backgroundColor: cardBg,
            borderColor: item.isRead ? theme.colors.outlineVariant : accent,
            opacity: item.isRead ? 0.92 : 1,
          },
        ]}
        elevation={item.isRead ? 1 : 2}
      >
        <TouchableRipple onPress={() => openModal(item)} borderRadius={22}>
          <View style={styles.cardContent}>
            <Avatar.Icon
              size={46}
              icon={item.type === "alerts" ? "alert-circle-outline" : item.isRead ? "email-open-outline" : "email-alert-outline"}
              style={{ backgroundColor: item.type === "alerts" ? theme.colors.errorContainer : theme.colors.primaryContainer }}
              color={accent}
            />
            <View style={styles.cardTextBlock}>
              <View style={styles.itemTop}>
                <Text variant="titleMedium" numberOfLines={2} style={[styles.itemTitle, { color: theme.colors.onSurface, fontWeight: item.isRead ? "700" : "900" }]}>
                  {item.title}
                </Text>
                {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: accent }]} />}
              </View>
              <Text variant="bodySmall" numberOfLines={2} style={[styles.itemDescription, { color: theme.colors.onSurfaceVariant }]}>
                {item.description}
              </Text>
              <View style={styles.itemBottom}>
                <View style={styles.metaPillRow}>
                  <NotificationMetaPill label={typeLabel} backgroundColor={item.type === "alerts" ? theme.colors.errorContainer : theme.colors.primaryContainer} textColor={item.type === "alerts" ? theme.colors.error : theme.colors.onPrimaryContainer} />
                  {alertNotification && (
                    <NotificationMetaPill label={item.alert?.severity || "Alert"} backgroundColor={theme.colors.primaryContainer} textColor={theme.colors.onPrimaryContainer} />
                  )}
                </View>
                <Text variant="labelSmall" numberOfLines={1} style={[styles.itemTime, { color: theme.colors.onSurfaceVariant }]}>
                  {item.time}
                </Text>
              </View>
            </View>
          </View>
        </TouchableRipple>
      </Surface>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ThemedBackground />

      <AppHeader
        title={t("notiHeadline")}
        subtitle={`${unreadCount} ${t("unread")} ${t("notifications")}`}
        showBack
        showHome
      />

      <Animated.View style={[styles.headerWrap, { opacity: fadeAnim }]}>
        <SegmentedButtons
          value={filter}
          onValueChange={setFilter}
          buttons={[
            { value: "all", label: t("all") },
            { value: "unread", label: t("unread") },
            { value: "alerts", label: t("alerts") },
          ]}
        />
      </Animated.View>

      {loading && !refreshing ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>
            {t("loadingNotifications")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: Math.max(insets.bottom + 116, 128),
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Avatar.Icon
                icon="check-circle-outline"
                size={60}
                style={{ backgroundColor: theme.colors.primaryContainer }}
                color={theme.colors.primary}
              />
              <Text
                variant="titleMedium"
                style={{ color: theme.colors.onSurface, marginTop: 14, fontWeight: "800" }}
              >
                {t("allCaughtUp")}
              </Text>
              <Text
                variant="bodyMedium"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginTop: 6,
                  textAlign: "center",
              }}
            >
              {t("noNotificationsView")}
            </Text>
          </View>
        }
        />
      )}

      <Surface
        style={[
          styles.footer,
          {
            bottom: Math.max(insets.bottom + 12, 16),
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
        elevation={4}
      >
        <View style={styles.footerActions}>
          <Button mode="outlined" onPress={markAllRead} disabled={unreadCount === 0} style={[styles.footerButton, styles.leftFooterButton]} icon="email-check-outline" textColor={theme.colors.primary} labelStyle={styles.footerButtonLabel}>
            {t("markAllRead")}
          </Button>
          <Button mode="contained" onPress={clearRead} disabled={readCount === 0} style={styles.footerButton} icon="check-all" buttonColor={theme.colors.primary} textColor={theme.colors.onPrimary} labelStyle={styles.footerButtonLabel}>
            {t("clearButton")}
          </Button>
        </View>
      </Surface>

      <Portal>
        <Modal visible={isModalVisible} onDismiss={closeModal} contentContainerStyle={styles.modalOuter}>
          <Animated.View
            style={[
              styles.modalContainer,
              {
                width: modalWidth,
                maxHeight: modalMaxHeight,
                backgroundColor: theme.colors.surface,
                opacity: modalOpacity,
                transform: [{ scale: modalScale }],
              },
            ]}
          >
            {selected && (
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Avatar.Icon
                    size={52}
                    icon={selected.type === "alerts" ? "alert" : "email"}
                    style={{ backgroundColor: selected.type === "alerts" ? theme.colors.errorContainer : theme.colors.primaryContainer }}
                    color={selected.type === "alerts" ? theme.colors.error : theme.colors.tertiary}
                  />

                  <Chip compact style={{ backgroundColor: selected.type === "alerts" ? theme.colors.errorContainer : theme.colors.primaryContainer }} textStyle={{ color: selected.type === "alerts" ? theme.colors.error : theme.colors.onPrimaryContainer, fontWeight: "700" }}>
                    {isAlertNotification(selected) ? "Camera Alert" : selected.type === "alerts" ? t("alert") : t("update")}
                  </Chip>
                </View>

                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                  <Text variant="titleLarge" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
                    {selected.title}
                  </Text>

                  <Text variant="bodySmall" style={[styles.modalTime, { color: theme.colors.onSurfaceVariant }]}>
                    {selected.time}
                  </Text>

                  <Text variant="bodyLarge" style={[styles.modalBodyText, { color: theme.colors.onSurface }]}>
                    {selected.description}
                  </Text>

                  {isAlertNotification(selected) ? (
                    <View style={[styles.alertNotificationBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.outlineVariant }]}>
                      <Text style={[styles.alertNotificationTitle, { color: theme.colors.onSurface }]}>
                        Alert Summary
                      </Text>

                      <View style={styles.alertSummaryGrid}>
                        <AlertSummaryItem theme={theme} label="Severity" value={selected.alert?.severity} />
                        <AlertSummaryItem theme={theme} label="Status" value={selected.alert?.status} />
                        <AlertSummaryItem theme={theme} label="Detected Activity" value={selected.alert?.detectedActivity} />
                        <AlertSummaryItem theme={theme} label="Confidence" value={selected.alert?.confidence} />
                        <AlertSummaryItem theme={theme} label="Camera ID" value={selected.alert?.cameraId} />
                        <AlertSummaryItem theme={theme} label="Received" value={selected.alert?.receivedAt} />
                      </View>

                      <Text style={[styles.alertLinkHelp, { color: theme.colors.onSurfaceVariant }]}>
                        Open this alert in the Alerts Dashboard to view the attached video evidence and full review information.
                      </Text>
                    </View>
                  ) : (
                    <Text variant="bodyLarge" style={[styles.modalFullText, { color: theme.colors.onSurface }]}>
                      {selected.fullText}
                    </Text>
                  )}
                </ScrollView>

                {isAlertNotification(selected) && (
                  <Button mode="contained" onPress={openSelectedAlertDashboard} style={styles.alertLinkButton} icon="open-in-new" buttonColor={theme.colors.primary} textColor={theme.colors.onPrimary}>
                    Open in Alerts Dashboard
                  </Button>
                )}

                <Button mode={isAlertNotification(selected) ? "outlined" : "contained"} onPress={closeModal} style={styles.modalButton} buttonColor={isAlertNotification(selected) ? undefined : theme.colors.primary} textColor={isAlertNotification(selected) ? theme.colors.primary : theme.colors.onPrimary}>
                  {t("closeButton")}
                </Button>
              </View>
            )}
          </Animated.View>
        </Modal>
      </Portal>
    </View>
  );
}

function NotificationMetaPill({ label, backgroundColor, textColor }) {
  return (
    <View style={[styles.metaPill, { backgroundColor }]}>
      <Text numberOfLines={1} style={[styles.metaPillText, { color: textColor }]}>
        {label}
      </Text>
    </View>
  );
}

function AlertSummaryItem({ theme, label, value }) {
  return (
    <View style={styles.alertSummaryItem}>
      <Text numberOfLines={1} style={[styles.alertSummaryLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <Text numberOfLines={2} style={[styles.alertSummaryValue, { color: theme.colors.onSurface }]}>{value || "N/A"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },

  card: {
    marginBottom: 14,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1.5,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
  },
  cardTextBlock: {
    flex: 1,
    minWidth: 0,
    marginLeft: 14,
  },
  itemTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  itemTitle: {
    flex: 1,
    minWidth: 0,
    lineHeight: 22,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 10,
    marginTop: 6,
  },
  itemDescription: {
    marginTop: 5,
    lineHeight: 19,
  },
  itemBottom: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaPillRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  metaPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 8,
    marginBottom: 4,
    maxWidth: "100%",
  },
  metaPillText: {
    fontSize: 12,
    fontWeight: "900",
  },
  itemTime: {
    flexShrink: 0,
    marginLeft: 8,
    marginBottom: 4,
  },
  footer: {
    position: "absolute",
    left: 16,
    right: 16,
    padding: 14,
    borderRadius: 24,
    borderWidth: 1,
  },
  footerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  footerButton: {
    flex: 1,
    borderRadius: 16,
  },
  leftFooterButton: {
    marginRight: 12,
  },
  footerButtonLabel: {
    fontWeight: "800",
    fontSize: 12,
  },
  modalOuter: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 18,
  },
  modalContainer: {
    borderRadius: 30,
    padding: 20,
    overflow: "hidden",
  },
  modalContent: {
    maxHeight: "100%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalScroll: {
    flexShrink: 1,
  },
  modalScrollContent: {
    paddingBottom: 8,
  },
  modalTitle: {
    fontWeight: "900",
    lineHeight: 30,
  },
  modalTime: {
    marginTop: 8,
  },
  modalBodyText: {
    marginTop: 18,
    lineHeight: 26,
  },
  modalFullText: {
    marginTop: 18,
    lineHeight: 26,
  },
  alertNotificationBox: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    marginTop: 18,
  },
  alertNotificationTitle: {
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 12,
  },
  alertSummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  alertSummaryItem: {
    width: "48%",
    marginBottom: 14,
  },
  alertSummaryLabel: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  alertSummaryValue: {
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
  },
  alertLinkHelp: {
    marginTop: 4,
    lineHeight: 20,
    fontWeight: "700",
  },
  alertLinkButton: {
    marginTop: 14,
    borderRadius: 16,
  },
  modalButton: {
    marginTop: 10,
    borderRadius: 16,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingTop: 70,
  },
});
