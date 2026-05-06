import React, { useMemo, useState } from "react";
import { View, StyleSheet, FlatList } from "react-native";
import {
  Text,
  Surface,
  TouchableRipple,
  Avatar,
  Searchbar,
  Chip,
  useTheme,
} from "react-native-paper";
import { useTranslation } from "react-i18next";
import * as WebBrowser from "expo-web-browser";
import AppHeader from "../components/AppHeader";

const STUDY_MATERIALS = [
  {
    id: "1",
    title: "Bako Flora Guide",
    sub: "PDF • 2.4 MB",
    category: "Guide",
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  },
  {
    id: "2",
    title: "Orangutan Ethics",
    sub: "PDF • 1.1 MB",
    category: "Policy",
    url: "https://example-files.pdf2go.com/testing/pdf_collection/example_multipage_landscape.pdf",
  },
];

export default function Materials() {
  const { t } = useTranslation();
  const theme = useTheme();

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const openPDF = async (url) => {
    await WebBrowser.openBrowserAsync(url);
  };

  const filtered = useMemo(() => {
    return STUDY_MATERIALS.filter((item) => {
      const matchesQuery = item.title.toLowerCase().includes(query.toLowerCase());
      const matchesCategory =
        activeCategory === "All" || item.category === activeCategory;
      return matchesQuery && matchesCategory;
    });
  }, [query, activeCategory]);

  const cardOverlay = theme.dark ? "rgba(16,38,28,0.96)" : "rgba(255,255,255,0.86)";
  const chipBg = theme.dark ? "rgba(127,169,138,0.16)" : "rgba(47,125,98,0.10)";

  const renderItem = ({ item }) => (
    <Surface
      style={[
        styles.card,
        {
          backgroundColor: cardOverlay,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
      elevation={2}
    >
      <TouchableRipple
        onPress={() => openPDF(item.url)}
        borderRadius={24}
        style={styles.ripple}
      >
        <View style={styles.cardContent}>
          <View style={styles.fileTop}>
            <Avatar.Icon
              icon="file-pdf-box"
              size={50}
              color={theme.colors.error}
              style={{ backgroundColor: theme.colors.errorContainer }}
            />
            <Chip
              compact
              style={{ backgroundColor: chipBg }}
              textStyle={{ color: theme.colors.onSurface, fontWeight: "700" }}
            >
              {item.category}
            </Chip>
          </View>

          <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]} numberOfLines={2}>
            {item.title}
          </Text>

          <Text style={[styles.cardSub, { color: theme.colors.onSurfaceVariant }]}>
            {item.sub}
          </Text>
        </View>
      </TouchableRipple>
    </Surface>
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title={t("matHeadline")}
        subtitle="Forest knowledge resources"
        showBack
        showHome
      />

      <View style={styles.container}>
        <Surface
          style={[
            styles.hero,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
          elevation={2}
        >
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: "900" }}>
            Learning Materials
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, lineHeight: 22 }}>
            Browse training references, policy resources, and quick field guides for daily forest guide operations.
          </Text>
        </Surface>

        <Searchbar
          placeholder="Search materials"
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
          {["All", "Guide", "Policy"].map((cat) => {
            const selected = activeCategory === cat;
            return (
              <Chip
                key={cat}
                selected={selected}
                onPress={() => setActiveCategory(cat)}
                style={{
                  marginRight: 10,
                  backgroundColor: selected
                    ? theme.colors.primary
                    : theme.colors.surfaceVariant,
                }}
                textStyle={{
                  color: selected ? theme.colors.onPrimary : theme.colors.onSurface,
                  fontWeight: "700",
                }}
              >
                {cat}
              </Chip>
            );
          })}
        </View>

        {filtered.length === 0 ? (
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
            <Text style={{ color: theme.colors.onSurface, fontWeight: "800", marginTop: 14, fontSize: 18 }}>
              No materials found
            </Text>
            <Text
              style={{
                color: theme.colors.onSurfaceVariant,
                marginTop: 8,
                textAlign: "center",
                lineHeight: 22,
              }}
            >
              Try another keyword or switch categories to view available learning resources.
            </Text>
          </Surface>
        ) : (
          <FlatList
            data={filtered}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24, paddingTop: 10 }}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: "space-between" }}
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
    padding: 20,
  },
  hero: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  search: {
    marginBottom: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  chipRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  card: {
    flex: 1,
    marginBottom: 16,
    borderRadius: 24,
    overflow: "hidden",
    marginHorizontal: 4,
    borderWidth: 1,
  },
  ripple: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    minHeight: 182,
  },
  cardContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  fileTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  cardTitle: {
    fontWeight: "800",
    lineHeight: 22,
  },
  cardSub: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: "600",
  },
  emptyCard: {
    marginTop: 18,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
  },
});