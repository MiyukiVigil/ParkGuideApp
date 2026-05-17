import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, AppState, Platform, StyleSheet, View } from "react-native";
import { Button, IconButton, Surface, Text, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import AppHeader from "../components/AppHeader";
import { getProfile } from "../services/profileService";
import { isGuideWorkLocationSharingEnabled, startGuideWorkLocationSharing, stopGuideWorkLocationSharing } from "../services/guideLocationTrackingService";
import api from "../utils/api";
import { useScreenSpeech } from "../contexts/ScreenSpeechContext";

const DEFAULT_REGION = {
  latitude: 1.5533,
  longitude: 110.3592,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const getMapComponents = () => {
  if (Platform.OS === "web") {
    return {};
  }

  const maps = require("react-native-maps");
  return {
    MapView: maps.default,
    Marker: maps.Marker,
    Callout: maps.Callout,
    PROVIDER_GOOGLE: maps.PROVIDER_GOOGLE,
  };
};

const getGuideList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.guides)) return payload.guides;
  if (Array.isArray(payload?.locations)) return payload.locations;
  return [];
};

const normalizeGuide = (guide, index) => {
  const latitude = Number(guide.latitude ?? guide.lat);
  const longitude = Number(guide.longitude ?? guide.lng ?? guide.lon);
  const userId = guide.user_id ?? guide.guide_id ?? guide.id;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    id: userId ?? `${latitude}-${longitude}-${index}`,
    locationId: guide.location_id ?? guide.locationId ?? guide.id,
    name: guide.name ?? guide.guide_name ?? guide.full_name ?? guide.username ?? "Park Guide",
    latitude,
    longitude,
    lastSeen: guide.last_seen ?? guide.updated_at ?? guide.timestamp,
  };
};

const spreadOverlappingGuides = (guides) => {
  const seen = new Map();
  return guides.map((guide) => {
    const key = `${guide.latitude.toFixed(6)},${guide.longitude.toFixed(6)}`;
    const indexAtPoint = seen.get(key) || 0;
    seen.set(key, indexAtPoint + 1);
    if (indexAtPoint === 0) {
      return {
        ...guide,
        markerLatitude: guide.latitude,
        markerLongitude: guide.longitude,
      };
    }
    const offset = 0.00012;
    const angle = indexAtPoint * (Math.PI / 4);
    return {
      ...guide,
      markerLatitude: guide.latitude + Math.sin(angle) * offset,
      markerLongitude: guide.longitude + Math.cos(angle) * offset,
    };
  });
};

const formatLastUpdated = (value) => {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
};

const getGuideInitials = (name) => {
  const text = String(name || "").trim();
  if (!text) return "PG";

  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
};

