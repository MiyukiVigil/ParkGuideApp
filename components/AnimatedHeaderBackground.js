import React, { useRef, useEffect } from "react";
import { View, StyleSheet, Animated, useWindowDimensions } from "react-native";
import { useTheme } from "react-native-paper";
import Svg, { Defs, LinearGradient, Stop, Circle, Path, Ellipse, Rect } from "react-native-svg";

/**
 * AnimatedHeaderBackground - Unique tropical header with animated firefly particles
 * Features glowing particles floating upward through tropical vegetation
 */
export default function AnimatedHeaderBackground() {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const glowAnim = useRef(new Animated.Value(0)).current;
  const particle1Anim = useRef(new Animated.Value(0)).current;
  const particle2Anim = useRef(new Animated.Value(0)).current;
  const particle3Anim = useRef(new Animated.Value(0)).current;

  const isDark = theme.dark;

  // Main glow animation
  useEffect(() => {
    const glowSequence = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    );
    glowSequence.start();
    return () => glowSequence.stop();
  }, [glowAnim]);

  // Firefly particle animations
  useEffect(() => {
    const particle1Sequence = Animated.loop(
      Animated.sequence([
        Animated.timing(particle1Anim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(particle1Anim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    particle1Sequence.start();
    return () => particle1Sequence.stop();
  }, [particle1Anim]);

  useEffect(() => {
    const particle2Sequence = Animated.loop(
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(particle2Anim, {
          toValue: 1,
          duration: 3200,
          useNativeDriver: true,
        }),
        Animated.timing(particle2Anim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    particle2Sequence.start();
    return () => particle2Sequence.stop();
  }, [particle2Anim]);

  useEffect(() => {
    const particle3Sequence = Animated.loop(
      Animated.sequence([
        Animated.delay(1000),
        Animated.timing(particle3Anim, {
          toValue: 1,
          duration: 3400,
          useNativeDriver: true,
        }),
        Animated.timing(particle3Anim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    particle3Sequence.start();
    return () => particle3Sequence.stop();
  }, [particle3Anim]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.6],
  });

  const particle1Opacity = particle1Anim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 1, 0],
  });

  const particle1Y = particle1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -50],
  });

  const particle2Opacity = particle2Anim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 1, 0],
  });

  const particle2Y = particle2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -60],
  });

  const particle3Opacity = particle3Anim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 1, 0],
  });

  const particle3Y = particle3Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -55],
  });

  return (
    <View style={styles.container}>
      <Svg width={width} height={150} viewBox={`0 0 ${width} 150`}>
        <Defs>
          <LinearGradient id="headerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop
              offset="0%"
              stopColor={isDark ? "#1a5a42" : "#99ddb3"}
              stopOpacity="1"
            />
            <Stop
              offset="100%"
              stopColor={isDark ? "#0d3a2a" : "#66cc99"}
              stopOpacity="1"
            />
          </LinearGradient>
        </Defs>

        {/* Header background gradient */}
        <Rect width={width} height={150} fill="url(#headerGrad)" />

        {/* Tropical leaf decorations */}
        <Path
          d="M10,30 Q15,20 20,30 Q22,40 15,45 Q8,40 10,30"
          fill={isDark ? "rgba(61, 156, 113, 0.35)" : "rgba(77, 140, 105, 0.35)"}
        />
        <Path
          d={`M${width - 20},35 Q${width - 15},25 ${width - 10},35 Q${width - 8},45 ${width - 15},50 Q${width - 22},45 ${width - 20},35`}
          fill={isDark ? "rgba(61, 156, 113, 0.35)" : "rgba(77, 140, 105, 0.35)"}
        />

        {/* Vegetation silhouette at bottom */}
        <Path
          d={`M0,110 Q${width / 4},90 ${width / 2},100 Q${(3 * width) / 4},90 ${width},110 L${width},150 L0,150 Z`}
          fill={isDark ? "rgba(13, 40, 23, 0.5)" : "rgba(102, 153, 102, 0.25)"}
        />
      </Svg>

      {/* Animated glow layer */}
      <Animated.View
        style={[
          styles.glowOverlay,
          {
            backgroundColor: isDark
              ? "rgba(84, 176, 137, 0.15)"
              : "rgba(138, 205, 140, 0.2)",
            opacity: glowOpacity,
          },
        ]}
      />

      {/* Firefly particle 1 - floating animation */}
      <Animated.View
        style={[
          styles.particle,
          {
            left: width * 0.15,
            opacity: particle1Opacity,
            transform: [{ translateY: particle1Y }],
          },
        ]}
      >
        <View
          style={[
            styles.particleGlow,
            {
              backgroundColor: isDark ? "rgba(138, 205, 140, 0.9)" : "rgba(100, 200, 100, 0.9)",
              shadowColor: isDark ? "#54b089" : "#64c864",
            },
          ]}
        />
      </Animated.View>

      {/* Firefly particle 2 */}
      <Animated.View
        style={[
          styles.particle,
          {
            left: width * 0.5,
            opacity: particle2Opacity,
            transform: [{ translateY: particle2Y }],
          },
        ]}
      >
        <View
          style={[
            styles.particleGlow,
            {
              backgroundColor: isDark ? "rgba(138, 205, 140, 0.85)" : "rgba(100, 200, 100, 0.85)",
              shadowColor: isDark ? "#54b089" : "#64c864",
            },
          ]}
        />
      </Animated.View>

      {/* Firefly particle 3 */}
      <Animated.View
        style={[
          styles.particle,
          {
            left: width * 0.85,
            opacity: particle3Opacity,
            transform: [{ translateY: particle3Y }],
          },
        ]}
      >
        <View
          style={[
            styles.particleGlow,
            {
              backgroundColor: isDark ? "rgba(138, 205, 140, 0.88)" : "rgba(100, 200, 100, 0.88)",
              shadowColor: isDark ? "#54b089" : "#64c864",
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 150,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "transparent",
  },
  glowOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "100%",
  },
  particle: {
    position: "absolute",
    bottom: 20,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  particleGlow: {
    width: "100%",
    height: "100%",
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
});