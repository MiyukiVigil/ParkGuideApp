import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { ActivityIndicator, Avatar, Button, Chip, Modal, Portal, Surface, Text, TouchableRipple, useTheme } from "react-native-paper";
import { WebView } from "react-native-webview";
import { useLocalSearchParams } from "expo-router";

import AppHeader from "../components/AppHeader";
import ThemedBackground from "../components/ThemedBackground";
import * as AlertService from "../services/alertService";
import * as MonitorService from "../services/monitorService";

export default function Monitor() {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const params = useLocalSearchParams();
  const requestedAlertId = typeof params?.alertId === "string" ? params.alertId : null;
  const shouldOpenRequestedAlert = params?.open === "1";
  const [status, setStatus] = useState(MonitorService.DEFAULT_MONITOR_STATUS);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const openedRouteAlertRef = useRef(null);

  const loadMonitor = useCallback(async ({ showLoader = true } = {}) => {
    try {
      if (showLoader) setIsLoading(true);
      setError("");
      const [nextStatus, nextAlerts] = await Promise.all([
        MonitorService.getMonitorStatus(),
        AlertService.fetchAlerts({ fallbackToLocal: false }),
      ]);
      setStatus(nextStatus);
      setAlerts(nextAlerts);
    } catch (err) {
      console.log("Monitor load error:", err?.response?.data || err?.message || err);
      setError("Unable to load live monitor data from the backend.");
      setAlerts([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMonitor();
    const interval = setInterval(() => loadMonitor({ showLoader: false }), 10000);
    return () => clearInterval(interval);
  }, [loadMonitor]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadMonitor({ showLoader: false });
  }, [loadMonitor]);

  const pendingCount = useMemo(() => alerts.filter((alert) => String(alert.status).toLowerCase().includes("pending")).length, [alerts]);
  const highCount = useMemo(() => alerts.filter((alert) => String(alert.severity).toLowerCase() === "high").length, [alerts]);
  const visibleAlerts = alerts;
  const hasManyAlerts = visibleAlerts.length > 4;
  const modalWidth = Math.min(width - 24, 560);
  const modalMaxHeight = Math.max(height - 48, 420);

  const openAlertModal = (alert) => {
    setSelectedAlert(alert);
    setModalVisible(true);
  };

  const closeAlertModal = () => {
    setModalVisible(false);
    setSelectedAlert(null);
  };

  useEffect(() => {
    if (!shouldOpenRequestedAlert || !requestedAlertId || isLoading || openedRouteAlertRef.current === requestedAlertId) {
      return;
    }
    const matchedAlert = alerts.find((alert) => String(alert.id) === requestedAlertId);
    if (!matchedAlert) return;
    openedRouteAlertRef.current = requestedAlertId;
    openAlertModal(matchedAlert);
  }, [alerts, isLoading, requestedAlertId, shouldOpenRequestedAlert]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ThemedBackground />
      <AppHeader title="RangerEye Monitor" subtitle="ESP32 AI violation reports" showBack showHome />

      {isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>Loading live monitor data...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.container}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        >
          <Surface style={[styles.statusCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={2}>
            <View style={styles.statusTop}>
              <View style={styles.statusTitleBlock}>
                <Avatar.Icon
                  size={48}
                  icon={status.isLive ? "camera-wireless-outline" : "camera-off-outline"}
                  color={status.isLive ? theme.colors.primary : theme.colors.onSurfaceVariant}
                  style={{ backgroundColor: status.isLive ? theme.colors.primaryContainer : theme.colors.surfaceVariant }}
                />
                <View style={styles.statusTextBlock}>
                  <Text style={[styles.statusTitle, { color: theme.colors.onSurface }]}>ESP32-CAM Pipeline</Text>
                  <Text numberOfLines={2} style={[styles.statusMessage, { color: theme.colors.onSurfaceVariant }]}>
                    {status.message || "Camera module is offline."}
                  </Text>
                </View>
              </View>

              <Chip
                compact
                style={{ backgroundColor: status.isLive ? theme.colors.primaryContainer : theme.colors.surfaceVariant }}
                textStyle={{ color: status.isLive ? theme.colors.primary : theme.colors.onSurfaceVariant, fontWeight: "800" }}
              >
                {status.isLive ? "Live" : "Offline"}
              </Chip>
            </View>

            {error ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text> : null}
          </Surface>

          <View style={styles.summaryRow}>
            <SummaryCard theme={theme} label="AI Alerts" value={String(alerts.length)} />
            <SummaryCard theme={theme} label="Pending" value={String(pendingCount)} tone="warning" />
            <SummaryCard theme={theme} label="High" value={String(highCount)} tone="danger" />
          </View>

          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleBlock}>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Violation Reports</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                {visibleAlerts.length ? `${visibleAlerts.length} AI alert${visibleAlerts.length === 1 ? "" : "s"} from the current database` : "No stored AI alerts yet"}
              </Text>
            </View>
            <Chip compact style={{ backgroundColor: theme.colors.primaryContainer }} textStyle={{ color: theme.colors.primary, fontWeight: "800" }}>
              {visibleAlerts.length}
            </Chip>
          </View>

          {visibleAlerts.length ? (
            <View style={styles.alertList}>
              {visibleAlerts.map((alert, index) => (
                <Surface
                  key={alert.id}
                  style={[
                    styles.alertCard,
                    hasManyAlerts && styles.compactAlertCard,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
                  ]}
                  elevation={index === 0 ? 2 : 1}
                >
                  <TouchableRipple onPress={() => openAlertModal(alert)} borderRadius={22}>
                    <View style={[styles.alertPressArea, hasManyAlerts && styles.compactAlertPressArea]}>
                      <View style={styles.alertHeader}>
                        <View style={styles.alertTitleBlock}>
                          <Text numberOfLines={2} style={[styles.alertTitle, { color: theme.colors.onSurface }]}>{alert.title}</Text>
                          <Text numberOfLines={2} style={[styles.alertSummary, { color: theme.colors.onSurfaceVariant }]}>{alert.summary}</Text>
                        </View>
                        <Chip compact style={{ backgroundColor: getSeverityBg(alert.severity, theme) }} textStyle={{ color: getSeverityColor(alert.severity, theme), fontWeight: "900" }}>
                          {alert.severity}
                        </Chip>
                      </View>

                      <View style={styles.listMetaRow}>
                        <Text numberOfLines={1} style={[styles.listMetaText, { color: theme.colors.onSurfaceVariant }]}>
                          {[alert.detectedActivity, alert.confidence, alert.receivedAt].filter(Boolean).join(" • ")}
                        </Text>
                        <Chip compact style={{ backgroundColor: theme.colors.primaryContainer }} textStyle={{ color: theme.colors.primary, fontWeight: "800" }}>
                          View
                        </Chip>
                      </View>
                    </View>
                  </TouchableRipple>
                </Surface>
              ))}
            </View>
          ) : (
            <Surface style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={1}>
              <Avatar.Icon size={56} icon="shield-check-outline" color={theme.colors.primary} style={{ backgroundColor: theme.colors.primaryContainer }} />
              <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>No AI violation reports</Text>
              <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                Only backend AI alerts appear here. Old raw captures and placeholder sensor rows are no longer shown.
              </Text>
            </Surface>
          )}
        </ScrollView>
      )}

      <Portal>
        <Modal visible={isModalVisible} onDismiss={closeAlertModal} contentContainerStyle={styles.modalOuter}>
          <Surface style={[styles.modalCard, { width: modalWidth, maxHeight: modalMaxHeight, backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={5}>
            {selectedAlert && (
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Avatar.Icon size={52} icon="alert" style={{ backgroundColor: theme.colors.errorContainer }} color={theme.colors.error} />
                  <Chip compact style={{ backgroundColor: theme.colors.errorContainer }} textStyle={{ color: theme.colors.error, fontWeight: "800" }}>
                    Camera Alert
                  </Chip>
                </View>

                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                  <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>{selectedAlert.title}</Text>
                  <Text style={[styles.modalTime, { color: theme.colors.onSurfaceVariant }]}>{selectedAlert.receivedAt}</Text>
                  <Text style={[styles.modalBodyText, { color: theme.colors.onSurface }]}>{selectedAlert.summary}</Text>

                  <View style={[styles.alertNotificationBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.outlineVariant }]}>
                    <Text style={[styles.alertNotificationTitle, { color: theme.colors.onSurface }]}>Alert Summary</Text>

                    <View style={styles.alertSummaryGrid}>
                      <AlertSummaryItem theme={theme} label="Severity" value={selectedAlert.severity} />
                      <AlertSummaryItem theme={theme} label="Status" value={selectedAlert.status} />
                      <AlertSummaryItem theme={theme} label="Detected Activity" value={selectedAlert.detectedActivity} />
                      <AlertSummaryItem theme={theme} label="Confidence" value={selectedAlert.confidence} />
                      <AlertSummaryItem theme={theme} label="Camera ID" value={selectedAlert.cameraId} />
                      <AlertSummaryItem theme={theme} label="Received" value={selectedAlert.receivedAt} />
                    </View>

                    {selectedAlert.videoUrl ? (
                      <AnnotatedVideo uri={selectedAlert.videoUrl} theme={theme} />
                    ) : (
                      <View style={[styles.noVideoBox, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}>
                        <Text style={{ color: theme.colors.onSurfaceVariant }}>No annotated evidence video attached.</Text>
                      </View>
                    )}

                    <Text style={[styles.alertLinkHelp, { color: theme.colors.onSurfaceVariant }]}>
                      Evidence file:{"\n"}{selectedAlert.videoFilename || "N/A"}
                    </Text>
                    <Text style={[styles.alertLinkHelp, { color: theme.colors.onSurfaceVariant }]}>
                      Recommended action: {selectedAlert.recommendedAction || "Review the footage and confirm the event."}
                    </Text>
                  </View>
                </ScrollView>

                <Button mode="outlined" onPress={closeAlertModal} style={styles.modalButton} textColor={theme.colors.primary}>
                  Close
                </Button>
              </View>
            )}
          </Surface>
        </Modal>
      </Portal>
    </View>
  );
}

function AnnotatedVideo({ uri, theme }) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
          video { width: 100%; height: 100%; object-fit: contain; background: #000; }
        </style>
      </head>
      <body>
        <video controls playsinline>
          <source src="${uri}" type="video/mp4" />
        </video>
      </body>
    </html>
  `;

  return (
    <View style={[styles.videoBox, { borderColor: theme.colors.outlineVariant }]}>
      <WebView source={{ html }} style={styles.videoWebView} allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false} javaScriptEnabled domStorageEnabled />
    </View>
  );
}

function SummaryCard({ theme, label, value, tone }) {
  const color = tone === "danger" ? theme.colors.error : tone === "warning" ? "#D6A33A" : theme.colors.primary;
  return (
    <Surface style={[styles.summaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={1}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text numberOfLines={1} style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
    </Surface>
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

function getSeverityColor(severity, theme) {
  if (String(severity).toLowerCase() === "high") return theme.colors.error;
  if (String(severity).toLowerCase() === "medium") return "#D6A33A";
  return theme.colors.primary;
}

function getSeverityBg(severity, theme) {
  if (String(severity).toLowerCase() === "high") return theme.colors.errorContainer;
  if (String(severity).toLowerCase() === "medium") return "rgba(214,163,58,0.18)";
  return theme.colors.primaryContainer;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  container: {
    padding: 18,
    paddingBottom: 40,
  },
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statusCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
  },
  statusTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  statusTitleBlock: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  statusMessage: {
    marginTop: 4,
    lineHeight: 19,
  },
  errorText: {
    marginTop: 12,
    fontWeight: "700",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "900",
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "800",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  sectionTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "900",
  },
  sectionSubtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  alertList: {
    gap: 10,
  },
  alertCard: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
  },
  compactAlertCard: {
    borderRadius: 18,
  },
  alertPressArea: {
    padding: 14,
  },
  compactAlertPressArea: {
    padding: 12,
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  alertTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  alertTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "900",
  },
  alertSummary: {
    marginTop: 4,
    lineHeight: 19,
  },
  videoBox: {
    height: 190,
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  videoWebView: {
    flex: 1,
    backgroundColor: "#000",
  },
  noVideoBox: {
    minHeight: 82,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  listMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 6,
  },
  listMetaText: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: "700",
  },
  emptyCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "900",
  },
  emptyText: {
    marginTop: 6,
    textAlign: "center",
    lineHeight: 20,
  },
  modalOuter: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 18,
  },
  modalCard: {
    borderRadius: 30,
    borderWidth: 1,
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
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 31,
  },
  modalTime: {
    marginTop: 8,
    fontSize: 13,
  },
  modalBodyText: {
    marginTop: 18,
    fontSize: 16,
    lineHeight: 24,
  },
  alertNotificationBox: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    marginTop: 18,
  },
  alertNotificationTitle: {
    fontSize: 19,
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
    marginTop: 10,
    lineHeight: 20,
    fontWeight: "700",
  },
  modalButton: {
    marginTop: 12,
    borderRadius: 16,
  },
});
