import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert as NativeAlert, RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { ActivityIndicator, Avatar, Button, Chip, Modal, Portal, Surface, Text, TextInput, TouchableRipple, useTheme } from "react-native-paper";
import { WebView } from "react-native-webview";
import { useLocalSearchParams } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import { useTranslation } from "react-i18next";

import AppHeader from "../components/AppHeader";
import ThemedBackground from "../components/ThemedBackground";
import { useMonitoring } from "../contexts/MonitoringContext";
import * as AlertService from "../services/alertService";
import * as Esp32CameraService from "../services/esp32CameraService";
import * as MonitorService from "../services/monitorService";
import * as OfflineEvidenceQueue from "../services/offlineEvidenceQueue";

export default function Monitor() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const params = useLocalSearchParams();
  const {
    captureError,
    captureState,
    isMonitoring,
    queuedEvidenceCount,
    refreshMonitorState,
    startMonitoring,
    stopMonitoring,
    syncQueuedEvidence,
  } = useMonitoring();
  const requestedAlertId = typeof params?.alertId === "string" ? params.alertId : null;
  const shouldOpenRequestedAlert = params?.open === "1";
  const [status, setStatus] = useState(MonitorService.DEFAULT_MONITOR_STATUS);
  const [alerts, setAlerts] = useState([]);
  const [clips, setClips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [controlBusy, setControlBusy] = useState(false);
  const [controlMessage, setControlMessage] = useState("");
  const [esp32BaseUrl, setEsp32BaseUrl] = useState("");
  const [esp32Input, setEsp32Input] = useState("");
  const [esp32Status, setEsp32Status] = useState(null);
  const [esp32Busy, setEsp32Busy] = useState(false);
  const [esp32Message, setEsp32Message] = useState("");
  const [deletingClipId, setDeletingClipId] = useState(null);
  const [activeSection, setActiveSection] = useState("capture");
  const openedRouteAlertRef = useRef(null);

  const loadMonitor = useCallback(async ({ showLoader = true } = {}) => {
    try {
      if (showLoader) setIsLoading(true);
      setError("");
      const [nextStatus, nextAlerts, nextClips] = await Promise.all([
        MonitorService.getMonitorStatus(),
        AlertService.fetchAlerts({ fallbackToLocal: false }),
        MonitorService.fetchMonitorClips(),
      ]);
      setStatus(nextStatus);
      setAlerts(nextAlerts);
      setClips(nextClips);
    } catch (err) {
      console.log("Monitor load error:", err?.response?.data || err?.message || err);
      setError(t("monitorLoadError"));
      setAlerts([]);
      setClips([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    loadMonitor();
    const interval = setInterval(() => loadMonitor({ showLoader: false }), 10000);
    return () => clearInterval(interval);
  }, [loadMonitor]);

  useEffect(() => {
    let active = true;

    const loadSavedEsp32 = async () => {
      const saved = await Esp32CameraService.getSavedEsp32BaseUrl();
      if (!active) return;
      setEsp32BaseUrl(saved);
      setEsp32Input(saved.replace(/^https?:\/\//i, ""));
      if (!saved) return;

      try {
        const deviceStatus = await Esp32CameraService.getEsp32Status(saved);
        if (active) setEsp32Status(deviceStatus);
      } catch {
        if (active) setEsp32Status(null);
      }
    };

    loadSavedEsp32();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!esp32BaseUrl) return undefined;

    let cancelled = false;

    const reportEsp32Connectivity = async () => {
      try {
        const deviceStatus = await Esp32CameraService.getEsp32Status(esp32BaseUrl);
        if (cancelled) return;
        setEsp32Status(deviceStatus);
        await MonitorService.startMonitorSession({
          camera_source: esp32BaseUrl,
          clip_interval_minutes: 5,
        });
      } catch {
        if (cancelled) return;
        setEsp32Status(null);
        await MonitorService.stopMonitorSession().catch(() => null);
      }
    };

    reportEsp32Connectivity();
    const interval = setInterval(reportEsp32Connectivity, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [esp32BaseUrl]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadMonitor({ showLoader: false });
  }, [loadMonitor]);

  const pendingCount = useMemo(() => alerts.filter((alert) => String(alert.status).toLowerCase().includes("pending")).length, [alerts]);
  const visibleAlerts = alerts;
  const useBoxColumns = width >= 720;
  const modalWidth = Math.min(width - 24, 560);
  const modalMaxHeight = Math.max(height - 48, 420);

  const openAlertModal = (alert) => {
    setSelectedAlert(alert);
    setModalVisible(true);
  };

  const openClipModal = (clip) => {
    setSelectedAlert({
      id: clip.id,
      title: clip.title,
      summary: clip.summary,
      severity: clip.hasAlert ? "Alert" : "Footage",
      status: clip.status,
      detectedActivity: clip.hasAlert ? "AI alert" : "No monitored detection",
      confidence: "N/A",
      cameraId: clip.cameraSource,
      receivedAt: clip.recordedAt,
      videoUrl: clip.videoUrl,
      videoFilename: clip.videoFilename,
      videoDuration: clip.videoDuration,
      recommendedAction: clip.hasAlert ? "Review the AI alert and attached footage." : "Review the recorded footage to confirm camera capture quality.",
    });
    setModalVisible(true);
  };

  const closeAlertModal = () => {
    setModalVisible(false);
    setSelectedAlert(null);
  };

  const handleSaveEsp32Address = async () => {
    try {
      setEsp32Busy(true);
      setEsp32Message("");
      const saved = await Esp32CameraService.saveEsp32BaseUrl(esp32Input);
      setEsp32BaseUrl(saved);
      setEsp32Input(saved.replace(/^https?:\/\//i, ""));
      if (!saved) {
        setEsp32Status(null);
        setEsp32Message("ESP32-CAM address cleared.");
        return;
      }
      const deviceStatus = await Esp32CameraService.getEsp32Status(saved);
      setEsp32Status(deviceStatus);
      await MonitorService.startMonitorSession({
        camera_source: saved,
        clip_interval_minutes: 5,
      });
      await loadMonitor({ showLoader: false });
      setEsp32Message(`Connected to ${deviceStatus.device || "ESP32-CAM"} at ${deviceStatus.ip || saved}.`);
    } catch (err) {
      setEsp32Status(null);
      setEsp32Message(err?.message || "Unable to connect to ESP32-CAM.");
    } finally {
      setEsp32Busy(false);
    }
  };

  const handleAutoFindEsp32 = async () => {
    try {
      setEsp32Busy(true);
      setEsp32Message("Searching local WiFi for ParkGuide ESP32-CAM...");
      const found = await Esp32CameraService.discoverEsp32Camera();
      setEsp32BaseUrl(found.baseUrl);
      setEsp32Input(found.baseUrl.replace(/^https?:\/\//i, ""));
      setEsp32Status(found.status);
      await MonitorService.startMonitorSession({
        camera_source: found.baseUrl,
        clip_interval_minutes: 5,
      });
      await loadMonitor({ showLoader: false });
      setEsp32Message(`Auto-found ESP32-CAM at ${found.status?.ip || found.baseUrl}.`);
    } catch (err) {
      setEsp32Status(null);
      setEsp32Message(err?.message || "Unable to auto-find ESP32-CAM.");
    } finally {
      setEsp32Busy(false);
    }
  };

  const handleRefreshEsp32 = async () => {
    try {
      setEsp32Busy(true);
      setEsp32Message("");
      const baseUrl = await Esp32CameraService.saveEsp32BaseUrl(esp32Input || esp32BaseUrl);
      setEsp32BaseUrl(baseUrl);
      setEsp32Input(baseUrl.replace(/^https?:\/\//i, ""));
      const deviceStatus = await Esp32CameraService.getEsp32Status(baseUrl);
      setEsp32Status(deviceStatus);
      await MonitorService.startMonitorSession({
        camera_source: baseUrl,
        clip_interval_minutes: 5,
      });
      await loadMonitor({ showLoader: false });
      setEsp32Message(`ESP32-CAM is online at ${deviceStatus.ip || baseUrl}.`);
    } catch (err) {
      setEsp32Status(null);
      setEsp32Message(err?.message || "Unable to reach ESP32-CAM.");
    } finally {
      setEsp32Busy(false);
    }
  };

  const handleBackendRecordEsp32 = async () => {
    const capturedFrames = [];
    const startedAt = Date.now();
    const targetDurationMs = 15000;
    const targetFrameIntervalMs = 180;
    const maxFrames = 60;

    try {
      setEsp32Busy(true);
      setEsp32Message("Recording ESP32 footage locally on this phone...");
      const baseUrl = await Esp32CameraService.saveEsp32BaseUrl(esp32Input || esp32BaseUrl);
      setEsp32BaseUrl(baseUrl);
      setEsp32Input(baseUrl.replace(/^https?:\/\//i, ""));

      const deviceStatus = await Esp32CameraService.getEsp32Status(baseUrl);
      setEsp32Status(deviceStatus);
      const captureUrl = deviceStatus.captureUrl || `${baseUrl}/capture`;

      while (Date.now() - startedAt < targetDurationMs && capturedFrames.length < maxFrames) {
        const frameStartedAt = Date.now();
        const frameUri = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}esp32-frame-${Date.now()}-${capturedFrames.length}.jpg`;

        try {
          const downloaded = await FileSystem.downloadAsync(captureUrl, frameUri);
          capturedFrames.push(downloaded.uri);
        } catch (frameErr) {
          if (capturedFrames.length < 2) {
            throw frameErr;
          }
        }

        const elapsedSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        setEsp32Message(`Recording locally... ${elapsedSeconds}s, ${capturedFrames.length} frames`);

        const remainingDelay = targetFrameIntervalMs - (Date.now() - frameStartedAt);
        if (remainingDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingDelay));
        }
      }

      if (capturedFrames.length < 2) {
        throw new Error("Not enough ESP32 frames captured. Check that the phone can open the ESP32 /capture URL.");
      }

      const elapsedSeconds = Math.max(1, (Date.now() - startedAt) / 1000);
      const capturedFps = Math.max(1, Math.min(8, Math.round(capturedFrames.length / elapsedSeconds)));
      setEsp32Message(`Uploading ${capturedFrames.length} local frames to Firebase...`);

      const result = await MonitorService.uploadEsp32FramesViaFirebase({
        frames: capturedFrames,
        baseUrl,
        cameraSource: baseUrl,
        location: "ESP32-CAM monitoring",
        fps: capturedFps,
        clipIntervalMinutes: 5,
      });

      const nextStatus = await Esp32CameraService.getEsp32Status(baseUrl).catch(() => deviceStatus);
      setEsp32Status(nextStatus);
      await loadMonitor({ showLoader: false });

      if (result.alert) {
        setEsp32Message(`Recorded on phone, uploaded to Firebase, and created alert #${result.alert.id}.`);
      } else {
        const frameCount = result.recording?.real_frames || result.recording?.saved_frames;
        const frameText = frameCount ? ` (${frameCount} frames at ${result.recording?.fps || capturedFps} fps)` : "";
        setEsp32Message(`${result.detail || "Recorded footage. No violation detected."}${frameText}`);
      }
    } catch (err) {
      const data = err?.response?.data;
      const detail = data?.detail || err?.message || "Phone could not record/upload the ESP32 footage through Firebase.";
      const hint = data?.hint ? ` ${data.hint}` : "";
      if (capturedFrames.length >= 2) {
        const elapsedSeconds = Math.max(1, (Date.now() - startedAt) / 1000);
        const queuedFps = Math.max(1, Math.min(8, Math.round(capturedFrames.length / elapsedSeconds)));
        const baseUrl = esp32BaseUrl || (esp32Input ? `http://${esp32Input.replace(/^https?:\/\//i, "")}` : "");
        await OfflineEvidenceQueue.queueEsp32FrameClip({
          frames: capturedFrames,
          baseUrl,
          cameraSource: baseUrl,
          location: "ESP32-CAM monitoring",
          fps: queuedFps,
          clipIntervalMinutes: 5,
        });
        await refreshMonitorState();
        setEsp32Message(`${detail}${hint} Footage was saved on this phone and will sync when internet/backend access returns.`);
      } else {
        setEsp32Message(`${detail}${hint}`);
      }
    } finally {
      await Promise.all(
        capturedFrames.map((uri) =>
          FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => null)
        )
      );
      setEsp32Busy(false);
    }
  };

  const handleStartOfflineCapture = async () => {
    try {
      setControlBusy(true);
      setControlMessage("");
      await startMonitoring({
        sourceMode: "phone-offline",
        cameraSource: "offline-phone-camera",
        location: "Offline field monitoring",
        clipDurationSeconds: 12,
        clipIntervalMinutes: 5,
      });
      setControlMessage("Offline recorder started. Clips upload now if possible, otherwise they stay queued on this phone.");
    } catch (err) {
      setControlMessage(err?.message || "Unable to start offline recorder.");
    } finally {
      setControlBusy(false);
    }
  };

  const handleStopOfflineCapture = async () => {
    try {
      setControlBusy(true);
      setControlMessage("");
      await stopMonitoring();
      setControlMessage("Offline recorder stopped.");
      await loadMonitor({ showLoader: false });
    } catch (err) {
      setControlMessage(err?.message || "Unable to stop offline recorder.");
    } finally {
      setControlBusy(false);
    }
  };

  const handleSyncQueuedEvidence = async () => {
    try {
      setControlBusy(true);
      setControlMessage("");
      const result = await syncQueuedEvidence();
      setControlMessage(
        result.uploaded.length
          ? `Uploaded ${result.uploaded.length} queued clip${result.uploaded.length === 1 ? "" : "s"}.`
          : result.remaining
            ? "Queued clips are still waiting for backend/network access."
            : "No queued clips to sync."
      );
      await loadMonitor({ showLoader: false });
    } catch (err) {
      setControlMessage(err?.message || "Unable to sync queued clips.");
    } finally {
      setControlBusy(false);
    }
  };

  const deleteRecordedClip = async (clip) => {
    try {
      setDeletingClipId(clip.id);
      setEsp32Message("");
      await MonitorService.deleteMonitorClip(clip.id);
      setClips((items) => items.filter((item) => item.id !== clip.id));
      await loadMonitor({ showLoader: false });
      setEsp32Message(t("recordedFootageDeleted"));
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || t("deleteRecordedFootageFailed");
      setEsp32Message(detail);
    } finally {
      setDeletingClipId(null);
    }
  };

  const confirmDeleteRecordedClip = (clip) => {
    NativeAlert.alert(
      t("deleteFootageTitle"),
      t("deleteFootageMessage"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("deleteAction"),
          style: "destructive",
          onPress: () => deleteRecordedClip(clip),
        },
      ]
    );
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
            <SummaryCard theme={theme} label="Footage" value={String(clips.length)} />
            <SummaryCard theme={theme} label="Pending" value={String(pendingCount)} tone="warning" />
          </View>

          <Surface style={[styles.navCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={1}>
            <View style={styles.sectionTabs}>
              <Button
                compact
                mode={activeSection === "capture" ? "contained" : "text"}
                icon="record-circle-outline"
                onPress={() => setActiveSection("capture")}
                style={styles.sectionTab}
              >
                Capture
              </Button>
              <Button
                compact
                mode={activeSection === "footage" ? "contained" : "text"}
                icon="video-outline"
                onPress={() => setActiveSection("footage")}
                style={styles.sectionTab}
              >
                Footage
              </Button>
              <Button
                compact
                mode={activeSection === "alerts" ? "contained" : "text"}
                icon="shield-alert-outline"
                onPress={() => setActiveSection("alerts")}
                style={styles.sectionTab}
              >
                Alerts
              </Button>
            </View>
          </Surface>

          {activeSection === "capture" ? (
          <Surface style={[styles.controlCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={1}>
            <View style={styles.controlTop}>
              <View style={styles.sectionTitleBlock}>
                <Text style={[styles.controlTitle, { color: theme.colors.onSurface }]}>Evidence Capture</Text>
                <Text style={[styles.controlSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                  Record through the phone, then upload now or keep the footage queued until connection returns.
                </Text>
              </View>
              <Chip compact style={{ backgroundColor: queuedEvidenceCount ? theme.colors.errorContainer : esp32Status ? theme.colors.primaryContainer : theme.colors.surfaceVariant }} textStyle={{ color: queuedEvidenceCount ? theme.colors.error : esp32Status ? theme.colors.primary : theme.colors.onSurfaceVariant, fontWeight: "900" }}>
                {queuedEvidenceCount ? `${queuedEvidenceCount} queued` : esp32Status ? "ESP online" : "Not tested"}
              </Chip>
            </View>

            <TextInput
              mode="outlined"
              label="ESP32 IP or URL"
              value={esp32Input}
              onChangeText={setEsp32Input}
              placeholder="10.236.220.241"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={styles.esp32Input}
              left={<TextInput.Icon icon="ip-network-outline" />}
            />

            <View style={styles.controlMetaRow}>
              {esp32Status ? (
                <>
                <Chip compact style={{ backgroundColor: theme.colors.surfaceVariant }} textStyle={{ color: theme.colors.onSurfaceVariant, fontWeight: "800" }}>
                  {esp32Status.ip || esp32BaseUrl}
                </Chip>
                <Chip compact style={{ backgroundColor: esp32Status.isRecording ? theme.colors.errorContainer : theme.colors.primaryContainer }} textStyle={{ color: esp32Status.isRecording ? theme.colors.error : theme.colors.primary, fontWeight: "800" }}>
                  {esp32Status.isRecording ? "ESP recording" : "ESP idle"}
                </Chip>
                </>
              ) : null}
              <Chip compact style={{ backgroundColor: isMonitoring ? theme.colors.primaryContainer : theme.colors.surfaceVariant }} textStyle={{ color: isMonitoring ? theme.colors.primary : theme.colors.onSurfaceVariant, fontWeight: "800" }}>
                {isMonitoring ? "Phone fallback active" : captureState}
              </Chip>
              <Chip compact style={{ backgroundColor: queuedEvidenceCount ? theme.colors.errorContainer : theme.colors.surfaceVariant }} textStyle={{ color: queuedEvidenceCount ? theme.colors.error : theme.colors.onSurfaceVariant, fontWeight: "800" }}>
                {queuedEvidenceCount ? `${queuedEvidenceCount} in queue` : "Queue clear"}
              </Chip>
            </View>

            {(esp32Message || controlMessage || captureError) ? (
              <Text style={[styles.controlMessage, { color: captureError ? theme.colors.error : theme.colors.onSurfaceVariant }]}>
                {captureError || esp32Message || controlMessage}
              </Text>
            ) : null}

            <View style={styles.controlButtons}>
              <Button mode="contained" icon="radar" onPress={handleAutoFindEsp32} loading={esp32Busy} disabled={esp32Busy}>
                Auto Find
              </Button>
              <Button mode="outlined" icon="content-save-outline" onPress={handleSaveEsp32Address} loading={esp32Busy} disabled={esp32Busy}>
                Save/Test
              </Button>
              <Button mode="contained" icon="video-outline" onPress={handleBackendRecordEsp32} loading={esp32Busy} disabled={esp32Busy || (!esp32BaseUrl && !esp32Input.trim())}>
                Record Clip
              </Button>
              <Button
                mode="outlined"
                icon={isMonitoring ? "stop-circle-outline" : "record-circle-outline"}
                onPress={isMonitoring ? handleStopOfflineCapture : handleStartOfflineCapture}
                loading={controlBusy}
                disabled={controlBusy}
              >
                {isMonitoring ? "Stop Phone" : "Phone Fallback"}
              </Button>
              <Button
                mode="outlined"
                icon="cloud-upload-outline"
                onPress={handleSyncQueuedEvidence}
                loading={controlBusy && !isMonitoring}
                disabled={controlBusy || queuedEvidenceCount < 1}
              >
                Sync Queue
              </Button>
            </View>
          </Surface>
          ) : null}

          {activeSection === "footage" ? (
          <>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleBlock}>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Recorded Footage</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                {clips.length ? `${clips.length} saved clip${clips.length === 1 ? "" : "s"} from the backend recorder` : "Record a clip to verify the camera feed"}
              </Text>
            </View>
            <Chip compact style={{ backgroundColor: theme.colors.primaryContainer }} textStyle={{ color: theme.colors.primary, fontWeight: "800" }}>
              {clips.length}
            </Chip>
          </View>

          {clips.length ? (
            <View style={styles.boxGrid}>
              {clips.map((clip, index) => (
                <Surface
                  key={clip.id}
                  style={[
                    styles.boxCard,
                    { width: useBoxColumns ? "48.5%" : "100%", backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
                  ]}
                  elevation={index === 0 ? 2 : 1}
                >
                  <TouchableRipple onPress={() => openClipModal(clip)} borderRadius={22}>
                    <View style={styles.boxPressArea}>
                      <View style={styles.boxHeader}>
                        <Avatar.Icon size={42} icon={clip.hasAlert ? "alert-circle-outline" : "video-outline"} color={clip.hasAlert ? theme.colors.error : theme.colors.primary} style={{ backgroundColor: clip.hasAlert ? theme.colors.errorContainer : theme.colors.primaryContainer }} />
                        <View style={styles.alertTitleBlock}>
                          <Text numberOfLines={1} style={[styles.alertTitle, { color: theme.colors.onSurface }]}>{clip.videoFilename}</Text>
                          <Text numberOfLines={3} style={[styles.alertSummary, { color: theme.colors.onSurfaceVariant }]}>{clip.summary}</Text>
                        </View>
                      </View>

                      <View style={styles.boxMetaWrap}>
                        <Chip compact style={{ backgroundColor: clip.hasAlert ? theme.colors.errorContainer : theme.colors.primaryContainer }} textStyle={{ color: clip.hasAlert ? theme.colors.error : theme.colors.primary, fontWeight: "900" }}>
                          {clip.hasAlert ? "Alert" : "Saved"}
                        </Chip>
                        <Chip compact style={{ backgroundColor: theme.colors.surfaceVariant }} textStyle={{ color: theme.colors.onSurfaceVariant, fontWeight: "800" }}>
                          {clip.videoDuration}
                        </Chip>
                      </View>

                      <Text numberOfLines={2} style={[styles.boxMetaText, { color: theme.colors.onSurfaceVariant }]}>
                        {[clip.cameraSource, clip.recordedAt].filter(Boolean).join(" • ")}
                      </Text>
                    </View>
                  </TouchableRipple>
                  <View style={styles.boxActions}>
                    <Button compact mode="outlined" icon="play-circle-outline" onPress={() => openClipModal(clip)}>
                      Play
                    </Button>
                    <Button
                      compact
                      mode="text"
                      icon="delete-outline"
                      textColor={theme.colors.error}
                      loading={deletingClipId === clip.id}
                      disabled={Boolean(deletingClipId)}
                      onPress={() => confirmDeleteRecordedClip(clip)}
                    >
                      Delete
                    </Button>
                  </View>
                </Surface>
              ))}
            </View>
          ) : (
            <Surface style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={1}>
              <Avatar.Icon size={56} icon="video-outline" color={theme.colors.primary} style={{ backgroundColor: theme.colors.primaryContainer }} />
              <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>No footage recorded yet</Text>
              <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                Use Record Clip to save ESP32-CAM footage. Clips stay visible even when AI finds no violation.
              </Text>
            </Surface>
          )}
          </>
          ) : null}

          {activeSection === "alerts" ? (
          <>
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
            <View style={styles.boxGrid}>
              {visibleAlerts.map((alert, index) => (
                <Surface
                  key={alert.id}
                  style={[
                    styles.boxCard,
                    { width: useBoxColumns ? "48.5%" : "100%", backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
                  ]}
                  elevation={index === 0 ? 2 : 1}
                >
                  <TouchableRipple onPress={() => openAlertModal(alert)} borderRadius={22}>
                    <View style={styles.boxPressArea}>
                      <View style={styles.boxHeader}>
                        <Avatar.Icon size={42} icon="shield-alert-outline" color={getSeverityColor(alert.severity, theme)} style={{ backgroundColor: getSeverityBg(alert.severity, theme) }} />
                        <View style={styles.alertTitleBlock}>
                          <Text numberOfLines={2} style={[styles.alertTitle, { color: theme.colors.onSurface }]}>{alert.title}</Text>
                          <Text numberOfLines={3} style={[styles.alertSummary, { color: theme.colors.onSurfaceVariant }]}>{alert.summary}</Text>
                        </View>
                      </View>

                      <View style={styles.boxMetaWrap}>
                        <Chip compact style={{ backgroundColor: getSeverityBg(alert.severity, theme) }} textStyle={{ color: getSeverityColor(alert.severity, theme), fontWeight: "900" }}>
                          {alert.severity}
                        </Chip>
                        <Chip compact style={{ backgroundColor: theme.colors.surfaceVariant }} textStyle={{ color: theme.colors.onSurfaceVariant, fontWeight: "800" }}>
                          {alert.confidence}
                        </Chip>
                      </View>

                      <Text numberOfLines={2} style={[styles.boxMetaText, { color: theme.colors.onSurfaceVariant }]}>
                        {[alert.detectedActivity, alert.receivedAt].filter(Boolean).join(" • ")}
                      </Text>
                    </View>
                  </TouchableRipple>
                  <View style={styles.boxActions}>
                    <Button compact mode="outlined" icon="eye-outline" onPress={() => openAlertModal(alert)}>
                      View
                    </Button>
                  </View>
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
          </>
          ) : null}
        </ScrollView>
      )}

      <Portal>
        <Modal visible={isModalVisible} onDismiss={closeAlertModal} contentContainerStyle={styles.modalOuter}>
          <Surface style={[styles.modalCard, { width: modalWidth, maxHeight: modalMaxHeight, backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={5}>
            {selectedAlert && (
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Avatar.Icon size={52} icon={selectedAlert.severity === "Footage" ? "video-outline" : "alert"} style={{ backgroundColor: selectedAlert.severity === "Footage" ? theme.colors.primaryContainer : theme.colors.errorContainer }} color={selectedAlert.severity === "Footage" ? theme.colors.primary : theme.colors.error} />
                  <Chip compact style={{ backgroundColor: selectedAlert.severity === "Footage" ? theme.colors.primaryContainer : theme.colors.errorContainer }} textStyle={{ color: selectedAlert.severity === "Footage" ? theme.colors.primary : theme.colors.error, fontWeight: "800" }}>
                    {selectedAlert.severity === "Footage" ? "Recorded Footage" : "Camera Alert"}
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
    padding: 14,
    paddingBottom: 28,
  },
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statusCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
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
    fontSize: 18,
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
  controlCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  controlTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  controlTitle: {
    fontSize: 17,
    fontWeight: "900",
  },
  controlSubtitle: {
    marginTop: 4,
    lineHeight: 19,
  },
  esp32Input: {
    marginTop: 14,
  },
  controlMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  controlMessage: {
    marginTop: 12,
    lineHeight: 19,
    fontWeight: "700",
  },
  controlButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: "900",
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "800",
  },
  navCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 6,
    marginBottom: 12,
  },
  sectionTabs: {
    flexDirection: "row",
    gap: 6,
  },
  sectionTab: {
    flex: 1,
    borderRadius: 12,
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
    fontSize: 20,
    fontWeight: "900",
  },
  sectionSubtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  boxGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  boxCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  boxPressArea: {
    padding: 12,
  },
  boxHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  boxMetaWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  boxMetaText: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  boxActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  alertCard: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
  },
  alertPressArea: {
    padding: 14,
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
    fontSize: 16,
    lineHeight: 21,
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
