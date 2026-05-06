import React, { useEffect, useMemo, useState } from "react";
import { Stack } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { Appearance, useColorScheme } from "react-native";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import {
  darkTheme,
  lightTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
} from "../theme/theme";
import { en, ms, zh } from "../constants/translations";
import { ThemeContext } from "../contexts/ThemeContext";

const supportedLangs = ["en", "ms", "zh"];
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