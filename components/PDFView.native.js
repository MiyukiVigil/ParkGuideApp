import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Dimensions, ActivityIndicator } from "react-native";
import { useTheme, Appbar, Button, ProgressBar, Text } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from 'react-i18next';
import Pdf from "react-native-pdf";

export default function PDFViewer() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { url } = useLocalSearchParams();
  const pdfRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [dimensions, setDimensions] = useState(Dimensions.get("window"));

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const rawUrl = decodeURIComponent(url || "");
  const normalizedUri = rawUrl.startsWith('/') ? `file://${rawUrl}` : rawUrl;
  const isRemoteUrl = /^https?:\/\//i.test(normalizedUri);
  const source = { uri: normalizedUri, cache: !isRemoteUrl };

  useEffect(() => {
    setLoading(true);
    setTotalPages(0);
    setCurrentPage(1);
  }, [normalizedUri]);

  const goToPage = (targetPage) => {
    const maxPage = totalPages || 1;
    const safePage = Math.max(1, Math.min(maxPage, targetPage));

    if (pdfRef.current?.setPage) {
      pdfRef.current.setPage(safePage);
    }

    setCurrentPage(safePage);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={t('pdfViewerTitle') || "PDF Viewer"} />
      </Appbar.Header>

      <View style={styles.pdfWrapper}>
        <Pdf
          key={normalizedUri}
          ref={pdfRef}
          source={source}
          horizontal={true}
          enablePaging={true}
          trustAllCerts={false}
          fitPolicy={0} 
          scale={1.0}
          onLoadComplete={(numberOfPages) => {
            const safeTotalPages = parseInt(numberOfPages, 10) || 0;
            setTotalPages(safeTotalPages);
            setCurrentPage(1);
            setLoading(false);
          }}
          onPageChanged={(page) => {
            setCurrentPage(Number(page) || 1);
            setLoading(false);
          }}
          onLoadProgress={(percent) => {
            if (percent >= 1) {
              setLoading(false);
            }
          }}
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

      <View style={[styles.footer, { backgroundColor: theme.colors.surface }]}> 
        <ProgressBar
          progress={totalPages > 0 ? currentPage / totalPages : 0}
          color={theme.colors.primary}
          style={styles.progressBar}
        />

        <View style={styles.paginationRow}>
          <Button
            mode="outlined"
            compact
            onPress={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            {t('pdfPrevPage')}
          </Button>

          <Button mode="contained" compact disabled>
            {currentPage}/{totalPages > 0 ? totalPages : '?'}
          </Button>

          <Button
            mode="outlined"
            compact
            onPress={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            {t('pdfNextPage')}
          </Button>
        </View>

        <Text style={styles.progressLabel}>
          {t('pdfReadingProgress')} {Math.round((totalPages > 0 ? currentPage / totalPages : 0) * 100)}%
        </Text>
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
  },
  footer: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
  },
  progressBar: {
    height: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  progressLabel: {
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.75,
  },
});