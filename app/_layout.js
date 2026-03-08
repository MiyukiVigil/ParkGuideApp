import React, { createContext, useContext, useState, useEffect } from "react";
import { Stack } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { darkTheme, lightTheme } from "../theme/theme";
import { Appearance, useColorScheme } from "react-native";

const ThemeContext = createContext();
export const useThemeContext = () => useContext(ThemeContext);

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

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      <PaperProvider theme={theme}>
        <Stack screenOptions={{ headerShown: false }} />
      </PaperProvider>
    </ThemeContext.Provider>
  );
}