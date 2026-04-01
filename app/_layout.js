import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { Stack } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { darkTheme, lightTheme } from "../theme/theme";
import { Appearance, useColorScheme, AppState, Alert } from "react-native";
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en, ms, zh } from '../constants/translations';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import { ensureFreshSession } from "../utils/api";

const ThemeContext = createContext();
export const useThemeContext = () => useContext(ThemeContext);

// Setup Translations
const supportedLangs = ['en', 'ms', 'zh'];
const deviceLocales = Localization.getLocales() || [];
const deviceLang = deviceLocales.find(l => supportedLangs.includes(l.languageCode))?.languageCode || 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: { ...en } },
    ms: { translation: { ...ms } },
    zh: { translation: { ...zh } },
  },
  lng: deviceLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default function RootLayout() {
  const router = useRouter();
  const systemScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemScheme === "dark");
  const [fontScale, setFontScale] = useState(1.0); // Font scale state
  const sessionAlertShown = useRef(false);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  // Sync with System Theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setIsDarkMode(colorScheme === "dark");
    });
    return () => subscription.remove();
  }, []);

  // Load Saved Preferences (Language & Font)
  useEffect(() => {
    const loadSettings = async () => {
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

      const refresh = await AsyncStorage.getItem("refreshToken");
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
    };

    const subscription = AppState.addEventListener("change", handleActiveState);

    return () => subscription.remove();
  }, [router]);

  // Apply font scaling across all React Native Paper typography variants.
  const baseTheme = isDarkMode ? darkTheme : lightTheme;
  const scaledFonts = Object.fromEntries(
    Object.entries(baseTheme.fonts).map(([key, value]) => {
      if (typeof value?.fontSize === "number") {
        return [key, { ...value, fontSize: value.fontSize * fontScale }];
      }
      return [key, value];
    })
  );

  const theme = {
    ...baseTheme,
    fonts: scaledFonts,
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, fontScale, setFontScale }}>
      <PaperProvider theme={theme}>
        <Stack
          screenOptions={{
            headerShown: false,
            headerTitleStyle: {
              fontSize: (baseTheme.fonts.titleLarge?.fontSize || 22) * fontScale,
            },
          }}
        />
      </PaperProvider>
    </ThemeContext.Provider>
  );
}
