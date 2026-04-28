import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";
import i18n from "i18next";

const TTS_STORAGE_KEY = "appTextToSpeechEnabled";
const DEFAULT_SPEECH_PRIORITY = 0;
const SCREEN_SPEECH_PRIORITY = 100;

const ScreenSpeechContext = createContext(null);

const normalizeSpeechText = (text) =>
  String(text || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();

const splitSpeechText = (text, maxLength = 2400) => {
  const normalized = normalizeSpeechText(text);

  if (!normalized) {
    return [];
  }

  if (normalized.length <= maxLength) {
    return [normalized];
  }

  const words = normalized.split(" ");
  const chunks = [];
  let currentChunk = "";

  words.forEach((word) => {
    if (!word) {
      return;
    }

    const nextChunk = currentChunk ? `${currentChunk} ${word}` : word;

    if (nextChunk.length > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = word;
      return;
    }

    currentChunk = nextChunk;
  });

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
};

export function ScreenSpeechProvider({ children }) {
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isSpeechReady, setIsSpeechReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sourcesVersion, setSourcesVersion] = useState(0);
  const sourcesRef = useRef(new Map());
  const speechSessionRef = useRef(0);
  const speechQueueRef = useRef([]);

  useEffect(() => {
    let mounted = true;

    const loadEnabledState = async () => {
      try {
        const savedValue = await AsyncStorage.getItem(TTS_STORAGE_KEY);
        if (!mounted) {
          return;
        }

        setTtsEnabled(savedValue === "true");
      } catch (error) {
        console.log("Failed to load TTS setting", error);
      } finally {
        if (mounted) {
          setIsSpeechReady(true);
        }
      }
    };

    loadEnabledState();

    return () => {
      mounted = false;
    };
  }, []);

  const persistEnabledState = useCallback(async (nextEnabled) => {
    setTtsEnabled(nextEnabled);

    try {
      await AsyncStorage.setItem(TTS_STORAGE_KEY, nextEnabled ? "true" : "false");
    } catch (error) {
      console.log("Failed to save TTS setting", error);
    }

    if (!nextEnabled) {
      speechSessionRef.current += 1;
      speechQueueRef.current = [];
      setIsSpeaking(false);
      setIsPaused(false);

      try {
        await Speech.stop();
      } catch (error) {
        console.log("Failed to stop TTS speech", error);
      }
    }
  }, []);

  const clearSpeechSource = useCallback((sourceId) => {
    if (!sourceId || !sourcesRef.current.has(sourceId)) {
      return;
    }

    sourcesRef.current.delete(sourceId);
    setSourcesVersion((version) => version + 1);
  }, []);

  const setSpeechSource = useCallback((sourceId, text, priority = DEFAULT_SPEECH_PRIORITY) => {
    if (!sourceId) {
      return;
    }

    const normalizedText = normalizeSpeechText(text);

    if (!normalizedText) {
      clearSpeechSource(sourceId);
      return;
    }

    sourcesRef.current.set(sourceId, {
      text: normalizedText,
      priority,
      updatedAt: Date.now(),
    });

    setSourcesVersion((version) => version + 1);
  }, [clearSpeechSource]);

  const activeSpeechText = useMemo(() => {
    const sources = Array.from(sourcesRef.current.values()).filter((entry) => entry?.text);

    if (sources.length === 0) {
      return "";
    }

    const sortedSources = [...sources].sort((left, right) => {
      if (right.priority !== left.priority) {
        return right.priority - left.priority;
      }

      return right.updatedAt - left.updatedAt;
    });

    return sortedSources[0]?.text || "";
  }, [sourcesVersion]);

  const speakChunks = useCallback((chunks, sessionId, chunkIndex = 0) => {
    if (!chunks.length || sessionId !== speechSessionRef.current) {
      setIsSpeaking(false);
      setIsPaused(false);
      speechQueueRef.current = [];
      return;
    }

    const nextChunk = chunks[chunkIndex];

    if (!nextChunk) {
      setIsSpeaking(false);
      setIsPaused(false);
      speechQueueRef.current = [];
      return;
    }

    Speech.speak(nextChunk, {
      language: i18n.language || "en",
      rate: 0.95,
      pitch: 1,
      onStart: () => {
        if (sessionId === speechSessionRef.current) {
          setIsSpeaking(true);
          setIsPaused(false);
        }
      },
      onPause: () => {
        if (sessionId === speechSessionRef.current) {
          setIsPaused(true);
        }
      },
      onResume: () => {
        if (sessionId === speechSessionRef.current) {
          setIsPaused(false);
          setIsSpeaking(true);
        }
      },
      onDone: () => {
        if (sessionId !== speechSessionRef.current) {
          return;
        }

        speakChunks(chunks, sessionId, chunkIndex + 1);
      },
      onStopped: () => {
        if (sessionId === speechSessionRef.current) {
          setIsSpeaking(false);
          setIsPaused(false);
          speechQueueRef.current = [];
        }
      },
      onError: (error) => {
        console.log("TTS speech error", error);
        if (sessionId === speechSessionRef.current) {
          setIsSpeaking(false);
          setIsPaused(false);
          speechQueueRef.current = [];
        }
      },
    });
  }, []);

  const stopSpeech = useCallback(async () => {
    speechSessionRef.current += 1;
    speechQueueRef.current = [];
    setIsSpeaking(false);
    setIsPaused(false);

    try {
      await Speech.stop();
    } catch (error) {
      console.log("Failed to stop TTS speech", error);
    }
  }, []);

  const speakActiveText = useCallback(async (textOverride) => {
    if (!ttsEnabled) {
      return false;
    }

    const textToSpeak = normalizeSpeechText(textOverride || activeSpeechText);
    if (!textToSpeak) {
      return false;
    }

    await stopSpeech();

    const sessionId = speechSessionRef.current + 1;
    speechSessionRef.current = sessionId;
    const chunks = splitSpeechText(textToSpeak, Math.max(1000, Math.min(Speech.maxSpeechInputLength || 2400, 2400)));

    if (!chunks.length) {
      return false;
    }

    speechQueueRef.current = chunks;
    speakChunks(chunks, sessionId, 0);
    return true;
  }, [activeSpeechText, speakChunks, stopSpeech, ttsEnabled]);

  const toggleSpeechPlayback = useCallback(async () => {
    if (!ttsEnabled) {
      return false;
    }

    if (isPaused) {
      if (Platform.OS === "android") {
        return speakActiveText();
      }

      try {
        await Speech.resume();
        setIsPaused(false);
        setIsSpeaking(true);
        return true;
      } catch (error) {
        console.log("Failed to resume TTS speech", error);
        return false;
      }
    }

    if (isSpeaking) {
      if (Platform.OS === "android") {
        await stopSpeech();
        return true;
      }

      try {
        await Speech.pause();
        setIsPaused(true);
        setIsSpeaking(true);
        return true;
      } catch (error) {
        console.log("Failed to pause TTS speech", error);
        return false;
      }
    }

    return speakActiveText();
  }, [isPaused, isSpeaking, speakActiveText, stopSpeech, ttsEnabled]);

  const value = useMemo(() => ({
    isSpeechReady,
    ttsEnabled,
    setTtsEnabled: persistEnabledState,
    isSpeaking,
    isPaused,
    activeSpeechText,
    setSpeechSource,
    clearSpeechSource,
    speakActiveText,
    toggleSpeechPlayback,
    stopSpeech,
  }), [
    activeSpeechText,
    clearSpeechSource,
    isPaused,
    isSpeaking,
    isSpeechReady,
    persistEnabledState,
    setSpeechSource,
    speakActiveText,
    stopSpeech,
    toggleSpeechPlayback,
    ttsEnabled,
  ]);

  return <ScreenSpeechContext.Provider value={value}>{children}</ScreenSpeechContext.Provider>;
}

export function useScreenSpeechContext() {
  const context = useContext(ScreenSpeechContext);

  if (!context) {
    throw new Error("useScreenSpeechContext must be used within a ScreenSpeechProvider");
  }

  return context;
}

export function useScreenSpeech(text, { enabled = true, priority = SCREEN_SPEECH_PRIORITY } = {}) {
  const { setSpeechSource, clearSpeechSource } = useScreenSpeechContext();
  const sourceIdRef = useRef(`speech-${Math.random().toString(36).slice(2, 10)}`);

  useEffect(() => {
    if (!enabled) {
      clearSpeechSource(sourceIdRef.current);
      return undefined;
    }

    setSpeechSource(sourceIdRef.current, text, priority);

    return () => {
      clearSpeechSource(sourceIdRef.current);
    };
  }, [clearSpeechSource, enabled, priority, setSpeechSource, text]);
}
