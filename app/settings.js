import React, { useState } from "react";
import { View, StyleSheet, Alert, ScrollView, useWindowDimensions } from "react-native";
import {
  List,
  Switch,
  Button,
  Menu,
  Surface,
  Avatar,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import AppHeader from "../components/AppHeader";
import ThemedBackground from "../components/ThemedBackground";
import { useThemeContext } from "../contexts/ThemeContext";
import { clearAuthTokens } from "../utils/tokenStorage";
import { clearProgressData } from "../utils/progressSync";

export default function Settings() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const {
    isDarkMode,
    toggleTheme,
    uiMode,
    toggleUiMode,
    isSimpleMode,
    highContrast,
    toggleHighContrast,
    animationsEnabled,
    toggleAnimations,
  } = useThemeContext();

  const [langMenuVisible, setLangMenuVisible] = useState(false);
  const [fontMenuVisible, setFontMenuVisible] = useState(false);
  const [isTTS, setIsTTS] = useState(false);
  const [fontLabel, setFontLabel] = useState("Standard");

  // Responsive container width for larger screens
  const containerWidth = width > 1200 ? 800 : "100%";
  const containerMargin = width > 1200 ? "auto" : 0;

  const getLangLabel = () => {
    switch (i18n.language) {
      case "ms":
        return "Bahasa Melayu";
      case "zh":
        return "中文";
      default:
        return "English";
    }
  };

  const handleSecureLogout = async () => {
    Alert.alert(
      "Secure Logout",
      "Are you sure you want to sign out? All local data will be cleared.",
      [
        { text: "Cancel", onPress: () => {}, style: "cancel" },
        {
          text: "Sign Out",
          onPress: async () => {
            try {
              // Clear all auth data
              await clearAuthTokens();
              await clearProgressData();
              // Reset navigation stack completely to login
              router.replace({
                pathname: "/",
                params: { logout: "true" }
              });
            } catch (error) {
              Alert.alert("Error", "Failed to sign out.");
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const updateLanguage = async (lang) => {
    await i18n.changeLanguage(lang);
    await AsyncStorage.setItem("appLanguage", lang);
    setLangMenuVisible(false);
  };

  const cardRadius = isSimpleMode || highContrast ? 16 : 26;
  const sectionRadius = isSimpleMode || highContrast ? 16 : 24;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <ThemedBackground />
      <AppHeader
        title={t("setHeader")}
        subtitle="Preferences and display"
        showBack
        showHome
      />

      <ScrollView 
        style={[styles.container, { width: containerWidth, marginLeft: containerMargin, marginRight: containerMargin }]} 
        contentContainerStyle={styles.contentContainer}
      >
        <Surface
          style={[
            styles.profileCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
              borderRadius: cardRadius,
            },
          ]}
          elevation={highContrast ? 0 : isSimpleMode ? 1 : 2}
        >
          <TouchableRipple onPress={() => router.push("/account")} borderRadius={cardRadius}>
            <View style={[styles.profileInner, { paddingVertical: isSimpleMode || highContrast ? 22 : 18 }]}>
              <Avatar.Icon
                icon="account"
                size={isSimpleMode || highContrast ? 60 : 54}
                style={{ backgroundColor: theme.colors.primaryContainer }}
                color={theme.colors.tertiary}
              />
              <View style={{ marginLeft: 14, flex: 1 }}>
                <Text variant={isSimpleMode || highContrast ? "titleLarge" : "titleMedium"} style={{ color: theme.colors.onSurface, fontWeight: "800" }}>
                  Guide Preferences
                </Text>
                <Text variant={isSimpleMode || highContrast ? "bodyMedium" : "bodySmall"} style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  Tap here to open account settings, email, password and profile
                </Text>
              </View>
            </View>
          </TouchableRipple>
        </Surface>

        <Surface
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
              borderRadius: sectionRadius,
            },
          ]}
          elevation={highContrast ? 0 : 1}
        >
          <Text
            variant={isSimpleMode || highContrast ? "titleMedium" : "titleSmall"}
            style={[
              styles.sectionTitle,
              {
                color: theme.colors.onSurfaceVariant,
                paddingTop: isSimpleMode || highContrast ? 18 : 14,
              },
            ]}
          >
            Appearance
          </Text>

          <List.Item
            title="Theme Mode"
            description={isDarkMode ? "Dark mode" : "Light mode"}
            left={(props) => (
              <List.Icon
                {...props}
                icon={isDarkMode ? "moon-waning-crescent" : "weather-sunny"}
                color={theme.colors.tertiary}
              />
            )}
            titleStyle={{ color: theme.colors.onSurface, fontWeight: "700", fontSize: isSimpleMode || highContrast ? 19 : 16 }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant, fontSize: isSimpleMode || highContrast ? 15 : 13 }}
            right={() => <Switch value={isDarkMode} onValueChange={toggleTheme} />}
            style={{ minHeight: isSimpleMode || highContrast ? 72 : undefined }}
          />

          <List.Item
            title="Interface Mode"
            description={uiMode === "simple" ? "Basic" : "Pro"}
            left={(props) => (
              <List.Icon
                {...props}
                icon={uiMode === "simple" ? "view-agenda-outline" : "palette-outline"}
                color={theme.colors.tertiary}
              />
            )}
            titleStyle={{ color: theme.colors.onSurface, fontWeight: "700", fontSize: isSimpleMode || highContrast ? 19 : 16 }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant, fontSize: isSimpleMode || highContrast ? 15 : 13 }}
            right={() => <Switch value={uiMode === "pretty"} onValueChange={toggleUiMode} />}
            style={{ minHeight: isSimpleMode || highContrast ? 72 : undefined }}
          />

          <List.Item
            title="High Contrast"
            description={highContrast ? "High contrast on" : "High contrast off"}
            left={(props) => (
              <List.Icon
                {...props}
                icon="circle-half-full"
                color={theme.colors.tertiary}
              />
            )}
            titleStyle={{ color: theme.colors.onSurface, fontWeight: "700", fontSize: isSimpleMode || highContrast ? 19 : 16 }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant, fontSize: isSimpleMode || highContrast ? 15 : 13 }}
            right={() => <Switch value={highContrast} onValueChange={toggleHighContrast} />}
            style={{ minHeight: isSimpleMode || highContrast ? 72 : undefined }}
          />

          <List.Item
            title="Background Animations"
            description={animationsEnabled ? "Animations enabled" : "Animations disabled"}
            left={(props) => (
              <List.Icon
                {...props}
                icon="animation-play"
                color={theme.colors.tertiary}
              />
            )}
            titleStyle={{ color: theme.colors.onSurface, fontWeight: "700", fontSize: isSimpleMode || highContrast ? 19 : 16 }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant, fontSize: isSimpleMode || highContrast ? 15 : 13 }}
            right={() => <Switch value={animationsEnabled} onValueChange={toggleAnimations} />}
            style={{ minHeight: isSimpleMode || highContrast ? 72 : undefined }}
          />

          <Menu
            visible={langMenuVisible}
            onDismiss={() => setLangMenuVisible(false)}
            anchor={
              <List.Item
                title={t("langSwitch")}
                description={getLangLabel()}
                left={(props) => (
                  <List.Icon {...props} icon="translate" color={theme.colors.tertiary} />
                )}
                titleStyle={{ color: theme.colors.onSurface, fontWeight: "700", fontSize: isSimpleMode || highContrast ? 19 : 16 }}
                descriptionStyle={{ color: theme.colors.onSurfaceVariant, fontSize: isSimpleMode || highContrast ? 15 : 13 }}
                onPress={() => setLangMenuVisible(true)}
                style={{ minHeight: isSimpleMode || highContrast ? 72 : undefined }}
              />
            }
          >
            <Menu.Item onPress={() => updateLanguage("en")} title="English" />
            <Menu.Item onPress={() => updateLanguage("ms")} title="Bahasa Melayu" />
            <Menu.Item onPress={() => updateLanguage("zh")} title="中文" />
          </Menu>

          <Menu
            visible={fontMenuVisible}
            onDismiss={() => setFontMenuVisible(false)}
            anchor={
              <List.Item
                title={t("fontSet")}
                description={fontLabel}
                left={(props) => (
                  <List.Icon {...props} icon="format-size" color={theme.colors.tertiary} />
                )}
                titleStyle={{ color: theme.colors.onSurface, fontWeight: "700", fontSize: isSimpleMode || highContrast ? 19 : 16 }}
                descriptionStyle={{ color: theme.colors.onSurfaceVariant, fontSize: isSimpleMode || highContrast ? 15 : 13 }}
                onPress={() => setFontMenuVisible(true)}
                style={{ minHeight: isSimpleMode || highContrast ? 72 : undefined }}
              />
            }
          >
            <Menu.Item
              onPress={() => {
                setFontLabel("Small");
                setFontMenuVisible(false);
              }}
              title="Small"
            />
            <Menu.Item
              onPress={() => {
                setFontLabel("Standard");
                setFontMenuVisible(false);
              }}
              title="Standard"
            />
            <Menu.Item
              onPress={() => {
                setFontLabel("Large");
                setFontMenuVisible(false);
              }}
              title="Large"
            />
          </Menu>
        </Surface>

        <Surface
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
              borderRadius: sectionRadius,
            },
          ]}
          elevation={highContrast ? 0 : 1}
        >
          <Text
            variant={isSimpleMode || highContrast ? "titleMedium" : "titleSmall"}
            style={[
              styles.sectionTitle,
              {
                color: theme.colors.onSurfaceVariant,
                paddingTop: isSimpleMode || highContrast ? 18 : 14,
              },
            ]}
          >
            Accessibility
          </Text>

          <List.Item
            title="Text-to-Speech (TTS)"
            description="Read training modules aloud"
            left={(props) => (
              <List.Icon {...props} icon="volume-high" color={theme.colors.tertiary} />
            )}
            right={() => <Switch value={isTTS} onValueChange={() => setIsTTS(!isTTS)} />}
            titleStyle={{ color: theme.colors.onSurface, fontWeight: "700", fontSize: isSimpleMode || highContrast ? 19 : 16 }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant, fontSize: isSimpleMode || highContrast ? 15 : 13 }}
            style={{ minHeight: isSimpleMode || highContrast ? 72 : undefined }}
          />
        </Surface>

        <Button
          mode="outlined"
          textColor={theme.colors.error}
          style={[
            styles.logout,
            {
              borderColor: theme.colors.error,
              borderRadius: isSimpleMode || highContrast ? 14 : 16,
            },
          ]}
          contentStyle={{ height: isSimpleMode || highContrast ? 56 : 48 }}
          onPress={handleSecureLogout}
        >
          Secure Logout
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 40 },
  profileCard: {
    borderWidth: 1,
    marginBottom: 18,
    overflow: "hidden",
  },
  profileInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  sectionCard: {
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
    paddingTop: 4,
  },
  sectionTitle: {
    paddingHorizontal: 18,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  logout: {
    marginTop: 8,
  },
});
