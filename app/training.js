import React, { useState, useCallback, useRef } from "react";
import { ScrollView, View, StyleSheet, Alert, Animated } from "react-native";
import {
  Text,
  Surface,
  TouchableRipple,
  useTheme,
  IconButton,
  ProgressBar,
  Portal,
  Modal,
  Button,
  RadioButton,
  Chip,
  Avatar,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { TRAINING_COURSES } from "../constants/courses";
import AppHeader from "../components/AppHeader";
import ThemedBackground from "../components/ThemedBackground";

const getLocalizedText = (textObj, lang) => {
  if (!textObj) return "";
  if (typeof textObj === "string") return textObj;
  return textObj[lang] || textObj.en || "";
};

export default function TrainingModule() {
  const [showQuiz, setShowQuiz] = useState(false);
  const [checked, setChecked] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [completedModules, setCompletedModules] = useState([]);

  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      const loadProgress = async () => {
        try {
          const stored = await AsyncStorage.getItem("completedModules");
          if (stored) setCompletedModules(JSON.parse(stored));
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }).start();
        } catch (err) {
          console.log("Failed to load progress", err);
        }
      };
      loadProgress();
    }, [fadeAnim])
  );

  const getCourseProgress = (course) => {
    const completedCount = course.modules.filter((m) => completedModules.includes(m.id)).length;
    return completedCount / course.modules.length;
  };

  const handleQuizSubmit = async () => {
    const correctValue = String(selectedModule.quiz.correctIndex);

    if (checked === correctValue) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const updatedModules = Array.from(new Set([...completedModules, selectedModule.id]));
      setCompletedModules(updatedModules);
      await AsyncStorage.setItem("completedModules", JSON.stringify(updatedModules));
      setShowQuiz(false);
      Alert.alert(t("success"), t("moduleCompleted"));
      setSelectedModule(null);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t("incorrect"), t("reviewContent"));
    }

    setChecked("");
  };

  const totalModules = TRAINING_COURSES.reduce((sum, c) => sum + c.modules.length, 0);
  const overallProgress = totalModules === 0 ? 0 : completedModules.length / totalModules;
  const cardBg = theme.dark ? "rgba(16,38,28,0.96)" : "rgba(255,255,255,0.84)";
  const chipBg = theme.dark ? "rgba(127,169,138,0.16)" : "rgba(47,125,98,0.10)";

  return (
    <View style={[styles.master, { backgroundColor: theme.colors.background }]}>
      <ThemedBackground />

      {!selectedCourse && (
        <>
          <AppHeader
            title={t("TrainingModules")}
            subtitle="Forest learning hub"
            showBack
            showHome
          />

          <Animated.ScrollView
            style={{ opacity: fadeAnim }}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: insets.bottom + 30,
            }}
            showsVerticalScrollIndicator={false}
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
              <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: "900" }}>
                Training Overview
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                Learn flexibly, track progress, and unlock new guide skills.
              </Text>

              <View style={styles.heroStats}>
                <View style={styles.heroStatBlock}>
                  <Text style={[styles.heroStatValue, { color: theme.colors.tertiary }]}>
                    {completedModules.length}
                  </Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>Completed modules</Text>
                </View>
                <View style={styles.heroStatBlock}>
                  <Text style={[styles.heroStatValue, { color: theme.colors.tertiary }]}>
                    {Math.round(overallProgress * 100)}%
                  </Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>Overall progress</Text>
                </View>
              </View>
            </Surface>

            {TRAINING_COURSES.map((course) => {
              const progress = getCourseProgress(course);

              return (
                <Surface
                  key={course.id}
                  style={[
                    styles.courseCard,
                    {
                      backgroundColor: cardBg,
                      borderColor: theme.colors.outlineVariant,
                    },
                  ]}
                  elevation={2}
                >
                  <TouchableRipple onPress={() => setSelectedCourse(course)} borderRadius={28}>
                    <View style={styles.courseCardInner}>
                      <View style={styles.courseTop}>
                        <View style={{ flex: 1 }}>
                          <Chip
                            compact
                            style={{ alignSelf: "flex-start", marginBottom: 14, backgroundColor: chipBg }}
                            textStyle={{ color: theme.colors.onSurface, fontWeight: "700" }}
                          >
                            {course.modules.length} modules
                          </Chip>

                          <Text
                            variant="titleLarge"
                            style={{ color: theme.colors.onSurface, fontWeight: "900" }}
                          >
                            {getLocalizedText(course.title, i18n.language)}
                          </Text>

                          <Text
                            variant="bodyMedium"
                            style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}
                          >
                            Interactive lessons, assessments, and completion tracking.
                          </Text>
                        </View>

                        <Avatar.Icon
                          size={44}
                          icon="school-outline"
                          color={theme.colors.tertiary}
                          style={{ backgroundColor: theme.colors.primaryContainer }}
                        />
                      </View>

                      <View style={styles.progressRow}>
                        <ProgressBar
                          progress={progress}
                          color={theme.colors.primary}
                          style={[
                            styles.progressBar,
                            { backgroundColor: theme.colors.surfaceVariant },
                          ]}
                        />
                        <Text style={[styles.percent, { color: theme.colors.tertiary }]}>
                          {Math.round(progress * 100)}%
                        </Text>
                      </View>
                    </View>
                  </TouchableRipple>
                </Surface>
              );
            })}
          </Animated.ScrollView>
        </>
      )}

      {selectedCourse && !selectedModule && (
        <>
          <AppHeader
            title={getLocalizedText(selectedCourse.title, i18n.language)}
            subtitle="Course modules"
            showBack
            showHome
          />

          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: insets.bottom + 24,
            }}
            showsVerticalScrollIndicator={false}
          >
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
                Course Summary
              </Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                Complete modules in order to unlock the next lesson and keep your guide training up to date.
              </Text>
            </Surface>

            {selectedCourse.modules.map((module, index) => {
              const isCompleted = completedModules.includes(module.id);
              const isLocked =
                index !== 0 && !completedModules.includes(selectedCourse.modules[index - 1].id);

              return (
                <Surface
                  key={module.id}
                  style={[
                    styles.moduleCard,
                    {
                      backgroundColor: cardBg,
                      borderColor: theme.colors.outlineVariant,
                      opacity: isLocked ? 0.5 : 1,
                    },
                  ]}
                  elevation={1}
                >
                  <TouchableRipple disabled={isLocked} onPress={() => setSelectedModule(module)} borderRadius={22}>
                    <View style={styles.moduleRow}>
                      <View
                        style={[
                          styles.moduleBadge,
                          {
                            backgroundColor: isCompleted
                              ? theme.colors.primary
                              : theme.colors.surfaceVariant,
                          },
                        ]}
                      >
                        {isCompleted ? (
                          <IconButton icon="check" size={18} iconColor={theme.colors.onPrimary} />
                        ) : (
                          <Text style={{ fontWeight: "900", color: theme.colors.onSurface }}>
                            {index + 1}
                          </Text>
                        )}
                      </View>

                      <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text
                          variant="titleMedium"
                          style={{ color: theme.colors.onSurface, fontWeight: "800" }}
                        >
                          {getLocalizedText(module.title, i18n.language)}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                          {isCompleted ? t("completed") : isLocked ? t("locked") : t("available")}
                        </Text>
                      </View>

                      <IconButton
                        icon={isLocked ? "lock-outline" : "play-circle-outline"}
                        iconColor={isLocked ? theme.colors.onSurfaceVariant : theme.colors.tertiary}
                      />
                    </View>
                  </TouchableRipple>
                </Surface>
              );
            })}
          </ScrollView>
        </>
      )}

      {selectedModule && (
        <>
          <AppHeader
            title={getLocalizedText(selectedModule.title, i18n.language)}
            subtitle={`Module ${selectedModule.id}`}
            showBack
            showHome
          />

          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: insets.bottom + 120,
            }}
            showsVerticalScrollIndicator={false}
          >
            <Surface
              style={[
                styles.videoCard,
                {
                  backgroundColor: cardBg,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
              elevation={2}
            >
              <View style={styles.videoCenter}>
                <View
                  style={[
                    styles.playCircle,
                    { backgroundColor: theme.colors.primaryContainer },
                  ]}
                >
                  <IconButton icon="play" size={34} iconColor={theme.colors.tertiary} />
                </View>
                <Text
                  variant="titleMedium"
                  style={{ color: theme.colors.onSurface, fontWeight: "900", marginTop: 10 }}
                >
                  {getLocalizedText(selectedModule.videoLabel, i18n.language)}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
                  Tap to start module media
                </Text>
              </View>
            </Surface>

            <Surface
              style={[
                styles.contentCard,
                {
                  backgroundColor: cardBg,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
              elevation={1}
            >
              <Text
                variant="titleLarge"
                style={{ color: theme.colors.onSurface, fontWeight: "900" }}
              >
                {getLocalizedText(selectedModule.contentTitle, i18n.language)}
              </Text>
              <Text
                variant="bodyLarge"
                style={[styles.contentText, { color: theme.colors.onSurface }]}
              >
                {getLocalizedText(selectedModule.content, i18n.language)}
              </Text>
            </Surface>

            <Button
              mode="contained"
              onPress={() => setShowQuiz(true)}
              style={styles.assessmentButton}
              contentStyle={{ height: 56 }}
              buttonColor={theme.colors.primary}
              textColor={theme.colors.onPrimary}
            >
              {completedModules.includes(selectedModule.id)
                ? t("retakeAssessment")
                : t("takeModuleQuiz")}
            </Button>
          </ScrollView>
        </>
      )}

      <Portal>
        <Modal
          visible={showQuiz}
          onDismiss={() => setShowQuiz(false)}
          contentContainerStyle={[
            styles.quizModal,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: "900" }}>
            {t("knowledgeCheck")}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            Complete the assessment to unlock progress.
          </Text>

          <Text variant="titleMedium" style={[styles.question, { color: theme.colors.onSurface }]}>
            {getLocalizedText(selectedModule?.quiz.question, i18n.language)}
          </Text>

          <RadioButton.Group onValueChange={(val) => setChecked(val)} value={checked}>
            {selectedModule?.quiz.options[i18n.language].map((option, index) => (
              <Surface
                key={index}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor:
                      checked === String(index)
                        ? theme.colors.primaryContainer
                        : theme.colors.surfaceVariant,
                    borderColor:
                      checked === String(index)
                        ? theme.colors.primary
                        : "transparent",
                  },
                ]}
                elevation={0}
              >
                <TouchableRipple onPress={() => setChecked(String(index))} borderRadius={16}>
                  <View style={styles.optionRow}>
                    <RadioButton value={String(index)} color={theme.colors.primary} />
                    <Text style={{ flex: 1, color: theme.colors.onSurface, fontWeight: "600" }}>
                      {option}
                    </Text>
                  </View>
                </TouchableRipple>
              </Surface>
            ))}
          </RadioButton.Group>

          <Button
            mode="contained"
            onPress={handleQuizSubmit}
            disabled={!checked}
            style={styles.submitBtn}
            buttonColor={theme.colors.primary}
            textColor={theme.colors.onPrimary}
          >
            {t("submitAssessment")}
          </Button>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  master: { flex: 1 },
  heroCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    marginBottom: 18,
  },
  heroStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },
  heroStatBlock: {
    flex: 1,
  },
  heroStatValue: {
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 4,
  },
  courseCard: {
    borderRadius: 28,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
  },
  courseCardInner: { padding: 20 },
  courseTop: { flexDirection: "row", alignItems: "flex-start" },
  progressRow: { flexDirection: "row", alignItems: "center", marginTop: 18 },
  progressBar: { flex: 1, height: 12, borderRadius: 10 },
  percent: { marginLeft: 12, fontWeight: "900", minWidth: 46, textAlign: "right" },
  summaryCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  moduleCard: {
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
  },
  moduleRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  moduleBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  videoCard: {
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  videoCenter: {
    height: 220,
    justifyContent: "center",
    alignItems: "center",
  },
  playCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    justifyContent: "center",
    alignItems: "center",
  },
  contentCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  contentText: {
    lineHeight: 28,
    marginTop: 14,
    opacity: 0.92,
  },
  assessmentButton: {
    marginTop: 22,
    borderRadius: 18,
  },
  quizModal: {
    margin: 18,
    borderRadius: 28,
    padding: 24,
  },
  question: {
    marginTop: 18,
    marginBottom: 18,
    lineHeight: 28,
  },
  optionCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1.5,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  submitBtn: {
    marginTop: 18,
    borderRadius: 16,
  },
});
