import React, { useCallback, useEffect, useState } from "react";
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Chip, ProgressBar, Surface, Text, useTheme } from "react-native-paper";

import AppHeader from "../components/AppHeader";
import ThemedBackground from "../components/ThemedBackground";
import { useThemeContext } from "../contexts/ThemeContext";
import arTrainingService from "../services/arTrainingService";

const fallbackImage =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/A_panoramic_example_of_the_deep_ravine_forest_ecosystem._%2831018541-539e-49b5-be18-dd6123962a3a%29.JPG/3840px-A_panoramic_example_of_the_deep_ravine_forest_ecosystem._%2831018541-539e-49b5-be18-dd6123962a3a%29.JPG";

const fallbackScenarios = [
  {
    id: "offline-biodiversity",
    code: "vr-biodiversity-canopy-briefing",
    title: {
      en: "Biodiversity Briefing in a Simulated Rainforest",
      ms: "Simulasi Panduan Biodiversiti Hutan",
      zh: "森林生物多样性导览模拟",
    },
    description: {
      en: "Practise a guide talk that connects canopy, understory, forest floor, and species relationships in one immersive scene.",
      ms: "Latih penerangan lapisan hutan, hubungan spesies, dan pemerhatian rendah impak.",
      zh: "练习讲解森林层次、物种关系和低影响观察。",
    },
    field_brief: {
      en: "A group of first-time visitors is entering a sensitive rainforest trail. Build a clear explanation without encouraging off-trail movement.",
    },
    learning_objectives: [
      { en: "Explain biodiversity through visible evidence." },
      { en: "Connect habitat layers and nutrient cycling." },
      { en: "Use low-impact visitor instructions." },
    ],
    scenario_type: "biodiversity",
    difficulty: "intermediate",
    duration_minutes: 14,
    thumbnail: fallbackImage,
    hotspot_count: 3,
    quiz_count: 1,
  },
  {
    id: "offline-ecotourism",
    code: "ar-ecotourism-low-impact-trail",
    title: {
      en: "Eco-tourism Trail Management Simulation",
      ms: "Simulasi Pengurusan Pelawat Eko-pelancongan",
      zh: "生态旅游游客管理模拟",
    },
    description: {
      en: "Practise group spacing, photo-stop control, waste prevention, and leave-no-trace messages during a busy trail stop.",
      ms: "Latih kawalan kumpulan, keputusan tempat bergambar, etika laluan, dan panduan tidak tinggal kesan.",
      zh: "练习团队管理、拍照点决策、步道礼仪和无痕指导。",
    },
    field_brief: {
      en: "Your group reaches a narrow viewpoint. Several visitors want photos, snacks, and shortcuts.",
    },
    learning_objectives: [
      { en: "Keep visitor movement safe and low impact." },
      { en: "Explain eco-tourism practices clearly." },
      { en: "Balance visitor enjoyment with site protection." },
    ],
    scenario_type: "ecotourism",
    difficulty: "beginner",
    duration_minutes: 12,
    thumbnail: fallbackImage,
    hotspot_count: 3,
    quiz_count: 1,
  },
  {
    id: "offline-wildlife",
    code: "vr-wildlife-encounter-response",
    title: {
      en: "Wildlife Encounter Response Drill",
      ms: "Simulasi Respons Pertemuan Hidupan Liar",
      zh: "野生动物遭遇应对模拟",
    },
    description: {
      en: "Practise calm crowd control, safe distance, no-feeding messaging, rerouting, and escalation during a wildlife encounter.",
      ms: "Latih jarak selamat, mesej jangan beri makan, tukar laluan, dan eskalasi kecemasan.",
      zh: "练习安全距离、禁止喂食、改道和紧急升级处理。",
    },
    field_brief: {
      en: "A macaque appears near the trail while visitors begin raising phones and snacks.",
    },
    learning_objectives: [
      { en: "Recognise wildlife stress and visitor risk cues." },
      { en: "Maintain safe distance and prevent feeding." },
      { en: "Decide when to reroute or escalate." },
    ],
    scenario_type: "wildlife",
    difficulty: "advanced",
    duration_minutes: 15,
    thumbnail: fallbackImage,
    hotspot_count: 4,
    quiz_count: 1,
  },
];

