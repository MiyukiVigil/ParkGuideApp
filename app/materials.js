import React, { useMemo, useState, useEffect, useCallback } from "react";
import { View, StyleSheet, FlatList, Alert, Platform, Linking, Modal, useWindowDimensions } from "react-native";
import {
  Text,
  Surface,
  TouchableRipple,
  Avatar,
  Searchbar,
  Chip,
  useTheme,
  IconButton,
  ActivityIndicator,
} from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ReactNativeBlobUtil from "react-native-blob-util";
import api, { ensureFreshSession } from "../utils/api";
import { getAccessToken } from "../utils/tokenStorage";
import AppHeader from "../components/AppHeader";
import ThemedBackground from "../components/ThemedBackground";
import { useScreenSpeech } from "../contexts/ScreenSpeechContext";

const DOWNLOAD_STORAGE_KEY = "downloadedSecureMaterialsV2";

const formatBytes = (bytes) => {
  const value = Number(bytes) || 0;
  if (value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const sized = value / (1024 ** index);
  return `${sized.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const formatUploadedDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString();
};

export default function Materials() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const maxContentWidth = width > 1200 ? 980 : "100%";

  // Responsive column count based on screen width
  const getNumColumns = () => {
    if (width >= 1200) return 3;
    if (width >= 800) return 2;
    return 1;
  };

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [downloadedFiles, setDownloadedFiles] = useState({});
  const [downloadProgress, setDownloadProgress] = useState({});
  const [downloadingMap, setDownloadingMap] = useState({});
  const [studyMaterials, setStudyMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);
  const [viewingPdfLoading, setViewingPdfLoading] = useState(false);

  const handleViewOnline = async (item) => {
    try {
      setViewingPdfLoading(true);
      // Get authenticated download URL
      const remoteUrl = item.url || (await getMaterialUrl(item));
      if (!remoteUrl) {
        setViewingPdfLoading(false);
        Alert.alert(t("unavailable"), t("thisFileNotAvailable"));
        return;
      }

      // Ensure fresh session (refresh token if needed)
      const hasValidSession = await ensureFreshSession();
      if (!hasValidSession) {
        setViewingPdfLoading(false);
        Alert.alert(t("sessionExpired"), t("pleaseLogInAgain"));
        router.replace("/");
        return;
      }

      // Get the current access token
      const token = await getAccessToken();
      if (!token) {
        setViewingPdfLoading(false);
        Alert.alert(t("authRequired"), t("pleaseLogInAgain"));
        router.replace("/");
        return;
      }

      const tempPath = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/temp_pdf_${Date.now()}.pdf`;
      const headers = { Authorization: `Bearer ${token}` };

      try {
        await ReactNativeBlobUtil.config({
          path: tempPath,
          fileCache: true,
        }).fetch("GET", remoteUrl, headers);

        setViewingPdfLoading(false);
        // Open PDF viewer in-app with local path
        router.push({
          pathname: "/pdfViewer",
          params: {
            url: encodeURIComponent(tempPath),
            isLocalPath: "true",
            title: encodeURIComponent(item.title),
          },
        });
      } catch (downloadError) {
        setViewingPdfLoading(false);
        console.error("PDF download error:", downloadError);
        Alert.alert(t("downloadFailedTitle"), t("couldNotDownloadPDF"));
      }
    } catch (error) {
      setViewingPdfLoading(false);
      console.log("Error opening URL:", error);
      Alert.alert(t("error"), t("failedToOpenFile"));
    }
  };

  const getAuthHeaders = async () => {
    const token = await getAccessToken();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    const loadDownloadedFiles = async () => {
      try {
        const cached = await AsyncStorage.getItem(DOWNLOAD_STORAGE_KEY);
        if (!cached) return;

        const parsed = JSON.parse(cached);
        if (!parsed || typeof parsed !== "object") return;

        const validated = {};
        const entries = Object.entries(parsed);

        for (const [materialId, filePath] of entries) {
          const exists = await ReactNativeBlobUtil.fs.exists(filePath);
          if (exists) {
            validated[materialId] = filePath;
          }
        }

        setDownloadedFiles(validated);
        await AsyncStorage.setItem(DOWNLOAD_STORAGE_KEY, JSON.stringify(validated));
      } catch (error) {
        console.log("Failed loading downloaded files", error.message);
      }
    };

    loadDownloadedFiles();
  }, []);

  useEffect(() => {
    const loadStudyMaterials = async () => {
      try {
        setLoadingMaterials(true);
        const response = await api.get("/secure-files/files/");
        const rows = Array.isArray(response.data) ? response.data : [];

        const mapped = rows.map((row) => ({
          id: String(row.id),
          fileId: row.id,
          title: row.original_name || `File ${row.id}`,
          sub: `${(row.content_type || "FILE").toUpperCase()} • ${formatBytes(row.size)}`,
          category: row.category || row.file_category || row.tags?.[0] || "All",
          tags: Array.isArray(row.tags) ? row.tags : [],
          url: row.download_url || null,
          apiDownloadUrl: `${api.defaults.baseURL}/secure-files/files/${row.id}/download/`,
          uploadedAt: row.uploaded_at || null,
        }));

        mapped.sort((left, right) => {
          const leftTime = left.uploadedAt ? new Date(left.uploadedAt).getTime() : 0;
          const rightTime = right.uploadedAt ? new Date(right.uploadedAt).getTime() : 0;
          return rightTime - leftTime;
        });

        setStudyMaterials(mapped);
      } catch (error) {
        if (
          error.response?.status === 401 ||
          error.response?.status === 403 ||
          error.isSessionExpired
        ) {
          Alert.alert(t("sessionExpired"), t("pleaseLogInAgain"));
          router.replace("/");
          return;
        }

        console.log("Failed to load study materials", error.response?.data || error.message);
        setStudyMaterials([]);
      } finally {
        setLoadingMaterials(false);
      }
    };

    loadStudyMaterials();
  }, [router]);

  const filtered = useMemo(() => {
    return studyMaterials.filter((item) => {
      const matchesQuery = item.title.toLowerCase().includes(query.toLowerCase());
      const matchesCategory =
        activeCategory === "All" || item.category === activeCategory || item.tags?.includes(activeCategory);
      return matchesQuery && matchesCategory;
    });
  }, [query, activeCategory, studyMaterials]);

  const categories = useMemo(() => {
    const tagSet = new Set(["All"]);
    studyMaterials.forEach((item) => {
      if (item.category && item.category !== "All") tagSet.add(item.category);
      item.tags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet);
  }, [studyMaterials]);

  useScreenSpeech(
    loadingMaterials
      ? 'Materials are loading.'
      : [
          'Materials',
          activeCategory !== 'All' ? `Category: ${activeCategory}` : '',
          query ? `Search: ${query}` : '',
          ...filtered.map((item, index) => `${index + 1}. ${item.title}. ${item.sub}`),
        ]
          .filter(Boolean)
          .join('. '),
    { priority: 100 }
  );

  const getAppDownloadPath = (item) => {
    const ext = ".pdf";
    return `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/material_${item.id}${ext}`;
  };

  const getMaterialUrl = async (item) => {
    if (!item?.fileId) {
      return item?.url || null;
    }

    try {
      const response = await api.get(`/secure-files/files/${item.fileId}/download-url/`);
      return response?.data?.download_url || item?.url || null;
    } catch (error) {
      if (
        error.response?.status === 401 ||
        error.response?.status === 403 ||
        error.isSessionExpired
      ) {
        Alert.alert(t("sessionExpired"), t("pleaseLogInAgain"));
        router.replace("/");
        return null;
      }
      return item?.url || null;
    }
  };

  const handleDownloadToPublicDownloads = async (item) => {
    if (downloadingMap[item.id]) return;

    try {
      setDownloadingMap((prev) => ({ ...prev, [item.id]: true }));
      setDownloadProgress((prev) => ({ ...prev, [item.id]: 0 }));

      const fileName = `${item.title.replace(/[^a-zA-Z0-9-_ ]/g, "").trim() || `material_${item.id}`}.pdf`;
      const filePath = `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${fileName}`;

      const remoteUrl = item.apiDownloadUrl || item.url;
      if (!remoteUrl) {
        throw new Error("Missing download URL");
      }

      const headers = await getAuthHeaders();

      const task = ReactNativeBlobUtil.config({
        fileCache: true,
        path: filePath,
        addAndroidDownloads: {
          useDownloadManager: true,
          notification: true,
          mediaScannable: true,
          title: fileName,
          mime: "application/pdf",
          path: filePath,
          description: t("downloadDescription"),
        },
      }).fetch("GET", remoteUrl, headers);

      task.progress((received, total) => {
        if (!total) return;
        const progress = received / total;
        setDownloadProgress((prev) => ({ ...prev, [item.id]: progress }));
      });

      await task;

      const updated = {
        ...downloadedFiles,
        [item.id]: filePath,
      };

      setDownloadedFiles(updated);
      await AsyncStorage.setItem(DOWNLOAD_STORAGE_KEY, JSON.stringify(updated));

      Alert.alert(
        t("downloadCompleteTitle"),
        `${t("downloadCompleteMessage")}\n${t("downloadSavedAt")} ${filePath}`
      );
    } catch (error) {
      console.log("Download failed", error.message);
      Alert.alert(t("downloadFailedTitle"), t("downloadFailedMessage"));
    } finally {
      setDownloadingMap((prev) => ({ ...prev, [item.id]: false }));
      setDownloadProgress((prev) => ({ ...prev, [item.id]: 0 }));
    }
  };

  const handleDownloadToAppStorage = async (item, options = {}) => {
    if (Platform.OS === "web") {
      openPDF(item.url);
      return;
    }

    if (downloadingMap[item.id]) return;

    try {
      setDownloadingMap((prev) => ({ ...prev, [item.id]: true }));
      setDownloadProgress((prev) => ({ ...prev, [item.id]: 0 }));

      const filePath = getAppDownloadPath(item);
      const remoteUrl = item.apiDownloadUrl || item.url;
      if (!remoteUrl) {
        throw new Error("Missing download URL");
      }

      const headers = await getAuthHeaders();

      const task = ReactNativeBlobUtil.config({
        path: filePath,
        fileCache: true,
      }).fetch("GET", remoteUrl, headers);

      task.progress((received, total) => {
        if (!total) return;
        const progress = received / total;
        setDownloadProgress((prev) => ({ ...prev, [item.id]: progress }));
      });

      await task;

      const updated = {
        ...downloadedFiles,
        [item.id]: filePath,
      };

      setDownloadedFiles(updated);
      await AsyncStorage.setItem(DOWNLOAD_STORAGE_KEY, JSON.stringify(updated));

      if (options.showSuccessAlert !== false) {
        Alert.alert(
          t("downloadCompleteTitle"),
          `${t("downloadCompleteMessage")}\n${t("downloadSavedAt")} ${filePath}`
        );
      }

      return filePath;
    } catch (error) {
      console.log("Download failed", error.message);
      if (options.showErrorAlert !== false) {
        Alert.alert(t("downloadFailedTitle"), t("downloadFailedMessage"));
      }
      return null;
    } finally {
      setDownloadingMap((prev) => ({ ...prev, [item.id]: false }));
      setDownloadProgress((prev) => ({ ...prev, [item.id]: 0 }));
    }
  };

  const handleDownload = async (item) => {
    let remoteUrl = item.apiDownloadUrl;
    if (Platform.OS === "web") {
      remoteUrl = await getMaterialUrl(item);
    }

    if (!remoteUrl) {
      Alert.alert(t("downloadFailedTitle"), t("noDownloadUrlAvailable"));
      return;
    }

    const hydratedItem = { ...item, url: remoteUrl };

    if (Platform.OS === "web") {
      Linking.openURL(hydratedItem.url);
      return;
    }

    if (Platform.OS === "android") {
      Alert.alert(
        t("downloadLocationTitle"),
        t("downloadLocationMessage"),
        [
          {
            text: t("downloadToDevice"),
            onPress: () => handleDownloadToPublicDownloads(hydratedItem),
          },
          {
            text: t("downloadInBrowser"),
            onPress: () => Linking.openURL(hydratedItem.url),
          },
          {
            text: t("downloadToAppStorage"),
            onPress: () => handleDownloadToAppStorage(hydratedItem),
          },
          {
            text: t("cancelAction"),
            style: "cancel",
          },
        ]
      );
      return;
    }

    Alert.alert(
      t("downloadLocationTitle"),
      t("downloadLocationMessageIOS"),
      [
        {
          text: t("downloadInBrowser"),
          onPress: () => Linking.openURL(hydratedItem.url),
        },
        {
          text: t("downloadToAppStorage"),
          onPress: () => handleDownloadToAppStorage(hydratedItem),
        },
        {
          text: t("cancelAction"),
          style: "cancel",
        },
      ]
    );
  };

  const handleDeleteFile = async (item) => {
    Alert.alert(
      t("confirmDelete"),
      t("confirmDeleteFile"),
      [
        {
          text: t("cancelAction"),
          style: "cancel",
        },
        {
          text: t("deleteAction"),
          style: "destructive",
          onPress: async () => {
            try {
              const filePath = downloadedFiles[item.id];
              if (filePath) {
                const exists = await ReactNativeBlobUtil.fs.exists(filePath);
                if (exists) {
                  await ReactNativeBlobUtil.fs.unlink(filePath);
                }
              }

              const updated = { ...downloadedFiles };
              delete updated[item.id];
              setDownloadedFiles(updated);
              await AsyncStorage.setItem(DOWNLOAD_STORAGE_KEY, JSON.stringify(updated));

              Alert.alert(t("successTitle"), t("fileDeleted"));
            } catch (error) {
              console.log("Delete error:", error);
              Alert.alert(t("errorTitle"), t("deleteError"));
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const numColumns = getNumColumns();
    const isMultiColumn = numColumns > 1;

    return (
      <TouchableRipple
        borderRadius={16}
        onPress={() => handleViewOnline(item)}
        style={{ marginBottom: 12, flex: 1 / numColumns }}
      >
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
          <View style={[styles.cardInner, isMultiColumn && styles.cardInnerVertical]}>
            <View style={styles.cardLeft}>
              <Avatar.Icon
                icon="file-pdf-box"
                size={40}
                color={theme.colors.error}
                style={{ backgroundColor: theme.colors.errorContainer }}
              />
            </View>

            <View style={[styles.cardMiddle, isMultiColumn && styles.cardMiddleVertical]}>
              <Text
                style={[styles.cardTitle, { color: theme.colors.onSurface }]}
                numberOfLines={2}
              >
                {item.title}
              </Text>

              <View style={styles.metaRow}>
                <Chip
                  compact
                  size="small"
                  style={[styles.categoryChip, { backgroundColor: theme.colors.primaryContainer }]}
                  textStyle={[styles.categoryChipText, { color: theme.colors.onPrimaryContainer }]}
                >
                  {item.category}
                </Chip>
                {!!item.uploadedAt && (
                  <Text style={[styles.cardMeta, { color: theme.colors.onSurfaceVariant }]}>
                    {formatUploadedDate(item.uploadedAt)}
                  </Text>
                )}
              </View>

              {!!downloadedFiles[item.id] && (
                <Text style={[styles.savedLabel, { color: theme.colors.primary }]}>
                  ✓ {t("savedLocally")}
                </Text>
              )}
            </View>

            <View style={[styles.cardRight, isMultiColumn && styles.cardRightVertical]}>
              {!downloadedFiles[item.id] ? (
                <IconButton
                  icon="download"
                  disabled={!!downloadingMap[item.id]}
                  onPress={(e) => {
                    e.stopPropagation ? e.stopPropagation() : null;
                    handleDownload(item);
                  }}
                  size={20}
                  iconColor={theme.colors.primary}
                />
              ) : (
                <IconButton
                  icon="trash-can"
                  onPress={(e) => {
                    e.stopPropagation ? e.stopPropagation() : null;
                    handleDeleteFile(item);
                  }}
                  size={20}
                  iconColor={theme.colors.error}
                />
              )}
            </View>
          </View>
        </Surface>
      </TouchableRipple>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ThemedBackground />
      <AppHeader
        title={t("matHeadline")}
        subtitle={t("forestKnowledgeResources")}
        showBack
        showHome
      />

      <View style={[styles.container, { maxWidth: maxContentWidth }]}>
        <Searchbar
          placeholder={t("searchMaterials")}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          value={query}
          onChangeText={setQuery}
          style={[
            styles.search,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
          inputStyle={{ color: theme.colors.onSurface }}
          iconColor={theme.colors.onSurfaceVariant}
        />

        <View style={styles.chipRow}>
          {categories.map((key) => {
            const label = key === "All" ? t("categoryAll") : t(`category${key}`, key);
            const selected = activeCategory === key;
            return (
              <Chip
                key={key}
                selected={selected}
                onPress={() => setActiveCategory(key)}
                style={{
                  backgroundColor: selected
                    ? theme.colors.primary
                    : theme.colors.surfaceVariant,
                }}
                textStyle={{
                  color: selected
                    ? theme.colors.onPrimary
                    : theme.colors.onSurface,
                  fontWeight: "700",
                }}
              >
                {label}
              </Chip>
            );
          })}
        </View>

        {loadingMaterials ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              animating
              size="large"
              color={theme.colors.primary}
            />
          </View>
        ) : filtered.length === 0 ? (
          <Surface
            style={[
              styles.emptyCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
            elevation={1}
          >
            <Avatar.Icon
              icon="file-search-outline"
              size={58}
              color={theme.colors.primary}
              style={{ backgroundColor: theme.colors.primaryContainer }}
            />
            <Text
              style={{
                color: theme.colors.onSurface,
                fontWeight: "800",
                marginTop: 14,
                fontSize: 18,
              }}
            >
              {t("noMaterialsFound")}
            </Text>
            <Text
              style={{
                color: theme.colors.onSurfaceVariant,
                marginTop: 8,
                textAlign: "center",
                lineHeight: 22,
              }}
            >
              {t("noMaterialsFoundDesc")}
            </Text>
          </Surface>
        ) : (
          <FlatList
            data={filtered}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24, paddingTop: 4 }}
            scrollEnabled={true}
            numColumns={getNumColumns()}
            columnWrapperStyle={getNumColumns() > 1 ? { gap: 12 } : undefined}
          />
        )}
      </View>

      <Modal
        visible={viewingPdfLoading}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={[styles.loadingOverlay, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 16, color: theme.colors.onBackground }}>
            {t("loadingPdf")}
          </Text>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    width: "100%",
    alignSelf: "center",
    padding: 16,
  },
  search: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipRow: {
    flexDirection: "row",
    marginBottom: 16,
    paddingRight: 8,
    gap: 8,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
  },
  cardInnerVertical: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  cardLeft: {
    justifyContent: "center",
  },
  cardMiddle: {
    flex: 1,
    justifyContent: "center",
  },
  cardMiddleVertical: {
    width: "100%",
  },
  cardRight: {
    justifyContent: "center",
    alignItems: "center",
  },
  cardRightVertical: {
    alignSelf: "flex-end",
  },
  cardTitle: {
    fontWeight: "700",
    fontSize: 15,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  categoryChip: {
    height: 24,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardMeta: {
    fontSize: 12,
    fontWeight: "500",
  },
  savedLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyCard: {
    marginTop: 24,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
  },
  loadingOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.95,
  },
});
