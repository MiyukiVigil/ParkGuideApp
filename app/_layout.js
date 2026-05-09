import React, { useEffect, useMemo, useState, useRef } from "react";
import { Stack } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { darkTheme, lightTheme } from "../theme/theme";
import { Appearance, useColorScheme, AppState, Alert, Platform, View, ActivityIndicator } from "react-native";
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en, ms, zh } from '../constants/translations';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import { ensureFreshSession } from "../utils/api";
import { getRefreshToken } from "../utils/tokenStorage";
import * as NotificationService from "../services/notificationService";
import { ThemeContext } from "../contexts/ThemeContext";
import { ScreenSpeechProvider } from "../contexts/ScreenSpeechContext";
import TTSFloatingButton from "../components/TTSFloatingButton";
import { validateConfig } from "../constants/config";
import { AppAlertProvider } from "../components/AppAlertProvider";

// Setup Translations
const supportedLangs = ['en', 'ms', 'zh'];
const deviceLocales = Localization.getLocales() || [];
const deviceLang =
  deviceLocales.find((l) => supportedLangs.includes(l.languageCode))?.languageCode || "en";

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: { ...en } },
      ms: { translation: { ...ms } },
      zh: { translation: { ...zh } },
    },
    lng: deviceLang,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
}

export default function RootLayout() {
  const systemScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemScheme === "dark");
  const [uiMode, setUiMode] = useState("pretty");
  const [fontScalePreset, setFontScalePresetState] = useState("standard");
  const [fontFamilyPreset, setFontFamilyPresetState] = useState("system");
  const [highContrast, setHighContrast] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const sessionAlertShown = useRef(false);
  const router = useRouter();

  const fontScale = useMemo(() => {
    switch (fontScalePreset) {
      case "small":
        return 0.9;
      case "large":
        return 1.15;
      default:
        return 1;
    }
  }, [fontScalePreset]);

  const toggleTheme = async () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    await AsyncStorage.setItem("appThemeMode", next ? "dark" : "light");
  };

  const toggleUiMode = async () => {
    const next = uiMode === "pretty" ? "simple" : "pretty";
    setUiMode(next);
    await AsyncStorage.setItem("appUiMode", next);
  };

  const toggleHighContrast = async () => {
    const next = !highContrast;
    setHighContrast(next);
    await AsyncStorage.setItem("appHighContrast", next ? "true" : "false");
  };

  const toggleAnimations = async () => {
    const next = !animationsEnabled;
    setAnimationsEnabled(next);
    await AsyncStorage.setItem("appAnimationsEnabled", next ? "true" : "false");
  };

  const setFontScalePreset = async (preset) => {
    const allowed = ["small", "standard", "large"];
    const nextPreset = allowed.includes(preset) ? preset : "standard";
    setFontScalePresetState(nextPreset);
    await AsyncStorage.setItem("appFontScalePreset", nextPreset);
  };

  const setFontFamilyPreset = async (preset) => {
    const allowed = ["system", "serif", "mono"];
    const nextPreset = allowed.includes(preset) ? preset : "system";
    setFontFamilyPresetState(nextPreset);
    await AsyncStorage.setItem("appFontFamilyPreset", nextPreset);
  };

  // Validate app configuration on startup
  useEffect(() => {
    validateConfig();
  }, []);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      AsyncStorage.getItem("appThemeMode").then((savedTheme) => {
        if (savedTheme === "dark") setIsDarkMode(true);
        else if (savedTheme === "light") setIsDarkMode(false);
        else setIsDarkMode(colorScheme === "dark");
      });
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [savedLang, savedTheme, savedUiMode, savedFontScalePreset, savedFontFamilyPreset, savedHighContrast, savedAnimations] = await Promise.all([
          AsyncStorage.getItem("appLanguage"),
          AsyncStorage.getItem("appThemeMode"),
          AsyncStorage.getItem("appUiMode"),
          AsyncStorage.getItem("appFontScalePreset"),
          AsyncStorage.getItem("appFontFamilyPreset"),
          AsyncStorage.getItem("appHighContrast"),
          AsyncStorage.getItem("appAnimationsEnabled"),
        ]);

        if (savedLang) {
          await i18n.changeLanguage(savedLang);
        }

        if (savedTheme === "dark") setIsDarkMode(true);
        else if (savedTheme === "light") setIsDarkMode(false);
        else setIsDarkMode(systemScheme === "dark");

        if (savedUiMode === "simple" || savedUiMode === "pretty") {
          setUiMode(savedUiMode);
        }

        if (["small", "standard", "large"].includes(savedFontScalePreset)) {
          setFontScalePresetState(savedFontScalePreset);
        }

        if (["system", "serif", "mono"].includes(savedFontFamilyPreset)) {
          setFontFamilyPresetState(savedFontFamilyPreset);
        }

        if (savedHighContrast === "true") {
          setHighContrast(true);
        } else {
          setHighContrast(false);
        }

        if (savedAnimations === "false") {
          setAnimationsEnabled(false);
        } else {
          setAnimationsEnabled(true);
        }
      } catch (e) {
        console.log("Failed to load settings", e);
      } finally {
        setIsLoaded(true);
      }
    };

    const timeoutId = setTimeout(() => {
      setIsLoaded((prev) => {
        if (!prev) {
          console.warn("Settings load timeout reached, continuing app startup.");
        }
        return true;
      });
    }, 4000);

    loadSettings();

    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const handleActiveState = async (nextState) => {
      if (nextState !== "active") return;

      try {
        const refresh = await getRefreshToken();
        if (!refresh) return;

        const ok = await ensureFreshSession();
        if (ok || sessionAlertShown.current) return;

        sessionAlertShown.current = true;
        Alert.alert(
          "Session expired",
          "Your session has expired. Please log in again.",
          [
            {
              text: "OK",
              onPress: () => {
                sessionAlertShown.current = false;
                router.replace("/");
              },
            },
          ]
        );
      } catch (error) {
        // Suppress errors related to activity not being available
        if (error?.message?.includes("activity is no longer available")) {
          console.warn("Activity not available during state transition, retry will occur on next app focus");
          sessionAlertShown.current = false;
        } else {
          console.error("Session check error:", error);
        }
      }
    };

    const subscription = AppState.addEventListener("change", handleActiveState);
    return () => subscription.remove();
  }, [router]);

  // Setup push notifications
  useEffect(() => {
    let disposePushListeners = null;

    const setupNotifications = async () => {
      try {
        // Initialize notification handler
        NotificationService.setupNotificationHandler();

        // Register for push notifications
        await NotificationService.registerForPushNotifications();

        // Listen to incoming push notifications
        disposePushListeners = NotificationService.listenToPushNotifications((notification, eventType) => {
          console.log("Push notification received:", notification);
          const data = notification?.request?.content?.data || {};
          const alertId = data.monitoring_alert_id || data.alert_id;
          if (eventType === "response" && alertId) {
            router.push({ pathname: "/monitor", params: { alertId: String(alertId), open: "1" } });
          }
        });
      } catch (err) {
        console.log("Error setting up notifications:", err);
      }
    };

    setupNotifications();

    return () => {
      if (disposePushListeners && typeof disposePushListeners === "function") {
        disposePushListeners();
      }
    };
  }, []);

  const theme = useMemo(() => {
    const baseTheme = isDarkMode ? darkTheme : lightTheme;
    if (!baseTheme?.fonts) {
      return baseTheme;
    }

    let selectedFontFamily;
    if (fontFamilyPreset === "serif") {
      selectedFontFamily = Platform.OS === "ios" ? "Times New Roman" : "serif";
    } else if (fontFamilyPreset === "mono") {
      selectedFontFamily = Platform.OS === "ios" ? "Courier" : "monospace";
    }

    const scaledFonts = Object.fromEntries(
      Object.entries(baseTheme.fonts).map(([variant, fontDef]) => {
        if (!fontDef || typeof fontDef !== "object") {
          return [variant, fontDef];
        }

        return [
          variant,
          {
            ...fontDef,
            fontSize:
              typeof fontDef.fontSize === "number"
                ? Math.round(fontDef.fontSize * fontScale)
                : fontDef.fontSize,
            lineHeight:
              typeof fontDef.lineHeight === "number"
                ? Math.round(fontDef.lineHeight * fontScale)
                : fontDef.lineHeight,
            fontFamily: selectedFontFamily || fontDef.fontFamily,
          },
        ];
      })
    );

    return {
      ...baseTheme,
      fonts: scaledFonts,
    };
  }, [isDarkMode, fontScale, fontFamilyPreset]);

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" }}>
        <ActivityIndicator size="large" color="#2E7D5A" />
      </View>
    );
  }

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        toggleTheme,
        uiMode,
        toggleUiMode,
        isSimpleMode: uiMode === "simple",
        fontScale,
        fontScalePreset,
        setFontScalePreset,
        fontFamilyPreset,
        setFontFamilyPreset,
        highContrast,
        toggleHighContrast,
        animationsEnabled,
        toggleAnimations,
      }}
    >
      <ScreenSpeechProvider>
        <PaperProvider theme={theme}>
          <AppAlertProvider>
            <Stack screenOptions={{ headerShown: false }} />
            <TTSFloatingButton />
          </AppAlertProvider>
        </PaperProvider>
      </ScreenSpeechProvider>
    </ThemeContext.Provider>
  );
}
