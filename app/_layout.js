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

// Supported languages
const supportedLangs = ['en', 'ms', 'zh'];

// Find the first locale that is supported
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
  const systemScheme = useColorScheme(); // initial detection
  const [isDarkMode, setIsDarkMode] = useState(systemScheme === "dark");

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setIsDarkMode(colorScheme === "dark");
    });
    return () => subscription.remove();
  }, []);

   useEffect(() => {
      const loadLanguage = async () => {
        const savedLang = await AsyncStorage.getItem('appLanguage');
        if (savedLang) {
          i18n.changeLanguage(savedLang); // change i18next immediately
        }
      };
      loadLanguage();
    }, []);

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      <PaperProvider theme={theme}>
        <Stack screenOptions={{ headerShown: false }} />
      </PaperProvider>
    </ThemeContext.Provider>
  );
}