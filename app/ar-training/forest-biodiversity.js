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

const deepRavinePanorama =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/A_panoramic_example_of_the_deep_ravine_forest_ecosystem._%2831018541-539e-49b5-be18-dd6123962a3a%29.JPG/3840px-A_panoramic_example_of_the_deep_ravine_forest_ecosystem._%2831018541-539e-49b5-be18-dd6123962a3a%29.JPG";
const localFallbackImage = require("../../assets/360/forest1.jpeg");
const PAN_STEP = 260;
const PHONE_LOOK_RANGE = 900;
const PHONE_LOOK_SMOOTHING = 0.18;

const scenarioMeta = {
  biodiversity: { icon: "leaf", label: "Biodiversity", color: "#2E7D32" },
  ecotourism: { icon: "walk", label: "Eco-tourism", color: "#00897B" },
  wildlife: { icon: "paw", label: "Wildlife", color: "#D84315" },
  conservation: { icon: "shield-leaf", label: "Conservation", color: "#5E35B1" },
  guiding: { icon: "account-voice", label: "Guide Skills", color: "#1565C0" },
};

const offlineScenario = {
  id: "offline",
  code: "offline-forest-vr",
  scenario_type: "biodiversity",
  title: { en: "Forest 360 VR Guide Training" },
  description: {
    en: "Explore a 360 forest panorama, focus on training hotspots, and practise guide responses.",
  },
  field_brief: {
    en: "A visitor group has paused inside a sensitive forest ecosystem. Use the 360 view to identify teaching moments and practise confident guide responses.",
  },
  learning_objectives: [
    { en: "Identify biodiversity teaching points inside a realistic 360 scene." },
    { en: "Practise low-impact visitor management." },
    { en: "Explain wildlife and habitat concepts using visible field evidence." },
  ],
  success_criteria: [
    { en: "Open every 360 hotspot." },
    { en: "Review each visitor prompt and guide response." },
    { en: "Pass the field decision check with at least 70%." },
  ],
  initial_panorama_url: deepRavinePanorama,
  panoramas: [
    {
      id: "offline-panorama",
      name: "Forest 360 training stop",
      panorama_url: deepRavinePanorama,
      hotspots: [
        {
          id: "canopy",
          hotspot_id: "canopy",
          title: { en: "Canopy Habitat" },
          icon_type: "tree",
          color_hint: "#2E7D32",
          position_yaw: 42,
          position_pitch: 24,
          content: {
            description: { en: "Use the canopy to explain layers, shelter, food sources, and species niches." },
            visitor_prompt: { en: 'A visitor asks: "Why does the forest look layered instead of all the same height?"' },
            guide_action: { en: "Explain canopy, understory, and forest floor roles while asking visitors to observe without touching plants." },
          },
        },
        {
          id: "trail-edge",
          hotspot_id: "trail-edge",
          title: { en: "Trail Edge Regeneration" },
          icon_type: "sprout",
          color_hint: "#43A047",
          position_yaw: 156,
          position_pitch: -2,
          content: {
            description: { en: "Seedlings and low plants show how trampling can slow forest recovery." },
            visitor_prompt: { en: "A visitor steps off the trail to get a closer photo." },
            guide_action: { en: "Bring them back calmly and explain how staying on the trail protects young plants." },
          },
        },
        {
          id: "forest-floor",
          hotspot_id: "forest-floor",
          title: { en: "Forest Floor Cycle" },
          icon_type: "mushroom",
          color_hint: "#795548",
          position_yaw: 258,
          position_pitch: -24,
          content: {
            description: { en: "Leaf litter, fungi, and fallen wood return nutrients and create microhabitats." },
            visitor_prompt: { en: "A visitor asks why the park does not remove all fallen branches." },
            guide_action: { en: "Explain nutrient cycling and distinguish natural debris from safety hazards." },
          },
        },
        {
          id: "wildlife-buffer",
          hotspot_id: "wildlife-buffer",
          title: { en: "Wildlife Buffer" },
          icon_type: "paw",
          color_hint: "#D84315",
          position_yaw: 318,
          position_pitch: 4,
          content: {
            description: { en: "Dense vegetation can hide wildlife. Guides should manage distance, noise, and food." },
            visitor_prompt: { en: "A visitor hears movement and wants to move closer." },
            guide_action: { en: "Keep the group together, lower voices, secure food, and maintain a respectful distance." },
          },
        },
      ],
    },
  ],
  quizzes: [
    {
      id: "offline-q1",
      question_text: { en: "A visitor steps off the trail for a photo near seedlings. What should the guide do?" },
      options: {
        en: [
          "Bring them back politely and explain trampling damage.",
          "Allow it if they only step off briefly.",
          "Pick up a seedling and show it to the group.",
          "Ignore it to avoid interrupting the tour.",
        ],
      },
      correct_option_index: 0,
      correct_explanation: { en: "Correct. The guide protects the site and turns the moment into learning." },
      incorrect_explanation: { en: "The best answer combines visitor care, habitat protection, and a short explanation." },
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

const getLocalizedList = (items, language) =>
  (Array.isArray(items) ? items : [])
    .map((item) => getLocalizedText(item, language))
    .filter(Boolean);

const getOptions = (quiz, language) => {
  const options = parseMaybeJson(quiz?.options);
  if (Array.isArray(options)) return options;
  if (!options) return [];
  return options[language] || options.en || options.ms || options.zh || [];
};

const getHotspotId = (hotspot) => String(hotspot.hotspot_id || hotspot.id);

const getCueDescription = (hotspot, language) =>
  getLocalizedText(
    hotspot?.content?.description || hotspot?.content?.guide_script || hotspot?.content,
    language,
    "Review this hotspot and decide how you would explain it to visitors."
  );

const getCuePrompt = (hotspot, language) =>
  getLocalizedText(hotspot?.content?.visitor_prompt, language, "What should the guide do here?");

const getCueAction = (hotspot, language) =>
  getLocalizedText(hotspot?.content?.guide_action, language, "Give a calm explanation and manage visitor impact.");

const getHotspotPosition = (hotspot, panoramaWidth, sceneHeight) => {
  const yaw = ((Number(hotspot.position_yaw || 0) % 360) + 360) % 360;
  const pitch = clamp(Number(hotspot.position_pitch || 0), -55, 55);
  return {
    x: (yaw / 360) * panoramaWidth,
    y: sceneHeight * (0.5 - pitch / 130),
  };
};

export default function ForestVRTraining() {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
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
  const [phoneLookEnabled, setPhoneLookEnabled] = useState(false);
  const [selectedHotspotId, setSelectedHotspotId] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [visitedHotspotIds, setVisitedHotspotIds] = useState([]);
  const [answers, setAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const panX = useRef(new Animated.Value(0)).current;
  const panStart = useRef(0);
  const panCurrent = useRef(0);
  const phoneLookRef = useRef(null);
  const syncedHotspots = useRef(new Set());
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
        console.log("Unable to start VR session", error.response?.data || error.message);
      }
    } catch (error) {
      console.log("Unable to load VR scenario", error.response?.data || error.message);
      Alert.alert("Offline VR", "Backend scenario could not load, so a local 360 training view is shown.");
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
  const title = getLocalizedText(scenario.title, i18n.language, "Forest 360 VR Guide Training");
  const description = getLocalizedText(scenario.description, i18n.language);
  const successCriteria = getLocalizedList(scenario.success_criteria, i18n.language);
  const candidateImage = panorama.panorama_url || scenario.initial_panorama_url || selectedImage;
  const imageUri = candidateImage && !String(candidateImage).includes("firebasestorage")
    ? candidateImage
    : deepRavinePanorama;
  const imageSource = imageFailed ? localFallbackImage : { uri: imageUri };
  const cardRadius = isSimpleMode || highContrast ? 8 : 8;
  const sceneHeight = Math.min(Math.max(height * 0.62, 430), 640);
  const panoramaWidth = Math.max(width * 3.2, sceneHeight * 2.25);
  const minPan = width - panoramaWidth;

  const cues = useMemo(
    () =>
      hotspots.map((hotspot, index) => ({
        hotspot,
        index,
        id: getHotspotId(hotspot),
        title: getLocalizedText(hotspot.title, i18n.language, `Hotspot ${index + 1}`),
        reviewed: visitedHotspotIds.includes(getHotspotId(hotspot)),
        position: getHotspotPosition(hotspot, panoramaWidth, sceneHeight),
      })),
    [hotspots, i18n.language, panoramaWidth, sceneHeight, visitedHotspotIds]
  );

  const selectedCue = cues.find((cue) => cue.id === selectedHotspotId) || cues[0];
  const progress = useMemo(() => {
    const hotspotPart = cues.length ? visitedHotspotIds.length / cues.length : 1;
    const quizPart = quizzes.length ? (quizResult?.passed ? 1 : 0) : 1;
    return clamp(hotspotPart * 0.75 + quizPart * 0.25, 0, 1);
  }, [cues.length, quizResult, quizzes.length, visitedHotspotIds.length]);

  const setPan = useCallback(
    (value, animated = false) => {
      const next = clamp(value, minPan, 0);
      panCurrent.current = next;
      if (animated) {
        Animated.spring(panX, {
          toValue: next,
          friction: 9,
          tension: 44,
          useNativeDriver: true,
        }).start();
      } else {
        panX.setValue(next);
      }
    },
    [minPan, panX]
  );

  const focusCue = useCallback(
    (cue, showPopup = false) => {
      if (!cue) return;
      setSelectedHotspotId(cue.id);
      setPopupVisible(showPopup);
      setPan(width / 2 - cue.position.x, true);
    },
    [setPan, width]
  );

  useEffect(() => {
    if (selectedCue && !selectedHotspotId) {
      focusCue(selectedCue);
    }
  }, [focusCue, selectedCue, selectedHotspotId]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        if (phoneLookEnabled) {
          setPhoneLookEnabled(false);
          phoneLookRef.current = null;
        }
        panStart.current = panCurrent.current;
      },
      onPanResponderMove: (_, gesture) => {
        setPan(panStart.current + gesture.dx, false);
      },
    })
  ).current;

  useEffect(() => {
    if (!phoneLookEnabled) return undefined;

    DeviceMotion.setUpdateInterval(50);
    const subscription = DeviceMotion.addListener((event) => {
      const gamma = event.rotation?.gamma || 0;
      if (!phoneLookRef.current) {
        phoneLookRef.current = {
          gamma,
          pan: panCurrent.current,
        };
        return;
      }

      const target = phoneLookRef.current.pan - (gamma - phoneLookRef.current.gamma) * PHONE_LOOK_RANGE;
      const next = panCurrent.current + (target - panCurrent.current) * PHONE_LOOK_SMOOTHING;
      setPan(next, false);
    });

    return () => subscription.remove();
  }, [phoneLookEnabled, setPan]);

  const togglePhoneLook = async () => {
    if (phoneLookEnabled) {
      setPhoneLookEnabled(false);
      phoneLookRef.current = null;
      return;
    }

    const available = await DeviceMotion.isAvailableAsync();
    if (!available) {
      Alert.alert("Phone look unavailable", "Use swipe or the left/right buttons to explore the 360 view.");
      return;
    }

    phoneLookRef.current = null;
    setPhoneLookEnabled(true);
  };

  const stepPan = useCallback((direction) => {
    setPan(panCurrent.current + direction * PAN_STEP, true);
  }, [setPan]);

  const jumpToPercent = useCallback((percent) => {
    setPan(minPan * percent, true);
  }, [minPan, setPan]);

  const reviewCue = useCallback(async () => {
    if (!selectedCue?.hotspot) return;
    const id = selectedCue.id;
    setPopupVisible(true);
    setVisitedHotspotIds((current) => (current.includes(id) ? current : [...current, id]));

    if (typeof selectedCue.hotspot.id === "number" && !syncedHotspots.current.has(id)) {
      syncedHotspots.current.add(id);
      try {
        await arTrainingService.discoverHotspot(selectedCue.hotspot.id);
      } catch (error) {
        console.log("Hotspot sync failed", error.response?.data || error.message);
      }
    }
  }, [selectedCue]);

  const focusNextCue = useCallback(() => {
    if (!cues.length) return;
    const nextCue = cues.find((cue) => !cue.reviewed) || cues[(selectedCue?.index + 1) % cues.length] || cues[0];
    focusCue(nextCue, true);
  }, [cues, focusCue, selectedCue]);

  const submitQuiz = async () => {
    const unanswered = quizzes.some((_, index) => answers[index] === undefined);
    if (unanswered) {
      Alert.alert("Questions incomplete", "Answer every field decision first.");
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
    if (visitedHotspotIds.length < cues.length) {
      Alert.alert("Hotspots remaining", "Open and review every VR hotspot first.");
      return;
    }
    if (quizzes.length && !quizResult?.passed) {
      Alert.alert("Decision check not passed", "Score at least 70% on the field decision questions.");
      return;
    }

    if (session?.progress_id) {
      try {
        await arTrainingService.updateProgress(session.progress_id, {
          hotspots_discovered: visitedHotspotIds,
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

    Alert.alert("Training completed", "The 360 VR training is complete and your progress was saved when possible.");
  };

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <ThemedBackground />
        <AppHeader title="360 VR Training" showBack showHome />
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>Loading 360 environment...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ThemedBackground />
      <AppHeader title={title} subtitle="360 hotspot training" showBack showHome />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.briefHeader}>
          <Chip icon={meta.icon} compact>
            {meta.label}
          </Chip>
          <Chip icon="panorama-horizontal" compact>
            360 view
          </Chip>
        </View>

        <Surface
          elevation={3}
          style={[
            styles.viewerCard,
            {
              height: sceneHeight,
              borderRadius: cardRadius,
              borderColor: theme.colors.outlineVariant,
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <View style={styles.viewer} {...panResponder.panHandlers}>
            <Animated.View
              style={[
                styles.panoramaLayer,
                {
                  width: panoramaWidth,
                  transform: [{ translateX: panX }],
                },
              ]}
            >
              <ImageBackground source={imageSource} resizeMode="cover" style={styles.panoramaImage} onError={() => setImageFailed(true)}>
                {cues.map((cue) => (
                  <TouchableOpacity
                    key={cue.id}
                    activeOpacity={0.88}
                    onPress={() => focusCue(cue, true)}
                    style={[
                      styles.hotspot,
                      {
                        left: cue.position.x,
                        top: cue.position.y,
                        backgroundColor: cue.reviewed ? theme.colors.primary : cue.hotspot.color_hint || meta.color,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons name={cue.reviewed ? "check" : cue.hotspot.icon_type || "map-marker-question"} size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                ))}
              </ImageBackground>
            </Animated.View>

            <View style={styles.viewerOverlay}>
              <View style={styles.viewerTopBar}>
                <View style={styles.viewerBadge}>
                  <MaterialCommunityIcons name="virtual-reality" size={18} color="#FFFFFF" />
                  <Text style={styles.viewerBadgeText}>{phoneLookEnabled ? "Phone look active" : "Drag to look around"}</Text>
                </View>
                <Text style={styles.viewerCounter}>
                  {visitedHotspotIds.length}/{cues.length}
                </Text>
              </View>

              {selectedCue ? (
                <View style={styles.selectedCueCard}>
                  <View style={[styles.selectedCueIcon, { backgroundColor: selectedCue.hotspot.color_hint || meta.color }]}>
                    <MaterialCommunityIcons name={selectedCue.hotspot.icon_type || "map-marker-question"} size={22} color="#FFFFFF" />
                  </View>
                  <View style={styles.selectedCueCopy}>
                    <Text numberOfLines={1} style={styles.selectedCueTitle}>{selectedCue.title}</Text>
                    <Text numberOfLines={2} style={styles.selectedCueText}>
                      {getCueDescription(selectedCue.hotspot, i18n.language)}
                    </Text>
                  </View>
                </View>
              ) : null}
              {popupVisible && selectedCue ? (
                <View style={styles.hotspotPopup}>
                  <View style={styles.popupHeader}>
                    <View style={[styles.popupIcon, { backgroundColor: selectedCue.hotspot.color_hint || meta.color }]}>
                      <MaterialCommunityIcons name={selectedCue.hotspot.icon_type || "map-marker-question"} size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.popupTitleWrap}>
                      <Text numberOfLines={1} style={styles.popupTitle}>{selectedCue.title}</Text>
                      <Text style={styles.popupSub}>{selectedCue.reviewed ? "Reviewed" : "Training hotspot"}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setPopupVisible(false)} style={styles.popupClose}>
                      <MaterialCommunityIcons name="close" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.popupBody}>{getCueDescription(selectedCue.hotspot, i18n.language)}</Text>
                  <View style={styles.popupCallout}>
                    <MaterialCommunityIcons name="account-question" size={17} color="#FFFFFF" />
                    <Text style={styles.popupCalloutText}>{getCuePrompt(selectedCue.hotspot, i18n.language)}</Text>
                  </View>
                  <View style={styles.popupCallout}>
                    <MaterialCommunityIcons name="account-voice" size={17} color="#FFFFFF" />
                    <Text style={styles.popupCalloutText}>{getCueAction(selectedCue.hotspot, i18n.language)}</Text>
                  </View>
                  <Button mode="contained" icon="check" onPress={reviewCue} style={styles.popupButton}>
                    Mark reviewed
                  </Button>
                </View>
              ) : null}
            </View>
          </View>
        </Surface>

        <Surface elevation={1} style={[styles.panel, { backgroundColor: theme.colors.surface, borderRadius: cardRadius }]}>
          <View style={styles.rowBetween}>
            <View style={styles.flexCopy}>
              <Text style={[styles.panelTitle, { color: theme.colors.onSurface }]}>VR Hotspots</Text>
              <Text style={[styles.bodyText, { color: theme.colors.onSurfaceVariant }]}>
                Tap hotspots in the 360 view. Content opens as a popup inside the viewer.
              </Text>
            </View>
            <Text style={[styles.progressText, { color: theme.colors.primary }]}>{Math.round(progress * 100)}%</Text>
          </View>
          <ProgressBar progress={progress} color={theme.colors.primary} style={styles.progressBar} />

          <View style={styles.controlRow}>
            <Button mode={phoneLookEnabled ? "contained" : "outlined"} icon="cellphone-arrow-down" onPress={togglePhoneLook} style={styles.controlButton}>
              {phoneLookEnabled ? "Phone look on" : "Phone look"}
            </Button>
            <Button mode="outlined" icon="chevron-left" onPress={() => stepPan(1)} style={styles.iconControlButton}>
              Left
            </Button>
            <Button mode="outlined" icon="chevron-right" onPress={() => stepPan(-1)} style={styles.iconControlButton}>
              Right
            </Button>
            <Button mode="contained" icon="book-open-page-variant" onPress={reviewCue} style={styles.controlButton}>
              Open popup
            </Button>
            <Button mode="outlined" icon="skip-next" onPress={focusNextCue} style={styles.controlButton}>
              Next hotspot
            </Button>
          </View>

          <View style={styles.compassRow}>
            {[0, 0.25, 0.5, 0.75, 1].map((point) => (
              <TouchableOpacity key={point} style={[styles.compassDot, { backgroundColor: theme.colors.primary }]} onPress={() => jumpToPercent(point)} />
            ))}
          </View>

          <View style={styles.cueGrid}>
            {cues.map((cue) => (
              <TouchableOpacity
                key={cue.id}
                activeOpacity={0.86}
                onPress={() => focusCue(cue, true)}
                style={[
                  styles.cueItem,
                  {
                    borderColor: cue.id === selectedCue?.id || cue.reviewed ? theme.colors.primary : theme.colors.outlineVariant,
                    backgroundColor: cue.reviewed ? theme.colors.primaryContainer : theme.colors.surface,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={cue.reviewed ? "check-circle" : cue.hotspot.icon_type || "map-marker-question"}
                  size={18}
                  color={cue.reviewed ? theme.colors.primary : theme.colors.onSurfaceVariant}
                />
                <Text numberOfLines={1} style={[styles.cueText, { color: cue.reviewed ? theme.colors.onPrimaryContainer : theme.colors.onSurface }]}>
                  {cue.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Surface>

        <Surface elevation={1} style={[styles.panel, { backgroundColor: theme.colors.surface, borderRadius: cardRadius }]}>
          <Text style={[styles.panelTitle, { color: theme.colors.onSurface }]}>Field Decision Check</Text>
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

          <Button mode="outlined" icon="checkbox-marked-circle-outline" onPress={submitQuiz} loading={submitting} disabled={submitting} style={styles.controlButton}>
            Check answers
          </Button>
        </Surface>

        <Button mode="contained" icon="clipboard-check" onPress={completeTraining} style={styles.completeButton}>
          Complete 360 VR Training
        </Button>

        {successCriteria.length ? (
          <Surface elevation={0} style={[styles.criteriaPanel, { backgroundColor: theme.colors.surfaceVariant, borderRadius: cardRadius }]}>
            <Text style={[styles.criteriaTitle, { color: theme.colors.onSurfaceVariant }]}>Completion Standard</Text>
            {successCriteria.map((item, index) => (
              <View key={`${item}-${index}`} style={styles.criteriaRow}>
                <MaterialCommunityIcons name="check-circle-outline" size={16} color={theme.colors.primary} />
                <Text style={[styles.criteriaText, { color: theme.colors.onSurfaceVariant }]}>{item}</Text>
              </View>
            ))}
          </Surface>
        ) : null}
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
    paddingBottom: 36,
  },
  briefHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: "row",
    gap: 8,
  },
  viewerCard: {
    marginHorizontal: 0,
    overflow: "hidden",
    borderWidth: 1,
  },
  viewer: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#07120C",
  },
  panoramaLayer: {
    height: "100%",
  },
  panoramaImage: {
    flex: 1,
  },
  hotspot: {
    position: "absolute",
    width: 46,
    height: 46,
    marginLeft: -23,
    marginTop: -23,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  viewerOverlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: "box-none",
  },
  viewerTopBar: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  viewerBadge: {
    minHeight: 34,
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(0,0,0,0.52)",
  },
  viewerBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  viewerCounter: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    backgroundColor: "rgba(0,0,0,0.42)",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: "hidden",
  },
  selectedCueCard: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    minHeight: 82,
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(0,0,0,0.62)",
  },
  selectedCueIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedCueCopy: {
    flex: 1,
  },
  selectedCueTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  selectedCueText: {
    color: "rgba(255,255,255,0.86)",
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  hotspotPopup: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 108,
    borderRadius: 8,
    padding: 12,
    backgroundColor: "rgba(7,18,12,0.9)",
  },
  popupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  popupIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  popupTitleWrap: {
    flex: 1,
  },
  popupTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  popupSub: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
    textTransform: "uppercase",
  },
  popupClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  popupBody: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  popupCallout: {
    marginTop: 9,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  popupCalloutText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  popupButton: {
    marginTop: 10,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  panel: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  flexCopy: {
    flex: 1,
  },
  panelTitle: {
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
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
  controlRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  controlButton: {
    borderRadius: 8,
  },
  iconControlButton: {
    borderRadius: 8,
    minWidth: 86,
  },
  compassRow: {
    marginTop: 12,
    minHeight: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  compassDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  cueGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  cueItem: {
    minHeight: 40,
    maxWidth: "100%",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  cueText: {
    maxWidth: 220,
    fontSize: 12,
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
    marginHorizontal: 16,
    marginTop: 18,
    borderRadius: 8,
  },
  criteriaPanel: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
  },
  criteriaTitle: {
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  criteriaRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    marginTop: 4,
  },
  criteriaText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
});
