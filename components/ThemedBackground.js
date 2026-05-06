import React, { useRef, useEffect } from "react";
import { View, StyleSheet, useWindowDimensions, Animated } from "react-native";
import { useTheme } from "react-native-paper";
import { useThemeContext } from "../contexts/ThemeContext";
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Path, Ellipse, Circle, Polygon, Rect } from "react-native-svg";

/**
 * ThemedBackground - Sarawak Rainforest inspired backdrop
 * Layered tropical forest with atmospheric elements
 */
export default function ThemedBackground() {
  const theme = useTheme();
  const context = useThemeContext();
  const { height: screenHeight } = useWindowDimensions();
  const glowAnim = useRef(new Animated.Value(0)).current;
  const foliageAnim = useRef(new Animated.Value(0)).current;
  
  if (!context) {
    return null;
  }
  
  const { animationsEnabled } = context;
  const isDark = theme.dark;

  // Start smooth glow animation - slower
  useEffect(() => {
    if (animationsEnabled) {
      const glowSequence = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 6000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 6000,
            useNativeDriver: true,
          }),
        ])
      );
      glowSequence.start();
      return () => glowSequence.stop();
    }
  }, [animationsEnabled, glowAnim]);

  // Foliage sway animation - slower
  useEffect(() => {
    if (animationsEnabled) {
      const foliageSequence = Animated.loop(
        Animated.sequence([
          Animated.timing(foliageAnim, {
            toValue: 1,
            duration: 5000,
            useNativeDriver: true,
          }),
          Animated.timing(foliageAnim, {
            toValue: 0,
            duration: 5000,
            useNativeDriver: true,
          }),
        ])
      );
      foliageSequence.start();
      return () => foliageSequence.stop();
    }
  }, [animationsEnabled, foliageAnim]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.2, 0.6, 0.2],
  });

  const foliageSway = foliageAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, 2, 0, -2, 0],
  });

  return (
    <View style={[styles.container, { height: screenHeight }]} pointerEvents="none">
      <View
        style={[
          styles.roundedContainer,
          {
            backgroundColor: isDark ? "#0a1810" : "#d4e8d4",
            overflow: "hidden",
          },
        ]}
      >
        <Animated.View
          style={[
            { flex: 1, transform: [{ translateX: foliageSway }] },
          ]}
        >
        {/* Sarawak Rainforest SVG */}
        <Svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
          <Defs>
            {/* Sky gradient - misty rainforest atmosphere */}
            <SvgGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={isDark ? "#0f3d2e" : "#a8d8b8"} stopOpacity="1" />
              <Stop offset="50%" stopColor={isDark ? "#1a5a42" : "#8fd4a8"} stopOpacity="1" />
              <Stop offset="100%" stopColor={isDark ? "#0f2818" : "#6acc92"} stopOpacity="1" />
            </SvgGradient>

            {/* Mist effect gradient */}
            <SvgGradient id="mistGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={isDark ? "rgba(31, 76, 61, 0.1)" : "rgba(200, 240, 200, 0.3)"} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={isDark ? "rgba(31, 76, 61, 0.3)" : "rgba(180, 220, 180, 0.5)"} stopOpacity="0.8" />
            </SvgGradient>

            {/* Canopy gradient */}
            <SvgGradient id="canopyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={isDark ? "#2d7d5f" : "#66b366"} stopOpacity="1" />
              <Stop offset="100%" stopColor={isDark ? "#0d4a2a" : "#4a9d4a"} stopOpacity="1" />
            </SvgGradient>
          </Defs>

          {/* Background Sky */}
          <Rect width="400" height="800" fill="url(#skyGradient)" />

          {/* Far background - misty trees (faintest layer) */}
          <Path
            d="M0,300 Q50,250 100,280 T200,280 T300,280 T400,280 L400,350 L0,350 Z"
            fill={isDark ? "#1a4d3e" : "#99cc99"}
            opacity="0.4"
          />

          {/* Distant canopy silhouette */}
          <Path
            d="M0,200 Q30,150 60,180 Q90,150 120,180 Q150,140 180,180 Q210,150 240,180 Q270,140 300,180 Q330,150 360,180 Q390,140 400,180 L400,280 L0,280 Z"
            fill={isDark ? "#0f3a28" : "#7acc99"}
            opacity="0.6"
          />

          {/* Mid-layer vegetation - thick tropical foliage */}
          <Path
            d="M0,320 Q20,280 40,310 Q60,270 80,310 Q100,280 120,310 Q140,270 160,310 Q180,280 200,310 Q220,270 240,310 Q260,280 280,310 Q300,270 320,310 Q340,280 360,310 Q380,270 400,310 L400,450 L0,450 Z"
            fill={isDark ? "#1d5a42" : "#66a366"}
            opacity="0.8"
          />

          {/* Large tropical trees - middle ground */}
          <Path
            d="M10,380 L35,280 L60,380 M60,380 L100,260 L140,380 M140,380 L185,240 L230,380 M230,380 L275,260 L320,380 M320,380 L360,280 L400,380"
            stroke={isDark ? "#0d3a2a" : "#2d6b47"}
            strokeWidth="16"
            fill="none"
            strokeLinecap="round"
          />

          {/* Dense foliage clusters - rainforest canopy */}
          <Circle cx="50" cy="250" r="45" fill={isDark ? "#2d7d5f" : "#5cab5a"} opacity="0.7" />
          <Circle cx="120" cy="220" r="50" fill={isDark ? "#3a9d6f" : "#66cc66"} opacity="0.7" />
          <Circle cx="200" cy="200" r="55" fill={isDark ? "#2d7d5f" : "#5cab5a"} opacity="0.8" />
          <Circle cx="280" cy="220" r="50" fill={isDark ? "#3a9d6f" : "#66cc66"} opacity="0.7" />
          <Circle cx="350" cy="250" r="45" fill={isDark ? "#2d7d5f" : "#5cab5a"} opacity="0.7" />

          {/* Foreground layer - largest trees */}
          <Path
            d="M-10,500 L50,380 L110,500 M110,500 L190,330 L270,500 M270,500 L350,380 L430,500"
            stroke={isDark ? "#1d5a42" : "#4a8d4a"}
            strokeWidth="20"
            fill="none"
            strokeLinecap="round"
          />

          {/* Dense foreground foliage */}
          <Circle cx="60" cy="380" r="60" fill={isDark ? "#3a9d6f" : "#66cc66"} opacity="0.8" />
          <Circle cx="200" cy="350" r="70" fill={isDark ? "#2d7d5f" : "#5cab5a"} opacity="0.9" />
          <Circle cx="340" cy="380" r="60" fill={isDark ? "#3a9d6f" : "#66cc66"} opacity="0.8" />

          {/* Ground elevation and forest floor */}
          <Path
            d="M0,550 Q50,520 100,530 Q150,510 200,530 Q250,510 300,530 Q350,520 400,550 L400,800 L0,800 Z"
            fill={isDark ? "rgba(13, 40, 23, 0.9)" : "rgba(77, 140, 105, 0.5)"}
          />

          {/* Mist overlay for atmosphere */}
          <Rect width="400" height="800" fill="url(#mistGradient)" opacity="0.3" />
        </Svg>
        </Animated.View>

        {/* Animated atmospheric glow */}
        <Animated.View
          style={[
            styles.glowLayer,
            {
              backgroundColor: isDark
                ? "rgba(84, 176, 137, 0.12)"
                : "rgba(138, 205, 140, 0.15)",
              opacity: glowOpacity,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    width: "100%",
    zIndex: 0,
    pointerEvents: "none",
  },
  roundedContainer: {
    flex: 1,
    overflow: "hidden",
  },
  glowLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  fadeOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
  },
});