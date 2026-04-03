import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, FlatList, ScrollView, Animated, Easing } from 'react-native';
import { Text, Surface, TouchableRipple, Avatar, Button, Portal, Modal, useTheme, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import api from '../utils/api';

export default function Notifications() {
  const theme = useTheme();import React, { useState, useRef, useMemo, useEffect } from "react";
import { View, StyleSheet, FlatList, ScrollView, Animated } from "react-native";
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
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import AppHeader from "../components/AppHeader";
import ThemedBackground from "../components/ThemedBackground";

const NOTIFICATIONS = [
  {
    id: "1",
    title: "New Module Available",
    description: "Advanced Biodiversity 2.0 is unlocked.",
    fullText: "Complete the new module within 14 days to maintain guide status.",
    time: "10 mins ago",
    type: "updates",
    isRead: false,
  },
  {
    id: "2",
    title: "Park Alert",
    description: "Heavy rain expected in Bako National Park.",
    fullText: "Flash flood warning: reroute tours immediately.",
    time: "2 hours ago",
    type: "alerts",
    isRead: false,
  },
  {
    id: "3",
    title: "Certification Approved",
    description: "Eco-Tourism Ethics certificate is ready.",
    fullText: "Your certificate is verified. Check the Certs section.",
    time: "Mar 07, 2026",
    type: "updates",
    isRead: true,
  },
];

export default function Notifications() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [selected, setSelected] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [filter, setFilter] = useState("all");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.94)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const filteredNotifications = useMemo(() => {
    if (filter === "unread") return notifications.filter((n) => !n.isRead);
    if (filter === "alerts") return notifications.filter((n) => n.type === "alerts");
    return notifications;
  }, [notifications, filter]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const openModal = (item) => {
    setSelected({ ...item, isRead: true });
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
    );
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

  const clearRead = () => setNotifications((prev) => prev.filter((n) => !n.isRead));
  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

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
              {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: getAccent(item) }]} />}
            </View>

            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }} numberOfLines={2}>
              {item.description}
            </Text>

            <View style={styles.itemBottom}>
              <Chip
                compact
                style={{ backgroundColor: theme.colors.primaryContainer }}
                textStyle={{ color: theme.colors.onPrimaryContainer, fontWeight: "700" }}
              >
                {item.type === "alerts" ? "Alert" : "Update"}
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
        subtitle={`${unreadCount} unread notifications`}
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
            Notification Centre
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
            Review operational alerts and recent updates for forest guide duties.
          </Text>

          <View style={styles.summaryActions}>
            <Button mode="text" onPress={markAllRead}>
              Mark all read
            </Button>
            <Button mode="text" onPress={clearRead}>
              Clear read
            </Button>
          </View>
        </Surface>

        <SegmentedButtons
          value={filter}
          onValueChange={setFilter}
          buttons={[
            { value: "all", label: "All" },
            { value: "unread", label: "Unread" },
            { value: "alerts", label: "Alerts" },
          ]}
        />
      </Animated.View>

      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Avatar.Icon
              icon="check-circle-outline"
              size={60}
              style={{ backgroundColor: theme.colors.primaryContainer }}
              color={theme.colors.primary}
            />
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginTop: 14, fontWeight: "800" }}>
              All caught up
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6, textAlign: "center" }}>
              There are no notifications in this view right now.
            </Text>
          </View>
        }
      />

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
                    {selected.type === "alerts" ? "Alert" : "Update"}
                  </Chip>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text variant="titleLarge" style={{ fontWeight: "900", color: theme.colors.onSurface }}>
                    {selected.title}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                    {selected.time}
                  </Text>
                  <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, marginTop: 18, lineHeight: 28 }}>
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
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();

  const [notifications, setNotifications] = useState([]);
  const [selected, setSelected] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  // Persist animated value across renders
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        setLoading(true);
        const response = await api.get('/notifications/items/');
        const rows = Array.isArray(response.data) ? response.data : [];
        setNotifications(rows.map((item) => ({
          ...item,
          id: String(item.id),
          isRead: !!item.is_read,
        })));
      } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403 || error.isSessionExpired) {
          router.replace('/');
          return;
        }
        console.log('Failed to load notifications', error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [router]);

  const openModal = async (item) => {
    setSelected({ ...item, isRead: true });
    setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n));

    if (!item.isRead) {
      try {
        await api.post(`/notifications/items/${item.id}/mark-read/`);
      } catch (error) {
        console.log('Failed to mark notification read', error.response?.data || error.message);
      }
    }

    setModalVisible(true);
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => setModalVisible(false));
  };

  const clearRead = async () => {
    try {
      await api.post('/notifications/items/clear-read/');
      setNotifications(prev => prev.filter(n => !n.isRead));
    } catch (error) {
      console.log('Failed to clear read notifications', error.response?.data || error.message);
    }
  };

  const renderItem = ({ item }) => (
    <Surface
      style={[
        styles.card,
        { backgroundColor: item.isRead ? theme.colors.surfaceVariant : theme.colors.surface,
          borderColor: theme.colors.outline,
          borderWidth: 1
        },
      ]}
      elevation={item.isRead ? 0 : 2}
    >
      <TouchableRipple onPress={() => openModal(item)} style={styles.ripple} borderless>
        <View style={styles.cardContent}>
          <Avatar.Icon
            size={40}
            icon={item.isRead ? "email-open-outline" : "email-alert-outline"}
            style={{ backgroundColor: item.isRead ? theme.colors.surfaceVariant : theme.colors.primaryContainer, marginRight: 15 }}
            color={item.isRead ? theme.colors.onSurfaceVariant : theme.colors.primary}
          />
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={{ fontWeight: item.isRead ? '400' : '700', color: item.isRead ? theme.colors.onSurfaceVariant : theme.colors.onSurface }} numberOfLines={1}>
              {item.title}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
              {item.description}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{item.time}</Text>
          </View>
        </View>
      </TouchableRipple>
    </Surface>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineSmall" style={[styles.header, { color: theme.colors.onBackground }]}>{t("notiHeadline")}</Text>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator animating color={theme.colors.primary} />
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>No notifications yet.</Text>
            </View>
          )
        }
      />

      {/* Footer */}
      <Surface style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20), backgroundColor: theme.colors.surface }]} elevation={4}>
        <Button mode="contained" onPress={clearRead} style={{ borderRadius: 12 }} buttonColor={theme.colors.primary} icon="check-all">
          {t("clearButton")}
        </Button>
      </Surface>

      {/* Modal */}
      <Portal>
        <Modal
            visible={isModalVisible}
            onDismiss={closeModal}
            contentContainerStyle={[
            styles.modalContainer, 
            { backgroundColor: theme.colors.surface }
            ]}
        >
            {selected && (
            <View>
                <View style={styles.modalHeader}>
                <Avatar.Icon size={48} icon="email" style={{ backgroundColor: theme.colors.primaryContainer }} color={theme.colors.primary} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                <Text variant="titleLarge" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                    {selected.title}
                </Text>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, marginTop: 15 }}>
                    {selected.fullText}
                </Text>
                </ScrollView>

                <Button mode="contained" onPress={closeModal} style={styles.modalButton}>
                {t("closeButton")}
                </Button>
            </View>
            )}
        </Modal>
    </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 20, fontWeight: '900' },
  card: { marginBottom: 15, borderRadius: 16, overflow: 'hidden' },
  ripple: { padding: 15 },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  emptyWrap: { paddingTop: 40, alignItems: 'center' },
  footer: { position: 'absolute', bottom: 20, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalContainer: {
    width: '90%',
    alignSelf: 'center',
    borderRadius: 24,
    padding: 25,
    minHeight: 300, // Ensure it has a base height
    },
    modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
    },
    modalButton: {
    borderRadius: 12,
    marginTop: 20
    }
});
