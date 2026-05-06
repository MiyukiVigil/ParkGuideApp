/**
 * Enhanced AR Viewer Component
 * Features: Multi-environment support, detailed hotspots, quiz integration, progress tracking
 */

import React, { useState, useRef, useEffect } from "react";
import {
  Animated,
  PanResponder,
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";
import { Text, Surface, Chip, ProgressBar, Button, Icon } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ImageBackground } from "react-native";

/**
 * Enhanced hotspot component with detailed information display
 */
const EnhancedHotspot = ({
  hotspot,
  position,
  onPress,
  isActive,
  theme,
  language,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive) {
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.3,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isActive]);

  const getLocalizedText = (value, fallback = "") => {
    if (!value) return fallback;
    if (typeof value === "string") return value;
    return value[language] || value.en || fallback;
  };

  return (
    <Animated.View
      style={[
        styles.hotspotContainer,
        {
          left: `${position.x}%`,
          top: `${position.y}%`,
          transform: [{ scale }],
        },
      ]}
    >
      <TouchableOpacity onPress={onPress}>
        <Surface
          style={[
            styles.hotspotButton,
            {
              backgroundColor: isActive
                ? theme.colors.primary
                : theme.colors.surfaceVariant,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={hotspot.icon || "information"}
            size={20}
            color={theme.colors.onPrimary}
          />
        </Surface>
      </TouchableOpacity>
      {isActive && (
        <View style={styles.hotspotLabel}>
          <Text style={styles.hotspotLabelText}>
            {getLocalizedText(hotspot.label)}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

/**
 * Detailed information modal for each hotspot
 */
const HotspotDetailsModal = ({
  visible,
  hotspot,
  onClose,
  theme,
  language,
}) => {
  const getLocalizedText = (value, fallback = "") => {
    if (!value) return fallback;
    if (typeof value === "string") return value;
    return value[language] || value.en || fallback;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={[styles.modalOverlay, { backgroundColor: theme.colors.backdrop }]}
      >
        <Surface style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {getLocalizedText(hotspot.label)}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={theme.colors.onSurface}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll}>
            {/* Species Information */}
            {hotspot.species && (
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>
                  {language === "zh"
                    ? "物种"
                    : language === "ms"
                    ? "Spesies"
                    : "Species"}
                </Text>
                <Text style={styles.speciesName}>{hotspot.species}</Text>
                {hotspot.scientific && (
                  <Text style={styles.scientificName}>{hotspot.scientific}</Text>
                )}
              </View>
            )}

            {/* Height/Characteristics */}
            {hotspot.height && (
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>
                  {language === "zh"
                    ? "高度"
                    : language === "ms"
                    ? "Ketinggian"
                    : "Height"}
                </Text>
                <Text>{hotspot.height}</Text>
              </View>
            )}

            {/* Characteristics */}
            {hotspot.characteristics && (
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>
                  {language === "zh"
                    ? "特征"
                    : language === "ms"
                    ? "Ciri-ciri"
                    : "Characteristics"}
                </Text>
                <Text style={styles.description}>
                  {getLocalizedText(hotspot.characteristics)}
                </Text>
              </View>
            )}

            {/* Ecology */}
            {hotspot.ecology && (
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>
                  {language === "zh"
                    ? "生态"
                    : language === "ms"
                    ? "Ekologi"
                    : "Ecology"}
                </Text>
                <Text style={styles.description}>
                  {getLocalizedText(hotspot.ecology)}
                </Text>
              </View>
            )}

            {/* Wildlife */}
            {hotspot.wildlife && (
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>
                  {language === "zh"
                    ? "野生动物"
                    : language === "ms"
                    ? "Hidupan Liar"
                    : "Wildlife"}
                </Text>
                <View style={styles.chipContainer}>
                  {hotspot.wildlife.map((animal, idx) => (
                    <Chip
                      key={idx}
                      style={styles.chip}
                      textStyle={{ color: theme.colors.onPrimary }}
                    >
                      {animal}
                    </Chip>
                  ))}
                </View>
              </View>
            )}

            {/* Safety Information */}
            {hotspot.safeDistance && (
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>
                  {language === "zh"
                    ? "安全距离"
                    : language === "ms"
                    ? "Jarak Selamat"
                    : "Safe Distance"}
                </Text>
                <Text style={styles.safetyWarning}>{hotspot.safeDistance}</Text>
              </View>
            )}

            {hotspot.actionPlan && (
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>
                  {language === "zh"
                    ? "行动计划"
                    : language === "ms"
                    ? "Rancangan Tindakan"
                    : "Action Plan"}
                </Text>
                <Text style={styles.description}>
                  {getLocalizedText(hotspot.actionPlan)}
                </Text>
              </View>
            )}

            {/* Note/Instructions */}
            {hotspot.note && (
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>
                  {language === "zh"
                    ? "指导"
                    : language === "ms"
                    ? "Panduan"
                    : "Guidance"}
                </Text>
                <Text style={styles.description}>
                  {getLocalizedText(hotspot.note)}
                </Text>
              </View>
            )}
          </ScrollView>

          <Button
            mode="contained"
            onPress={onClose}
            style={styles.modalButton}
          >
            {language === "zh" ? "关闭" : language === "ms" ? "Tutup" : "Close"}
          </Button>
        </Surface>
      </View>
    </Modal>
  );
};

/**
 * Main Enhanced AR Viewer Component
 */
export const EnhancedARViewer = ({
  scenario,
  environments,
  hotspots,
  onComplete,
  theme,
  language = "en",
}) => {
  const [selectedEnvironment, setSelectedEnvironment] = useState(
    environments[0]
  );
  const [activeHotspot, setActiveHotspot] = useState(null);
  const [visitedHotspots, setVisitedHotspots] = useState(new Set());
  const [showModal, setShowModal] = useState(false);
  const [panResponder] = useState(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
    })
  );

  const handleHotspotPress = (hotspot) => {
    setActiveHotspot(hotspot);
    setVisitedHotspots((prev) => new Set([...prev, hotspot.id]));
    setShowModal(true);
  };

  const getLocalizedText = (value, fallback = "") => {
    if (!value) return fallback;
    if (typeof value === "string") return value;
    return value[language] || value.en || fallback;
  };

  const progressPercentage =
    (visitedHotspots.size / hotspots.length) * 100;

  return (
    <View style={styles.container}>
      {/* AR Viewer Area */}
      <ImageBackground
        source={{ uri: selectedEnvironment.panorama }}
        style={styles.viewerArea}
        {...panResponder.panHandlers}
      >
        {/* Hotspots */}
        {hotspots.map((hotspot) => (
          <EnhancedHotspot
            key={hotspot.id}
            hotspot={hotspot}
            position={{ x: hotspot.x, y: hotspot.y }}
            onPress={() => handleHotspotPress(hotspot)}
            isActive={
              activeHotspot?.id === hotspot.id ||
              visitedHotspots.has(hotspot.id)
            }
            theme={theme}
            language={language}
          />
        ))}

        {/* Orientation Guide */}
        <View style={styles.orientationGuide}>
          <Chip
            style={styles.orientationChip}
            textStyle={{ fontSize: 12 }}
          >
            {language === "zh"
              ? "向各个方向平移查看"
              : language === "ms"
              ? "Sapukan ke semua arah untuk lihat"
              : "Swipe to explore"}
          </Chip>
        </View>
      </ImageBackground>

      {/* Environment Selector */}
      <View style={styles.environmentSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {environments.map((env) => (
            <TouchableOpacity
              key={env.id}
              onPress={() => setSelectedEnvironment(env)}
              style={[
                styles.envButton,
                selectedEnvironment.id === env.id && styles.envButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.envButtonText,
                  selectedEnvironment.id === env.id &&
                    styles.envButtonTextActive,
                ]}
              >
                {env.environment}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Progress Indicator */}
      <Surface style={styles.progressContainer}>
        <View style={styles.progressInfo}>
          <Text style={styles.progressLabel}>
            {language === "zh"
              ? "进度"
              : language === "ms"
              ? "Kemajuan"
              : "Progress"}{" "}
            ({visitedHotspots.size}/{hotspots.length})
          </Text>
          <ProgressBar
            progress={progressPercentage / 100}
            style={styles.progressBar}
          />
        </View>
      </Surface>

      {/* Hotspot Details Modal */}
      {activeHotspot && (
        <HotspotDetailsModal
          visible={showModal}
          hotspot={activeHotspot}
          onClose={() => setShowModal(false)}
          theme={theme}
          language={language}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  viewerArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  hotspotContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  hotspotButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  hotspotLabel: {
    position: "absolute",
    top: 55,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  hotspotLabelText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  orientationGuide: {
    position: "absolute",
    bottom: 20,
    left: 20,
  },
  orientationChip: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  environmentSelector: {
    height: 60,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  envButton: {
    marginHorizontal: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
  },
  envButtonActive: {
    backgroundColor: "#2196F3",
  },
  envButtonText: {
    fontSize: 12,
    color: "#666",
  },
  envButtonTextActive: {
    color: "#fff",
  },
  progressContainer: {
    padding: 16,
    marginBottom: 8,
    marginHorizontal: 8,
    borderRadius: 8,
  },
  progressInfo: {
    gap: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "90%",
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
  },
  modalScroll: {
    paddingHorizontal: 16,
    maxHeight: "75%",
  },
  infoSection: {
    marginVertical: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1976d2",
  },
  speciesName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  scientificName: {
    fontSize: 12,
    fontStyle: "italic",
    color: "#666",
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: "#333",
  },
  safetyWarning: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#d32f2f",
    padding: 8,
    backgroundColor: "#ffebee",
    borderRadius: 4,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    marginVertical: 4,
  },
  modalButton: {
    marginHorizontal: 16,
    marginVertical: 16,
  },
});

export default EnhancedARViewer;
