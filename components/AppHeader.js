import React from "react";
import { View, StyleSheet } from "react-native";
import { IconButton, Surface, Text, useTheme } from "react-native-paper";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeContext } from "../contexts/ThemeContext";

export default function AppHeader({
  title,
  subtitle,
  showBack = true,
  showHome = true,
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { isSimpleMode, highContrast } = useThemeContext();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 6 }]}>
      <Surface
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
            borderRadius: isSimpleMode || highContrast ? 14 : 22,
          },
        ]}
        elevation={highContrast ? 0 : isSimpleMode ? 1 : 2}
      >
        <View style={styles.side}>
          {showBack ? (
            <IconButton
              icon="arrow-left"
              iconColor={theme.colors.onSurface}
              onPress={() => router.back()}
            />
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>

        <View style={styles.center}>
          <Text
            variant={isSimpleMode || highContrast ? "titleLarge" : "titleMedium"}
            numberOfLines={1}
            style={{ color: theme.colors.onSurface, fontWeight: "900" }}
          >
            {title}
          </Text>
          {!!subtitle && !isSimpleMode && !highContrast && (
            <Text
              variant="bodySmall"
              numberOfLines={1}
              style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}
            >
              {subtitle}
            </Text>
          )}
        </View>

        <View style={styles.side}>
          {showHome ? (
            <IconButton
              icon="home-variant-outline"
              iconColor={theme.colors.tertiary}
              onPress={() => router.push("/home")}
            />
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  container: {
    minHeight: 64,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  side: {
    width: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 6,
  },
  placeholder: {
    width: 40,
    height: 40,
  },
});