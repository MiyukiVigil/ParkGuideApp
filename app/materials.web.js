import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Linking, StyleSheet, View, useWindowDimensions } from "react-native";
import {
  ActivityIndicator,
  Avatar,
  Chip,
  IconButton,
  Searchbar,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import AppHeader from "../components/AppHeader";
import ThemedBackground from "../components/ThemedBackground";
import { useScreenSpeech } from "../contexts/ScreenSpeechContext";
import api, { ensureFreshSession } from "../utils/api";

const formatBytes = (bytes) => {
  const value = Number(bytes) || 0;
  if (value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const sized = value / 1024 ** index;
  return `${sized.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const formatUploadedDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString();
};

export default function MaterialsWeb() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [studyMaterials, setStudyMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);
  const [error, setError] = useState("");
  const maxContentWidth = width > 1200 ? 980 : "100%";
  const numColumns = width >= 1200 ? 3 : width >= 800 ? 2 : 1;

  const getMaterialUrl = useCallback(
    async (item) => {
      if (!item?.fileId) return item?.url || null;
      try {
        const response = await api.get(`/secure-files/files/${item.fileId}/download-url/`);
        return response?.data?.download_url || item?.url || null;
      } catch (requestError) {
        if (
          requestError.response?.status === 401 ||
          requestError.response?.status === 403 ||
          requestError.isSessionExpired
        ) {
          router.replace("/");
          return null;
        }
        return item?.url || null;
      }
    },
    [router]
  );

  useEffect(() => {
    const loadStudyMaterials = async () => {
      try {
        setLoadingMaterials(true);
        setError("");
        const response = await api.get("/secure-files/files/");
        const rows = Array.isArray(response.data) ? response.data : [];
        const mapped = rows.map((row) => ({
          id: String(row.id),
          fileId: row.id,
          title: row.original_name || t("fileNameFallback", { id: row.id }),
          sub: `${(row.content_type || "FILE").toUpperCase()} - ${formatBytes(row.size)}`,
          category: row.category || row.file_category || row.tags?.[0] || "All",
          tags: Array.isArray(row.tags) ? row.tags : [],
          url: row.download_url || null,
          uploadedAt: row.uploaded_at || null,
        }));

        mapped.sort((left, right) => {
          const leftTime = left.uploadedAt ? new Date(left.uploadedAt).getTime() : 0;
          const rightTime = right.uploadedAt ? new Date(right.uploadedAt).getTime() : 0;
          return rightTime - leftTime;
        });

        setStudyMaterials(mapped);
      } catch (requestError) {
        if (
          requestError.response?.status === 401 ||
          requestError.response?.status === 403 ||
          requestError.isSessionExpired
        ) {
          router.replace("/");
          return;
        }
        setError(t("materialsLoadError"));
        setStudyMaterials([]);
      } finally {
        setLoadingMaterials(false);
      }
    };

    loadStudyMaterials();
  }, [router, t]);

  const filtered = useMemo(
    () =>
      studyMaterials.filter((item) => {
        const matchesQuery = item.title.toLowerCase().includes(query.toLowerCase());
        const matchesCategory =
          activeCategory === "All" || item.category === activeCategory || item.tags?.includes(activeCategory);
        return matchesQuery && matchesCategory;
      }),
    [activeCategory, query, studyMaterials]
  );

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
      ? `${t("matHeadline")}. ${t("loadingMaterials")}`
      : [
          t("matHeadline"),
          activeCategory !== "All" ? `${t("category")}: ${activeCategory}` : "",
          query ? `${t("search")}: ${query}` : "",
          ...filtered.map((item, index) => `${index + 1}. ${item.title}. ${item.sub}`),
        ]
          .filter(Boolean)
          .join(". "),
    { priority: 100 }
  );

  const openMaterial = async (item) => {
    const ok = await ensureFreshSession();
    if (!ok) {
      router.replace("/");
      return;
    }

    const remoteUrl = await getMaterialUrl(item);
    if (!remoteUrl) {
      setError(t("noDownloadUrlAvailable"));
      return;
    }

    await Linking.openURL(remoteUrl);
  };

  const renderItem = ({ item }) => (
    <TouchableRipple
      borderRadius={8}
      onPress={() => openMaterial(item)}
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
        <View style={styles.cardInner}>
          <Avatar.Icon
            icon="file-pdf-box"
            size={40}
            color={theme.colors.error}
            style={{ backgroundColor: theme.colors.errorContainer }}
          />
          <View style={styles.cardMiddle}>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.metaRow}>
              <Chip compact style={{ backgroundColor: theme.colors.primaryContainer }}>
                {item.category === "All" ? t("categoryAll") : t(`category${item.category}`, item.category)}
              </Chip>
              {!!item.uploadedAt && (
                <Text style={[styles.cardMeta, { color: theme.colors.onSurfaceVariant }]}>
                  {formatUploadedDate(item.uploadedAt)}
                </Text>
              )}
            </View>
          </View>
          <IconButton icon="open-in-new" size={20} iconColor={theme.colors.primary} />
        </View>
      </Surface>
    </TouchableRipple>
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ThemedBackground />
      <AppHeader title={t("matHeadline")} subtitle={t("forestKnowledgeResources")} showBack showHome />

      <View style={[styles.container, { maxWidth: maxContentWidth }]}>
        <Searchbar
          placeholder={t("searchMaterials")}
          value={query}
          onChangeText={setQuery}
          style={[
            styles.search,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
        />

        <View style={styles.chipRow}>
          {categories.map((key) => {
            const selected = activeCategory === key;
            return (
              <Chip
                key={key}
                selected={selected}
                onPress={() => setActiveCategory(key)}
                style={{ backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceVariant }}
                textStyle={{ color: selected ? theme.colors.onPrimary : theme.colors.onSurfaceVariant }}
              >
                {key === "All" ? t("categoryAll") : t(`category${key}`, key)}
              </Chip>
            );
          })}
        </View>

        {loadingMaterials ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>{t("loadingMaterials")}</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={{ color: theme.colors.error }}>{error}</Text>
          </View>
        ) : (
          <FlatList
            key={numColumns}
            data={filtered}
            numColumns={numColumns}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 28 }}
            columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>{t("noMaterialsFound")}</Text>
                <Text style={[styles.emptyBody, { color: theme.colors.onSurfaceVariant }]}>{t("noMaterialsFoundDesc")}</Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignSelf: "center",
    width: "100%",
    paddingHorizontal: 16,
  },
  search: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardMiddle: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  cardMeta: {
    fontSize: 12,
  },
  columnWrapper: {
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  emptyBody: {
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
});
