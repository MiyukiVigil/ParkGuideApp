import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import ThemedBackground from "../components/ThemedBackground";

export default function PDFViewerPage() {
  const router = useRouter();
  const { url } = useLocalSearchParams();

  useEffect(() => {
    const openPdf = async () => {
      try {
        if (!url || typeof url !== "string") {
          router.back();
          return;
        }

        const decodedUrl = decodeURIComponent(url);
        await WebBrowser.openBrowserAsync(decodedUrl);
        router.back();
      } catch (error) {
        console.log("Failed to open PDF:", error);
        router.back();
      }
    };

    openPdf();
  }, [url]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#D6B36A" />
      <Text style={styles.text}>Opening PDF...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1F17",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  text: {
    marginTop: 16,
    color: "#F4F7F2",
  },
});
