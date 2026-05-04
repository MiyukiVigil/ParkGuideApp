import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  ImageBackground,
  PanResponder,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { DeviceMotion } from "expo-sensors";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Button, Chip, ProgressBar, Surface, Text, useTheme } from "react-native-paper";

import AppHeader from "../../components/AppHeader";
import ThemedBackground from "../../components/ThemedBackground";
import { useThemeContext } from "../../contexts/ThemeContext";
import arTrainingService from "../../services/arTrainingService";

const remoteFallback =
  "https://firebasestorage.googleapis.com/v0/b/parkguideapp-c8517.firebasestorage.app/o/assests%2F360%2FAdobeStock_15550322.jpeg?alt=media&token=c9d64eed-c48a-4075-b9e3-35314566cd68";
const localFallbackImage = require("../../assets/360/forest1.jpeg");

const scanTargets = [
  { id: "left", label: "Left", icon: "arrow-left-bold", test: ({ yaw }) => yaw < -32 },
  { id: "right", label: "Right", icon: "arrow-right-bold", test: ({ yaw }) => yaw > 32 },
  { id: "up", label: "Up", icon: "arrow-up-bold", test: ({ pitch }) => pitch > 18 },
  { id: "down", label: "Down", icon: "arrow-down-bold", test: ({ pitch }) => pitch < -18 },
];

const scenarioMeta = {
  biodiversity: { icon: "leaf", label: "Biodiversity", color: "#2E7D32" },
  ecotourism: { icon: "walk", label: "Eco-tourism", color: "#00897B" },
  wildlife: { icon: "paw", label: "Wildlife", color: "#D84315" },
  conservation: { icon: "shield-leaf", label: "Conservation", color: "#5E35B1" },
  guiding: { icon: "account-voice", label: "Guide Skills", color: "#1565C0" },
};