const scenarioMeta = {
  biodiversity: { icon: "leaf", color: "#2E7D32", label: "Biodiversity" },
  ecotourism: { icon: "walk", color: "#00897B", label: "Eco-tourism" },
  wildlife: { icon: "paw", color: "#D84315", label: "Wildlife" },
  conservation: { icon: "shield-leaf", color: "#5E35B1", label: "Conservation" },
  guiding: { icon: "account-voice", color: "#1565C0", label: "Guiding" },
};

const difficultyColors = {
  beginner: "#2E7D32",
  intermediate: "#F9A825",
  advanced: "#C62828",
};

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

const getImage = (scenario) => {
  const image = scenario.thumbnail || scenario.initial_panorama_url || scenario.panoramas?.[0]?.panorama_url;
  return image && !String(image).includes("firebasestorage") ? image : fallbackImage;
};

function ScenarioCard({ scenario, language, theme, onPress }) {
  const [failed, setFailed] = useState(false);
  const meta = scenarioMeta[scenario.scenario_type] || scenarioMeta.guiding;
  const difficulty = scenario.difficulty || "intermediate";
  const image = failed ? fallbackImage : getImage(scenario);

  return (
    <TouchableOpacity activeOpacity={0.86} onPress={onPress} style={styles.cardTouchable}>
      <Surface
        elevation={2}
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
      >
        <View style={styles.imageWrap}>
          <Image source={{ uri: image }} style={styles.cardImage} onError={() => setFailed(true)} />
          <View style={styles.imageShade} />
          <View style={[styles.typeBadge, { backgroundColor: meta.color }]}>
            <MaterialCommunityIcons name={meta.icon} size={16} color="#FFFFFF" />
            <Text style={styles.badgeText}>{meta.label}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.titleRow}>
            <Text numberOfLines={2} style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              {getLocalizedText(scenario.title, language, scenario.code)}
            </Text>
            <View style={[styles.iconBubble, { backgroundColor: meta.color }]}>
              <MaterialCommunityIcons name="cube-scan" size={20} color="#FFFFFF" />
            </View>
          </View>

          <Text numberOfLines={3} style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
            {getLocalizedText(scenario.description, language)}
          </Text>
          {scenario.field_brief ? (
            <Text numberOfLines={2} style={[styles.briefText, { color: theme.colors.primary }]}>
              Field brief: {getLocalizedText(scenario.field_brief, language)}
            </Text>
          ) : null}

          <View style={styles.metrics}>
            <Chip icon="clock-outline" compact style={styles.metricChip}>
              {scenario.duration_minutes || 10} min
            </Chip>
            <Chip icon="map-marker-radius" compact style={styles.metricChip}>
              {scenario.hotspot_count || scenario.all_hotspots_count || 0} hotspots
            </Chip>
            <Chip icon="help-circle-outline" compact style={styles.metricChip}>
              {scenario.quiz_count || 0} quiz
            </Chip>
          </View>

          <View style={styles.footerRow}>
            <View style={[styles.levelPill, { backgroundColor: difficultyColors[difficulty] || difficultyColors.intermediate }]}>
              <Text style={styles.levelText}>{difficulty.toUpperCase()}</Text>
            </View>
            <View style={[styles.startPill, { backgroundColor: theme.colors.primary }]}>
              <Text style={[styles.startText, { color: theme.colors.onPrimary }]}>Start Drill</Text>
              <MaterialCommunityIcons name="arrow-right" size={18} color={theme.colors.onPrimary} />
            </View>
          </View>
        </View>
      </Surface>
    </TouchableOpacity>
  );
}

