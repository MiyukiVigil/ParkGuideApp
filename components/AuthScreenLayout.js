import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ThemedBackground from "./ThemedBackground";

export default function AuthScreenLayout({
  children,
  centerContent = true,
  maxWidth = 460,
  contentContainerStyle,
  innerStyle,
  scrollEnabled = true,
}) {
  const { width, height } = useWindowDimensions();
  const horizontalPadding = width >= 768 ? 32 : 20;
  const verticalPadding = height < 700 ? 20 : height < 820 ? 28 : 40;
  const contentWidth = Math.min(maxWidth, Math.max(280, width - horizontalPadding * 2));

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.screen}
    >
      <ThemedBackground />
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={scrollEnabled}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: horizontalPadding,
              paddingVertical: verticalPadding,
              justifyContent: centerContent ? "center" : "flex-start",
              minHeight: height,
            },
            contentContainerStyle,
          ]}
        >
          <View style={[styles.inner, { width: contentWidth }, innerStyle]}>{children}</View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0C1E17",
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  inner: {
    alignSelf: "center",
    width: "100%",
  },
});
