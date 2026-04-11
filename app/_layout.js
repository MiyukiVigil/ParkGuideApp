import React, { useEffect, useMemo, useState } from "react";
import { Stack } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { darkTheme, lightTheme } from "../theme/theme";
import { Appearance, useColorScheme, AppState, Alert, Platform } from "react-native";
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en, ms, zh } from '../constants/translations';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import { ensureFreshSession } from "../utils/api";
import { getRefreshToken } from "../utils/tokenStorage";

const ThemeContext = createContext();
export const useThemeContext = () => useContext(ThemeContext);

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
  const [highContrast, setHighContrast] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

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
        const [savedLang, savedTheme, savedUiMode, savedHighContrast] = await Promise.all([
          AsyncStorage.getItem("appLanguage"),
          AsyncStorage.getItem("appThemeMode"),
          AsyncStorage.getItem("appUiMode"),
          AsyncStorage.getItem("appHighContrast"),
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

        if (savedHighContrast === "true") {
          setHighContrast(true);
        } else {
          setHighContrast(false);
        }
      } catch (e) {
        console.log("Failed to load settings", e);
      } finally {
        setIsLoaded(true);
      const savedLang = await AsyncStorage.getItem('appLanguage');
      const savedFont = await AsyncStorage.getItem('appFontScale');
      if (savedLang) i18n.changeLanguage(savedLang);
      if (savedFont) setFontScale(parseFloat(savedFont));
    };
    loadSettings();
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

    loadSettings();
  }, [systemScheme]);

  const theme = useMemo(() => {
    if (highContrast) {
      return isDarkMode ? highContrastDarkTheme : highContrastLightTheme;
    }
    return isDarkMode ? darkTheme : lightTheme;
  }, [isDarkMode, highContrast]);

  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        toggleTheme,
        uiMode,
        toggleUiMode,
        isSimpleMode: uiMode === "simple",
        highContrast,
        toggleHighContrast,
      }}
    >
      <PaperProvider theme={theme}>
        <Stack screenOptions={{ headerShown: false }} />
      </PaperProvider>
    </ThemeContext.Provider>
  );
}
