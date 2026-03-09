import React, { useState } from "react";
import { View, StyleSheet, Dimensions, ActivityIndicator } from "react-native";
import Pdf from "react-native-pdf"; // Requires native build: npx expo run:ios
import { useTheme, Appbar } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from 'react-i18next';

export default function PDFViewer() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { url } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);

  const source = { uri: decodeURIComponent(url || ""), cache: true };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} color={theme.colors.onSurface} />
        <Appbar.Content 
          title={t('pdfViewerTitle') || "PDF Viewer"} 
          titleStyle={{ color: theme.colors.onSurface }} 
        />
      </Appbar.Header>

      <View style={{ flex: 1, width: '100%' }}>
        <Pdf
          source={source}
          // THE MAGIC PROPS FOR HORIZONTAL SWIPING
          horizontal={true}
          enablePaging={true}
          scale={1.0}
          minScale={1.0}
          maxScale={3.0}
          onLoadComplete={() => setLoading(false)}
          onError={(error) => {
            console.log(error);
            setLoading(false);
          }}
          style={styles.pdf}
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
  pdf: {
    flex: 1,
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
    backgroundColor: '#000', // Black background looks better for paging
  },
  loader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -20,
    marginLeft: -20,
  }
});