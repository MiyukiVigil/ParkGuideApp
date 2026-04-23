import React, { useCallback, useMemo, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Button, Surface, Text, TouchableRipple, useTheme } from "react-native-paper";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import AppHeader from "../components/AppHeader";
import ThemedBackground from "../components/ThemedBackground";
import { useScreenSpeech } from "../contexts/ScreenSpeechContext";
import * as AlertService from "../services/alertService";

const CAMERA_PRODUCT_NAME = "ESP32-CAM";

export default function Monitor() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraCheckStatus, setCameraCheckStatus] = useState("checking");
  const [cameraError, setCameraError] = useState(null);
  const [alertCount, setAlertCount] = useState(0);
  const tr = useCallback((key, fallback, options = {}) => t(key, { defaultValue: fallback, ...options }), [t]);
  const canUseCamera = Platform.OS !== "web";
  const cameraProductName = CAMERA_PRODUCT_NAME;
  const statusCheckLabel = useMemo(() => getCameraBottomStatusLabel(cameraCheckStatus, tr), [cameraCheckStatus, tr]);

  const runCameraModuleCheck = useCallback(async () => {
    setCameraError(null);
    if (!canUseCamera) {
      setCameraCheckStatus("unsupported");
      return;
    }
    setCameraCheckStatus("checking");
    if (permission?.granted) {
      return;
    }
    try {
      const result = await requestPermission();
      if (!result?.granted) {
        setCameraCheckStatus("permission");
      }
    } catch (err) {
      setCameraCheckStatus("failed");
      setCameraError(err?.message || tr("cameraModuleCheckError", "Unable to check the camera module."));
    }
  }, [canUseCamera, permission?.granted, requestPermission, tr]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const loadMonitorData = async () => {
        const alerts = await AlertService.fetchAlerts();
        if (isActive) setAlertCount(alerts.length);
      };
      runCameraModuleCheck();
      loadMonitorData();
      return () => {
        isActive = false;
      };
    }, [runCameraModuleCheck])
  );

  const handleOpenAlerts = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/alerts");
  };

  const handleCameraReady = () => {
    setCameraCheckStatus("passed");
    setCameraError(null);
  };

  const handleCameraMountError = (event) => {
    const message = event?.message || tr("cameraFeedError", "Camera feed could not be started.");
    setCameraCheckStatus("failed");
    setCameraError(message);
  };

  useScreenSpeech(
    [tr("tourMonitor", "Tour Monitor"), tr("cameraModuleTest", "Camera module test"), `${tr("camera", "Camera")}: ${cameraProductName}`, `${tr("statusCheck", "Status Check")}: ${statusCheckLabel}`].join(" "),
    { priority: 100 }
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ThemedBackground />

      <AppHeader title={tr("tourMonitor", "Tour Monitor")} subtitle={tr("cameraModuleTest", "Camera module test")} showBack showHome />

      <View style={styles.body}>
        <View style={styles.cameraStage}>
          {canUseCamera && permission?.granted ? (
            <CameraView style={StyleSheet.absoluteFillObject} facing="back" onCameraReady={handleCameraReady} onMountError={handleCameraMountError} />
          ) : (
            <View style={[styles.permissionPanel, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.permissionTitle, { color: theme.colors.onSurface }]}>
                {tr("cameraFeedInactive", "Camera feed is not active")}
              </Text>

              <Text style={[styles.permissionText, { color: theme.colors.onSurfaceVariant }]}>
                {cameraCheckStatus === "unsupported"
                  ? tr("cameraUnsupportedHelp", "Camera feed is not supported on this platform.")
                  : tr("cameraAccessHelp", "Grant camera access to check whether the camera module feed can start properly.")}
              </Text>

              {canUseCamera && (
                <Button mode="contained" onPress={runCameraModuleCheck} icon="camera" style={styles.permissionButton}>
                  {tr("enableCameraFeed", "Enable Camera Feed")}
                </Button>
              )}
            </View>
          )}
        </View>

        <Surface
          style={[
            styles.controlPanel,
            {
              paddingBottom: Math.max(insets.bottom + 12, 20),
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
          elevation={4}
        >
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>{t("monitorPreview")}</Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            {t("monitorPreviewDesc")}
          </Text>
        </Surface>
      </View>
    </View>
  );
}

function CompactStat({ theme, label, value, onPress }) {
  const content = (
    <View style={styles.compactStatInner}>
      <Text numberOfLines={1} style={[styles.compactStatValue, { color: theme.colors.onSurface }]}>{value}</Text>
      <Text numberOfLines={1} style={[styles.compactStatLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
    </View>
  );
  if (!onPress) {
    return <View style={styles.compactStat}>{content}</View>;
  }
  return (
    <TouchableRipple onPress={onPress} borderRadius={18} style={styles.compactStat}>
      {content}
    </TouchableRipple>
  );
}

function getCameraBottomStatusLabel(status, tr) {
  if (status === "passed") return tr("onlineStatus", "Online");
  if (status === "checking") return tr("checkingStatus", "Checking");
  if (status === "failed") return tr("issueStatus", "Issue");
  if (status === "unsupported") return tr("unsupportedStatus", "Unsupported");
  return tr("accessNeededStatus", "Access Needed");
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  body: {
    flex: 1,
    marginTop: 12,
  },
  cameraStage: {
    flex: 1,
    width: "100%",
    minHeight: 430,
    backgroundColor: "#000",
    overflow: "hidden",
    position: "relative",
  },
  permissionPanel: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  permissionText: {
    marginTop: 8,
    textAlign: "center",
    lineHeight: 21,
  },
  permissionButton: {
    marginTop: 18,
    borderRadius: 16,
  },
  controlPanel: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 14,
    paddingHorizontal: 16,
  },
  compactStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  compactStat: {
    flex: 1,
    borderRadius: 18,
    overflow: "hidden",
  },
  compactStatInner: {
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  compactStatValue: {
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  compactStatLabel: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  errorText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    textAlign: "center",
  },
});