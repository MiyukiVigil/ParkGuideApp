import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Dimensions, Platform, Linking } from "react-native";
import { ActivityIndicator, Text, Appbar, Button, useTheme, ProgressBar, IconButton } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ReactNativeBlobUtil from "react-native-blob-util";
import PdfView from "react-native-pdf";

const TEMP_PDF_STORAGE_KEY = "tempPdfPath";

export default function PDFViewerPage() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const { url, isLocalPath, title } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dimensions, setDimensions] = useState(Dimensions.get("window"));
  const [pdfSource, setPdfSource] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const pdfRef = useRef(null);

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  // Download authenticated PDF if needed
  useEffect(() => {
    const preparePdf = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!url || typeof url !== "string") {
          setError(t("invalidFile") || "Invalid file URL");
          setLoading(false);
          return;
        }

        const decodedUrl = decodeURIComponent(url);
        console.log("PDF URL:", decodedUrl);

        // If it's already a local file path, use it directly
        if (isLocalPath === "true") {
          console.log("Loading local PDF path");
          setPdfSource({ uri: decodedUrl, cache: false });
          return;
        }

        // For public URLs without auth, use directly
        console.log("Loading public URL");
        setPdfSource({ uri: decodedUrl, cache: true });
      } catch (err) {
        console.log("PDF preparation error:", err);
        setError(err.message || "Failed to prepare PDF");
        setLoading(false);
      }
    };

    preparePdf();
  }, [url, isLocalPath]);

  // Cleanup temp PDF on unmount
  useEffect(() => {
    return () => {
      (async () => {
        try {
          const tempPath = await AsyncStorage.getItem(TEMP_PDF_STORAGE_KEY);
          if (tempPath) {
            const exists = await ReactNativeBlobUtil.fs.exists(tempPath);
            if (exists) {
              await ReactNativeBlobUtil.fs.unlink(tempPath);
            }
            await AsyncStorage.removeItem(TEMP_PDF_STORAGE_KEY);
          }
        } catch (err) {
          console.log("Cleanup error:", err);
        }
      })();
    };
  }, []);

  const handlePrevious = () => {
    console.log("Previous button pressed, currentPage:", currentPage, "totalPages:", totalPages);
    if (typeof currentPage === 'number' && currentPage > 1) {
      const newPage = currentPage - 1;
      console.log("Setting page to:", newPage);
      setCurrentPage(newPage);
      // Update PDF directly
      if (pdfRef.current) {
        try {
          pdfRef.current.setPage(newPage);
        } catch (err) {
          console.log("Error setting page:", err);
        }
      }
    } else {
      console.log("Cannot go previous, currentPage:", currentPage);
    }
  };

  const handleNext = () => {
    console.log("Next button pressed, currentPage:", currentPage, "totalPages:", totalPages);
    if (typeof currentPage === 'number' && currentPage < totalPages) {
      const newPage = currentPage + 1;
      console.log("Setting page to:", newPage);
      setCurrentPage(newPage);
      // Update PDF directly
      if (pdfRef.current) {
        try {
          pdfRef.current.setPage(newPage);
        } catch (err) {
          console.log("Error setting page:", err);
        }
      }
    } else {
      console.log("Cannot go next, currentPage:", currentPage, "totalPages:", totalPages);
    }
  };

  const handlePageChange = (page) => {
    if (typeof page === 'number' && page > 0 && page !== currentPage) {
      setCurrentPage(page);
    }
  };

  const progressValue = totalPages > 0 ? currentPage / totalPages : 0;

  // Poll PDF ref to detect swipe page changes
  useEffect(() => {
    if (totalPages === 0 || !pdfRef.current) return;

    const pollInterval = setInterval(() => {
      if (pdfRef.current) {
        try {
          // Try to get the current page from the PDF view
          // The PDF library may store this differently, so we check multiple possible properties
          const pageNum = pdfRef.current.currentPage || pdfRef.current.page || currentPage;
          
          // If we found a different page and it's within bounds, update state
          if (typeof pageNum === 'number' && pageNum > 0 && pageNum <= totalPages && pageNum !== currentPage) {
            console.log("Detected swipe, updating page from", currentPage, "to", pageNum);
            setCurrentPage(pageNum);
          }
        } catch (err) {
          // Silent fail - polling is optional
        }
      }
    }, 300);

    return () => clearInterval(pollInterval);
  }, [totalPages, currentPage]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content 
          title={title ? decodeURIComponent(title) : (t("pdfViewerTitle") || "PDF Viewer")} 
        />
      </Appbar.Header>

      {/* Show full loading screen while preparing PDF */}
      {loading && !pdfSource && (
        <View style={[styles.loadingOverlay, styles.fullScreenLoading]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 16, color: theme.colors.onSurface, fontSize: 16 }}>
            {t("loading") || "Loading PDF..."}
          </Text>
        </View>
      )}

      <View style={[styles.pdfWrapper, { display: pdfSource ? 'flex' : 'none' }]}>
        {error ? (
          <View style={styles.errorContainer}>
            <Text
              style={{
                color: theme.colors.error,
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              {error}
            </Text>
            <Button mode="contained" onPress={() => router.back()}>
              {t("goBack") || "Go Back"}
            </Button>
          </View>
        ) : pdfSource ? (
          <>
            <PdfView
              ref={pdfRef}
              source={pdfSource}
              onLoadComplete={(numberOfPages) => {
                console.log("===== PDF LOADED =====");
                console.log("numberOfPages:", numberOfPages);
                setTotalPages(numberOfPages);
                setCurrentPage(1);
                setLoading(false);
              }}

              onError={(err) => {
                console.log("PDF Load Error:", err);
                setLoading(false);
                setError(t("failedLoadPdf") || "Failed to load PDF. Please try again.");
              }}
              onPageChanged={(e) => {
                // Try to extract page from various possible event formats
                const pageNum = e?.page || e?.nativeEvent?.page || e;
                if (typeof pageNum === 'number' && pageNum > 0 && pageNum !== currentPage) {
                  setCurrentPage(pageNum);
                }
              }}
              style={[
                styles.pdf,
                { width: dimensions.width },
              ]}
              textStyle={styles.text}
              enablePaging={true}
              trustAllCerts={false}
              fitPolicy={0}
              scale={1.0}
              spacing={10}
              horizontal={true}
              directionalLockEnabled={true}
            />

            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text
                  style={{ marginTop: 12, color: theme.colors.onSurface }}
                >
                  {t("loading") || "Loading PDF..."}
                </Text>
              </View>
            )}
          </>
        ) : null}
      </View>

      {pdfSource && !error && (
        <View style={[styles.controlsContainer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outline }]}>
          <Text style={{ color: theme.colors.onSurface, marginBottom: 8, fontSize: 10 }}>
            totalPages={totalPages}, currentPage={currentPage}
          </Text>
          <View style={styles.progressContainer}>
            <ProgressBar
              progress={progressValue}
              color={theme.colors.primary}
              style={styles.progressBar}
            />
            <Text style={[styles.pageText, { color: theme.colors.onSurface }]}>
              {currentPage} / {totalPages}
            </Text>
          </View>

          <View style={styles.buttonRow}>
            <IconButton
              icon="chevron-left"
              disabled={currentPage <= 1}
              onPress={() => {
                console.log("ICON BUTTON LEFT PRESSED");
                handlePrevious();
              }}
              iconColor={theme.colors.primary}
              size={28}
            />
            <Text style={[styles.statusText, { color: theme.colors.onSurfaceVariant }]}>
              {currentPage === 1 && totalPages > 1 ? t("firstPage") || "First Page" : currentPage === totalPages && totalPages > 1 ? t("lastPage") || "Last Page" : ""}
            </Text>
            <IconButton
              icon="chevron-right"
              disabled={currentPage >= totalPages}
              onPress={() => {
                console.log("ICON BUTTON RIGHT PRESSED");
                handleNext();
              }}
              iconColor={theme.colors.primary}
              size={28}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pdfWrapper: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
  },
  pdf: {
    flex: 1,
  },
  text: {
    color: "#000",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1000,
  },
  fullScreenLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  controlsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 8,
  },
  pageText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  statusText: {
    fontSize: 12,
    flex: 1,
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
