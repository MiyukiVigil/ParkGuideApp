import React, { useState, useCallback, useRef } from "react";
import { useRouter } from "expo-router";
import { ScrollView, View, StyleSheet, Alert, Animated, useWindowDimensions } from "react-native";
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
  Checkbox,
  Chip,
  Avatar,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import api from "../utils/api";
import * as Haptics from "expo-haptics";
import { TRAINING_COURSES } from "../constants/courses";
import AppHeader from "../components/AppHeader";
import ThemedBackground from "../components/ThemedBackground";
import {
  markModuleComplete,
  getCompletedModules,
  saveQuizProgress,
  getQuizProgress,
} from "../utils/progressSync";

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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [completedModules, setCompletedModules] = useState([]);

  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const authAlertShown = useRef(false);

  // Responsive column count for courses
  const getNumColumns = () => {
    if (width >= 1200) return 2;
    return 1;
  };

  // --- Helpers ---
  const showSessionExpiredAlert = () => {
    if (authAlertShown.current) return;
    authAlertShown.current = true;
    Alert.alert('Session expired', 'Your session has expired. Please log in again.', [
      { text: 'OK', onPress: () => { authAlertShown.current = false; router.replace('/'); } },
    ]);
  };

  const getQuizOptions = (quiz) => {
    if (!quiz?.options) return [];
    if (Array.isArray(quiz.options)) return quiz.options;
    const langOptions = quiz.options[i18n.language];
    if (Array.isArray(langOptions) && langOptions.length) return langOptions;
    const enOptions = quiz.options.en;
    if (Array.isArray(enOptions) && enOptions.length) return enOptions;
    const first = Object.values(quiz.options).find(arr => Array.isArray(arr) && arr.length);
    return first || [];
  };

  const getModuleQuizzes = (module) => {
    if (!module) return [];
    if (Array.isArray(module.quizzes) && module.quizzes.length) return module.quizzes;
    if (module.quiz && typeof module.quiz === 'object') return [module.quiz];
    return [];
  };

  const getCorrectIndexes = (quiz) => {
    if (!quiz) return [];
    if (Array.isArray(quiz.correctIndexes) && quiz.correctIndexes.length > 0) {
      return quiz.correctIndexes.map((index) => String(index));
    }
    return quiz.correctIndex !== undefined ? [String(quiz.correctIndex)] : [];
  };

  const getCourseProgress = (course) => {
    const modules = course.modules || [];
    if (modules.length === 0) return 0;
    const completedCount = modules.filter(m => completedModules.includes(m.id)).length;
    const progress = completedCount / modules.length;
    console.log(`[${course.id}] Progress: ${completedCount}/${modules.length} = ${progress} (modules: ${modules.map(m => m.id).join(',')}, completed: ${completedModules.join(',')})`);
    return progress;
  };

  const handleModuleSelect = (module) => {
    setSelectedModule(module);
    setCurrentQuestionIndex(0);
    setSelectedOptions([]);
    setChecked("");
  };

  const handleModuleCompletion = async () => {
    try {
      // Mark module complete (syncs with backend)
      const updated = await markModuleComplete(selectedModule.id);
      setCompletedModules(updated);
      
      setShowQuiz(false);
      Alert.alert(t("success"), t("moduleCompleted"));
      setSelectedModule(null);
    } catch (err) {
      console.error("Failed to complete module:", err);
      Alert.alert("Error", "Failed to save progress.");
    }
  };

  // --- Data Loading ---
  useFocusEffect(
    useCallback(() => {
      const loadProgress = async () => {
        try {
          const completedIds = await getCompletedModules();
          console.log('Training page - loaded completedIds:', completedIds);
          setCompletedModules(completedIds);
          
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

  const handleQuizSubmit = async () => {
    const quizzes = getModuleQuizzes(selectedModule);
    const currentQuiz = quizzes[currentQuestionIndex];
    const correctValues = getCorrectIndexes(currentQuiz);
    const selectedValues = Array.from(new Set(selectedOptions));

    const isCorrect = selectedValues.length === correctValues.length &&
                      selectedValues.every(v => correctValues.includes(v));

    // Save quiz progress
    await saveQuizProgress(selectedModule.id, currentQuestionIndex, {
      question: currentQuiz.question,
      selectedAnswers: selectedValues,
      isCorrect: isCorrect,
    });

    if (isCorrect) {
      if (currentQuestionIndex < quizzes.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedOptions([]);
      } else {
        await handleModuleCompletion();
      }
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

            {TRAINING_COURSES.length > 0 ? (
              <View style={[styles.coursesGrid, { width: width - 40 }]}>
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
                          width: getNumColumns() === 1 ? "100%" : "48%",
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
              </View>
            ) : null}
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
                <Surface key={module.id} style={[styles.moduleTile, { backgroundColor: theme.colors.surfaceVariant }, isLocked && styles.locked]} elevation={0}>
                  <TouchableRipple disabled={isLocked} onPress={() => handleModuleSelect(module)}>
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
        <Modal visible={showQuiz} onDismiss={() => setShowQuiz(false)} contentContainerStyle={[styles.modernQuizModal, { backgroundColor: theme.colors.surface }]}>
          {(() => {
            const quizzes = getModuleQuizzes(selectedModule);
            const currentQuiz = quizzes[currentQuestionIndex];
            if (!currentQuiz) return <Text>No Quiz Found</Text>;

            const options = getQuizOptions(currentQuiz);
            const correctValues = getCorrectIndexes(currentQuiz);
            const isMultiSelect = correctValues.length > 1;

            return (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                <View style={{ padding: 24 }}>
                  {/* Header */}
                  <View style={{ marginBottom: 24 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: "900", flex: 1 }}>
                        {t("knowledgeCheck")}
                      </Text>
                      <IconButton 
                        icon="close" 
                        size={24} 
                        iconColor={theme.colors.onSurface}
                        onPress={() => setShowQuiz(false)}
                      />
                    </View>
                    <ProgressBar 
                      progress={(currentQuestionIndex + 1) / quizzes.length} 
                      color={theme.colors.primary}
                      style={{ backgroundColor: theme.colors.surfaceVariant, borderRadius: 12 }}
                    />
                    <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, fontSize: 12, fontWeight: '600' }}>
                      Question {currentQuestionIndex + 1} of {quizzes.length}
                    </Text>
                  </View>

                  {/* Question */}
                  <Surface 
                    style={[
                      styles.questionCard, 
                      { 
                        backgroundColor: theme.colors.primaryContainer,
                        borderColor: theme.colors.primary,
                      }
                    ]}
                    elevation={0}
                  >
                    <Text style={{ color: theme.colors.onPrimaryContainer, fontSize: 16, lineHeight: 24, fontWeight: '500' }}>
                      {getLocalizedText(currentQuiz.question, i18n.language)}
                    </Text>
                  </Surface>

                  {/* Multi-select indicator */}
                  {isMultiSelect && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 12 }}>
                      <Chip 
                        label={`Select ${correctValues.length} answers`}
                        icon="information"
                        size={20}
                        style={{ 
                          backgroundColor: theme.colors.secondaryContainer,
                          alignSelf: 'flex-start',
                        }}
                        textStyle={{ color: theme.colors.onSecondaryContainer, fontSize: 12 }}
                      />
                    </View>
                  )}

                  {/* Options */}
                  <View style={{ marginTop: 20 }}>
                    {options.map((option, index) => {
                      const val = String(index);
                      const isSelected = selectedOptions.includes(val);
                      return (
                        <Surface
                          key={index}
                          style={[
                            styles.optionCard,
                            {
                              backgroundColor: isSelected 
                                ? theme.colors.primaryContainer 
                                : theme.colors.surfaceVariant,
                              borderColor: isSelected 
                                ? theme.colors.primary 
                                : theme.colors.outlineVariant,
                              borderWidth: isSelected ? 2 : 1,
                            }
                          ]}
                          elevation={isSelected ? 1 : 0}
                        >
                          <TouchableRipple 
                            onPress={() => {
                              if (isMultiSelect) {
                                setSelectedOptions(isSelected ? selectedOptions.filter(v => v !== val) : [...selectedOptions, val]);
                              } else {
                                setSelectedOptions([val]);
                              }
                            }}
                            borderRadius={16}
                          >
                            <View style={styles.optionContent}>
                              {isMultiSelect ? (
                                <Checkbox 
                                  status={isSelected ? 'checked' : 'unchecked'} 
                                  color={theme.colors.primary}
                                />
                              ) : (
                                <RadioButton 
                                  value={val} 
                                  status={isSelected ? 'checked' : 'unchecked'}
                                  color={theme.colors.primary}
                                />
                              )}
                              <Text 
                                style={{ 
                                  marginLeft: 12, 
                                  flex: 1,
                                  color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                                  fontWeight: isSelected ? '600' : '500',
                                  fontSize: 15,
                                }}
                              >
                                {option}
                              </Text>
                            </View>
                          </TouchableRipple>
                        </Surface>
                      );
                    })}
                  </View>

                  {/* Submit Button */}
                  <Button
                    mode="contained"
                    onPress={handleQuizSubmit}
                    disabled={selectedOptions.length === 0}
                    style={styles.submitBtn}
                    contentStyle={{ height: 50 }}
                    buttonColor={theme.colors.primary}
                    textColor={theme.colors.onPrimary}
                  >
                    {currentQuestionIndex === quizzes.length - 1 ? t("completeAssessment") : t("nextQuestion")}
                  </Button>
                </View>
              </ScrollView>
            );
          })()}
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
  coursesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
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
  moduleTile: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 0,
  },
  locked: {
    opacity: 0.6,
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
  modernQuizModal: {
    margin: 16,
    borderRadius: 28,
    maxHeight: "90%",
  },
  questionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  optionCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  submitBtn: {
    marginTop: 24,
    borderRadius: 16,
  },
  boldText: {
    fontWeight: "900",
  },
});
