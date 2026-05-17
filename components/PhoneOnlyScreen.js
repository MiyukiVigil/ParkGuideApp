import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, Surface, Text, useTheme } from "react-native-paper";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import AppHeader from "./AppHeader";
import ThemedBackground from "./ThemedBackground";
import { useScreenSpeech } from "../contexts/ScreenSpeechContext";

export default function PhoneOnlyScreen({ titleKey, subtitleKey, featureKey }) {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const title = t(titleKey);
  const subtitle = subtitleKey ? t(subtitleKey) : t("phoneOnlySubtitle");
  const feature = featureKey ? t(featureKey) : title;

  useScreenSpeech(
    [title, t("phoneOnlyTitle"), t("phoneOnlyBody", { feature })].join(". "),
    { priority: 100 }
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ThemedBackground />
      <AppHeader title={title} subtitle={subtitle} showBack showHome />
      <View style={styles.content}>
        <Surface
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
          elevation={1}
        >
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>
            {t("phoneOnlyTitle")}
          </Text>
          <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
            {t("phoneOnlyBody", { feature })}
          </Text>
          <Button mode="contained" onPress={() => router.replace("/home")} style={styles.button}>
            {t("backToHome")}
          </Button>
        </Surface>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 520,
    borderRadius: 8,
    borderWidth: 1,
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
  },
  body: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
  },
  button: {
    alignSelf: "flex-start",
    marginTop: 18,
  },
});
