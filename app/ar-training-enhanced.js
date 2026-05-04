import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
  Animated,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Button,
  Chip,
  ProgressBar,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import AppHeader from "../components/AppHeader";
import ThemedBackground from "../components/ThemedBackground";
import { useThemeContext } from "../contexts/ThemeContext";
import courseService from "../services/courseService";
import arTrainingService from "../services/arTrainingService";

const fallbackFirebaseImage =
  "https://firebasestorage.googleapis.com/v0/b/parkguideapp-c8517.firebasestorage.app/o/assests%2F360%2FAdobeStock_15550322.jpeg?alt=media&token=c9d64eed-c48a-4075-b9e3-35314566cd68";

const fallbackScenarios = [
  {
    id: "forest-adv",
    code: "ar-forest-biodiversity-201",
    title: { en: "Tropical Forest Biodiversity Master", ms: "Ketua Biodiversiti Hutan Tropika", zh: "热带森林生物多样性大师" },
    description: {
      en: "Master forest ecosystem layers, species diversity, and ecological niches. Learn about canopy stratification and biodiversity hotspots.",
      ms: "Kuasai lapisan ekosistem hutan, kepelbagaian spesies, dan niche ekologi. Pelajari stratifikasi kanopi dan titik panas biodiversiti.",
      zh: "掌握森林生态系统层、物种多样性和生态位。了解冠层分层和生物多样性热点。",
    },
    difficulty: "advanced",
    duration: 35,
    thumbnail: "https://images.unsplash.com/photo-1511593358241-7eea1f3c84e5?w=400&h=300&fit=crop",
    scenario: "forest",
    hotspots: 5,
  },
  {
    id: "eco-mid",
    code: "ar-ecotourism-practices-201",
    title: { en: "Sustainable Eco-tourism Excellence", ms: "Keunggulan Eko-pelancongan Lestari", zh: "可持续生态旅游卓越" },
    description: {
      en: "Learn sustainable visitor management, conservation practices, and community engagement. Master visitor flow control and interpretive guiding.",
      ms: "Pelajari pengurusan pelawat lestari, amalan pemuliharaan, dan penglibatan komuniti. Kuasai kawalan aliran pelawat dan membimbing interpretif.",
      zh: "学习可持续游客管理、保护实践和社区参与。掌握游客流量控制和解释性导游。",
    },
    difficulty: "intermediate",
    duration: 30,
    thumbnail: "https://images.unsplash.com/photo-1469022563149-aa64dbd37dae?w=400&h=300&fit=crop",
    scenario: "eco",
    hotspots: 3,
  },
  {
    id: "wildlife-adv",
    code: "ar-wildlife-safety-advanced",
    title: { en: "Wildlife Encounter & Safety Protocol", ms: "Protokol Keselamatan & Pertemuan Hidupan Liar", zh: "野生动物遭遇和安全协议" },
    description: {
      en: "Advanced training on wildlife behavior, safe encounter distances, emergency protocols, and visitor protection. Learn to identify dangerous situations.",
      ms: "Latihan lanjutan tentang tingkah laku hidupan liar, jarak pertemuan selamat, protokol kecemasan, dan perlindungan pelawat.",
      zh: "关于野生动物行为、安全遭遇距离、紧急协议和游客保护的高级培训。",
    },
    difficulty: "advanced",
    duration: 40,
    thumbnail: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=400&h=300&fit=crop",
    scenario: "wildlife",
    hotspots: 4,
  },
  {
    id: "conservation-mid",
    code: "ar-conservation-strategies-201",
    title: { en: "Park Conservation & Management", ms: "Pemuliharaan & Pengurusan Taman", zh: "公园保护和管理" },
    description: {
      en: "Understand conservation initiatives, habitat restoration, invasive species management, and environmental monitoring. Communicate conservation importance to visitors.",
      ms: "Memahami inisiatif pemuliharaan, pemulihan habitat, pengurusan spesies invasif, dan pemantauan alam sekitar.",
      zh: "了解保护措施、栖息地恢复、入侵物种管理和环保监测。向访客传达保护的重要性。",
    },
    difficulty: "intermediate",
    duration: 28,
    thumbnail: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
    scenario: "forest",
    hotspots: 3,
  },
  {
    id: "ethics-begin",
    code: "ar-guide-ethics-fundamentals",
    title: { en: "Professional Park Guide Foundations", ms: "Asas Pemandu Taman Profesional", zh: "专业公园指南基础" },
    description: {
      en: "Essential training for new guides covering professionalism, visitor engagement, communication, and ethical responsibilities. Foundation for all guiding activities.",
      ms: "Latihan penting untuk pemandu baru yang merangkumi profesionalisme, penglibatan pelawat, komunikasi, dan tanggungjawab etika.",
      zh: "针对新导游的基本培训，涵盖专业精神、游客参与、沟通和道德责任。",
    },
    difficulty: "beginner",
    duration: 20,
    thumbnail: "https://images.unsplash.com/photo-1504681869696-d977e3a01bae?w=400&h=300&fit=crop",
    scenario: "eco",
    hotspots: 2,
  },
];

