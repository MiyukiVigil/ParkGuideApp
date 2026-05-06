import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Linking,
} from "react-native";
import {
  Text,
  Surface,
  useTheme,
  ActivityIndicator,
  Button,
  Chip,
  List,
} from "react-native-paper";

import AppHeader from "../components/AppHeader";
import ThemedBackground from "../components/ThemedBackground";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function Monitor() {
  const theme = useTheme();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadMonitorData();

    const interval = setInterval(() => {
      loadMonitorData(false);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadMonitorData = async (showLoader = true) => {
    try {
      if (showLoader) {
        setIsLoading(true);
      }

      setError("");

      const response = await fetch(`${API_BASE_URL}/api/ranger-eye/dashboard-data/`);

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const json = await response.json();
      setData(json);
    } catch (err) {
      console.log("Monitor data error:", err);
      setError(err.message || "Failed to load monitor data.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadMonitorData(false);
  };

  const deleteRecording = async (recordingId) => {
    const confirmed =
      typeof window !== "undefined" && window.confirm
        ? window.confirm("Delete this evidence clip?")
        : true;

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/ranger-eye/recordings/${recordingId}/delete/`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status}`);
      }

      await loadMonitorData(false);
    } catch (err) {
      console.log("delete recording error:", err);
      if (typeof window !== "undefined" && window.alert) {
        window.alert(err.message || "Failed to delete evidence clip.");
      }
    }
  };

  const openUrl = async (url) => {
    if (!url) return;

    const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;

    try {
      await Linking.openURL(fullUrl);
    } catch (err) {
      console.log("open url error:", err);
    }
  };

  const recordingStatus = data?.recording_status;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ThemedBackground />
      <AppHeader title="RangerEye" subtitle="IoT monitoring and evidence" showBack showHome />

      {isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
            Loading monitor data...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        >
          <Surface
            style={[
              styles.heroCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
            elevation={2}
          >
            <View style={styles.heroTop}>
              <View>
                <Text style={[styles.heroTitle, { color: theme.colors.onSurface }]}>
                  RangerEye Monitoring
                </Text>
                <Text
                  style={[
                    styles.heroSubtitle,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Sensor alerts, evidence photos, and recorded field clips from RangerEye devices.
                </Text>
              </View>

              <Chip
                style={{ backgroundColor: "rgba(214,179,106,0.16)" }}
                textStyle={{ color: "#D6B36A", fontWeight: "700" }}
              >
                Verified access
              </Chip>
            </View>

            {error ? (
              <Text style={{ color: theme.colors.error, marginTop: 12 }}>
                {error}
              </Text>
            ) : null}
          </Surface>

          <View style={styles.grid}>
            <Surface
              style={[
                styles.panel,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
              elevation={1}
            >
              <Text style={[styles.panelTitle, { color: theme.colors.onSurface }]}>
                Scheduled Video Recorder
              </Text>

              <StatCard
                label="Recorder Status"
                value={recordingStatus?.running ? "Recording" : "Waiting"}
                valueColor={recordingStatus?.running ? "#8ED1A3" : "#D6B36A"}
                theme={theme}
              />

              <StatCard
                label="Saved Videos"
                value={String(data?.recording_count ?? 0)}
                valueColor="#D6B36A"
                theme={theme}
              />

              <StatCard
                label="Latest Recording"
                value={recordingStatus?.last_recording || "None yet"}
                theme={theme}
              />

              <StatCard
                label="Next Recording"
                value={recordingStatus?.next_recording || "Starting soon"}
                theme={theme}
              />

              <Text style={[styles.note, { color: theme.colors.onSurfaceVariant }]}>
                The backend receives sensor alerts and stores MP4 evidence clips
                from the ESP32-CAM recorder.
              </Text>

              <Button
                mode="contained"
                onPress={handleRefresh}
                style={styles.actionButton}
              >
                Refresh Dashboard
              </Button>
            </Surface>

            <Surface
              style={[
                styles.panel,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
              elevation={1}
            >
              <Text style={[styles.panelTitle, { color: theme.colors.onSurface }]}>
                System Summary
              </Text>

              <StatCard
                label="Total Alerts"
                value={String(data?.total_alerts ?? 0)}
                valueColor="#D6B36A"
                theme={theme}
              />

              <StatCard
                label="Pending Review"
                value={String(data?.pending_count ?? 0)}
                valueColor="#FFB4AB"
                theme={theme}
              />

              <StatCard
                label="Button Evidence Photos"
                value={String(data?.evidence_count ?? 0)}
                valueColor="#8ED1A3"
                theme={theme}
              />

              <Text style={[styles.note, { color: theme.colors.onSurfaceVariant }]}>
                Inputs: ESP32-CAM button, soil moisture sensor, sound sensor,
                MPU6050 tilt/shake detection, and theft alarm.
              </Text>
            </Surface>
          </View>

          <SectionTitle title="Recent Alerts" subtitle="Auto-updating alerts" theme={theme} />

          {data?.alerts?.length ? (
            data.alerts.map((alert) => (
              <Surface
                key={alert.id || alert.alert_id}
                style={[
                  styles.alertCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
                elevation={1}
              >
                <View style={styles.cardHeaderRow}>
                  <Text style={[styles.alertTitle, { color: theme.colors.onSurface }]}>
                    {alert.event_type}
                  </Text>

                  <Chip
                    compact
                    style={{ backgroundColor: "rgba(255,180,171,0.16)" }}
                    textStyle={{ color: "#FFB4AB", fontWeight: "700" }}
                  >
                    {alert.status}
                  </Chip>
                </View>

                <List.Item
                  title="Alert ID"
                  description={alert.alert_id}
                  left={(props) => <List.Icon {...props} icon="identifier" />}
                  titleStyle={{ color: theme.colors.onSurface, fontWeight: "700" }}
                  descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                />

                <List.Item
                  title="Time"
                  description={alert.time}
                  left={(props) => <List.Icon {...props} icon="clock-outline" />}
                  titleStyle={{ color: theme.colors.onSurface, fontWeight: "700" }}
                  descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                />

                <List.Item
                  title="Location"
                  description={alert.location || "Unknown"}
                  left={(props) => <List.Icon {...props} icon="map-marker-outline" />}
                  titleStyle={{ color: theme.colors.onSurface, fontWeight: "700" }}
                  descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                />

                <List.Item
                  title="Device"
                  description={`${alert.source || "Unknown source"} • ${
                    alert.device_id || "Unknown device"
                  }`}
                  left={(props) => <List.Icon {...props} icon="access-point" />}
                  titleStyle={{ color: theme.colors.onSurface, fontWeight: "700" }}
                  descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                />

                {alert.message ? (
                  <Text
                    style={[
                      styles.messageText,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {alert.message}
                  </Text>
                ) : null}

                {alert.image_url ? (
                  <Button
                    mode="outlined"
                    onPress={() => openUrl(alert.image_url)}
                    style={styles.smallButton}
                  >
                    Open Evidence Image
                  </Button>
                ) : null}
              </Surface>
            ))
          ) : (
            <EmptyCard text="No alerts received yet." theme={theme} />
          )}

          <SectionTitle
            title="Latest Evidence Clips"
            subtitle="Auto-updating clip list"
            theme={theme}
          />

          {data?.recordings?.length ? (
            data.recordings.map((recording) => (
              <Surface
                key={recording.id || recording.filename}
                style={[
                  styles.alertCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
                elevation={1}
              >
                <Text style={[styles.alertTitle, { color: theme.colors.onSurface }]}>
                  {recording.filename}
                </Text>

                <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                  Time: {recording.time}
                </Text>

                <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  Duration: {recording.duration} seconds
                </Text>

                <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  Source: {recording.source}
                </Text>

                <View style={styles.videoButtonRow}>
                  {recording.video_url ? (
                    <Button
                      mode="contained"
                      onPress={() => openUrl(recording.video_url)}
                      style={styles.smallButton}
                    >
                      Open Video
                    </Button>
                  ) : null}

                  <Button
                    mode="outlined"
                    onPress={() => deleteRecording(recording.id)}
                    style={styles.smallButton}
                    textColor={theme.colors.error}
                  >
                    Delete Video
                  </Button>
                </View>
              </Surface>
            ))
          ) : (
            <EmptyCard text="No evidence clips recorded yet." theme={theme} />
          )}
        </ScrollView>
      )}
    </View>
  );
}

function StatCard({ label, value, valueColor, theme }) {
  return (
    <View
      style={[
        styles.statCard,
        {
          borderColor: theme.colors.outlineVariant,
          backgroundColor: "rgba(255,255,255,0.03)",
        },
      ]}
    >
      <Text
        style={[
          styles.statValue,
          {
            color: valueColor || theme.colors.onSurface,
          },
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
        {label}
      </Text>
    </View>
  );
}

function SectionTitle({ title, subtitle, theme }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
        {title}
      </Text>

      <Chip
        compact
        style={{ backgroundColor: "rgba(46,125,90,0.20)" }}
        textStyle={{ color: "#8ED1A3", fontWeight: "700" }}
      >
        {subtitle}
      </Chip>
    </View>
  );
}

function EmptyCard({ text, theme }) {
  return (
    <Surface
      style={[
        styles.emptyCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
      elevation={1}
    >
      <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }}>
        {text}
      </Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 22,
    marginBottom: 18,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    alignItems: "center",
    flexWrap: "wrap",
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "900",
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 14,
  },
  grid: {
    flexDirection: "row",
    gap: 18,
    flexWrap: "wrap",
  },
  panel: {
    flex: 1,
    minWidth: 320,
    borderRadius: 26,
    borderWidth: 1,
    padding: 20,
    marginBottom: 18,
  },
  panelTitle: {
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 14,
  },
  statCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  statValue: {
    fontSize: 26,
    fontWeight: "900",
  },
  statLabel: {
    marginTop: 6,
    fontSize: 13,
  },
  note: {
    marginTop: 8,
    lineHeight: 20,
  },
  actionButton: {
    marginTop: 16,
    borderRadius: 16,
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "900",
  },
  alertCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: "900",
    flexShrink: 1,
  },
  messageText: {
    marginTop: 8,
    lineHeight: 20,
  },
  smallButton: {
    marginTop: 14,
    alignSelf: "flex-start",
    borderRadius: 14,
  },
  emptyCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 24,
    marginBottom: 18,
  },
  videoButtonRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 8,
  },
});