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

import api from '../utils/api';

const { width, height } = Dimensions.get('window');

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

  const getQuizOptions = (quiz) => {
    if (!quiz?.options) return [];
    if (Array.isArray(quiz.options)) return quiz.options;
    return quiz.options[i18n.language] || quiz.options.en || Object.values(quiz.options)[0] || [];
  };

  /*
  ------------------------------
  LOAD USER PROGRESS + COURSES
  ------------------------------
  */

  useFocusEffect(
    useCallback(() => {

      const loadProgress = async () => {
        try {

          /* Load cached progress first */
          const stored = await AsyncStorage.getItem("completedModules");
          if (stored) {
            setCompletedModules(JSON.parse(stored));
          }

          /* Fetch server progress */
          const progressRes = await api.get("/progress/");
          const serverModules = (progressRes.data || [])
            .map((entry) => (typeof entry === 'object' ? entry.module : entry))
            .filter((id) => id != null);

          setCompletedModules(serverModules);

          /* Update cache */
          await AsyncStorage.setItem(
            "completedModules",
            JSON.stringify(serverModules)
          );

          await fetchCourses();

          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }).start();

        } catch (err) {
          console.log("Error loading progress", err.response?.data || err.message);
        }
      };

      loadProgress();

    }, [])
  );

  /*
  ------------------------------
  FETCH COURSES
  ------------------------------
  */

  const fetchCourses = async () => {
    try {

      const response = await api.get("/courses/");
      const data = Array.isArray(response.data) ? response.data : [];

      setCourses(data);

      console.log("COURSES FROM DJANGO:", data);

    } catch (err) {

      console.log("Failed to fetch courses", err.response?.data || err.message);
      setCourses([]);

    } finally {

      setLoading(false);

    }
  };

  /*
  ------------------------------
  COURSE PROGRESS
  ------------------------------
  */

  const getCourseProgress = (course) => {

    const modules = course.modules || [];

    if (modules.length === 0) return 0;

    const completedCount = modules.filter(module =>
      completedModules.includes(module.id)
    ).length;

    return completedCount / modules.length;
  };

  /*
  ------------------------------
  QUIZ SUBMISSION
  ------------------------------
  */

  const handleQuizSubmit = async () => {

    const correctValue = String(selectedModule.quiz.correctIndex);
    const isCorrect = checked === correctValue;

    if (isCorrect) {

      try {

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        /* Send completion to backend */

        await api.post("/complete-module/", {
          module_id: selectedModule.id
        });

        const updatedModules = Array.from(
          new Set([...completedModules, selectedModule.id])
        );

        setCompletedModules(updatedModules);

        /* Update local cache */

        await AsyncStorage.setItem(
          "completedModules",
          JSON.stringify(updatedModules)
        );

        setShowQuiz(false);
        Alert.alert(t("success"), t("moduleCompleted"));
        setSelectedModule(null);

      } catch (err) {

        console.log("Failed syncing progress", err.response?.data || err.message);

        Alert.alert(
          "Sync Error",
          "Module completed locally but failed to sync with server."
        );

      }

    } else {

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      Alert.alert(
        t("incorrect"),
        t("reviewContent")
      );

    }

    setChecked('');

  };

  /*
  ------------------------------
  UI
  ------------------------------
  */

  return (

    <View style={[styles.master, { backgroundColor: theme.colors.background }]}>

      {/* COURSE LIST */}

      {!selectedCourse && (

        <View style={styles.flexOne}>

          <Animated.ScrollView
            style={[styles.container, { opacity: fadeAnim }]}
            contentContainerStyle={{
              paddingTop: insets.top + 20,
              paddingBottom: insets.bottom + 40
            }}
            showsVerticalScrollIndicator={false}
          >

            <Text
              variant="headlineMedium"
              style={[
                styles.boldText,
                { color: theme.colors.onBackground, marginBottom: 25 }
              ]}
            >
              {t("TrainingModules")}
            </Text>

            {courses.map((course) => {

              const progress = getCourseProgress(course);

              return (

                <Surface
                  key={course.id}
                  style={[
                    styles.flatCard,
                    { backgroundColor: theme.colors.surfaceVariant }
                  ]}
                  elevation={0}
                >

                  <TouchableRipple
                    onPress={() => setSelectedCourse(course)}
                    borderRadius={32}
                  >

                    <View style={styles.cardInternal}>

                      <View style={styles.cardHeader}>

                        <View style={{ flex: 1 }}>

                          <Text
                            variant="titleLarge"
                            style={[
                              styles.boldText,
                              { color: theme.colors.onSurfaceVariant }
                            ]}
                          >
                            {getLocalizedText(course.title, i18n.language)}
                          </Text>

                          <Text
                            variant="labelLarge"
                            style={{
                              color: theme.colors.primary,
                              marginTop: 4
                            }}
                          >
                            {course.modules.length} {t("modulesCount").toUpperCase()}
                          </Text>

                        </View>

                        <IconButton
                          icon="arrow-right-drop-circle"
                          iconColor={theme.colors.primary}
                          size={32}
                        />

                      </View>

                      <View style={styles.progressSection}>

                        <View
                          style={[
                            styles.barWrapper,
                            {
                              backgroundColor: theme.dark
                                ? 'rgba(255,255,255,0.1)'
                                : 'rgba(0,0,0,0.05)'
                            }
                          ]}
                        >
                          <ProgressBar
                            progress={progress}
                            color={theme.colors.primary}
                            style={styles.mainBar}
                          />
                        </View>

                        <Text
                          variant="labelLarge"
                          style={[
                            styles.progressLabel,
                            { color: theme.colors.onSurface }
                          ]}
                        >
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

            <IconButton
              icon="chevron-left"
              iconColor={theme.colors.primary}
              onPress={() => setSelectedCourse(null)}
            />

            <Text
              variant="titleLarge"
              style={[styles.boldText, { color: theme.colors.onBackground }]}
              numberOfLines={1}
            >
              {getLocalizedText(selectedCourse.title, i18n.language)}
            </Text>

          </View>

          <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          >

            {selectedCourse.modules.map((module, index) => {

              const isCompleted = completedModules.includes(module.id);

              const isLocked =
                index !== 0 &&
                !completedModules.includes(
                  selectedCourse.modules[index - 1].id
                );

              return (

                <Surface
                  key={module.id}
                  style={[
                    styles.moduleTile,
                    { backgroundColor: theme.colors.surfaceVariant },
                    isLocked && styles.locked
                  ]}
                  elevation={0}
                >

                  <TouchableRipple
                    disabled={isLocked}
                    onPress={() => setSelectedModule(module)}
                  >

                    <View style={styles.moduleRow}>

                      <View
                        style={[
                          styles.statusCircle,
                          isCompleted && { backgroundColor: theme.colors.primary }
                        ]}
                      >

                        {isCompleted ? (
                          <IconButton icon="check" iconColor="white" size={18} />
                        ) : (
                          <Text style={styles.numberText}>{index + 1}</Text>
                        )}

                      </View>

                      <View style={{ flex: 1, marginLeft: 16 }}>

                        <Text
                          variant="titleMedium"
                          style={[
                            styles.boldText,
                            { color: theme.colors.onSurface }
                          ]}
                        >
                          {getLocalizedText(module.title, i18n.language)}
                        </Text>

                      </View>

                    </View>

                  </TouchableRipple>

                </Surface>

              );

            })}

          </ScrollView>

        </View>

      )}

      {/* MODULE DETAIL */}

      {selectedCourse && selectedModule && (

        <View style={[styles.flexOne, { paddingTop: insets.top }]}>

          <View style={styles.navHeader}>

            <IconButton
              icon="chevron-left"
              iconColor={theme.colors.primary}
              onPress={() => {
                setSelectedModule(null);
                setShowQuiz(false);
                setChecked('');
              }}
            />

            <Text
              variant="titleLarge"
              style={[styles.boldText, { color: theme.colors.onBackground }]}
              numberOfLines={1}
            >
              {getLocalizedText(selectedModule.title, i18n.language)}
            </Text>

          </View>

          <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          >

            <Surface
              style={[
                styles.flatCard,
                { backgroundColor: theme.colors.surfaceVariant, padding: 20 }
              ]}
              elevation={0}
            >
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                {getLocalizedText(selectedModule.content, i18n.language)}
              </Text>

              {!!selectedModule.quiz && (
                <Button
                  mode="contained"
                  style={styles.startQuizButton}
                  onPress={() => setShowQuiz(true)}
                >
                  Start Quiz
                </Button>
              )}
            </Surface>

          </ScrollView>

        </View>

      )}

      {/* QUIZ MODAL */}

      <Portal>

        <Modal
          visible={showQuiz}
          onDismiss={() => setShowQuiz(false)}
          contentContainerStyle={[
            styles.modernQuizModal,
            { backgroundColor: theme.colors.surface }
          ]}
        >

          <Text variant="headlineSmall" style={styles.boldText}>
            {t("knowledgeCheck")}
          </Text>

          <Text style={{ marginVertical: 20 }}>
            {getLocalizedText(selectedModule?.quiz.question, i18n.language)}
          </Text>

          <RadioButton.Group
            onValueChange={val => setChecked(val)}
            value={checked}
          >

            {getQuizOptions(selectedModule?.quiz).map((option, index) => (

              <TouchableRipple key={index} onPress={() => setChecked(String(index))}>

                <View style={styles.optionContent}>
                  <RadioButton value={String(index)} />
                  <Text>{option}</Text>
                </View>

              </TouchableRipple>

            ))}

          </RadioButton.Group>

          <Button
            mode="contained"
            onPress={handleQuizSubmit}
            disabled={!checked}
            style={{ marginTop: 20 }}
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

  flexOne: { flex: 1 },

  container: { flex: 1, paddingHorizontal: 22 },

  boldText: { fontWeight: '900' },

  flatCard: { borderRadius: 32, marginBottom: 18 },

  cardInternal: { padding: 26 },

  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },

  progressSection: { flexDirection: 'row', alignItems: 'center' },

  barWrapper: { flex: 1, height: 12, borderRadius: 6, overflow: 'hidden' },

  mainBar: { height: 12 },

  progressLabel: { marginLeft: 15, fontWeight: '900' },

  navHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },

  moduleTile: { borderRadius: 24, marginBottom: 14 },

  moduleRow: { flexDirection: 'row', alignItems: 'center', padding: 18 },

  statusCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center'
  },

  numberText: { fontWeight: '900', fontSize: 16 },

  locked: { opacity: 0.35 },

  modernQuizModal: {
    padding: 28,
    margin: 20,
    borderRadius: 38
  },

  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10
  },

  startQuizButton: {
    marginTop: 20
  }

});