export default function ARTraining() {
  const router = useRouter();
  const theme = useTheme();
  const { i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const { isSimpleMode, highContrast } = useThemeContext();
  const [scenarios, setScenarios] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const containerWidth = width > 1100 ? 920 : "100%";
  const cardRadius = isSimpleMode || highContrast ? 8 : 8;

  const load = useCallback(async () => {
    try {
      setError("");
      const [scenarioData, statData] = await Promise.all([
        arTrainingService.getARScenarios(),
        arTrainingService.getTrainingSummary(),
      ]);
      setScenarios(scenarioData.length ? scenarioData : fallbackScenarios);
      setStats(statData);
      if (!scenarioData.length) {
        setError("Backend AR simulations are not available yet. Showing offline examples.");
      }
    } catch (err) {
      console.log("Failed to load AR training", err.response?.data || err.message);
      setScenarios(fallbackScenarios);
      setError("Backend AR simulations are not available yet. Showing offline examples.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openScenario = (scenario) => {
    const params = new URLSearchParams({
      scenarioId: String(scenario.id),
      scenario: scenario.scenario_type || "biodiversity",
    });
    const image = getImage(scenario);
    if (image) params.append("image", image);
    router.push(`/ar-training/forest-biodiversity?${params.toString()}`);
  };

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <ThemedBackground />
        <AppHeader title="AR Training" showBack showHome />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
            Loading park guide simulations...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ThemedBackground />
      <AppHeader title="AR Training" subtitle="Immersive park guide practice" showBack showHome />

      <ScrollView
        style={{ alignSelf: "center", width: containerWidth }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Surface
          elevation={1}
          style={[
            styles.hero,
            {
              borderRadius: cardRadius,
              backgroundColor: theme.colors.primaryContainer,
            },
          ]}
        >
          <View style={styles.heroTop}>
            <View style={[styles.heroIcon, { backgroundColor: theme.colors.primary }]}>
              <MaterialCommunityIcons name="virtual-reality" size={28} color={theme.colors.onPrimary} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={[styles.heroTitle, { color: theme.colors.onPrimaryContainer }]}>
                VR/AR Training for Park Guides
              </Text>
              <Text style={[styles.heroText, { color: theme.colors.onPrimaryContainer }]}>
                Practise realistic guide situations: biodiversity explanations, eco-tourism visitor control, and wildlife encounter response.
              </Text>
            </View>
          </View>
        </Surface>

        {stats ? (
          <Surface
            elevation={1}
            style={[
              styles.statsPanel,
              {
                borderRadius: cardRadius,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
          >
            <View style={styles.statsHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Your AR Progress</Text>
              <Text style={[styles.statPercent, { color: theme.colors.primary }]}>
                {Math.round(stats.averageQuizScore || 0)}%
              </Text>
            </View>
            <ProgressBar progress={Math.min(1, (stats.averageQuizScore || 0) / 100)} color={theme.colors.primary} />
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>{stats.totalScenariosCompleted || 0}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>completed</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>{stats.totalHotspotsVisited || 0}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>hotspots</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>{stats.badgesEarned || 0}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>badges</Text>
              </View>
            </View>
          </Surface>
        ) : null}

        {error ? (
          <Surface elevation={0} style={[styles.error, { backgroundColor: theme.colors.errorContainer }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color={theme.colors.error} />
            <Text style={[styles.errorText, { color: theme.colors.onErrorContainer }]}>{error}</Text>
          </Surface>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Available Simulations</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            Immersive drills with field briefs, scanning tasks, hotspot decisions, and assessment questions
          </Text>
        </View>

        {scenarios.map((scenario) => (
          <ScenarioCard
            key={scenario.id || scenario.code}
            scenario={scenario}
            language={i18n.language}
            theme={theme}
            onPress={() => openScenario(scenario)}
          />
        ))}
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
  hero: {
    padding: 16,
    marginBottom: 14,
  },
  heroTop: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 5,
  },
  heroText: {
    fontSize: 13,
    lineHeight: 18,
  },
  statsPanel: {
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  statPercent: {
    fontSize: 18,
    fontWeight: "900",
  },
  statsGrid: {
    flexDirection: "row",
    marginTop: 12,
  },
  statItem: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "900",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
    textTransform: "uppercase",
  },
  error: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 3,
  },
  cardTouchable: {
    marginBottom: 14,
  },
  card: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  imageWrap: {
    height: 150,
    backgroundColor: "#0E1712",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  imageShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  typeBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  cardBody: {
    padding: 14,
  },
  titleRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  cardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 22,
  },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  description: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
  },
  briefText: {
    marginTop: 9,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  metricChip: {
    marginRight: 0,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    gap: 10,
  },
  levelPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  levelText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  startPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },
  startText: {
    fontSize: 13,
    fontWeight: "900",
  },
});