const offlineScenario = {
  id: "offline",
  code: "offline-ar-training",
  scenario_type: "biodiversity",
  title: {
    en: "Forest Biodiversity Guiding Simulation",
    ms: "Simulasi Panduan Biodiversiti Hutan",
    zh: "森林生物多样性导览模拟",
  },
  description: {
    en: "Scan the simulated forest, explain key biodiversity concepts, and practise confident guide decisions.",
    ms: "Imbas hutan simulasi, terangkan konsep biodiversiti utama, dan latih keputusan pemandu yang yakin.",
    zh: "扫描模拟森林，讲解关键生物多样性概念，并练习自信的导游决策。",
  },
  learning_objectives: [
    {
      en: "Introduce biodiversity through visible forest evidence.",
      ms: "Perkenalkan biodiversiti melalui bukti hutan yang dapat dilihat.",
      zh: "通过可见的森林证据介绍生物多样性。",
    },
    {
      en: "Use safe, low-impact guide instructions.",
      ms: "Gunakan arahan pemandu yang selamat dan rendah impak.",
      zh: "使用安全、低影响的导游指令。",
    },
  ],
  panoramas: [
    {
      id: "offline-panorama",
      name: "Training View",
      panorama_url: remoteFallback,
      hotspots: [
        {
          id: "canopy",
          hotspot_id: "canopy",
          title: { en: "Canopy Layer", ms: "Lapisan Kanopi", zh: "林冠层" },
          position_yaw: 35,
          position_pitch: 28,
          icon_type: "tree",
          color_hint: "#2E7D32",
          content: {
            description: {
              en: "Explain how the canopy creates food, shade, and nesting spaces for wildlife.",
              ms: "Terangkan bagaimana kanopi menghasilkan makanan, teduhan, dan ruang sarang untuk hidupan liar.",
              zh: "说明林冠如何为野生动物创造食物、遮荫和筑巢空间。",
            },
          },
        },
        {
          id: "understory",
          hotspot_id: "understory",
          title: { en: "Understory Plants", ms: "Tumbuhan Lapisan Bawah", zh: "林下植物" },
          position_yaw: 142,
          position_pitch: 2,
          icon_type: "sprout",
          color_hint: "#43A047",
          content: {
            description: {
              en: "Point out shade-tolerant plants and tell visitors why staying on the trail protects seedlings.",
              ms: "Tunjukkan tumbuhan tahan teduh dan beritahu pelawat mengapa kekal di laluan melindungi anak pokok.",
              zh: "指出耐阴植物，并告诉游客留在步道上如何保护幼苗。",
            },
          },
        },
        {
          id: "floor",
          hotspot_id: "floor",
          title: { en: "Forest Floor", ms: "Lantai Hutan", zh: "森林地面" },
          position_yaw: 236,
          position_pitch: -26,
          icon_type: "mushroom",
          color_hint: "#795548",
          content: {
            description: {
              en: "Use leaf litter and fungi to explain nutrient cycling.",
              ms: "Gunakan daun reput dan kulat untuk menerangkan kitaran nutrien.",
              zh: "利用落叶和真菌解释养分循环。",
            },
          },
        },
      ],
    },
  ],
  quizzes: [
    {
      id: "offline-q1",
      question_text: {
        en: "A visitor asks why fallen logs should stay in place. What is the best response?",
        ms: "Pelawat bertanya mengapa kayu tumbang perlu kekal. Apakah jawapan terbaik?",
        zh: "游客问为什么倒木应保留原地。最佳回答是什么？",
      },
      options: {
        en: ["They recycle nutrients and shelter organisms.", "They only make the trail look natural.", "They stop all animals from entering.", "They should be removed for decoration."],
        ms: ["Ia mengitar nutrien dan melindungi organisma.", "Ia hanya membuat laluan nampak semula jadi.", "Ia menghalang semua haiwan masuk.", "Ia patut dibuang untuk hiasan."],
        zh: ["它们循环养分并庇护生物。", "它们只是让步道看起来自然。", "它们阻止所有动物进入。", "它们应移走作装饰。"],
      },
      correct_option_index: 0,
      correct_explanation: {
        en: "Correct. Fallen logs are part of nutrient cycling and habitat.",
        ms: "Betul. Kayu tumbang ialah sebahagian daripada kitaran nutrien dan habitat.",
        zh: "正确。倒木是养分循环和栖息地的一部分。",
      },
      incorrect_explanation: {
        en: "Review the forest floor hotspot and focus on ecological function.",
        ms: "Semak hotspot lantai hutan dan fokus pada fungsi ekologi.",
        zh: "请复习森林地面热点，并关注生态功能。",
      },
    },
  ],
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const parseMaybeJson = (value) => {
  if (!value || typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const getLocalizedText = (value, language, fallback = "") => {
  const parsed = parseMaybeJson(value);
  if (!parsed) return fallback;
  if (typeof parsed === "string") return parsed;
  return parsed[language] || parsed.en || parsed.ms || parsed.zh || fallback;
};

const getOptions = (quiz, language) => {
  const options = parseMaybeJson(quiz?.options);
  if (Array.isArray(options)) return options;
  if (!options) return [];
  return options[language] || options.en || options.ms || options.zh || [];
};

const getHotspotDescription = (hotspot, language) =>
  getLocalizedText(
    hotspot?.content?.description || hotspot?.content?.guide_script || hotspot?.content,
    language,
    "Review this field cue and explain it clearly to visitors."
  );

const hotspotToPosition = (hotspot) => {
  const yaw = Number(hotspot.position_yaw || 0);
  const pitch = Number(hotspot.position_pitch || 0);
  return {
    x: clamp(((yaw % 360) / 360) * 100, 7, 93),
    y: clamp(50 - pitch * 0.78, 7, 91),
  };
};

export default function ARTrainingSimulation() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { i18n } = useTranslation();
  const { isSimpleMode, highContrast } = useThemeContext();
  const { scenarioId, image, scenario: scenarioParam } = useLocalSearchParams();
  const selectedScenarioId = Array.isArray(scenarioId) ? scenarioId[0] : scenarioId;
  const selectedImage = Array.isArray(image) ? image[0] : image;
  const scenarioTypeParam = Array.isArray(scenarioParam) ? scenarioParam[0] : scenarioParam;

  const [scenario, setScenario] = useState(offlineScenario);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(selectedScenarioId && !String(selectedScenarioId).startsWith("offline")));
  const [imageFailed, setImageFailed] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [orientation, setOrientation] = useState({ yaw: 0, pitch: 0 });
  const [scannedDirections, setScannedDirections] = useState([]);
  const [visitedHotspots, setVisitedHotspots] = useState([]);
  const [activeHotspotId, setActiveHotspotId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const parallaxX = useRef(new Animated.Value(0)).current;
  const parallaxY = useRef(new Animated.Value(0)).current;
  const orientationRef = useRef({ yaw: 0, pitch: 0 });
  const startedAt = useRef(Date.now());

  const loadScenario = useCallback(async () => {
    if (!selectedScenarioId || String(selectedScenarioId).startsWith("offline")) {
      setLoading(false);
      return;
    }

    try {
      const data = await arTrainingService.getScenarioDetails(selectedScenarioId);
      setScenario(data);
      try {
        const started = await arTrainingService.startScenario(selectedScenarioId);
        setSession(started);
      } catch (error) {
        console.log("Unable to start AR session", error.response?.data || error.message);
      }
    } catch (error) {
      console.log("Unable to load AR scenario", error.response?.data || error.message);
      Alert.alert("Offline simulation", "Backend scenario could not load, so a local training simulation is shown.");
    } finally {
      setLoading(false);
    }
  }, [selectedScenarioId]);

  useEffect(() => {
    loadScenario();
  }, [loadScenario]);

  const panorama = scenario.panoramas?.[0] || offlineScenario.panoramas[0];
  const hotspots = panorama.hotspots?.length ? panorama.hotspots : offlineScenario.panoramas[0].hotspots;
  const quizzes = scenario.quizzes?.length ? scenario.quizzes : offlineScenario.quizzes;
  const scenarioType = scenario.scenario_type || scenarioTypeParam || "biodiversity";
  const meta = scenarioMeta[scenarioType] || scenarioMeta.biodiversity;
  const title = getLocalizedText(scenario.title, i18n.language, "AR Training Simulation");
  const description = getLocalizedText(scenario.description, i18n.language);
  const imageUri = selectedImage || panorama.panorama_url || scenario.initial_panorama_url || remoteFallback;
  const imageSource = imageFailed ? localFallbackImage : { uri: imageUri };
  const activeHotspot = hotspots.find((item) => (item.hotspot_id || item.id) === activeHotspotId);
  const cardRadius = isSimpleMode || highContrast ? 8 : 8;
  const sceneHeight = Math.min(520, Math.max(330, width * 0.92));

  const progress = useMemo(() => {
    const hotspotPart = hotspots.length ? visitedHotspots.length / hotspots.length : 1;
    const scanPart = scannedDirections.length / scanTargets.length;
    const quizPart = quizzes.length ? (quizResult?.passed ? 1 : 0) : 1;
    return clamp((hotspotPart + scanPart + quizPart) / 3, 0, 1);
  }, [hotspots.length, quizzes.length, quizResult, scannedDirections.length, visitedHotspots.length]);

  const applyOrientation = useCallback(
    (next) => {
      const clamped = {
        yaw: clamp(next.yaw, -72, 72),
        pitch: clamp(next.pitch, -48, 48),
      };
      orientationRef.current = clamped;
      setOrientation(clamped);

      Animated.parallel([
        Animated.spring(parallaxX, {
          toValue: -clamped.yaw * 2.2,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.spring(parallaxY, {
          toValue: clamped.pitch * 2.25,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start();

      setScannedDirections((current) => {
        const found = scanTargets
          .filter((target) => target.test(clamped))
          .map((target) => target.id)
          .filter((id) => !current.includes(id));
        return found.length ? [...current, ...found] : current;
      });
    },
    [parallaxX, parallaxY]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        const current = orientationRef.current;
        applyOrientation({
          yaw: current.yaw + gesture.dx * 0.18,
          pitch: current.pitch - gesture.dy * 0.18,
        });
      },
    })
  ).current;

  useEffect(() => {
    if (!motionEnabled) return undefined;

    DeviceMotion.setUpdateInterval(100);
    const subscription = DeviceMotion.addListener((event) => {
      const beta = event.rotation?.beta || 0;
      const gamma = event.rotation?.gamma || 0;
      applyOrientation({
        pitch: beta * 42,
        yaw: gamma * 56,
      });
    });

    return () => subscription.remove();
  }, [applyOrientation, motionEnabled]);

  const nudge = (delta) => {
    applyOrientation({
      yaw: orientation.yaw + (delta.yaw || 0),
      pitch: orientation.pitch + (delta.pitch || 0),
    });
  };

  const toggleMotion = async () => {
    if (motionEnabled) {
      setMotionEnabled(false);
      return;
    }

    const available = await DeviceMotion.isAvailableAsync();
    if (!available) {
      Alert.alert("Motion unavailable", "Use drag or the direction buttons to complete the scan.");
      return;
    }
    setMotionEnabled(true);
  };

  const markHotspot = async (hotspot) => {
    const id = hotspot.hotspot_id || hotspot.id;
    setActiveHotspotId(id);
    setVisitedHotspots((current) => (current.includes(id) ? current : [...current, id]));

    if (typeof hotspot.id === "number") {
      try {
        await arTrainingService.discoverHotspot(hotspot.id);
      } catch (error) {
        console.log("Hotspot sync failed", error.response?.data || error.message);
      }
    }
  };

  const submitQuiz = async () => {
    const unanswered = quizzes.some((_, index) => answers[index] === undefined);
    if (unanswered) {
      Alert.alert("Questions incomplete", "Answer every training question first.");
      return;
    }

    setSubmitting(true);
    try {
      let correct = 0;
      const feedback = [];
      for (const [index, quiz] of quizzes.entries()) {
        const answer = answers[index];
        if (typeof quiz.id === "number") {
          const result = await arTrainingService.answerQuiz(quiz.id, answer, 20);
          if (result.correct) correct += 1;
          feedback.push(result.correct_explanation || result.incorrect_explanation);
        } else if (answer === quiz.correct_option_index) {
          correct += 1;
          feedback.push(quiz.correct_explanation);
        } else {
          feedback.push(quiz.incorrect_explanation);
        }
      }
      const score = Math.round((correct / quizzes.length) * 100);
      setQuizResult({ correct, score, passed: score >= 70, feedback });
    } catch (error) {
      console.log("Quiz sync failed", error.response?.data || error.message);
      Alert.alert("Quiz sync failed", "Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const completeTraining = async () => {
    if (visitedHotspots.length < hotspots.length) {
      Alert.alert("Hotspots remaining", "Tap every hotspot before completing the simulation.");
      return;
    }
    if (scannedDirections.length < scanTargets.length) {
      Alert.alert("Scan incomplete", "Scan left, right, up, and down. Dragging the scene also works.");
      return;
    }
    if (quizzes.length && !quizResult?.passed) {
      Alert.alert("Quiz not passed", "Score at least 70% on the scenario questions.");
      return;
    }

    if (session?.progress_id) {
      try {
        await arTrainingService.updateProgress(session.progress_id, {
          hotspots_discovered: visitedHotspots,
          panoramas_visited: [panorama.id],
          quizzes_completed: quizResult ? [{ score: quizResult.score, passed: quizResult.passed }] : [],
          completion_percentage: 100,
          is_completed: true,
          time_spent_seconds: Math.round((Date.now() - startedAt.current) / 1000),
        });
      } catch (error) {
        console.log("Progress sync failed", error.response?.data || error.message);
      }
    }

    Alert.alert("Training completed", "The simulation is complete and your AR progress was saved when possible.");
  };

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <ThemedBackground />
        <AppHeader title="AR Training" showBack showHome />
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>Loading simulation...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ThemedBackground />
      <AppHeader title={title} subtitle="Immersive guide practice" showBack showHome />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Surface
          elevation={2}
          style={[
            styles.sceneCard,
            {
              borderRadius: cardRadius,
              borderColor: theme.colors.outlineVariant,
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <View style={[styles.scene, { height: sceneHeight }]} {...panResponder.panHandlers}>
            <Animated.View
              style={[
                styles.sceneImageWrap,
                {
                  transform: [{ translateX: parallaxX }, { translateY: parallaxY }],
                },
              ]}
            >
              <ImageBackground
                source={imageSource}
                resizeMode="cover"
                style={styles.sceneImage}
                onError={() => setImageFailed(true)}
              />
            </Animated.View>

            <View style={styles.sceneOverlay}>
              <View style={styles.reticle}>
                <MaterialCommunityIcons name="crosshairs-gps" size={34} color="#FFFFFF" />
              </View>
              {hotspots.map((hotspot) => {
                const id = hotspot.hotspot_id || hotspot.id;
                const position = hotspotToPosition(hotspot);
                const done = visitedHotspots.includes(id);
                return (
                  <TouchableOpacity
                    key={id}
                    activeOpacity={0.85}
                    onPress={() => markHotspot(hotspot)}
                    style={[
                      styles.hotspot,
                      {
                        left: `${position.x}%`,
                        top: `${position.y}%`,
                        backgroundColor: done ? theme.colors.primary : hotspot.color_hint || meta.color,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons name={done ? "check" : hotspot.icon_type || "map-marker-question"} size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Surface>

        <Surface elevation={1} style={[styles.panel, { backgroundColor: theme.colors.surface, borderRadius: cardRadius }]}>
          <View style={styles.rowBetween}>
            <Chip icon={meta.icon} compact>
              {meta.label}
            </Chip>
            <Text style={[styles.progressText, { color: theme.colors.primary }]}>{Math.round(progress * 100)}%</Text>
          </View>
          <ProgressBar progress={progress} color={theme.colors.primary} style={styles.progressBar} />
          <Text style={[styles.bodyText, { color: theme.colors.onSurfaceVariant }]}>{description}</Text>

          <View style={styles.controlRow}>
            <Button mode={motionEnabled ? "contained" : "outlined"} icon="cellphone-arrow-down" onPress={toggleMotion} style={styles.motionButton}>
              {motionEnabled ? "Gyro active" : "Use gyro"}
            </Button>
            <View style={styles.nudgeGrid}>
              <TouchableOpacity style={[styles.nudgeButton, { borderColor: theme.colors.outlineVariant }]} onPress={() => nudge({ pitch: 18 })}>
                <MaterialCommunityIcons name="arrow-up-bold" size={18} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.nudgeButton, { borderColor: theme.colors.outlineVariant }]} onPress={() => nudge({ yaw: -22 })}>
                <MaterialCommunityIcons name="arrow-left-bold" size={18} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.nudgeButton, { borderColor: theme.colors.outlineVariant }]} onPress={() => nudge({ yaw: 22 })}>
                <MaterialCommunityIcons name="arrow-right-bold" size={18} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.nudgeButton, { borderColor: theme.colors.outlineVariant }]} onPress={() => nudge({ pitch: -18 })}>
                <MaterialCommunityIcons name="arrow-down-bold" size={18} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.scanRow}>
            {scanTargets.map((target) => {
              const done = scannedDirections.includes(target.id);
              return (
                <Chip key={target.id} icon={done ? "check" : target.icon} selected={done} compact style={styles.scanChip}>
                  {target.label}
                </Chip>
              );
            })}
          </View>
        </Surface>

        {activeHotspot ? (
          <Surface elevation={1} style={[styles.panel, { backgroundColor: theme.colors.surface, borderRadius: cardRadius }]}>
            <Text style={[styles.panelTitle, { color: theme.colors.onSurface }]}>
              {getLocalizedText(activeHotspot.title, i18n.language)}
            </Text>
            <Text style={[styles.bodyText, { color: theme.colors.onSurfaceVariant }]}>
              {getHotspotDescription(activeHotspot, i18n.language)}
            </Text>
            {activeHotspot.content?.visitor_prompt ? (
              <Text style={[styles.promptText, { color: theme.colors.primary }]}>
                {getLocalizedText(activeHotspot.content.visitor_prompt, i18n.language)}
              </Text>
            ) : null}
          </Surface>
        ) : null}

        <Surface elevation={1} style={[styles.panel, { backgroundColor: theme.colors.surface, borderRadius: cardRadius }]}>
          <Text style={[styles.panelTitle, { color: theme.colors.onSurface }]}>Scenario Questions</Text>
          {quizzes.map((quiz, questionIndex) => (
            <View key={quiz.id || quiz.question_id || questionIndex} style={styles.questionBlock}>
              <Text style={[styles.questionText, { color: theme.colors.onSurface }]}>
                {questionIndex + 1}. {getLocalizedText(quiz.question_text, i18n.language)}
              </Text>
              {getOptions(quiz, i18n.language).map((option, optionIndex) => {
                const selected = answers[questionIndex] === optionIndex;
                return (
                  <TouchableOpacity
                    key={`${option}-${optionIndex}`}
                    activeOpacity={0.84}
                    onPress={() => {
                      setAnswers((current) => ({ ...current, [questionIndex]: optionIndex }));
                      setQuizResult(null);
                    }}
                    style={[
                      styles.option,
                      {
                        borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
                        backgroundColor: selected ? theme.colors.primaryContainer : theme.colors.surface,
                      },
                    ]}
                  >
                    <Text style={{ color: selected ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant, fontWeight: selected ? "800" : "500" }}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {quizResult ? (
            <View style={styles.resultBlock}>
              <Text style={[styles.resultText, { color: quizResult.passed ? theme.colors.primary : theme.colors.error }]}>
                Score: {quizResult.score}% ({quizResult.correct}/{quizzes.length})
              </Text>
              {quizResult.feedback?.[0] ? (
                <Text style={[styles.bodyText, { color: theme.colors.onSurfaceVariant }]}>
                  {getLocalizedText(quizResult.feedback[0], i18n.language)}
                </Text>
              ) : null}
            </View>
          ) : null}

          <Button mode="outlined" icon="checkbox-marked-circle-outline" onPress={submitQuiz} loading={submitting} disabled={submitting} style={styles.motionButton}>
            Check answers
          </Button>
        </Surface>

        <Button mode="contained" icon="clipboard-check" onPress={completeTraining} style={styles.completeButton}>
          Complete AR Training
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  sceneCard: {
    overflow: "hidden",
    borderWidth: 1,
  },
  scene: {
    overflow: "hidden",
    backgroundColor: "#08120D",
  },
  sceneImageWrap: {
    position: "absolute",
    top: -140,
    left: -180,
    right: -180,
    bottom: -150,
  },
  sceneImage: {
    flex: 1,
  },
  sceneOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  reticle: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 56,
    height: 56,
    marginLeft: -28,
    marginTop: -28,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    backgroundColor: "rgba(0,0,0,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  hotspot: {
    position: "absolute",
    width: 40,
    height: 40,
    marginLeft: -20,
    marginTop: -20,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  panel: {
    marginTop: 14,
    padding: 14,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressText: {
    fontSize: 18,
    fontWeight: "900",
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginTop: 10,
    marginBottom: 12,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  controlRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  motionButton: {
    marginTop: 12,
    borderRadius: 8,
  },
  nudgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 6,
    width: 104,
  },
  nudgeButton: {
    width: 46,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  scanRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  scanChip: {
    marginRight: 0,
  },
  panelTitle: {
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 8,
  },
  promptText: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
  },
  questionBlock: {
    marginTop: 10,
  },
  questionText: {
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    marginBottom: 8,
  },
  option: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    justifyContent: "center",
  },
  resultBlock: {
    marginTop: 8,
    gap: 6,
  },
  resultText: {
    fontSize: 15,
    fontWeight: "900",
  },
  completeButton: {
    marginTop: 18,
    borderRadius: 8,
  },
});
