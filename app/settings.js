import React, { useEffect, useState } from "react";
import { View, StyleSheet, Alert, ScrollView, useWindowDimensions, Image } from "react-native";
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
  TextInput,
  Portal,
  Modal,
  ActivityIndicator,
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
import { unregisterPushNotifications } from "../services/notificationService";
import {
  disablePasskeys,
  getFriendlyPasskeyError,
  getPasskeyStatus,
  isPasskeySupported,
  registerPasskey,
} from "../services/passkeyService";
import {
  confirmTwoFactor,
  disableTwoFactor,
  getFriendlyTwoFactorError,
  getTwoFactorQrUrl,
  getTwoFactorStatus,
  setupTwoFactor,
} from "../services/twoFactorService";

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
  const [passkeyStatus, setPasskeyStatus] = useState({
    available: isPasskeySupported(),
    enabled: false,
    count: 0,
    credentials: [],
  });
  const [loadingPasskeyStatus, setLoadingPasskeyStatus] = useState(true);
  const [passkeyModalVisible, setPasskeyModalVisible] = useState(false);
  const [passkeyAction, setPasskeyAction] = useState("create");
  const [passkeyPassword, setPasskeyPassword] = useState("");
  const [passkeyLabel, setPasskeyLabel] = useState("");
  const [passkeySubmitting, setPasskeySubmitting] = useState(false);
  const [twoFactorStatus, setTwoFactorStatus] = useState({
    available: true,
    enabled: false,
    has_setup_secret: false,
    details: null,
  });
  const [loadingTwoFactorStatus, setLoadingTwoFactorStatus] = useState(true);
  const [twoFactorModalVisible, setTwoFactorModalVisible] = useState(false);
  const [twoFactorAction, setTwoFactorAction] = useState("create");
  const [twoFactorPassword, setTwoFactorPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorSetupData, setTwoFactorSetupData] = useState(null);
  const [twoFactorSubmitting, setTwoFactorSubmitting] = useState(false);

  // Keep settings readable on large web/tablet screens.
  const maxContentWidth = width > 1200 ? 860 : 760;

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
      t("logout"),
      t("logoutConfirm"),
      [
        { text: t("cancel"), onPress: () => {}, style: "cancel" },
        {
          text: t("signOut"),
          onPress: async () => {
            try {
              // Unregister push notifications first
              await unregisterPushNotifications();
              // Clear all auth data
              await clearAuthTokens();
              await clearProgressData();
              // Reset navigation stack completely to login
              router.replace({
                pathname: "/",
                params: { logout: "true" }
              });
            } catch (error) {
              Alert.alert(t("error"), t("failedToSignOut"));
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

  useEffect(() => {
    loadPasskeyStatus();
    loadTwoFactorStatus();
  }, []);

  const loadPasskeyStatus = async () => {
    if (!isPasskeySupported()) {
      setPasskeyStatus((prev) => ({ ...prev, available: false }));
      setLoadingPasskeyStatus(false);
      return;
    }

    try {
      setLoadingPasskeyStatus(true);
      const status = await getPasskeyStatus();
      setPasskeyStatus(status);
    } catch (error) {
      setPasskeyStatus((prev) => ({ ...prev, available: isPasskeySupported() }));
    } finally {
      setLoadingPasskeyStatus(false);
    }
  };

  const loadTwoFactorStatus = async () => {
    try {
      setLoadingTwoFactorStatus(true);
      const status = await getTwoFactorStatus();
      setTwoFactorStatus(status);
    } catch (error) {
      setTwoFactorStatus((prev) => ({ ...prev, available: true }));
    } finally {
      setLoadingTwoFactorStatus(false);
    }
  };

  const openTwoFactorModal = (action) => {
    setTwoFactorAction(action);
    setTwoFactorPassword("");
    setTwoFactorCode("");
    setTwoFactorSetupData(null);
    setTwoFactorModalVisible(true);
  };

  const openPasskeyModal = (action) => {
    setPasskeyAction(action);
    setPasskeyPassword("");
    setPasskeyLabel("");
    setPasskeyModalVisible(true);
  };

  const closeTwoFactorModal = () => {
    if (twoFactorSubmitting) return;
    setTwoFactorModalVisible(false);
    setTwoFactorPassword("");
    setTwoFactorCode("");
    setTwoFactorSetupData(null);
  };

  const closePasskeyModal = () => {
    if (passkeySubmitting) return;
    setPasskeyModalVisible(false);
    setPasskeyPassword("");
    setPasskeyLabel("");
  };

  const handlePasskeySubmit = async () => {
    if (!passkeyPassword.trim()) {
      Alert.alert("Password required", "Enter your password to continue.");
      return;
    }

    try {
      setPasskeySubmitting(true);
      if (passkeyAction === "disable") {
        await disablePasskeys(passkeyPassword);
        Alert.alert("Passkey disabled", "Passkey sign in has been turned off.");
      } else {
        await registerPasskey({
          currentPassword: passkeyPassword,
          label: passkeyLabel.trim(),
        });
        Alert.alert("Passkey saved", "You can now use your passkey to sign in.");
      }

      setPasskeyModalVisible(false);
      setPasskeyPassword("");
      setPasskeyLabel("");
      await loadPasskeyStatus();
    } catch (error) {
      Alert.alert(
        passkeyAction === "disable" ? "Could not disable passkey" : "Could not save passkey",
        getFriendlyPasskeyError(
          error,
          passkeyAction === "disable" ? "Unable to disable passkey." : "Unable to create passkey."
        )
      );
    } finally {
      setPasskeySubmitting(false);
    }
  };

  const handleTwoFactorSubmit = async () => {
    if (!twoFactorPassword.trim()) {
      Alert.alert("Password required", "Enter your password to continue.");
      return;
    }

    try {
      setTwoFactorSubmitting(true);
      if (twoFactorAction === "disable") {
        if (!twoFactorCode.trim()) {
          Alert.alert("Authenticator code required", "Enter the 6-digit code from your authenticator app.");
          return;
        }
        await disableTwoFactor({
          currentPassword: twoFactorPassword,
          code: twoFactorCode.trim(),
        });
        Alert.alert("Authenticator disabled", "Authenticator 2FA has been turned off.");
      } else if (!twoFactorSetupData) {
        const setupPayload = await setupTwoFactor(twoFactorPassword);
        setTwoFactorSetupData(setupPayload);
      } else {
        if (!twoFactorCode.trim()) {
          Alert.alert("Authenticator code required", "Enter the 6-digit code from your authenticator app.");
          return;
        }
        await confirmTwoFactor(twoFactorCode.trim());
        Alert.alert("Authenticator enabled", "You can now sign in with password plus your authenticator code.");
      }

      if (twoFactorAction === "disable" || twoFactorSetupData) {
        setTwoFactorModalVisible(false);
        setTwoFactorPassword("");
        setTwoFactorCode("");
        setTwoFactorSetupData(null);
      }
      await loadTwoFactorStatus();
    } catch (error) {
      Alert.alert(
        twoFactorAction === "disable" ? "Could not disable authenticator" : "Could not update authenticator",
        getFriendlyTwoFactorError(
          error,
          twoFactorAction === "disable"
            ? "Unable to disable authenticator 2FA."
            : "Unable to finish authenticator setup."
        )
      );
    } finally {
      setTwoFactorSubmitting(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <ThemedBackground />
      <AppHeader
        title={t("setHeader")}
        subtitle={t("preferencesAndDisplay")}
        showBack
        showHome
      />

      <ScrollView 
        style={[styles.container, { width: "100%", alignSelf: "center", maxWidth: maxContentWidth }]} 
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
                  {t("guidePreferences")}
                </Text>
                <Text variant={isSimpleMode || highContrast ? "bodyMedium" : "bodySmall"} style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  {t("tapToOpenSettings")}
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
            {t("appearance")}
          </Text>

          <List.Item
            title={t("themeMode")}
            description={isDarkMode ? t("darkMode") : t("lightMode")}
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
            title={t("interfaceMode")}
            description={uiMode === "simple" ? t("basic") : t("pro")}
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
            title={t("highContrast")}
            description={highContrast ? t("highContrastOn") : t("highContrastOff")}
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
            title={t("backgroundAnimations")}
            description={animationsEnabled ? t("animationsEnabled") : t("animationsDisabled")}
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
            <Menu.Item onPress={() => updateLanguage("en")} title={t("english")} />
            <Menu.Item onPress={() => updateLanguage("ms")} title={t("malay")} />
            <Menu.Item onPress={() => updateLanguage("zh")} title={t("chinese")} />
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
                setFontLabel(t("small"));
                setFontMenuVisible(false);
              }}
              title={t("small")}
            />
            <Menu.Item
              onPress={() => {
                setFontLabel(t("standard"));
                setFontMenuVisible(false);
              }}
              title={t("standard")}
            />
            <Menu.Item
              onPress={() => {
                setFontLabel(t("large"));
                setFontMenuVisible(false);
              }}
              title={t("large")}
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
            {t("accessibility")}
          </Text>

          <List.Item
            title={t("textToSpeech")}
            description={t("readTrainingModulesAloud")}
            left={(props) => (
              <List.Icon {...props} icon="volume-high" color={theme.colors.tertiary} />
            )}
            right={() => <Switch value={isTTS} onValueChange={() => setIsTTS(!isTTS)} />}
            titleStyle={{ color: theme.colors.onSurface, fontWeight: "700", fontSize: isSimpleMode || highContrast ? 19 : 16 }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant, fontSize: isSimpleMode || highContrast ? 15 : 13 }}
            style={{ minHeight: isSimpleMode || highContrast ? 72 : undefined }}
          />
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
            Security
          </Text>

          <List.Item
            title="Passkey sign in"
            description={
              loadingPasskeyStatus
                ? "Checking passkey status..."
                : passkeyStatus.enabled
                  ? `${passkeyStatus.count} passkey saved`
                  : passkeyStatus.available
                    ? "Add a passkey for faster sign in"
                    : "Passkeys are not supported on this device"
            }
            left={(props) => (
              <List.Icon {...props} icon="key-chain-variant" color={theme.colors.tertiary} />
            )}
            right={() =>
              loadingPasskeyStatus ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null
            }
            titleStyle={{ color: theme.colors.onSurface, fontWeight: "700", fontSize: isSimpleMode || highContrast ? 19 : 16 }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant, fontSize: isSimpleMode || highContrast ? 15 : 13 }}
            style={{ minHeight: isSimpleMode || highContrast ? 72 : undefined }}
          />

          <View style={styles.passkeyActionRow}>
            <Button
              mode="contained"
              onPress={() => openPasskeyModal("create")}
              disabled={!passkeyStatus.available || passkeySubmitting}
            >
              {passkeyStatus.enabled ? "Add another passkey" : "Create passkey"}
            </Button>
            <Button
              mode="outlined"
              onPress={() => openPasskeyModal("disable")}
              disabled={!passkeyStatus.enabled || passkeySubmitting}
              textColor={theme.colors.error}
            >
              Disable
            </Button>
          </View>

          <List.Item
            title="Authenticator 2FA"
            description={
              loadingTwoFactorStatus
                ? "Checking authenticator status..."
                : twoFactorStatus.enabled
                  ? "Authenticator protection is enabled"
                  : "Use an authenticator app for password sign in"
            }
            left={(props) => (
              <List.Icon {...props} icon="shield-key-outline" color={theme.colors.tertiary} />
            )}
            right={() =>
              loadingTwoFactorStatus ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null
            }
            titleStyle={{ color: theme.colors.onSurface, fontWeight: "700", fontSize: isSimpleMode || highContrast ? 19 : 16 }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant, fontSize: isSimpleMode || highContrast ? 15 : 13 }}
            style={{ minHeight: isSimpleMode || highContrast ? 72 : undefined }}
          />

          <View style={styles.passkeyActionRow}>
            <Button
              mode="contained"
              onPress={() => openTwoFactorModal("create")}
              disabled={twoFactorSubmitting}
            >
              {twoFactorStatus.enabled ? "Reset authenticator" : "Set up authenticator"}
            </Button>
            <Button
              mode="outlined"
              onPress={() => openTwoFactorModal("disable")}
              disabled={!twoFactorStatus.enabled || twoFactorSubmitting}
              textColor={theme.colors.error}
            >
              Disable
            </Button>
          </View>
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

      <Portal>
        <Modal
          visible={passkeyModalVisible}
          onDismiss={closePasskeyModal}
          contentContainerStyle={[
            styles.modalContainer,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: "900", marginBottom: 8 }}>
            {passkeyAction === "disable" ? "Disable passkey" : "Create passkey"}
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 14 }}>
            {passkeyAction === "disable"
              ? "Enter your password to turn off passkey sign in."
              : "Enter your password before saving a passkey on this device."}
          </Text>

          {passkeyAction === "create" ? (
            <TextInput
              label="Passkey label (optional)"
              mode="outlined"
              value={passkeyLabel}
              onChangeText={setPasskeyLabel}
              style={styles.input}
            />
          ) : null}

          <TextInput
            label="Current Password"
            mode="outlined"
            secureTextEntry
            value={passkeyPassword}
            onChangeText={setPasskeyPassword}
            style={styles.input}
          />

          <View style={styles.modalActionRow}>
            <Button mode="outlined" onPress={closePasskeyModal} disabled={passkeySubmitting}>
              Cancel
            </Button>
            <Button mode="contained" onPress={handlePasskeySubmit} loading={passkeySubmitting} disabled={passkeySubmitting}>
              {passkeyAction === "disable" ? "Disable" : "Continue"}
            </Button>
          </View>
        </Modal>

        <Modal
          visible={twoFactorModalVisible}
          onDismiss={closeTwoFactorModal}
          contentContainerStyle={[
            styles.modalContainer,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: "900", marginBottom: 8 }}>
            {twoFactorAction === "disable" ? "Disable authenticator" : "Set up authenticator"}
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 14 }}>
            {twoFactorAction === "disable"
              ? "Enter your password and current authenticator code to turn off 2FA."
              : twoFactorSetupData
                ? "Scan the QR code or copy the secret into your authenticator app, then enter the 6-digit code to confirm."
                : "Enter your password to generate the authenticator setup secret."}
          </Text>

          <TextInput
            label="Current Password"
            mode="outlined"
            secureTextEntry
            value={twoFactorPassword}
            onChangeText={setTwoFactorPassword}
            style={styles.input}
          />

          {twoFactorSetupData ? (
            <View style={styles.twoFactorSetupBlock}>
              <Image
                source={{ uri: getTwoFactorQrUrl(twoFactorSetupData.otpauth_uri) }}
                style={styles.twoFactorQr}
              />
              <Text style={{ color: theme.colors.onSurface, fontWeight: "700", marginBottom: 6 }}>
                Secret key
              </Text>
              <Text selectable style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
                {twoFactorSetupData.secret}
              </Text>
            </View>
          ) : null}

          {(twoFactorAction === "disable" || twoFactorSetupData) ? (
            <TextInput
              label="Authenticator code"
              mode="outlined"
              keyboardType="number-pad"
              value={twoFactorCode}
              onChangeText={setTwoFactorCode}
              style={styles.input}
            />
          ) : null}

          <View style={styles.modalActionRow}>
            <Button mode="outlined" onPress={closeTwoFactorModal} disabled={twoFactorSubmitting}>
              Cancel
            </Button>
            <Button mode="contained" onPress={handleTwoFactorSubmit} loading={twoFactorSubmitting} disabled={twoFactorSubmitting}>
              {twoFactorAction === "disable"
                ? "Disable"
                : twoFactorSetupData
                  ? "Verify & Enable"
                  : "Generate Setup"}
            </Button>
          </View>
        </Modal>
      </Portal>
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
  input: {
    marginBottom: 12,
    backgroundColor: "transparent",
  },
  passkeyActionRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  modalContainer: {
    margin: 18,
    borderRadius: 24,
    padding: 20,
  },
  modalActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 4,
  },
  twoFactorSetupBlock: {
    alignItems: "center",
    marginBottom: 12,
  },
  twoFactorQr: {
    width: 220,
    height: 220,
    borderRadius: 16,
    marginBottom: 12,
  },
  logout: {
    marginTop: 8,
  },
});