export default function GuideMap() {
  const theme = useTheme();
  const { t } = useTranslation();
  const mapRef = useRef(null);
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [locationStatus, setLocationStatus] = useState("");
  const [workTrackingEnabled, setWorkTrackingEnabled] = useState(false);
  const [locationAction, setLocationAction] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const guideCount = guides.length;
  const locationActionPending = locationAction !== null;
  useScreenSpeech(
    [
      t("map"),
      t("mapDesc"),
      guideCount > 0 ? `${guideCount} active guide${guideCount === 1 ? "" : "s"} on the map` : "No guide locations are available right now.",
      locationStatus,
      error,
      lastUpdatedAt ? `Last updated at ${formatLastUpdated(lastUpdatedAt)}` : "",
    ]
      .filter(Boolean)
      .join(". "),
    { priority: 100 }
  );

  const { MapView, Marker, Callout, PROVIDER_GOOGLE } = useMemo(getMapComponents, []);

  const loadGuideLocations = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await api.get("/accounts/guides/locations/");
      const nextGuides = getGuideList(response.data).map(normalizeGuide).filter(Boolean);

      console.log(
        "[map] guides payload",
        nextGuides.map((guide) => ({
          id: guide.id,
          name: guide.name,
          latitude: guide.latitude,
          longitude: guide.longitude,
        }))
      );

      setGuides(nextGuides);
      setLastUpdatedAt(new Date().toISOString());
      setError("");
    } catch (err) {
      console.log("Failed to load guide locations", err.response?.data || err.message || err);
      setError("Guide locations are not available yet.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleStartWorkTracking = useCallback(async () => {
    if (locationActionPending) return;
    setLocationAction("start");
    try {
      await startGuideWorkLocationSharing();
      setWorkTrackingEnabled(true);
      setLocationStatus("Work location sharing is active.");
      await loadGuideLocations({ silent: true });
    } catch (err) {
      console.log("Failed to start work location sharing:", err.message || err);
      setWorkTrackingEnabled(false);
      setLocationStatus("Unable to start work location sharing. Please check location permissions.");
    } finally {
      setLocationAction(null);
    }
  }, [loadGuideLocations, locationActionPending]);

  const handleStopWorkTracking = useCallback(async () => {
    if (locationActionPending) return;
    setLocationAction("stop");
    try {
      await stopGuideWorkLocationSharing();
      setWorkTrackingEnabled(false);
      setLocationStatus("Work location sharing is disabled.");
      setGuides((previousGuides) =>
        currentUserId === null
          ? previousGuides
          : previousGuides.filter((guide) => String(guide.id) !== String(currentUserId))
      );
      await loadGuideLocations({ silent: true });
    } catch (err) {
      console.log("Failed to stop work location sharing:", err.message || err);
      const enabled = await isGuideWorkLocationSharingEnabled();
      setWorkTrackingEnabled(enabled);
      setLocationStatus(
        enabled
          ? "Unable to stop work location sharing."
          : "Work location sharing stopped, but your last location could not be removed from the map."
      );
      await loadGuideLocations({ silent: true });
    } finally {
      setLocationAction(null);
    }
  }, [currentUserId, loadGuideLocations, locationActionPending]);

  useEffect(() => {
    let isMounted = true;
    const refreshTrackingState = async () => {
      const enabled = await isGuideWorkLocationSharingEnabled();
      if (isMounted) {
        setWorkTrackingEnabled(enabled);
        setLocationStatus(
          enabled
            ? "Work location sharing is active."
            : "Work location sharing is disabled."
        );
      }
    };
    const loadInitialMapState = async () => {
      const profile = await getProfile();
      if (isMounted) {
        setCurrentUserId(profile?.id ?? null);
      }
      await refreshTrackingState();
      await loadGuideLocations();
    };
    loadInitialMapState();
    const appStateSubscription = AppState.addEventListener("change", async (state) => {
      if (state === "active") {
        await refreshTrackingState();
        await loadGuideLocations({ silent: true });
      }
    });
    const intervalId = setInterval(() => {
      loadGuideLocations({ silent: true });
    }, 30000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
      appStateSubscription.remove();
    };
  }, [loadGuideLocations]);

  useEffect(() => {
    if (!mapRef.current || guides.length === 0) return;

    const timer = setTimeout(() => {
      if (guides.length === 1) {
        mapRef.current.animateToRegion(
          {
            latitude: guides[0].latitude,
            longitude: guides[0].longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          },
          300
        );
        return;
      }

      mapRef.current.fitToCoordinates(
        guides.map((guide) => ({
          latitude: guide.latitude,
          longitude: guide.longitude,
        })),
        {
          edgePadding: { top: 80, right: 80, bottom: 160, left: 80 },
          animated: true,
        }
      );
    }, 200);

    return () => clearTimeout(timer);
  }, [guides]);

  const region =
    guides.length > 0
      ? {
          latitude: guides[0].latitude,
          longitude: guides[0].longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }
      : DEFAULT_REGION;

  const renderableGuides = useMemo(() => spreadOverlappingGuides(guides), [guides]);

  const recenterMap = useCallback(() => {
    if (!mapRef.current) return;

    if (renderableGuides.length > 1) {
      mapRef.current.fitToCoordinates(
        renderableGuides.map((guide) => ({
          latitude: guide.latitude,
          longitude: guide.longitude,
        })),
        {
          edgePadding: { top: 80, right: 80, bottom: 160, left: 80 },
          animated: true,
        }
      );
      return;
    }

    if (renderableGuides.length === 1) {
      mapRef.current.animateToRegion(
        {
          latitude: renderableGuides[0].latitude,
          longitude: renderableGuides[0].longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        300
      );
      return;
    }

    mapRef.current.animateToRegion(DEFAULT_REGION, 300);
  }, [renderableGuides]);

  if (Platform.OS === "web" || !MapView) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}> 
        <AppHeader title={t("map")} subtitle={t("mapDesc")} showBack showHome />
        <View style={styles.content}>
          <Surface
            style={[
              styles.messageCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
            elevation={1}
          >
            <Text style={[styles.messageTitle, { color: theme.colors.onSurface }]}> 
              Embedded map preview is available on Android or iOS.
            </Text>
            <Text style={[styles.messageBody, { color: theme.colors.onSurfaceVariant }]}> 
              Run the app on a phone or emulator to view guide locations without opening Google Maps.
            </Text>
          </Surface>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}> 
      <AppHeader title={t("map")} subtitle={t("mapDesc")} showBack showHome />

      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
          initialRegion={region}
          showsUserLocation={false}
          showsMyLocationButton={Platform.OS === "android"}
        >
          {Marker && renderableGuides.map((guide) => {
            const isCurrentUser =
              currentUserId !== null && String(guide.id) === String(currentUserId);
            const initials = getGuideInitials(guide.name);

            return (
              <Marker
                key={guide.id}
                coordinate={{ latitude: guide.markerLatitude, longitude: guide.markerLongitude }}
                title={isCurrentUser ? "You" : guide.name}
                description={guide.lastSeen ? `Last seen ${formatLastUpdated(guide.lastSeen)}` : "Live location"}
                tracksViewChanges={false}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View
                  collapsable={false}
                  style={[
                    styles.avatarMarker,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: isCurrentUser ? theme.colors.tertiary : theme.colors.primary,
                    },
                  ]}
                >
                  <Text style={[styles.avatarInitials, { color: isCurrentUser ? theme.colors.tertiary : theme.colors.primary }]}>
                    {initials}
                  </Text>
                </View>

                <Callout tooltip>
                  <View
                    style={[
                      styles.calloutCard,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.outlineVariant,
                      },
                    ]}
                  >
                      <View style={[styles.calloutAvatar, { backgroundColor: isCurrentUser ? theme.colors.tertiaryContainer : theme.colors.primaryContainer }]}> 
                        <Text style={[styles.calloutAvatarText, { color: theme.colors.onPrimaryContainer }]}>
                          {initials}
                        </Text>
                      </View>
                    <View style={styles.calloutText}>
                      <Text style={[styles.calloutTitle, { color: theme.colors.onSurface }]}> 
                        {isCurrentUser ? "You" : guide.name}
                      </Text>
                      <Text style={[styles.calloutSubtitle, { color: theme.colors.onSurfaceVariant }]}> 
                        {guide.lastSeen ? `Last seen ${formatLastUpdated(guide.lastSeen)}` : "Live location"}
                      </Text>
                    </View>
                  </View>
                </Callout>
              </Marker>
            );
          })}
        </MapView>

        <View style={styles.overlay}>
          <Surface
            style={[
              styles.statusCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
            elevation={2}
          >
            <View style={styles.statusText}>
              <Text style={[styles.statusTitle, { color: theme.colors.onSurface }]}> 
                {loading ? "Loading guides" : `${guides.length} guides visible`}
              </Text>
              {!!lastUpdatedAt && !loading && (
                <Text style={[styles.statusBody, { color: theme.colors.onSurfaceVariant }]}> 
                  Updated {formatLastUpdated(lastUpdatedAt)}
                </Text>
              )}
              {!!locationStatus && (
                <Text style={[styles.statusBody, { color: theme.colors.onSurfaceVariant }]}> 
                  {locationStatus}
                </Text>
              )}
              {!!error && !locationStatus && (
                <Text style={[styles.statusBody, { color: theme.colors.onSurfaceVariant }]}> 
                  {error}
                </Text>
              )}
              {!error && !locationStatus && !loading && guides.length === 0 && (
                <Text style={[styles.statusBody, { color: theme.colors.onSurfaceVariant }]}> 
                  No live guide coordinates found.
                </Text>
              )}
            </View>

            <View style={styles.statusActions}>
              <IconButton icon="crosshairs-gps" size={22} iconColor={theme.colors.primary} onPress={recenterMap}/>

              <Button
                mode={workTrackingEnabled ? "contained-tonal" : "contained"}
                compact
                disabled={loading || refreshing || locationActionPending}
                loading={locationActionPending}
                icon={workTrackingEnabled ? "map-marker-off" : "map-marker-check"}
                onPress={workTrackingEnabled ? handleStopWorkTracking : handleStartWorkTracking}
              >
                {locationAction === "start" ? "Starting" : locationAction === "stop" ? "Stopping" : workTrackingEnabled ? "Stop" : "Start"}
              </Button>

              {loading || refreshing ? (
                <ActivityIndicator color={theme.colors.primary} />
              ) : (
                <IconButton
                  icon="refresh"
                  mode="contained-tonal"
                  disabled={locationActionPending}
                  onPress={async () => {
                    setRefreshing(true);
                    try {
                      await loadGuideLocations({ silent: true });
                    } finally {
                      setRefreshing(false);
                    }
                  }}
                />
              )}
            </View>
          </Surface>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  mapWrap: {
    flex: 1,
    marginHorizontal: 14,
    marginBottom: 14,
  },
  map: {
    flex: 1,
  },
  avatarMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 12,
    fontWeight: "900",
  },
  overlay: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
  },
  statusCard: {
    minHeight: 76,
    borderRadius: 18,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    flex: 1,
  },
  statusActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  statusBody: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
  },
  messageCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  messageTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  messageBody: {
    marginTop: 8,
    lineHeight: 22,
  },
  calloutCard: {
    minWidth: 160,
    maxWidth: 220,
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  calloutAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  calloutAvatarText: {
    fontSize: 12,
    fontWeight: "900",
  },
  calloutText: {
    flex: 1,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  calloutSubtitle: {
    marginTop: 2,
    fontSize: 12,
  },
});
