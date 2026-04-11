import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";
import { useThemeContext } from "../contexts/ThemeContext";

export default function ThemedBackground() {
  const theme = useTheme();
  const context = useThemeContext();
  
  if (!context) {
    return null;
  }
  
  const { isSimpleMode, highContrast } = context;

  if (isSimpleMode || highContrast) return null;

  return (
    <>
      <View
        style={[
          styles.bgTop,
          { backgroundColor: theme.dark ? "#123024" : "#DDEBDD" },
        ]}
      />
      <View
        style={[
          styles.bgGlow,
          {
            backgroundColor: theme.dark
              ? "rgba(77,170,127,0.08)"
              : "rgba(47,125,98,0.08)",
          },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  bgTop: {
    position: "absolute",
    top: 0,
    left: -40,
    right: -40,
    height: 260,
    borderBottomLeftRadius: 120,
    borderBottomRightRadius: 120,
    opacity: 0.42,
  },
  bgGlow: {
    position: "absolute",
    top: 120,
    alignSelf: "center",
    width: 260,
    height: 260,
    borderRadius: 130,
  },
});