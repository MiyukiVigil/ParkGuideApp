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
  "https://firebasestorage.googleapis.com/v0/b/parkguideapp-c8517.firebasestorage.app/o/assests%2F360%2FAdobeStock_15550322.jpeg?alt=media&token=c9d64eed-c48a-4075-b9e3-35314566cd68";

const fallbackScenarios = [
  {
    id: "offline-biodiversity",
    code: "ar-biodiversity-guide-sim",
    title: {
      en: "Forest Biodiversity Guiding Simulation",
      ms: "Simulasi Panduan Biodiversiti Hutan",
      zh: "森林生物多样性导览模拟",
    },
    description: {
      en: "Practise explaining forest layers, species relationships, and low-impact observation.",
      ms: "Latih penerangan lapisan hutan, hubungan spesies, dan pemerhatian rendah impak.",
      zh: "练习讲解森林层次、物种关系和低影响观察。",
    },
    scenario_type: "biodiversity",
    difficulty: "intermediate",
    duration_minutes: 12,
    thumbnail: fallbackImage,
    hotspot_count: 4,
    quiz_count: 1,
  },
  {
    id: "offline-ecotourism",
    code: "ar-ecotourism-practice-sim",
    title: {
      en: "Eco-tourism Visitor Management Simulation",
      ms: "Simulasi Pengurusan Pelawat Eko-pelancongan",
      zh: "生态旅游游客管理模拟",
    },
    description: {
      en: "Practise group control, photo-stop decisions, trail etiquette, and leave-no-trace guidance.",
      ms: "Latih kawalan kumpulan, keputusan tempat bergambar, etika laluan, dan panduan tidak tinggal kesan.",
      zh: "练习团队管理、拍照点决策、步道礼仪和无痕指导。",
    },
    scenario_type: "ecotourism",
    difficulty: "beginner",
    duration_minutes: 10,
    thumbnail: fallbackImage,
    hotspot_count: 3,
    quiz_count: 1,
  },
  {
    id: "offline-wildlife",
    code: "ar-wildlife-encounter-sim",
    title: {
      en: "Wildlife Encounter Response Simulation",
      ms: "Simulasi Respons Pertemuan Hidupan Liar",
      zh: "野生动物遭遇应对模拟",
    },
    description: {
      en: "Practise safe distance, no-feeding messaging, rerouting, and emergency escalation.",
      ms: "Latih jarak selamat, mesej jangan beri makan, tukar laluan, dan eskalasi kecemasan.",
      zh: "练习安全距离、禁止喂食、改道和紧急升级处理。",
    },
    scenario_type: "wildlife",
    difficulty: "advanced",
    duration_minutes: 14,
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

const getImage = (scenario) =>
  scenario.thumbnail || scenario.initial_panorama_url || scenario.panoramas?.[0]?.panorama_url || fallbackImage;

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
              <Text style={[styles.startText, { color: theme.colors.onPrimary }]}>Start Simulation</Text>
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
                Choose a scenario, scan the simulated park environment, discover hotspots, and answer field decisions.
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
            Biodiversity, eco-tourism, and wildlife practice modules
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
