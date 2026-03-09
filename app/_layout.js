import React, { createContext, useContext, useState, useEffect } from "react";
import { Stack } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { darkTheme, lightTheme } from "../theme/theme";
import { Appearance, useColorScheme } from "react-native";
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en, ms, zh } from '../constants/translations';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const systemScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemScheme === "dark");
  const [fontScale, setFontScale] = useState(1.0); // Font scale state

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

  // Apply Font Scaling to the theme
  const baseTheme = isDarkMode ? darkTheme : lightTheme;
  const theme = {
    ...baseTheme,
    fonts: {
      ...baseTheme.fonts,
      bodyLarge: { ...baseTheme.fonts.bodyLarge, fontSize: 16 * fontScale },
      bodyMedium: { ...baseTheme.fonts.bodyMedium, fontSize: 14 * fontScale },
      titleLarge: { ...baseTheme.fonts.titleLarge, fontSize: 22 * fontScale },
      labelLarge: { ...baseTheme.fonts.labelLarge, fontSize: 14 * fontScale },
    },
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, fontScale, setFontScale }}>
      <PaperProvider theme={theme}>
        <Stack screenOptions={{ headerShown: false }} />
      </PaperProvider>
    </ThemeContext.Provider>
  );
}