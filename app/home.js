import React, { useRef, useEffect, useCallback, useState } from "react";
import { ScrollView, View, StyleSheet, Platform, useWindowDimensions, Animated } from "react-native";
import { Text, Avatar, Surface, TouchableRipple, IconButton, Chip, useTheme } from "react-native-paper";
import { useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { getCompletedModules } from "../utils/progressSync";
import { TRAINING_COURSES } from "../constants/courses";
import ThemedBackground from "../components/ThemedBackground";

export default function Home() {
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { t, i18n } = useTranslation();

  const [trainingProgress, setTrainingProgress] = useState(0);
  const [remainingModules, setRemainingModules] = useState(0);
  const [completedModules, setCompletedModules] = useState([]);
  const [unreadCount] = useState(2);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.98)).current;
  const barAnim = useRef(new Animated.Value(0)).current;

  const isWeb = Platform.OS === "web";
  const contentWidth = isWeb && width > 1200 ? 900 : "100%";

  useFocusEffect(
    useCallback(() => {
      const loadTrainingProgress = async () => {
        try {
          const completed = await getCompletedModules(); // Use progressSync for backend-first fetch

          const current =
            TRAINING_COURSES.find((course) =>
              course.modules.some((mod) => !completed.includes(mod.id))
            ) || TRAINING_COURSES[TRAINING_COURSES.length - 1];

          const completedInCourse = current.modules.filter((mod) =>
            completed.includes(mod.id)
          ).length;

          const currentCourseProgress = completedInCourse / current.modules.length;

          const totalIncomplete = TRAINING_COURSES.reduce((acc, course) => {
            return acc + course.modules.filter((m) => !completed.includes(m.id)).length;
          }, 0);

          setCompletedModules(completed);
          setTrainingProgress(currentCourseProgress);
          setRemainingModules(totalIncomplete);
        } catch (err) {
          console.log("Failed to load progress", err);
        }
      };

      loadTrainingProgress();
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

  const currentCourse =
    TRAINING_COURSES.find((course) =>
      course.modules.some((mod) => !completedModules.includes(mod.id))
    ) || TRAINING_COURSES[TRAINING_COURSES.length - 1];

  const getLocalizedTitle = (titleData) => {
    if (typeof titleData === "string") return titleData;
    return titleData[i18n.language] || titleData.en || "Untitled Course";
  };

  const completedCount = completedModules.length;

  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ThemedBackground />

      <Animated.View
        style={[
          styles.topBar,
          {
            opacity: fadeAnim,
            alignSelf: "center",
            width: contentWidth,
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
            source={{ uri: "https://api.dicebear.com/7.x/avataaars/png?seed=Miyuki" }}
          />
        </TouchableRipple>

        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={[styles.brandTop, { color: theme.colors.primary }]}>
            SARAWAK FORESTRY
          </Text>
          <Text variant="headlineSmall" style={[styles.nameText, { color: theme.colors.onSurface }]}>
            Miyuki Vigil
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Forest guide operations dashboard
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
            <View style={[styles.badge, { backgroundColor: theme.colors.tertiary }]}>
              <Text style={[styles.badgeText, { color: theme.colors.onTertiary }]}>
                {unreadCount}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>

      <ScrollView
        style={[
          styles.container,
          {
            alignSelf: "center",
            width: contentWidth,
            backgroundColor: theme.colors.background,
          },
        ]}
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: 40,
          flexGrow: 1,
          backgroundColor: theme.colors.background,
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
                router.push("/training");
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
                  {getLocalizedTitle(currentCourse.title)}
                </Text>

                <Text style={[styles.featureSub, { color: theme.colors.onSurfaceVariant }]}>
                  Continue your current eco-guide learning path and keep your certification progress on track.
                </Text>

                <View style={styles.progressMeta}>
                  <Text style={[styles.metaLabel, { color: theme.colors.onSurfaceVariant }]}>
                    {remainingModules} modules remaining
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
            label="Completed"
            value={String(completedCount)}
            icon="check-circle-outline"
          />
          <StatCard
            theme={theme}
            label="Remaining"
            value={String(remainingModules)}
            icon="clock-outline"
          />
          <StatCard
            theme={theme}
            label="Alerts"
            value={String(unreadCount)}
            icon="bell-outline"
          />
        </View>

        <View style={styles.sectionRow}>
          <Text variant="titleMedium" style={[styles.sectionHeader, { color: theme.colors.onSurface }]}>
            {t("guideOperations")}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Quick access
          </Text>
        </View>

        <View style={styles.grid}>
          <OperationCard
            theme={theme}
            icon="book-open-variant"
            label={t("materials")}
            subtitle="Forest resources"
            onPress={() => router.push("/materials")}
          />
          <OperationCard
            theme={theme}
            icon="school"
            label={t("training")}
            subtitle={`${remainingModules} remaining`}
            progress={trainingProgress}
            onPress={() => router.push("/training")}
          />
          <OperationCard
            theme={theme}
            icon="certificate"
            label={t("certs")}
            subtitle="Verified records"
            progress={1}
            onPress={() => router.push("/cert")}
          />
          <OperationCard
            theme={theme}
            icon="cog"
            label={t("settings")}
            subtitle="Preferences"
            onPress={() => router.push("/settings")}
          />
          <OperationCard
            theme={theme}
            icon="video-check"
            label={t("tourMonitor")}
            subtitle="Live forest monitor"
            isLive
            fullWidth
            onPress={() => router.push("/monitor")}
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
            Today’s focus
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, lineHeight: 22 }}>
            Complete your next training module, review guide materials, and check alerts before field deployment.
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

function OperationCard({ icon, label, progress, subtitle, isLive, fullWidth, onPress, theme }) {
  return (
    <Surface
      style={[
        styles.opCard,
        {
          width: fullWidth ? "100%" : "48%",
          height: fullWidth ? 148 : 178,
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
            {isLive && (
              <View style={[styles.livePill, { backgroundColor: theme.colors.primaryContainer }]}>
                <View style={[styles.liveDot, { backgroundColor: theme.colors.tertiary }]} />
                <Text style={[styles.liveText, { color: theme.colors.tertiary }]}>LIVE</Text>
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

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 22 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 18,
    paddingHorizontal: 22,
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