const scenarioIcons = {
  forest: "leaf",
  eco: "walk",
  wildlife: "paw",
};

const difficultyColors = {
  beginner: "#4CAF50",
  intermediate: "#FFC107",
  advanced: "#FF6B6B",
};

const isArCourse = (course) => {
  const code = String(course?.code || "").toLowerCase();
  return code.startsWith("ar-") || code.includes("ar-training");
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

const inferScenario = (course) => {
  if (course.scenario) return course.scenario;
  const text = [course.code, getLocalizedText(course.title, "en"), getLocalizedText(course.description, "en")]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (text.includes("wildlife")) return "wildlife";
  if (text.includes("eco") || text.includes("tour")) return "eco";
  return "forest";
};

const getCourseImage = (course) => {
  if (course.thumbnail) return course.thumbnail;
  const lessons = (course.chapters || []).flatMap((chapter) => chapter.lessons || []);
  return lessons.flatMap((lesson) => lesson.content_images || []).find(Boolean) || fallbackFirebaseImage;
};

// Enhanced Course Card Component
const CourseCard = ({ course, theme, onPress, isSimpleMode, language }) => {
  const [imageError, setImageError] = useState(false);
  const difficulty = course.difficulty || "intermediate";
  const difficultyColor = difficultyColors[difficulty] || difficultyColors.intermediate;
  
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.cardContainer}
    >
      <Surface
        style={[
          styles.courseCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
        elevation={3}
      >
        {/* Card Header with Image */}
        <View style={styles.cardImageContainer}>
          <Image
            source={{ uri: getCourseImage(course) }}
            style={styles.cardImage}
            onError={() => setImageError(true)}
          />
          {/* Overlay Gradient */}
          <View style={[styles.cardImageOverlay, { backgroundColor: "rgba(0,0,0,0.3)" }]} />
          
          {/* Difficulty Badge */}
          <View
            style={[
              styles.difficultyBadge,
              { backgroundColor: difficultyColor },
            ]}
          >
            <MaterialCommunityIcons
              name={difficulty === "beginner" ? "star" : difficulty === "advanced" ? "crown" : "bookmark"}
              size={14}
              color="white"
            />
            <Text style={styles.difficultyText}>{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</Text>
          </View>

          {/* Type Icon */}
          <View style={[styles.typeIcon, { backgroundColor: theme.colors.primary }]}>
            <MaterialCommunityIcons
              name={scenarioIcons[inferScenario(course)] || "cube"}
              size={24}
              color={theme.colors.onPrimary}
            />
          </View>
        </View>

        {/* Card Content */}
        <View style={styles.cardContent}>
          {/* Title */}
          <Text
            variant="titleMedium"
            numberOfLines={2}
            style={[
              styles.cardTitle,
              { color: theme.colors.onSurface, fontWeight: "700" },
            ]}
          >
            {getLocalizedText(course.title, language)}
          </Text>

          {/* Description */}
          <Text
            numberOfLines={3}
            style={[
              styles.cardDescription,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {getLocalizedText(course.description, language)}
          </Text>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={16}
                color={theme.colors.primary}
              />
              <Text style={[styles.statText, { color: theme.colors.onSurfaceVariant }]}>
                {course.duration || 25} min
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialCommunityIcons
                name="map-marker-multiple"
                size={16}
                color={theme.colors.primary}
              />
              <Text style={[styles.statText, { color: theme.colors.onSurfaceVariant }]}>
                {course.hotspots || 4} hotspots
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialCommunityIcons
                name="help-circle-outline"
                size={16}
                color={theme.colors.primary}
              />
              <Text style={[styles.statText, { color: theme.colors.onSurfaceVariant }]}>
                Quiz
              </Text>
            </View>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="play-circle-outline"
              size={18}
              color={theme.colors.onPrimary}
            />
            <Text style={[styles.actionButtonText, { color: theme.colors.onPrimary }]}>
              Start Training
            </Text>
          </TouchableOpacity>
        </View>
      </Surface>
    </TouchableOpacity>
  );
};

export default function ARTraining() {
  const router = useRouter();
  const theme = useTheme();
  const { i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const { isSimpleMode, highContrast } = useThemeContext();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [trainingStats, setTrainingStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const containerWidth = width > 1200 ? 900 : "100%";
  const cardRadius = isSimpleMode || highContrast ? 8 : 12;

  const loadCourses = useCallback(async () => {
    try {
      setError("");
      const data = await courseService.getCourses({ is_published: true });
      const backendCourses = Array.isArray(data) ? data : data.results || [];
      const arCourses = backendCourses.filter(isArCourse);
      setCourses(arCourses.length ? arCourses : fallbackScenarios);
    } catch (err) {
      console.log("Failed to load AR courses from backend", err);
      setError("Backend AR courses not available. Showing sample scenarios.");
      setCourses(fallbackScenarios);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadTrainingStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const stats = await arTrainingService.getTrainingSummary();
      setTrainingStats(stats);
    } catch (err) {
      console.log("Failed to load AR training stats", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
    loadTrainingStats();
  }, [loadCourses, loadTrainingStats]);

  useFocusEffect(
    useCallback(() => {
      loadCourses();
      loadTrainingStats();
    }, [loadCourses, loadTrainingStats])
  );

  const openCourse = (course) => {
    const params = new URLSearchParams({
      scenario: inferScenario(course),
      courseId: String(course.id),
    });
    const image = getCourseImage(course);
    if (image) params.append("image", image);
    router.push(`/ar-training/forest-biodiversity?${params.toString()}`);
  };

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <ThemedBackground />
        <AppHeader title="AR Training" showBack showHome />
        <View style={styles.center}>
          <MaterialCommunityIcons
            name="cube-scan"
            size={60}
            color={theme.colors.primary}
            style={{ opacity: 0.3, marginBottom: 16 }}
          />
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, fontSize: 14 }}>
            Loading immersive scenarios...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ThemedBackground />
      <AppHeader title="🌍 AR Training" subtitle="Immersive Park Guide Mastery" showBack showHome />

      <ScrollView
        style={{ alignSelf: "center", width: containerWidth }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadCourses();
              loadTrainingStats();
            }}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Hero Section */}
        <Surface
          style={[
            styles.heroSection,
            {
              backgroundColor: theme.colors.primaryContainer,
              borderRadius: cardRadius,
            },
          ]}
          elevation={2}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons name="vr-box" size={40} color={theme.colors.primary} />
            </View>
            <Text variant="headlineSmall" style={[styles.heroTitle, { color: theme.colors.onPrimaryContainer }]}>
              Immersive VR/AR Training
            </Text>
            <Text style={[styles.heroDescription, { color: theme.colors.onPrimaryContainer }]}>
              Master biodiversity, eco-tourism, wildlife safety, and conservation through interactive AR scenarios. Practice real-world guide challenges in immersive environments.
            </Text>
            <View style={styles.heroChips}>
              <Chip
                icon="leaf"
                style={{ backgroundColor: theme.colors.primary, marginRight: 8 }}
                textStyle={{ color: theme.colors.onPrimary }}
              >
                Biodiversity
              </Chip>
              <Chip
                icon="paw"
                style={{ backgroundColor: theme.colors.primary }}
                textStyle={{ color: theme.colors.onPrimary }}
              >
                Safety
              </Chip>
            </View>
          </View>
        </Surface>

        {/* Error Message */}
        {error && (
          <Surface style={[styles.errorBanner, { backgroundColor: theme.colors.errorContainer }]} elevation={0}>
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color={theme.colors.error} />
            <Text style={[styles.errorText, { color: theme.colors.onErrorContainer }]}>{error}</Text>
          </Surface>
        )}

        {/* Training Statistics */}
        {trainingStats && !statsLoading && (
          <Surface
            style={[
              styles.statsContainer,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
                borderRadius: cardRadius,
              },
            ]}
            elevation={2}
          >
            <Text variant="titleMedium" style={[styles.statsTitle, { color: theme.colors.onSurface }]}>
              Your Progress
            </Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <MaterialCommunityIcons name="flag-checkered" size={28} color={theme.colors.primary} />
                <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>
                  {trainingStats.totalScenariosCompleted || 0}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Completed
                </Text>
              </View>
              <View style={styles.statBox}>
                <MaterialCommunityIcons name="map-marker" size={28} color={theme.colors.primary} />
                <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>
                  {trainingStats.totalHotspotsVisited || 0}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Hotspots
                </Text>
              </View>
              <View style={styles.statBox}>
                <MaterialCommunityIcons name="trophy" size={28} color={theme.colors.primary} />
                <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>
                  {trainingStats.badgesEarned || 0}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Badges
                </Text>
              </View>
            </View>
          </Surface>
        )}

        {/* Scenarios Section */}
        <View>
          <Text
            variant="titleLarge"
            style={[
              styles.sectionTitle,
              { color: theme.colors.onSurface, marginTop: 24, marginBottom: 12 },
            ]}
          >
            🎓 Training Scenarios
          </Text>
          <Text style={[styles.sectionDescription, { color: theme.colors.onSurfaceVariant, marginBottom: 16 }]}>
            Choose a scenario to begin your AR training journey
          </Text>

          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              theme={theme}
              language={i18n.language}
              onPress={() => openCourse(course)}
              isSimpleMode={isSimpleMode}
            />
          ))}
        </View>

        {/* Learning Tips */}
        <Surface
          style={[
            styles.tipsSection,
            {
              backgroundColor: theme.colors.tertiaryContainer,
              borderRadius: cardRadius,
            },
          ]}
          elevation={2}
        >
          <Text variant="titleMedium" style={[styles.tipsTitle, { color: theme.colors.onTertiaryContainer }]}>
            💡 Tips for Effective Learning
          </Text>
          <View style={styles.tipItem}>
            <MaterialCommunityIcons name="check-circle" size={20} color={theme.colors.tertiary} />
            <Text style={[styles.tipText, { color: theme.colors.onTertiaryContainer }]}>
              Explore all hotspots to unlock comprehensive knowledge
            </Text>
          </View>
          <View style={styles.tipItem}>
            <MaterialCommunityIcons name="check-circle" size={20} color={theme.colors.tertiary} />
            <Text style={[styles.tipText, { color: theme.colors.onTertiaryContainer }]}>
              Answer quiz questions to earn achievement badges
            </Text>
          </View>
          <View style={styles.tipItem}>
            <MaterialCommunityIcons name="check-circle" size={20} color={theme.colors.tertiary} />
            <Text style={[styles.tipText, { color: theme.colors.onTertiaryContainer }]}>
              Practice multiple scenarios for a well-rounded skill set
            </Text>
          </View>
        </Surface>
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
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  heroSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  heroContent: {
    alignItems: "center",
  },
  heroIcon: {
    marginBottom: 12,
  },
  heroTitle: {
    textAlign: "center",
    fontWeight: "800",
    marginBottom: 8,
  },
  heroDescription: {
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  heroChips: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
    gap: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
  },
  statsContainer: {
    padding: 16,
    marginBottom: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  statsTitle: {
    marginBottom: 16,
    fontWeight: "700",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statBox: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionTitle: {
    fontWeight: "800",
  },
  sectionDescription: {
    fontSize: 13,
  },
  cardContainer: {
    marginBottom: 16,
  },
  courseCard: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
  },
  cardImageContainer: {
    position: "relative",
    height: 160,
    width: "100%",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardImageOverlay: {
    ...StyleSheet.absoluteFill,
  },
  difficultyBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: "700",
    color: "white",
  },
  typeIcon: {
    position: "absolute",
    bottom: 12,
    left: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    marginBottom: 8,
    lineHeight: 20,
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    borderBottomColor: "rgba(0,0,0,0.05)",
    marginBottom: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  statText: {
    fontSize: 11,
    fontWeight: "600",
  },
  actionButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    fontWeight: "700",
    fontSize: 14,
  },
  tipsSection: {
    padding: 16,
    marginTop: 24,
    marginBottom: 20,
    borderRadius: 12,
  },
  tipsTitle: {
    marginBottom: 12,
    fontWeight: "700",
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
