import React, { useState, useCallback, useRef } from 'react';
import { ScrollView, View, StyleSheet, Alert, Animated, Dimensions } from 'react-native';
import { 
  Text, Surface, TouchableRipple, useTheme, IconButton, 
  ProgressBar, Portal, Modal, Button, RadioButton, Checkbox,
  ActivityIndicator 
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import api from '../utils/api';

const { width } = Dimensions.get('window');

const getLocalizedText = (textObj, lang) => {
  if (!textObj) return "";
  if (typeof textObj === "string") return textObj;
  return textObj[lang] || textObj.en || "";
};

export default function TrainingModule() {
  // --- States ---
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [completedModules, setCompletedModules] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuiestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [answers, setAnswers] = useState({});

  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const authAlertShown = useRef(false);

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
    return quiz.options[i18n.language] || quiz.options.en || Object.values(quiz.options)[0] || [];
  };

  const getModuleQuizzes = (module) => {
    if (!module) return [];
    if (Array.isArray(module.quizzes)) return module.quizzes;
    if (module.quiz) return [module.quiz];
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
    return completedCount / modules.length;
  };

  // --- Data Loading ---
  useFocusEffect(
    useCallback(() => {
      const loadContent = async () => {
        setLoading(true);
        try {
          // 1. Load cached progress
          const stored = await AsyncStorage.getItem("completedModules");
          if (stored) setCompletedModules(JSON.parse(stored));

          // 2. Parallel fetch from Neon/Django
          const [progressRes, coursesRes] = await Promise.all([
            api.get("/progress/"),
            api.get("/courses/")
          ]);

          const serverModules = (progressRes.data || []).map(e => e.module || e).filter(id => id != null);
          const courseData = Array.isArray(coursesRes.data) ? coursesRes.data : [];

          setCompletedModules(serverModules);
          setCourses(courseData);

          // Update Cache
          await AsyncStorage.setItem("completedModules", JSON.stringify(serverModules));

          // Fade in UI
          Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        } catch (err) {
          if (err.response?.status === 401 || err.response?.status === 403) {
            showSessionExpiredAlert();
          }
          console.log("Load Error:", err.message);
        } finally {
          setLoading(false);
        }
      };

      loadContent();
    }, [])
  );

  // --- Actions ---
  const handleModuleCompletion = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await api.post("/complete-module/", { module_id: selectedModule.id });

      const updated = Array.from(new Set([...completedModules, selectedModule.id]));
      setCompletedModules(updated);
      await AsyncStorage.setItem("completedModules", JSON.stringify(updated));

      setShowQuiz(false);
      Alert.alert(t("success"), t("moduleCompleted"));
      setSelectedModule(null);
    } catch (err) {
      Alert.alert("Sync Error", "Progress saved locally but failed to sync.");
    }
  };

  const handleQuizSubmit = async () => {
    const quizzes = getModuleQuizzes(selectedModule);
    const currentQuiz = quizzes[currentQuiestionIndex];
    const correctValues = getCorrectIndexes(currentQuiz);
    const selectedValues = Array.from(new Set(selectedOptions));

    const isCorrect = selectedValues.length === correctValues.length &&
                      selectedValues.every(v => correctValues.includes(v));

    if (isCorrect) {
      if (currentQuiestionIndex < quizzes.length - 1) {
        setCurrentQuestionIndex(currentQuiestionIndex + 1);
        setSelectedOptions([]);
      } else {
        await handleModuleCompletion();
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t("incorrect"), t("reviewContent"));
    }
  };

  // --- Render Logic ---

  if (loading) {
    return (
      <View style={[styles.master, styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator animating={true} color={theme.colors.primary} size="large" />
        <Text style={styles.loadingText}>{t("loading") || "Fetching Course Content..."}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.master, { backgroundColor: theme.colors.background }]}>
      
      {/* 1. COURSE LIST VIEW */}
      {!selectedCourse && (
        <Animated.ScrollView 
          style={[styles.container, { opacity: fadeAnim }]}
          contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }}
        >
          <Text variant="headlineMedium" style={[styles.boldText, { marginBottom: 25 }]}>
            {t("TrainingModules")}
          </Text>

          {courses.map((course) => {
            const progress = getCourseProgress(course);
            return (
              <Surface key={course.id} style={[styles.flatCard, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
                <TouchableRipple onPress={() => setSelectedCourse(course)} borderRadius={32}>
                  <View style={styles.cardInternal}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text variant="titleLarge" style={styles.boldText}>{getLocalizedText(course.title, i18n.language)}</Text>
                        <Text variant="labelLarge" style={{ color: theme.colors.primary }}>{course.modules.length} {t("modulesCount")}</Text>
                      </View>
                      <IconButton icon="arrow-right-drop-circle" iconColor={theme.colors.primary} size={32} />
                    </View>
                    <View style={styles.progressSection}>
                      <View style={styles.barWrapper}>
                        <ProgressBar progress={progress} color={theme.colors.primary} style={styles.mainBar} />
                      </View>
                      <Text variant="labelLarge" style={styles.progressLabel}>{Math.round(progress * 100)}%</Text>
                    </View>
                  </View>
                </TouchableRipple>
              </Surface>
            );
          })}
        </Animated.ScrollView>
      )}

      {/* 2. MODULE LIST VIEW */}
      {selectedCourse && !selectedModule && (
        <View style={[styles.flexOne, { paddingTop: insets.top }]}>
          <View style={styles.navHeader}>
            <IconButton icon="chevron-left" iconColor={theme.colors.primary} onPress={() => setSelectedCourse(null)} />
            <Text variant="titleLarge" style={styles.boldText}>{getLocalizedText(selectedCourse.title, i18n.language)}</Text>
          </View>
          <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
            {selectedCourse.modules.map((module, index) => {
              const isCompleted = completedModules.includes(module.id);
              const isLocked = index !== 0 && !completedModules.includes(selectedCourse.modules[index - 1].id);
              return (
                <Surface key={module.id} style={[styles.moduleTile, { backgroundColor: theme.colors.surfaceVariant }, isLocked && styles.locked]} elevation={0}>
                  <TouchableRipple disabled={isLocked} onPress={() => setSelectedModule(module)}>
                    <View style={styles.moduleRow}>
                      <View style={[styles.statusCircle, isCompleted && { backgroundColor: theme.colors.primary }]}>
                        {isCompleted ? <IconButton icon="check" iconColor="white" size={18} /> : <Text style={styles.numberText}>{index + 1}</Text>}
                      </View>
                      <Text variant="titleMedium" style={[styles.boldText, { marginLeft: 16 }]}>{getLocalizedText(module.title, i18n.language)}</Text>
                    </View>
                  </TouchableRipple>
                </Surface>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* 3. MODULE CONTENT VIEW */}
      {selectedModule && (
        <View style={[styles.flexOne, { paddingTop: insets.top }]}>
          <View style={styles.navHeader}>
            <IconButton icon="chevron-left" iconColor={theme.colors.primary} onPress={() => setSelectedModule(null)} />
            <Text variant="titleLarge" style={styles.boldText}>{getLocalizedText(selectedModule.title, i18n.language)}</Text>
          </View>
          <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
            <Surface style={[styles.flatCard, { backgroundColor: theme.colors.surfaceVariant, padding: 20 }]} elevation={0}>
              <Text>{getLocalizedText(selectedModule.content, i18n.language)}</Text>
              {getModuleQuizzes(selectedModule).length > 0 && (
                <Button mode="contained" style={styles.startQuizButton} onPress={() => setShowQuiz(true)}>Start Quiz</Button>
              )}
            </Surface>
          </ScrollView>
        </View>
      )}

      {/* QUIZ MODAL */}
      <Portal>
        <Modal visible={showQuiz} onDismiss={() => setShowQuiz(false)} contentContainerStyle={[styles.modernQuizModal, { backgroundColor: theme.colors.surface }]}>
          {(() => {
            const quizzes = getModuleQuizzes(selectedModule);
            const currentQuiz = quizzes[currentQuiestionIndex];
            if (!currentQuiz) return <Text>No Quiz Found</Text>;

            const options = getQuizOptions(currentQuiz);
            const correctValues = getCorrectIndexes(currentQuiz);
            const isMultiSelect = correctValues.length > 1;

            return (
              <View>
                <Text variant="headlineSmall" style={styles.boldText}>{t("knowledgeCheck")}</Text>
                <Text style={{ opacity: 0.6 }}>{currentQuiestionIndex + 1}/{quizzes.length}</Text>
                <Text style={{ marginVertical: 20 }}>{getLocalizedText(currentQuiz.question, i18n.language)}</Text>

                {options.map((option, index) => {
                  const val = String(index);
                  const isSelected = selectedOptions.includes(val);
                  return (
                    <TouchableRipple key={index} onPress={() => {
                      if (isMultiSelect) {
                        setSelectedOptions(isSelected ? selectedOptions.filter(v => v !== val) : [...selectedOptions, val]);
                      } else {
                        setSelectedOptions([val]);
                      }
                    }}>
                      <View style={styles.optionContent}>
                        {isMultiSelect ? <Checkbox status={isSelected ? 'checked' : 'unchecked'} /> : <RadioButton value={val} status={isSelected ? 'checked' : 'unchecked'} />}
                        <Text style={{ marginLeft: 8 }}>{option}</Text>
                      </View>
                    </TouchableRipple>
                  );
                })}

                <Button mode="contained" onPress={handleQuizSubmit} disabled={selectedOptions.length === 0} style={{ marginTop: 20 }}>
                  {t("submitAssessment")}
                </Button>
              </View>
            );
          })()}
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  master: { flex: 1 },
  flexOne: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, paddingHorizontal: 22 },
  boldText: { fontWeight: '900' },
  loadingText: { marginTop: 15, opacity: 0.6, fontWeight: '600' },
  flatCard: { borderRadius: 32, marginBottom: 18 },
  cardInternal: { padding: 26 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  progressSection: { flexDirection: 'row', alignItems: 'center' },
  barWrapper: { flex: 1, height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.05)' },
  mainBar: { height: 12 },
  progressLabel: { marginLeft: 15, fontWeight: '900' },
  navHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  moduleTile: { borderRadius: 24, marginBottom: 14 },
  moduleRow: { flexDirection: 'row', alignItems: 'center', padding: 18 },
  statusCircle: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.05)' },
  numberText: { fontWeight: '900', fontSize: 16 },
  locked: { opacity: 0.35 },
  modernQuizModal: { padding: 28, margin: 20, borderRadius: 38 },
  optionContent: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  startQuizButton: { marginTop: 20 }
});