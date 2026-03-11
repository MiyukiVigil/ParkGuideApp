import React from "react";
import { View, StyleSheet, Linking } from "react-native";
import { useTheme, Appbar, Button, Text } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

export default function PDFView() {
  const theme = useTheme();
  const router = useRouter();
  const { url } = useLocalSearchParams();
  const pdfUrl = decodeURIComponent(url || "");
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={t('pdfViewerTitle') || "PDF Viewer"} />
      </Appbar.Header>
      <View style={styles.content}>
        <Text style={{ marginBottom: 20 }}>{t("previewNotA")}</Text>
        <Button mode="contained" onPress={() => Linking.openURL(pdfUrl)}>
          {t("openWeb")}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
});