import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { View, StyleSheet, FlatList, ScrollView, Animated, RefreshControl, Alert } from "react-native";
import {
  Text,
  Surface,
  TouchableRipple,
  Avatar,
  Button,
  Portal,
  Modal,
  Chip,
  SegmentedButtons,
  useTheme,
  ActivityIndicator,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "expo-router";
import AppHeader from "../components/AppHeader";
import ThemedBackground from "../components/ThemedBackground";
import * as NotificationService from "../services/notificationService";

export default function Notifications() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [filter, setFilter] = useState("all");

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

  const openModal = async (item) => {
    setSelected({ ...item, isRead: true });
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
    );
    
    // Mark as read on backend
    if (item.backendId && !item.isRead) {
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

  const renderItem = ({ item }) => (
    <Surface
      style={[
        styles.card,
        {
          backgroundColor: cardBg,
          borderColor: item.isRead ? theme.colors.outlineVariant : getAccent(item),
          opacity: item.isRead ? 0.92 : 1,
        },
      ]}
      elevation={item.isRead ? 1 : 2}
    >
      <TouchableRipple onPress={() => openModal(item)} borderRadius={22}>
        <View style={styles.cardContent}>
          <Avatar.Icon
            size={46}
            icon={
              item.type === "alerts"
                ? "alert-circle-outline"
                : item.isRead
                ? "email-open-outline"
                : "email-alert-outline"
            }
            style={{
              backgroundColor:
                item.type === "alerts"
                  ? theme.colors.errorContainer
                  : theme.colors.primaryContainer,
            }}
            color={getAccent(item)}
          />

          <View style={{ flex: 1, marginLeft: 14 }}>
            <View style={styles.itemTop}>
              <Text
                variant="titleMedium"
                style={{
                  fontWeight: item.isRead ? "700" : "900",
                  color: theme.colors.onSurface,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              {!item.isRead && (
                <View style={[styles.unreadDot, { backgroundColor: getAccent(item) }]} />
              )}
            </View>

            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
              numberOfLines={2}
            >
              {item.description}
            </Text>

            <View style={styles.itemBottom}>
              <Chip
                compact
                style={{ backgroundColor: theme.colors.primaryContainer }}
                textStyle={{ color: theme.colors.onPrimaryContainer, fontWeight: "700" }}
              >
                {item.type === "alerts" ? t("alert") : t("update")}
              </Chip>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {item.time}
              </Text>
            </View>
          </View>
        </View>
      </TouchableRipple>
    </Surface>
  );

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
        <Surface
          style={[
            styles.summaryCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
          elevation={1}
        >
          <Text style={{ color: theme.colors.onSurface, fontWeight: "900", fontSize: 18 }}>
            {t("notificationCentre")}
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
            {t("reviewAlerts")}
          </Text>

          <View style={styles.summaryActions}>
            <Button mode="text" onPress={markAllRead}>
              {t("markAllRead")}
            </Button>
            <Button mode="text" onPress={clearRead}>
              {t("clearRead")}
            </Button>
          </View>
        </Surface>

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
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}
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
            paddingBottom: Math.max(insets.bottom, 18),
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.outlineVariant,
          },
        ]}
        elevation={4}
      >
        <Button
          mode="contained"
          onPress={clearRead}
          style={styles.clearButton}
          icon="check-all"
          buttonColor={theme.colors.primary}
          textColor={theme.colors.onPrimary}
        >
          {t("clearButton")}
        </Button>
      </Surface>

      <Portal>
        <Modal visible={isModalVisible} onDismiss={closeModal} contentContainerStyle={styles.modalOuter}>
          <Animated.View
            style={[
              styles.modalContainer,
              {
                backgroundColor: theme.colors.surface,
                opacity: modalOpacity,
                transform: [{ scale: modalScale }],
              },
            ]}
          >
            {selected && (
              <View>
                <View style={styles.modalHeader}>
                  <Avatar.Icon
                    size={54}
                    icon={selected.type === "alerts" ? "alert" : "email"}
                    style={{
                      backgroundColor:
                        selected.type === "alerts"
                          ? theme.colors.errorContainer
                          : theme.colors.primaryContainer,
                    }}
                    color={selected.type === "alerts" ? theme.colors.error : theme.colors.tertiary}
                  />
                  <Chip
                    compact
                    style={{ backgroundColor: theme.colors.primaryContainer }}
                    textStyle={{ color: theme.colors.onPrimaryContainer, fontWeight: "700" }}
                  >
                    {selected.type === "alerts" ? t("alert") : t("update")}
                  </Chip>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text
                    variant="titleLarge"
                    style={{ fontWeight: "900", color: theme.colors.onSurface }}
                  >
                    {selected.title}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}
                  >
                    {selected.time}
                  </Text>
                  <Text
                    variant="bodyLarge"
                    style={{ color: theme.colors.onSurface, marginTop: 18, lineHeight: 28 }}
                  >
                    {selected.fullText}
                  </Text>
                </ScrollView>

                <Button
                  mode="contained"
                  onPress={closeModal}
                  style={styles.modalButton}
                  buttonColor={theme.colors.primary}
                  textColor={theme.colors.onPrimary}
                >
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
    paddingBottom: 14,
  },
  summaryCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  summaryActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  card: {
    marginBottom: 14,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1.5,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  itemTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 10,
  },
  itemBottom: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  clearButton: {
    borderRadius: 16,
  },
  modalOuter: {
    padding: 18,
  },
  modalContainer: {
    borderRadius: 28,
    padding: 24,
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  modalButton: {
    marginTop: 22,
    borderRadius: 16,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingTop: 70,
  },
});
