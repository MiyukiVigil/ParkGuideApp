import React, { useRef, useEffect, useCallback, useState } from "react";
import { ScrollView, View, StyleSheet, Platform, useWindowDimensions, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, Avatar, Surface, TouchableRipple, IconButton, Chip, useTheme } from "react-native-paper";
import { useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import ThemedBackground from "../components/ThemedBackground";
import AnimatedHeaderBackground from "../components/AnimatedHeaderBackground";
import { useThemeContext } from "../contexts/ThemeContext";
import { useScreenSpeech } from "../contexts/ScreenSpeechContext";
import CONFIG, { getAvatarUrl } from "../constants/config";
import * as NotificationService from "../services/notificationService";
import courseService from "../services/courseService";
import { getProfile } from "../services/profileService";
import * as MonitorService from "../services/monitorService";

const withCacheBust = (url, version) => {
  if (!url) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${version}`;
};

const parseLocalizedValue = (value) => {
  if (!value || typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    try {
      const normalized = value.replace(/'/g, '"');
      return JSON.parse(normalized);
    } catch {
      return value;
    }
  }
};

const normalizeLanguageCode = (language) => {
  const normalized = String(language || "en").toLowerCase();
  if (normalized.startsWith("zh")) return "zh";
  if (normalized.startsWith("ms")) return "ms";
  if (normalized.startsWith("en")) return "en";
  return normalized.split("-")[0] || "en";
};

export default function Home() {
  const router = useRouter();
  const theme = useTheme();
  const themeContext = useThemeContext();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();

  const [trainingProgress, setTrainingProgress] = useState(0);
  const [remainingModules, setRemainingModules] = useState(0);
  const [completedModules, setCompletedModules] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentCourse, setCurrentCourse] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileImageVersion, setProfileImageVersion] = useState(Date.now());
  const [monitorStatus, setMonitorStatus] = useState(MonitorService.DEFAULT_MONITOR_STATUS);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.98)).current;
  const barAnim = useRef(new Animated.Value(0)).current;

  const isWeb = Platform.OS === "web";
  const contentWidth = isWeb && width > 1200 ? 900 : "100%";

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadProfile = async () => {
        try {
          const data = await getProfile();
          if (isActive) {
            setProfile(data);
            setProfileImageVersion(Date.now());
          }
        } catch (err) {
          console.log('Failed to load profile', err);
        }
      };

      const loadTrainingProgress = async () => {
        try {
          const enrollments = await courseService.getUserEnrollments();
          const rows = Array.isArray(enrollments) ? enrollments : (enrollments?.results || []);
          console.log('[home] User enrollments:', enrollments);
          
          // Set current course to first incomplete one, or first course overall
          const incompleteCourse = rows.find(e => e.status !== 'completed' && (e.progress_percentage || 0) < 100);
          const nextCourse = incompleteCourse || rows[0];
          
          // Parse course_title if it's a JSON string (handle both JSON and Python dict strings)
          const courseTitle = parseLocalizedValue(nextCourse?.course_title || nextCourse?.title);
          
          // Ensure course object has title 
          const courseToDisplay = nextCourse 
            ? { ...nextCourse, title: courseTitle || nextCourse.title } 
            : { title: t("noCourses") };
          setCurrentCourse(courseToDisplay);

          // Calculate overall progress across all enrolled courses
          const totalProgress = rows.length > 0
            ? rows.reduce((sum, e) => sum + (e.progress_percentage || 0), 0) / rows.length
            : 0;

          // Count courses not yet completed
          const remainingModules = rows.filter(e => e.status !== 'completed' && (e.progress_percentage || 0) < 100).length;

          setCompletedModules(rows.filter(e => e.status === 'completed' || (e.progress_percentage || 0) >= 100).map(e => e.id));
          setTrainingProgress(totalProgress / 100);
          setRemainingModules(remainingModules);
        } catch (err) {
          console.log("Failed to load progress", err);
          // Fallback: show no progress
          setCurrentCourse({ title: t("noCourses") });
          setTrainingProgress(0);
          setRemainingModules(0);
        }
      };

      loadProfile();
      loadTrainingProgress();

      return () => {
        isActive = false;
      };
    }, [t])
  );

  // Fetch unread notifications from backend
  useFocusEffect(
    useCallback(() => {
      const loadUnreadCount = async () => {
        try {
          const notifications = await NotificationService.fetchNotifications();
          const unread = notifications.filter((n) => !n.isRead).length;
          setUnreadCount(unread);
        } catch (err) {
          console.log("Failed to load unread count", err);
        }
      };
      loadUnreadCount();

      // Listen for real-time notification updates
      const unsubscribe = NotificationService.onNotificationUpdate((notification) => {
        // Refresh unread count when a new notification arrives
        loadUnreadCount();
      });

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }, [])
  );

  // Fetch tour monitor / camera module status
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadMonitorStatus = async () => {
        const status = await MonitorService.getMonitorStatus();

        if (isActive) {
          setMonitorStatus(status);
        }
      };

      loadMonitorStatus();

      const timer = setInterval(loadMonitorStatus, 15000);

      return () => {
        isActive = false;
        clearInterval(timer);
      };
    }, [])
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(heroScale, {
        toValue: 1,
        friction: 7,
        tension: 38,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, heroScale]);

  useEffect(() => {
    Animated.spring(barAnim, {
      toValue: trainingProgress,
      friction: 8,
      tension: 30,
      useNativeDriver: false,
    }).start();
  }, [trainingProgress, barAnim]);

  const getLocalizedTitle = (titleData) => {
    const language = normalizeLanguageCode(i18n.resolvedLanguage || i18n.language);
    if (!titleData) return t("untitledCourse");
    if (typeof titleData === "string") {
      const parsed = parseLocalizedValue(titleData);
      if (parsed && typeof parsed === "object") {
        return parsed[language] || parsed.en || parsed.ms || parsed.zh || t("untitledCourse");
      }

      return titleData;
    }
    if (typeof titleData === "object") {
      return titleData[language] || titleData.en || titleData.ms || titleData.zh || titleData.course_title || JSON.stringify(titleData);
    }
    return String(titleData);
  };

  useScreenSpeech(
    [
      t("todaysFocus"),
      currentCourse?.title ? `${t('training')}: ${getLocalizedTitle(currentCourse.title)}` : t('noCourses'),
      remainingModules > 0 ? `${remainingModules} ${t('modulesRemaining')}` : t('allCaughtUp'),
      unreadCount > 0 ? `${unreadCount} ${t('unread')} ${t('notifications')}` : t('noNotifications'),
    ].join(". "),
    { priority: 100 }
  );

  const completedCount = completedModules.length;
  const profileImageUri = profile?.profile_image_url
    ? withCacheBust(profile.profile_image_url, profileImageVersion)
    : getAvatarUrl(profile?.name || profile?.email || t("parkGuide"));

  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.screen}>
        <ThemedBackground />
      
      {/* Fixed Header Container - sticks to top */}
      <View style={styles.fixedHeaderContainer}>
        <AnimatedHeaderBackground />
        <Animated.View
          style={[
            styles.topBar,
            {
              opacity: fadeAnim,
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 10,
            },
          ]}
        >
          {/* Transparent header overlay - sits on top of animated header */}
          <View
            style={[
              styles.headerBackground,
              {
                backgroundColor: "transparent",
                width: "100%",
              },
            ]}
          >
          <TouchableRipple
            onPress={() => router.push("/account")}
            borderRadius={30}
            style={{ borderRadius: 30 }}
          >
            <Avatar.Image
              size={54}
              source={{
                uri: profileImageUri,
              }}
            />
          </TouchableRipple>

          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[styles.brandTop, { color: theme.colors.primary }]}>
              {t("sarawakForestry")}
            </Text>
            <Text
              variant="headlineSmall"
              style={[styles.nameText, { color: theme.colors.onSurface }]}
            >
              {profile?.name || t("parkGuide")}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {t("forestGuideOpsDashboard")}
            </Text>
          </View>

          <View>
            <IconButton
              icon="bell-badge-outline"
              iconColor={theme.colors.tertiary}
              size={28}
              onPress={() => router.push("/notification")}
            />
            {unreadCount > 0 && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: theme.colors.tertiary },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: theme.colors.onTertiary },
                  ]}
                >
                  {unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
      </View>

      <ScrollView
        style={[
          styles.container,
          {
            alignSelf: "center",
            width: contentWidth,
            marginTop: 150,
          },
        ]}
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom + 24, 44),
          flexGrow: 1,
        }}  
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: heroScale }] }}>
          <Surface
            style={[
              styles.mainFeature,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
            elevation={4}
          >
            <TouchableRipple
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.push("/courses");
              }}
              style={styles.cardRipple}
            >
              <View>
                <View style={styles.heroTopRow}>
                  <Chip
                    compact
                    style={{ backgroundColor: theme.colors.primaryContainer }}
                    textStyle={{ color: theme.colors.onPrimaryContainer, fontWeight: "800" }}
                  >
                    {t("inProgress").toUpperCase()}
                  </Chip>
                  <Text style={[styles.percentText, { color: theme.colors.tertiary }]}>
                    {Math.round(trainingProgress * 100)}%
                  </Text>
                </View>

                <Text variant="headlineSmall" style={[styles.featureTitle, { color: theme.colors.onSurface }]}>
                  {currentCourse ? getLocalizedTitle(currentCourse.title) : t("noCourses")}
                </Text>

                <Text style={[styles.featureSub, { color: theme.colors.onSurfaceVariant }]}>
                  {t("continueYourPath")}
                </Text>

                <View style={styles.progressMeta}>
                  <Text style={[styles.metaLabel, { color: theme.colors.onSurfaceVariant }]}>
                    {remainingModules} {t("modulesRemaining")}
                  </Text>
                  <Text style={[styles.metaLabel, { color: theme.colors.onSurfaceVariant }]}>
                    {t("courseCompletion")}
                  </Text>
                </View>

                <View
                  style={[
                    styles.customBarContainer,
                    { backgroundColor: theme.colors.surfaceVariant },
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.customBarFill,
                      {
                        width: barWidth,
                        backgroundColor: theme.colors.primary,
                      },
                    ]}
                  />
                </View>
              </View>
            </TouchableRipple>
          </Surface>
        </Animated.View>

        <View style={styles.statsRow}>
          <StatCard
            theme={theme}
            label={t("completed")}
            value={String(completedCount)}
            icon="check-circle-outline"
          />
          <StatCard
            theme={theme}
            label={t("remaining")}
            value={String(remainingModules)}
            icon="clock-outline"
          />
          <StatCard
            theme={theme}
            label={t("alerts")}
            value={String(unreadCount)}
            icon="bell-outline"
          />
        </View>

        <View style={styles.sectionRow}>
          <Text variant="titleMedium" style={[styles.sectionHeader, { color: theme.colors.onSurface }]}>
            {t("guideOperations")}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {t("quickAccess")}
          </Text>
        </View>

        <View style={styles.grid}>
          <OperationCard
            theme={theme}
            icon="book-open-variant"
            label={t("materials")}
            subtitle={t("forestResources")}
            onPress={() => router.push("/materials")}
          />
          <OperationCard
            theme={theme}
            icon="school"
            label={t("training")}
            subtitle={`${remainingModules} ${t("remaining")}`}
            progress={trainingProgress}
            onPress={() => router.push("/courses")}
          />
          <OperationCard
            theme={theme}
            icon="cube-scan"
            label={t("arTraining")}
            subtitle={t("immersiveTraining")}
            onPress={() => router.push("/ar-training")}
          />
          <OperationCard
            theme={theme}
            icon="certificate"
            label={t("badges")}
            subtitle={t("badgesEarned")}
            onPress={() => router.push("/cert")}
          />
          <OperationCard
            theme={theme}
            icon="map-marker-radius"
            label={t("map")}
            subtitle={t("mapDesc")}
            onPress={() => router.push("/map")}
          />
          <OperationCard
            theme={theme}
            icon="video-check"
            label={t("tourMonitor")}
            subtitle={
              monitorStatus.isLive? t("liveForestMonitor") : t("monitorOffline", { defaultValue: t("monitorOfflineDefault") })
            }
            status={monitorStatus.state}
            onPress={() => router.push("/monitor")}
          />
          <OperationCard
            theme={theme}
            icon="cog"
            label={t("settings")}
            subtitle={t("preferences")}
            onPress={() => router.push("/settings")}
          />
        </View>

        <Surface
          style={[
            styles.bottomPanel,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
          elevation={1}
        >
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: "900" }}>
            {t("todaysFocus")}
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, lineHeight: 22 }}>
            {t("todaysFocusDesc")}
          </Text>
        </Surface>
      </ScrollView>
    </View>
  );
}

function StatCard({ theme, label, value, icon }) {
  return (
    <Surface
      style={[
        styles.statCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
      elevation={1}
    >
      <Avatar.Icon
        size={40}
        icon={icon}
        color={theme.colors.tertiary}
        style={{ backgroundColor: theme.colors.primaryContainer }}
      />
      <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
    </Surface>
  );
}

function OperationCard({ icon, label, progress, subtitle, isLive, status, onPress, theme }) {
  const { t } = useTranslation();
  const statusPill = getOperationStatusConfig(status, isLive, theme, t);
  return (
    <Surface
      style={[
        styles.opCard,
        {
          width: "48%",
          height: 178,
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
      elevation={2}
    >
      <TouchableRipple
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={styles.ripple}
        borderRadius={30}
      >
        <View style={{ flex: 1, justifyContent: "space-between" }}>
          <View style={styles.cardTop}>
            <Avatar.Icon
              size={46}
              icon={icon}
              color={theme.colors.tertiary}
              style={{ backgroundColor: theme.colors.primaryContainer }}
            />
            {statusPill && (
              <View style={[styles.livePill, { backgroundColor: statusPill.backgroundColor }]}>
                <View style={[styles.liveDot, { backgroundColor: statusPill.dotColor }]} />
                <Text style={[styles.liveText, { color: statusPill.textColor }]}>
                  {statusPill.label}
                </Text>
              </View>
            )}
          </View>

          <View>
            <Text variant="titleMedium" style={[styles.cardLabel, { color: theme.colors.onSurface }]}>
              {label}
            </Text>
            <Text variant="bodySmall" style={[styles.cardSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              {subtitle}
            </Text>

            {progress !== undefined && (
              <View style={[styles.miniBarContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                <View
                  style={[
                    styles.miniBarFill,
                    {
                      width: `${progress * 100}%`,
                      backgroundColor: theme.colors.tertiary,
                    },
                  ]}
                />
              </View>
            )}
          </View>
        </View>
      </TouchableRipple>
    </Surface>
  );
}

function getOperationStatusConfig(status, isLive, theme, t) {
  if (!status && !isLive) {
    return null;
  }
  if (status === "live" || isLive) {
    return {
      label: t("liveLabel", { defaultValue: "LIVE" }),
      backgroundColor: theme.colors.primaryContainer,
      dotColor: theme.colors.tertiary,
      textColor: theme.colors.tertiary,
    };
  }
  if (status === "checking") {
    return {
      label: t("checkingLabel", { defaultValue: "CHECKING" }),
      backgroundColor: theme.colors.surfaceVariant,
      dotColor: theme.colors.primary,
      textColor: theme.colors.primary,
    };
  }
  if (status === "error") {
    return {
      label: t("errorLabel", { defaultValue: "ERROR" }),
      backgroundColor: theme.colors.errorContainer,
      dotColor: theme.colors.error,
      textColor: theme.colors.error,
    };
  }
  return {
    label: t("offlineLabel", { defaultValue: "OFFLINE" }),
    backgroundColor: theme.colors.surfaceVariant,
    dotColor: theme.colors.onSurfaceVariant,
    textColor: theme.colors.onSurfaceVariant,
  };
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fixedHeaderContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    height: 150,
    width: "100%",
  },
  container: { flex: 1, paddingHorizontal: 22, marginTop: 150 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 0,
    paddingHorizontal: 0,
    width: "100%",
  },
  headerBackground: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 0,
    paddingBottom: 18,
    paddingHorizontal: 22,
    borderRadius: 0,
  },
  brandTop: {
    fontWeight: "900",
    letterSpacing: 1.5,
    fontSize: 12,
  },
  nameText: {
    fontWeight: "900",
    marginTop: -2,
  },
  badge: {
    position: "absolute",
    top: 10,
    right: 8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "900",
  },
  mainFeature: {
    borderRadius: 34,
    marginBottom: 20,
    overflow: "hidden",
    borderWidth: 1,
  },
  cardRipple: {
    padding: 26,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  featureTitle: {
    fontWeight: "900",
    marginTop: 18,
    fontSize: 28,
    lineHeight: 34,
  },
  featureSub: {
    marginTop: 10,
    lineHeight: 22,
  },
  progressMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 12,
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  percentText: {
    fontWeight: "900",
    fontSize: 26,
  },
  customBarContainer: {
    height: 14,
    borderRadius: 7,
    overflow: "hidden",
  },
  customBarFill: {
    height: "100%",
    borderRadius: 7,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statCard: {
    width: "31%",
    borderWidth: 1,
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  statValue: {
    marginTop: 10,
    fontSize: 24,
    fontWeight: "900",
  },
  statLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  sectionHeader: {
    fontWeight: "900",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  opCard: {
    borderRadius: 30,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  ripple: {
    flex: 1,
    padding: 18,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardLabel: {
    fontWeight: "800",
  },
  cardSubtitle: {
    marginTop: 4,
  },
  miniBarContainer: {
    height: 7,
    borderRadius: 6,
    marginTop: 12,
    overflow: "hidden",
  },
  miniBarFill: {
    height: "100%",
    borderRadius: 6,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  liveText: {
    fontSize: 11,
    fontWeight: "900",
  },
  bottomPanel: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
    marginTop: 8,
  },
});
