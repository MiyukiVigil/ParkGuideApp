import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, Surface, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import AppHeader from "../components/AppHeader";
import ThemedBackground from "../components/ThemedBackground";

export default function Monitor() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <ThemedBackground />
      <AppHeader title={t("tourMonitor")} subtitle={t("liveFieldMonitor")} showBack showHome />

      <View style={styles.container}>
        <Surface
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
        >
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>{t("monitorPreviewTitle")}</Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            {t("monitorPreviewBody")}
          </Text>
        </Surface>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1, padding: 20 },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
  },
});
