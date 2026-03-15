import React, { useState, useCallback, useRef } from 'react';
import { ScrollView, View, StyleSheet, Alert, Animated, Dimensions } from 'react-native';
import { 
  Text, Surface, TouchableRipple, useTheme, IconButton, 
  ProgressBar, Portal, Modal, Button, RadioButton 
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import api from '../utils/api'; // <- Shared Axios instance

const { width, height } = Dimensions.get('window');

// Helper to get localized text from object
const getLocalizedText = (textObj, lang) => {
  if (!textObj) return "";
  if (typeof textObj === "string") return textObj;
  return textObj[lang] || textObj.en || "";
};

export default function TrainingModule() {
  const [showQuiz, setShowQuiz] = useState(false);
  const [checked, setChecked] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [completedModules, setCompletedModules] = useState([]);

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Load progress & courses on focus
  useFocusEffect(
    useCallback(() => {
      const loadProgress = async () => {
        try {
          const stored = await AsyncStorage.getItem("completedModules");
          if (stored) setCompletedModules(JSON.parse(stored));

          await fetchCourses();

          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }).start();
        } catch (err) {
          console.log("Error loading progress", err);
        }
      };
      loadProgress();
    }, [])
  );

  // Fetch courses from backend
  const fetchCourses = async () => {
    try {
      const response = await api.get("/courses/"); // token attached automatically
      setCourses(Array.isArray(response.data) ? response.data : []);
      console.log("COURSES FROM DJANGO:", response.data);
    } catch (err) {
      console.log("Failed to fetch courses", err.response?.data || err.message);
      setCourses([]); // fallback
    } finally {
      setLoading(false);
    }
  };

  // Calculate progress for each course
  const getCourseProgress = (course) => {
    const modules = course.modules || [];
    if (modules.length === 0) return 0;
    const completedCount = modules.filter(module =>
      completedModules.includes(module.id)
    ).length;
    return completedCount / modules.length;
  };

  // Quiz submission
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
    setChecked('');
  };

  return (
    <View style={[styles.master, { backgroundColor: theme.colors.background }]}>
      {/* COURSE LIST */}
      {!selectedCourse && (
        <View style={styles.flexOne}>
          <Animated.ScrollView 
            style={[styles.container, { opacity: fadeAnim }]}
            contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }}
            showsVerticalScrollIndicator={false}
          >
            <Text variant="headlineMedium" style={[styles.boldText, { color: theme.colors.onBackground, marginBottom: 25 }]}>
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
                          <Text variant="titleLarge" style={[styles.boldText, { color: theme.colors.onSurfaceVariant }]}>
                            {getLocalizedText(course.title, i18n.language)}
                          </Text>
                          <Text variant="labelLarge" style={{ color: theme.colors.primary, marginTop: 4 }}>
                            {course.modules.length} {t("modulesCount").toUpperCase()}
                          </Text>
                        </View>
                        <IconButton icon="arrow-right-drop-circle" iconColor={theme.colors.primary} size={32} />
                      </View>

                      <View style={styles.progressSection}>
                        <View style={[styles.barWrapper, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                          <ProgressBar progress={progress} color={theme.colors.primary} style={styles.mainBar} />
                        </View>
                        <Text variant="labelLarge" style={[styles.progressLabel, { color: theme.colors.onSurface }]}>
                          {Math.round(progress * 100)}%
                        </Text>
                      </View>
                    </View>
                  </TouchableRipple>
                </Surface>
              );
            })}
          </Animated.ScrollView>
        </View>
      )}

      {/* MODULE LIST */}
      {selectedCourse && !selectedModule && (
        <View style={[styles.flexOne, { paddingTop: insets.top }]}>
          <View style={styles.navHeader}>
            <IconButton icon="chevron-left" iconColor={theme.colors.primary} onPress={() => setSelectedCourse(null)} style={styles.backBtn} />
            <Text variant="titleLarge" style={[styles.boldText, { color: theme.colors.onBackground }]} numberOfLines={1}>
              {getLocalizedText(selectedCourse.title, i18n.language)}
            </Text>
          </View>

          <ScrollView 
            style={styles.container} 
            contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} 
            showsVerticalScrollIndicator={false}
          >
            {selectedCourse.modules.map((module, index) => {
              const isCompleted = completedModules.includes(module.id);
              const isLocked = index !== 0 && !completedModules.includes(selectedCourse.modules[index - 1].id);

              return (
                <Surface key={module.id} style={[styles.moduleTile, { backgroundColor: theme.colors.surfaceVariant }, isLocked && styles.locked]} elevation={0}>
                  <TouchableRipple disabled={isLocked} onPress={() => setSelectedModule(module)} borderRadius={24}>
                    <View style={styles.moduleRow}>
                      <View style={[styles.statusCircle, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }, isCompleted && { backgroundColor: theme.colors.primary }]}>
                        {isCompleted ? (
                          <IconButton icon="check" iconColor="white" size={18} />
                        ) : (
                          <Text style={[styles.numberText, { color: theme.colors.onSurface }]}>{index + 1}</Text>
                        )}
                      </View>
                      <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text variant="titleMedium" style={[styles.boldText, { color: theme.colors.onSurface }]}>{getLocalizedText(module.title, i18n.language)}</Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, opacity: 0.6 }}>
                          {isCompleted ? t("completed") : isLocked ? t("locked") : t("available")}
                        </Text>
                      </View>
                      {!isLocked && <IconButton icon="play-circle-outline" iconColor={theme.colors.primary} />}
                    </View>
                  </TouchableRipple>
                </Surface>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* MODULE CONTENT */}
      {selectedModule && (
        <View style={[styles.flexOne, { paddingTop: insets.top }]}>
          <View style={styles.headerActionRow}>
            <IconButton icon="close-circle" iconColor={theme.colors.primary} size={32} onPress={() => setSelectedModule(null)} />
          </View>

          <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
            <Text variant="labelLarge" style={{ color: theme.colors.primary, marginTop: 10 }}>
              {t("module").toUpperCase()} {selectedModule.id}
            </Text>
            <Text variant="headlineSmall" style={[styles.boldText, { marginBottom: 25, color: theme.colors.onBackground }]}>
              {getLocalizedText(selectedModule.title, i18n.language)}
            </Text>

            <Surface style={[styles.mediaFrame, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
              <IconButton icon="play-circle" size={60} iconColor={theme.colors.primary} />
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {getLocalizedText(selectedModule.videoLabel, i18n.language)}
              </Text>
            </Surface>

            <View style={styles.textSection}>
              <Text variant="titleLarge" style={[styles.boldText, { color: theme.colors.onSurface }]}>{getLocalizedText(selectedModule.contentTitle, i18n.language)}</Text>
              <Text variant="bodyLarge" style={[styles.contentText, { color: theme.colors.onSurface, opacity: 0.8 }]}>{getLocalizedText(selectedModule.content, i18n.language)}</Text>
            </View>

            <Button mode="contained" onPress={() => setShowQuiz(true)} style={styles.actionFab} contentStyle={{ height: 60 }}>
              {completedModules.includes(selectedModule.id) ? t("retakeAssessment") : t("takeModuleQuiz")}
            </Button>
          </ScrollView>
        </View>
      )}

      {/* QUIZ MODAL */}
      <Portal>
        <Modal visible={showQuiz} onDismiss={() => setShowQuiz(false)} contentContainerStyle={[styles.modernQuizModal, { backgroundColor: theme.colors.surface }]}>
          <Text variant="headlineSmall" style={[styles.boldText, { color: theme.colors.onSurface }]}>{t("knowledgeCheck")}</Text>
          <View style={[styles.modalDivider, { backgroundColor: theme.colors.outline }]} />
          <Text variant="bodyLarge" style={[styles.questionText, { color: theme.colors.onSurface }]}>
            {getLocalizedText(selectedModule?.quiz.question, i18n.language)}
          </Text>
          
          <RadioButton.Group onValueChange={val => setChecked(val)} value={checked}>
            {selectedModule?.quiz.options[i18n.language].map((option, index) => (
              <Surface key={index} style={[styles.optionTile, { backgroundColor: theme.colors.surfaceVariant }, checked === String(index) && { borderColor: theme.colors.primary, borderWidth: 1.5, backgroundColor: theme.dark ? 'rgba(76, 175, 80, 0.15)' : 'rgba(46, 125, 50, 0.05)' }]} elevation={0}>
                <TouchableRipple onPress={() => setChecked(String(index))} borderRadius={16}>
                  <View style={styles.optionContent}>
                    <RadioButton value={String(index)} />
                    <Text style={[styles.optionLabel, { color: theme.colors.onSurface }]}>{option}</Text>
                  </View>
                </TouchableRipple>
              </Surface>
            ))}
          </RadioButton.Group>

          <Button mode="contained" onPress={handleQuizSubmit} disabled={!checked} style={styles.submitBtn}>
            {t("submitAssessment")}
          </Button>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  master: { flex: 1 },
  flexOne: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 22 },
  boldText: { fontWeight: '900' },
  headerSpacer: { marginBottom: 35 },
  headerActionRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20 },
  flatCard: { borderRadius: 32, marginBottom: 18, overflow: 'hidden' },
  cardInternal: { padding: 26 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  progressSection: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  barWrapper: { flex: 1, height: 12, borderRadius: 6, overflow: 'hidden' },
  mainBar: { height: 12, borderRadius: 6 },
  progressLabel: { marginLeft: 15, fontWeight: '900', fontSize: 16, minWidth: 45, textAlign: 'right' },
  navHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 20 },
  backBtn: { marginLeft: -5 },
  moduleTile: { borderRadius: 24, marginBottom: 14, overflow: 'hidden' },
  moduleRow: { flexDirection: 'row', alignItems: 'center', padding: 18 },
  statusCircle: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  numberText: { fontWeight: '900', fontSize: 16 },
  locked: { opacity: 0.35 },
  mediaFrame: { height: 210, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginVertical: 20 },
  textSection: { marginTop: 10 },
  contentText: { lineHeight: 28, marginTop: 15 },
  actionFab: { marginTop: 40, borderRadius: 20 },
  modernQuizModal: { padding: 28, margin: 20, borderRadius: 38 },
  modalDivider: { height: 4, width: 40, borderRadius: 2, marginVertical: 15 },
  questionText: { marginBottom: 25, lineHeight: 28 },
  optionTile: { borderRadius: 18, marginBottom: 12, overflow: 'hidden' },
  optionContent: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  optionLabel: { flex: 1, marginLeft: 12, fontWeight: '600' },
  submitBtn: { marginTop: 30, borderRadius: 18, height: 55, justifyContent: 'center' }
});