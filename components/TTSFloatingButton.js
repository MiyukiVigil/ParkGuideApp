import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import { FAB, Portal, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useScreenSpeechContext } from "../contexts/ScreenSpeechContext";

const TTS_POSITION_KEY = "appTextToSpeechButtonPosition";
const BUTTON_SIZE = 56;
const BUTTON_MARGIN = 18;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export default function TTSFloatingButton() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const panValue = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const persistedPositionRef = useRef(null);
  const isDraggingRef = useRef(false);
  const buttonLayoutRef = useRef({ width: BUTTON_SIZE, height: BUTTON_SIZE });
  const [isReady, setIsReady] = useState(false);
  const { ttsEnabled, isSpeaking, isPaused, toggleSpeechPlayback, activeSpeechText } = useScreenSpeechContext();

  useEffect(() => {
    let mounted = true;

    const loadPosition = async () => {
      try {
        const savedPosition = await AsyncStorage.getItem(TTS_POSITION_KEY);
        if (!mounted) {
          return;
        }

        if (savedPosition) {
          const parsedPosition = JSON.parse(savedPosition);
          if (Number.isFinite(parsedPosition?.x) && Number.isFinite(parsedPosition?.y)) {
            persistedPositionRef.current = parsedPosition;
          }
        }
      } catch (error) {
        console.log("Failed to load TTS button position", error);
      } finally {
        if (mounted) {
          setIsReady(true);
        }
      }
    };

    loadPosition();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady || !windowWidth || !windowHeight) {
      return;
    }

    const maxX = Math.max(BUTTON_MARGIN, windowWidth - buttonLayoutRef.current.width - BUTTON_MARGIN);
    const maxY = Math.max(BUTTON_MARGIN, windowHeight - buttonLayoutRef.current.height - insets.bottom - BUTTON_MARGIN);

    const startPosition = persistedPositionRef.current || {
      x: maxX,
      y: maxY,
    };

    const nextX = clamp(startPosition.x, BUTTON_MARGIN, maxX);
    const nextY = clamp(startPosition.y, BUTTON_MARGIN, maxY);

    panValue.setValue({ x: nextX, y: nextY });
  }, [insets.bottom, isReady, panValue, windowHeight, windowWidth]);

  const savePosition = async (x, y) => {
    const safePosition = { x, y };
    persistedPositionRef.current = safePosition;

    try {
      await AsyncStorage.setItem(TTS_POSITION_KEY, JSON.stringify(safePosition));
    } catch (error) {
      console.log("Failed to save TTS button position", error);
    }
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6,
    onPanResponderGrant: () => {
      isDraggingRef.current = true;
      panValue.stopAnimation((value) => {
        dragOffsetRef.current = value;
        panValue.setOffset(value);
        panValue.setValue({ x: 0, y: 0 });
      });
    },
    onPanResponderMove: Animated.event([null, { dx: panValue.x, dy: panValue.y }], { useNativeDriver: false }),
    onPanResponderRelease: async (_, gestureState) => {
      const maxX = Math.max(BUTTON_MARGIN, windowWidth - buttonLayoutRef.current.width - BUTTON_MARGIN);
      const maxY = Math.max(BUTTON_MARGIN, windowHeight - buttonLayoutRef.current.height - insets.bottom - BUTTON_MARGIN);
      const nextX = clamp(dragOffsetRef.current.x + gestureState.dx, BUTTON_MARGIN, maxX);
      const nextY = clamp(dragOffsetRef.current.y + gestureState.dy, BUTTON_MARGIN, maxY);

      panValue.flattenOffset();
      panValue.setValue({ x: nextX, y: nextY });
      isDraggingRef.current = false;
      await savePosition(nextX, nextY);
    },
    onPanResponderTerminate: () => {
      panValue.flattenOffset();
      isDraggingRef.current = false;
    },
  }), [insets.bottom, panValue, windowHeight, windowWidth]);

  if (!ttsEnabled) {
    return null;
  }

  const icon = isSpeaking ? (isPaused ? "play" : "pause") : "volume-high";
  const helperText = isSpeaking ? (isPaused ? "Resume" : "Pause") : "Read";

  return (
    <Portal>
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.container,
          {
            transform: [{ translateX: panValue.x }, { translateY: panValue.y }],
          },
        ]}
        onLayout={(event) => {
          buttonLayoutRef.current = {
            width: event.nativeEvent.layout.width || buttonLayoutRef.current.width,
            height: event.nativeEvent.layout.height || buttonLayoutRef.current.height,
          };
        }}
        {...panResponder.panHandlers}
      >
        <FAB
          icon={icon}
          mode="contained"
          onPress={() => {
            if (!isDraggingRef.current) {
              toggleSpeechPlayback();
            }
          }}
          style={[
            styles.fab,
            {
              backgroundColor: theme.colors.primaryContainer,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
          color={theme.colors.onPrimaryContainer}
          disabled={!activeSpeechText}
          accessibilityLabel={`Text to speech ${helperText}`}
          accessibilityHint={activeSpeechText ? "Reads the current screen aloud" : "No screen text has been registered"}
        />
      </Animated.View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 999,
    elevation: 999,
  },
  fab: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    borderWidth: 1,
    padding: 0,
    margin: 0,
  },
});
