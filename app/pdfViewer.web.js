import React, { useEffect } from "react";
import { View, StyleSheet, Linking } from "react-native";
import { Text, Appbar, Button, useTheme } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

export default function PDFViewerPage() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const { url, isLocalPath, title } = useLocalSearchParams();

  // Open PDF in browser on web
  useEffect(() => {
    if (url) {
      const decodedUrl = decodeURIComponent(url);
      if (isLocalPath === "true") {
        // Can't access local files on web
        alert("PDF viewing not available on web for local files.");
        router.back();
      } else {
        // Open PDF in new tab/window
        Linking.openURL(decodedUrl).catch(() => {
          alert("Could not open PDF in browser.");
          router.back();
        });
        router.back();
      }
    }
  }, [url]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content 
          title={title ? decodeURIComponent(title) : (t("pdfViewerTitle") || "PDF Viewer")} 
        />
      </Appbar.Header>

      <View style={styles.content}>
        <Text style={{ color: theme.colors.onSurface, textAlign: "center", marginBottom: 12 }}>
          Opening PDF in browser...
        </Text>
        <Button mode="contained" onPress={() => router.back()}>
          {t("goBack") || "Go Back"}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
});
