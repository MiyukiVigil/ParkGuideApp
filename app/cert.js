import React from "react";
import { View, StyleSheet } from "react-native";
import { Card, Text, Avatar, Divider, List, Chip, Surface, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import AppHeader from "../components/AppHeader";
import ThemedBackground from "../components/ThemedBackground";

export default function Certification() {
  const theme = useTheme();
  const { t } = useTranslation();

  const cardBg = theme.dark ? "rgba(16,38,28,0.96)" : "rgba(255,255,255,0.84)";

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ThemedBackground />
      <AppHeader
        title="Certifications"
        subtitle="Verified guide status"
        showBack
        showHome
      />

      <View style={styles.content}>
        <Card
          style={[
            styles.idCard,
            {
              backgroundColor: theme.colors.primary,
            },
          ]}
        >
          <View style={styles.idContent}>
            <Avatar.Image
              size={84}
              source={{ uri: "https://api.dicebear.com/7.x/avataaars/png?seed=Miyuki" }}
            />
            <View style={styles.idText}>
              <Text variant="titleLarge" style={{ color: theme.colors.onPrimary, fontWeight: "900" }}>
                MIYUKI VIGIL
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onPrimary, marginTop: 4 }}>
                {t("certMedium")}
              </Text>
              <Text variant="labelSmall" style={{ color: "#FFE08A", marginTop: 8, fontWeight: "800" }}>
                ID: SFC-2026-0042
              </Text>
            </View>
          </View>

          <Divider style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />

          <View style={styles.idFooter}>
            <Chip
              icon="check-decagram"
              style={[styles.chip, { backgroundColor: "rgba(255,255,255,0.16)" }]}
              textStyle={{ color: "#fff", fontWeight: "700" }}
            >
              {t("verifiedGuide")}
            </Chip>
            <Text style={{ color: theme.colors.onPrimary, fontSize: 12, fontWeight: "700" }}>
              Exp: 12/2026
            </Text>
          </View>
        </Card>

        <Surface
          style={[
            styles.summaryCard,
            {
              backgroundColor: cardBg,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
          elevation={1}
        >
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: "900" }}>
            Completion Summary
          </Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryBlock}>
              <Text style={[styles.summaryNumber, { color: theme.colors.tertiary }]}>2</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>Courses completed</Text>
            </View>
            <View style={styles.summaryBlock}>
              <Text style={[styles.summaryNumber, { color: theme.colors.tertiary }]}>100%</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>Compliance status</Text>
            </View>
          </View>
        </Surface>

        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          {t("comModules")}
        </Text>

        <Card style={[styles.recordCard, { backgroundColor: cardBg }]}>
          <List.Item
            title="Eco-Tourism Ethics"
            description="Completed March 01, 2026"
            titleStyle={{ color: theme.colors.onSurface, fontWeight: "700" }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            left={(props) => <List.Icon {...props} icon="certificate" color={theme.colors.tertiary} />}
          />
          <Divider />
          <List.Item
            title="Biodiversity Level 1"
            description="Completed Feb 15, 2026"
            titleStyle={{ color: theme.colors.onSurface, fontWeight: "700" }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            left={(props) => <List.Icon {...props} icon="certificate" color={theme.colors.tertiary} />}
          />
        </Card>

        <Text variant="bodySmall" style={[styles.disclaimer, { color: theme.colors.onSurfaceVariant }]}>
          {t("certSecDesc")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 20 },
  idCard: { padding: 16, borderRadius: 24, marginBottom: 18 },
  idContent: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  idText: { marginLeft: 16, flex: 1 },
  idFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  chip: { height: 32 },
  summaryCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 22,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },
  summaryBlock: { flex: 1 },
  summaryNumber: {
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 4,
  },
  sectionTitle: { marginBottom: 12, fontWeight: "900" },
  recordCard: { borderRadius: 20, overflow: "hidden" },
  disclaimer: { marginTop: 18, textAlign: "center", lineHeight: 20 },
});