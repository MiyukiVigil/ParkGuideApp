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
import courseService from "../../services/courseService";
import { AR_TRAINING_SCENARIOS } from "../../constants/arCourse";

const deepRavinePanorama =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/A_panoramic_example_of_the_deep_ravine_forest_ecosystem._%2831018541-539e-49b5-be18-dd6123962a3a%29.JPG/3840px-A_panoramic_example_of_the_deep_ravine_forest_ecosystem._%2831018541-539e-49b5-be18-dd6123962a3a%29.JPG";
const localFallbackImage = require("../../assets/360/forest1.jpeg");
const PAN_STEP = 260;
const PHONE_LOOK_RANGE = 900;
const PHONE_LOOK_SMOOTHING = 0.18;

const scenarioMeta = {
  biodiversity: { icon: "leaf", labelKey: "arBiodiversity", color: "#2E7D32" },
  ecotourism: { icon: "walk", labelKey: "arEcotourism", color: "#00897B" },
  wildlife: { icon: "paw", labelKey: "arWildlife", color: "#D84315" },
  conservation: { icon: "shield-leaf", labelKey: "arConservation", color: "#5E35B1" },
  guiding: { icon: "account-voice", labelKey: "arGuideSkills", color: "#1565C0" },
};

const offlineScenario = {
  id: "offline",
  code: "offline-forest-vr",
  scenario_type: "biodiversity",
  title: {
    en: "Forest 360 VR Guide Training",
    ms: "Latihan Panduan VR 360 Hutan",
    zh: "森林 360 VR 导览培训",
  },
  description: {
    en: "Explore a 360 forest panorama, focus on training hotspots, and practise guide responses.",
    ms: "Terokai panorama hutan 360, fokus pada hotspot latihan, dan latih respons pemandu.",
    zh: "探索 360 森林全景，聚焦训练热点，并练习导览员回应。",
  },
  field_brief: {
    en: "A visitor group has paused inside a sensitive forest ecosystem. Use the 360 view to identify teaching moments and practise confident guide responses.",
    ms: "Sekumpulan pelawat berhenti di dalam ekosistem hutan yang sensitif. Gunakan paparan 360 untuk mengenal pasti peluang penerangan dan melatih respons pemandu yang yakin.",
    zh: "一组游客停留在敏感的森林生态系统中。使用 360 视图识别讲解时机，并练习自信的导览回应。",
  },
  learning_objectives: [
    { en: "Identify biodiversity teaching points inside a realistic 360 scene.", ms: "Kenal pasti titik penerangan biodiversiti dalam adegan 360 yang realistik.", zh: "在真实的 360 场景中识别生物多样性讲解点。" },
    { en: "Practise low-impact visitor management.", ms: "Latih pengurusan pelawat berimpak rendah.", zh: "练习低影响游客管理。" },
    { en: "Explain wildlife and habitat concepts using visible field evidence.", ms: "Terangkan konsep hidupan liar dan habitat menggunakan bukti medan yang kelihatan.", zh: "使用可见现场证据解释野生动物和栖息地概念。" },
  ],
  success_criteria: [
    { en: "Open every 360 hotspot.", ms: "Buka setiap hotspot 360.", zh: "打开每个 360 热点。" },
    { en: "Review each visitor prompt and guide response.", ms: "Semak setiap prompt pelawat dan respons pemandu.", zh: "查看每个游客提示和导览回应。" },
    { en: "Pass the field decision check with at least 70%.", ms: "Lulus semakan keputusan medan dengan sekurang-kurangnya 70%.", zh: "现场决策检查至少达到 70% 即为通过。" },
  ],
  initial_panorama_url: deepRavinePanorama,
  panoramas: [
    {
      id: "offline-panorama",
      name: { en: "Forest 360 training stop", ms: "Hentian latihan hutan 360", zh: "森林 360 训练点" },
      panorama_url: deepRavinePanorama,
      hotspots: [
        {
          id: "canopy",
          hotspot_id: "canopy",
          title: { en: "Canopy Habitat", ms: "Habitat Kanopi", zh: "树冠栖息地" },
          icon_type: "tree",
          color_hint: "#2E7D32",
          position_yaw: 42,
          position_pitch: 24,
          content: {
            description: { en: "Use the canopy to explain layers, shelter, food sources, and species niches.", ms: "Gunakan kanopi untuk menerangkan lapisan, perlindungan, sumber makanan, dan niche spesies.", zh: "用树冠解释森林层次、庇护、食物来源和物种生态位。" },
            visitor_prompt: { en: 'A visitor asks: "Why does the forest look layered instead of all the same height?"', ms: 'Pelawat bertanya: "Mengapa hutan nampak berlapis dan bukan sama tinggi?"', zh: "游客问：为什么森林看起来有层次，而不是一样高？" },
            guide_action: { en: "Explain canopy, understory, and forest floor roles while asking visitors to observe without touching plants.", ms: "Terangkan peranan kanopi, bawah kanopi, dan lantai hutan sambil meminta pelawat memerhati tanpa menyentuh tumbuhan.", zh: "解释树冠、林下层和森林地面的作用，同时提醒游客观察但不要触摸植物。" },
          },
        },
        {
          id: "trail-edge",
          hotspot_id: "trail-edge",
          title: { en: "Trail Edge Regeneration", ms: "Pemulihan Tepi Laluan", zh: "步道边缘再生" },
          icon_type: "sprout",
          color_hint: "#43A047",
          position_yaw: 156,
          position_pitch: -2,
          content: {
            description: { en: "Seedlings and low plants show how trampling can slow forest recovery.", ms: "Anak pokok dan tumbuhan rendah menunjukkan bagaimana pijakan boleh melambatkan pemulihan hutan.", zh: "幼苗和低矮植物说明踩踏会减慢森林恢复。" },
            visitor_prompt: { en: "A visitor steps off the trail to get a closer photo.", ms: "Seorang pelawat keluar dari laluan untuk mengambil gambar lebih dekat.", zh: "一名游客离开步道想拍近照。" },
            guide_action: { en: "Bring them back calmly and explain how staying on the trail protects young plants.", ms: "Bawa mereka kembali dengan tenang dan terangkan bagaimana kekal di laluan melindungi tumbuhan muda.", zh: "平静地请他们回到步道，并说明留在步道上如何保护幼苗。" },
          },
        },
        {
          id: "forest-floor",
          hotspot_id: "forest-floor",
          title: { en: "Forest Floor Cycle", ms: "Kitaran Lantai Hutan", zh: "森林地面循环" },
          icon_type: "mushroom",
          color_hint: "#795548",
          position_yaw: 258,
          position_pitch: -24,
          content: {
            description: { en: "Leaf litter, fungi, and fallen wood return nutrients and create microhabitats.", ms: "Serasah daun, kulat, dan kayu tumbang mengembalikan nutrien serta mewujudkan mikrohabitat.", zh: "落叶、真菌和倒木回收养分并形成微栖息地。" },
            visitor_prompt: { en: "A visitor asks why the park does not remove all fallen branches.", ms: "Pelawat bertanya mengapa taman tidak membuang semua dahan tumbang.", zh: "游客问为什么公园不清除所有倒下的树枝。" },
            guide_action: { en: "Explain nutrient cycling and distinguish natural debris from safety hazards.", ms: "Terangkan kitaran nutrien dan bezakan bahan semula jadi daripada bahaya keselamatan.", zh: "解释养分循环，并区分自然残枝与安全隐患。" },
          },
        },
        {
          id: "wildlife-buffer",
          hotspot_id: "wildlife-buffer",
          title: { en: "Wildlife Buffer", ms: "Zon Penampan Hidupan Liar", zh: "野生动物缓冲区" },
          icon_type: "paw",
          color_hint: "#D84315",
          position_yaw: 318,
          position_pitch: 4,
          content: {
            description: { en: "Dense vegetation can hide wildlife. Guides should manage distance, noise, and food.", ms: "Tumbuhan tebal boleh menyembunyikan hidupan liar. Pemandu perlu mengawal jarak, bunyi, dan makanan.", zh: "茂密植被可能隐藏野生动物。导览员应管理距离、音量和食物。" },
            visitor_prompt: { en: "A visitor hears movement and wants to move closer.", ms: "Pelawat terdengar pergerakan dan ingin mendekati.", zh: "游客听到动静并想靠近。" },
            guide_action: { en: "Keep the group together, lower voices, secure food, and maintain a respectful distance.", ms: "Kekalkan kumpulan bersama, rendahkan suara, simpan makanan, dan jaga jarak hormat.", zh: "让团队保持在一起，降低音量，收好食物，并保持尊重距离。" },
          },
        },
      ],
    },
  ],
  quizzes: [
    {
      id: "offline-q1",
      question_text: { en: "A visitor steps off the trail for a photo near seedlings. What should the guide do?", ms: "Seorang pelawat keluar dari laluan untuk bergambar dekat anak pokok. Apa yang perlu pemandu lakukan?", zh: "游客离开步道到幼苗旁拍照。导览员应该怎么做？" },
      options: {
        en: [
          "Bring them back politely and explain trampling damage.",
          "Allow it if they only step off briefly.",
          "Pick up a seedling and show it to the group.",
          "Ignore it to avoid interrupting the tour.",
        ],
        ms: [
          "Minta mereka kembali dengan sopan dan terangkan kerosakan akibat pijakan.",
          "Benarkan jika mereka keluar sebentar sahaja.",
          "Cabut anak pokok dan tunjukkan kepada kumpulan.",
          "Abaikan supaya lawatan tidak terganggu.",
        ],
        zh: [
          "礼貌地请他们回来，并解释踩踏造成的伤害。",
          "如果只是短暂停留就允许。",
          "拔起一株幼苗给团队看。",
          "忽略它以免打断行程。",
        ],
      },
      correct_option_index: 0,
      correct_explanation: { en: "Correct. The guide protects the site and turns the moment into learning.", ms: "Betul. Pemandu melindungi kawasan dan menjadikan situasi itu sebagai pembelajaran.", zh: "正确。导览员保护现场，并把这一刻转化为学习机会。" },
      incorrect_explanation: { en: "The best answer combines visitor care, habitat protection, and a short explanation.", ms: "Jawapan terbaik menggabungkan penjagaan pelawat, perlindungan habitat, dan penerangan ringkas.", zh: "最佳答案应结合游客照顾、栖息地保护和简短解释。" },
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

const buildLocalScenario = (scenarioId) => {
  const matched = AR_TRAINING_SCENARIOS.find((item) => String(item.id) === String(scenarioId));
  if (!matched) return offlineScenario;
  return {
    ...offlineScenario,
    ...matched,
    id: matched.id,
    panoramas: [
      {
        ...offlineScenario.panoramas[0],
        panorama_url: matched.initial_panorama_url || offlineScenario.panoramas[0].panorama_url,
      },
    ],
    quizzes: offlineScenario.quizzes,
  };
};

const getCueDescription = (hotspot, language, fallback) =>
  getLocalizedText(
    hotspot?.content?.description || hotspot?.content?.guide_script || hotspot?.content,
    language,
    fallback
  );

const getCuePrompt = (hotspot, language, fallback) =>
  getLocalizedText(hotspot?.content?.visitor_prompt, language, fallback);

const getCueAction = (hotspot, language, fallback) =>
  getLocalizedText(hotspot?.content?.guide_action, language, fallback);

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
  const { t, i18n } = useTranslation();
  const { isSimpleMode, highContrast } = useThemeContext();
  const { scenarioId, image, scenario: scenarioParam, lessonId } = useLocalSearchParams();
  const selectedScenarioId = Array.isArray(scenarioId) ? scenarioId[0] : scenarioId;
  const selectedImage = Array.isArray(image) ? image[0] : image;
  const scenarioTypeParam = Array.isArray(scenarioParam) ? scenarioParam[0] : scenarioParam;
  const courseLessonId = Array.isArray(lessonId) ? lessonId[0] : lessonId;

  const [scenario, setScenario] = useState(() => buildLocalScenario(selectedScenarioId));
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
      setScenario(buildLocalScenario(selectedScenarioId));
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
      Alert.alert(t("arOfflineTitle"), t("arOfflineMessage"));
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
  const metaLabel = t(meta.labelKey);
  const title = getLocalizedText(scenario.title, i18n.language, t("arDefaultTitle"));
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
      Alert.alert(t("arPhoneLookUnavailableTitle"), t("arPhoneLookUnavailableMessage"));
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
      Alert.alert(t("arQuestionsIncompleteTitle"), t("arQuestionsIncompleteMessage"));
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
      Alert.alert(t("arQuizSyncFailedTitle"), t("arQuizSyncFailedMessage"));
    } finally {
      setSubmitting(false);
    }
  };

  const completeTraining = async () => {
    if (visitedHotspotIds.length < cues.length) {
      Alert.alert(t("arHotspotsRemainingTitle"), t("arHotspotsRemainingMessage"));
      return;
    }
    if (quizzes.length && !quizResult?.passed) {
      Alert.alert(t("arDecisionCheckFailedTitle"), t("arDecisionCheckFailedMessage"));
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

    if (courseLessonId) {
      try {
        await courseService.markLessonComplete(courseLessonId);
      } catch (error) {
        console.log("Course lesson completion sync failed", error.message);
      }
    }

    Alert.alert(t("arTrainingCompletedTitle"), t("arTrainingCompletedMessage"));
  };

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <ThemedBackground />
        <AppHeader title={t("arVrTrainingTitle")} showBack showHome />
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>{t("arLoadingEnvironment")}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ThemedBackground />
      <AppHeader title={title} subtitle={t("arHotspotTrainingSubtitle")} showBack showHome />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.briefHeader}>
          <Chip icon={meta.icon} compact>
            {metaLabel}
          </Chip>
          <Chip icon="panorama-horizontal" compact>
            {t("ar360View")}
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
                  <Text style={styles.viewerBadgeText}>{phoneLookEnabled ? t("arPhoneLookActive") : t("arDragToLook")}</Text>
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
                      <Text style={styles.popupSub}>{selectedCue.reviewed ? t("arReviewed") : t("arTrainingHotspot")}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setPopupVisible(false)} style={styles.popupClose}>
                      <MaterialCommunityIcons name="close" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.popupBody}>{getCueDescription(selectedCue.hotspot, i18n.language, t("arDefaultHotspotDescription"))}</Text>
                  <View style={styles.popupCallout}>
                    <MaterialCommunityIcons name="account-question" size={17} color="#FFFFFF" />
                    <Text style={styles.popupCalloutText}>{getCuePrompt(selectedCue.hotspot, i18n.language, t("arDefaultHotspotPrompt"))}</Text>
                  </View>
                  <View style={styles.popupCallout}>
                    <MaterialCommunityIcons name="account-voice" size={17} color="#FFFFFF" />
                    <Text style={styles.popupCalloutText}>{getCueAction(selectedCue.hotspot, i18n.language, t("arDefaultHotspotAction"))}</Text>
                  </View>
                  <Button mode="contained" icon="check" onPress={reviewCue} style={styles.popupButton}>
                    {t("arMarkReviewed")}
                  </Button>
                </View>
              ) : null}
            </View>
          </View>
        </Surface>

        <Surface elevation={1} style={[styles.panel, { backgroundColor: theme.colors.surface, borderRadius: cardRadius }]}>
          <View style={styles.rowBetween}>
            <View style={styles.flexCopy}>
              <Text style={[styles.panelTitle, { color: theme.colors.onSurface }]}>{t("arVrHotspots")}</Text>
              <Text style={[styles.bodyText, { color: theme.colors.onSurfaceVariant }]}>
                {t("arHotspotsInstructions")}
              </Text>
            </View>
            <Text style={[styles.progressText, { color: theme.colors.primary }]}>{Math.round(progress * 100)}%</Text>
          </View>
          <ProgressBar progress={progress} color={theme.colors.primary} style={styles.progressBar} />

          <View style={styles.controlRow}>
            <Button mode={phoneLookEnabled ? "contained" : "outlined"} icon="cellphone-arrow-down" onPress={togglePhoneLook} style={styles.controlButton}>
              {phoneLookEnabled ? t("arPhoneLookOn") : t("arPhoneLook")}
            </Button>
            <Button mode="outlined" icon="chevron-left" onPress={() => stepPan(1)} style={styles.iconControlButton}>
              {t("arLeft")}
            </Button>
            <Button mode="outlined" icon="chevron-right" onPress={() => stepPan(-1)} style={styles.iconControlButton}>
              {t("arRight")}
            </Button>
            <Button mode="contained" icon="book-open-page-variant" onPress={reviewCue} style={styles.controlButton}>
              {t("arOpenPopup")}
            </Button>
            <Button mode="outlined" icon="skip-next" onPress={focusNextCue} style={styles.controlButton}>
              {t("arNextHotspot")}
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
          <Text style={[styles.panelTitle, { color: theme.colors.onSurface }]}>{t("arFieldDecisionCheck")}</Text>
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
                {t("arScore", { score: quizResult.score, correct: quizResult.correct, total: quizzes.length })}
              </Text>
              {quizResult.feedback?.[0] ? (
                <Text style={[styles.bodyText, { color: theme.colors.onSurfaceVariant }]}>
                  {getLocalizedText(quizResult.feedback[0], i18n.language)}
                </Text>
              ) : null}
            </View>
          ) : null}

          <Button mode="outlined" icon="checkbox-marked-circle-outline" onPress={submitQuiz} loading={submitting} disabled={submitting} style={styles.controlButton}>
            {t("arCheckAnswers")}
          </Button>
        </Surface>

        <Button mode="contained" icon="clipboard-check" onPress={completeTraining} style={styles.completeButton}>
          {t("arCompleteTraining")}
        </Button>

        {successCriteria.length ? (
          <Surface elevation={0} style={[styles.criteriaPanel, { backgroundColor: theme.colors.surfaceVariant, borderRadius: cardRadius }]}>
            <Text style={[styles.criteriaTitle, { color: theme.colors.onSurfaceVariant }]}>{t("arCompletionStandard")}</Text>
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
