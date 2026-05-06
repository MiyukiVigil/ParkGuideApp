import React, { useState, useEffect } from "react";
import { View, StyleSheet, Dimensions, ActivityIndicator } from "react-native";
import { useTheme, Appbar } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from 'react-i18next';
import Pdf from "react-native-pdf";

export default function PDFViewer() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { url } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [dimensions, setDimensions] = useState(Dimensions.get("window"));

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const source = { uri: decodeURIComponent(url || ""), cache: true };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={t('pdfViewerTitle') || "PDF Viewer"} />
      </Appbar.Header>

      <View style={styles.pdfWrapper}>
        <Pdf
          source={source}
          horizontal={true}
          enablePaging={true}
          trustAllCerts={false}
          fitPolicy={0} 
          scale={1.0}
          onLoadComplete={() => setLoading(false)}
          onError={(error) => {
            console.log(error);
            setLoading(false);
          }}
          style={[styles.pdf, { width: dimensions.width, height: dimensions.height }]}
        />

        {loading && (
          <ActivityIndicator 
            size="large" 
            color={theme.colors.primary} 
            style={styles.loader} 
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pdfWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333', 
  },
  pdf: {
    flex: 1,
  },
  loader: {
    position: 'absolute',
    alignSelf: 'center',
    top: '45%',
  }
});