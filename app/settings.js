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
  Dialog,
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
import { useScreenSpeechContext } from "../contexts/ScreenSpeechContext";
import { useScreenSpeech } from "../contexts/ScreenSpeechContext";

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
    fontScale,
    fontScalePreset,
    setFontScalePreset,
    fontFamilyPreset,
    setFontFamilyPreset,
    highContrast,
    toggleHighContrast,
    animationsEnabled,
    toggleAnimations,
  } = useThemeContext();
  const { ttsEnabled, setTtsEnabled } = useScreenSpeechContext();

  const [langMenuVisible, setLangMenuVisible] = useState(false);
  const [fontMenuVisible, setFontMenuVisible] = useState(false);
  const [fontFamilyMenuVisible, setFontFamilyMenuVisible] = useState(false);
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
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);

  // Keep settings readable on large web/tablet screens.
  const maxContentWidth = width > 1200 ? 860 : 760;

  const getLangLabel = () => {
    switch (i18n.language) {
      case "ms":
        return t("malay");
      case "zh":
        return t("chinese");
      default:
        return t("english");
    }
  };

  const handleSecureLogout = async () => {
    setLogoutDialogVisible(true);
  };

  const confirmSecureLogout = async () => {
    setLogoutDialogVisible(false);
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
  };

  const updateLanguage = async (lang) => {
    await i18n.changeLanguage(lang);
    await AsyncStorage.setItem("appLanguage", lang);
    setLangMenuVisible(false);
  };

  const cardRadius = isSimpleMode || highContrast ? 16 : 26;
  const sectionRadius = isSimpleMode || highContrast ? 16 : 24;
  const scaleSize = (size) => Math.round(size * (fontScale || 1));
  const listTitleFontSize = scaleSize(isSimpleMode || highContrast ? 19 : 16);
  const listDescriptionFontSize = scaleSize(isSimpleMode || highContrast ? 15 : 13);
  const fontLabel = t(fontScalePreset || "standard");
  const fontFamilyLabel = t(fontFamilyPreset === "serif" ? "serifFont" : fontFamilyPreset === "mono" ? "monoFont" : "systemFont");

  const ttsStateLabel = ttsEnabled ? t("enabled") : t("disabled");
  const speechText = [
    t("setHeader"),
    t("preferencesAndDisplay"),
    t("appearance"),
    `${t("themeMode")}: ${isDarkMode ? t("darkMode") : t("lightMode")}`,
    `${t("backgroundAnimations")}: ${animationsEnabled ? t("animationsEnabled") : t("animationsDisabled")}`,
    `${t("langSwitch")}: ${getLangLabel()}`,
    `${t("fontSet")}: ${fontLabel}`,
    `${t("fontStyle")}: ${fontFamilyLabel}`,
    t("accessibility"),
    `${t("textToSpeech")}: ${ttsStateLabel}`,
    t("security"),
  ].join('. ');

  useScreenSpeech(speechText, { priority: 100 });

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
      Alert.alert(t("passwordRequired"), t("enterPasswordToContinue"));
      return;
    }

    try {
      setPasskeySubmitting(true);
      if (passkeyAction === "disable") {
        await disablePasskeys(passkeyPassword);
        Alert.alert(t("passkeyDisabledTitle"), t("passkeySignInTurnedOff"));
      } else {
        await registerPasskey({
          currentPassword: passkeyPassword,
          label: passkeyLabel.trim(),
        });
        Alert.alert(t("passkeySavedTitle"), t("canNowUsePasskey"));
      }

      setPasskeyModalVisible(false);
      setPasskeyPassword("");
      setPasskeyLabel("");
      await loadPasskeyStatus();
    } catch (error) {
      Alert.alert(
        passkeyAction === "disable" ? t("couldNotDisablePasskey") : t("couldNotSavePasskey"),
        getFriendlyPasskeyError(
          error,
          passkeyAction === "disable" ? t("unableToDisablePasskey") : t("unableToCreatePasskey")
        )
      );
    } finally {
      setPasskeySubmitting(false);
    }
  };

  const handleTwoFactorSubmit = async () => {
    if (!twoFactorPassword.trim()) {
      Alert.alert(t("passwordRequired"), t("enterPasswordToContinue"));
      return;
    }

    try {
      setTwoFactorSubmitting(true);
      if (twoFactorAction === "disable") {
        if (!twoFactorCode.trim()) {
          Alert.alert(t("authenticatorCodeRequired"), t("enter6DigitCode"));
          return;
        }
        await disableTwoFactor({
          currentPassword: twoFactorPassword,
          code: twoFactorCode.trim(),
        });
        Alert.alert(t("authenticatorDisabledTitle"), t("authenticator2FADisabled"));
      } else if (!twoFactorSetupData) {
        const setupPayload = await setupTwoFactor(twoFactorPassword);
        setTwoFactorSetupData(setupPayload);
      } else {
        if (!twoFactorCode.trim()) {
          Alert.alert(t("authenticatorCodeRequired"), t("enter6DigitCode"));
          return;
        }
        await confirmTwoFactor(twoFactorCode.trim());
        Alert.alert(t("authenticatorEnabledTitle"), t("canNowSignInWithAuthenticator"));
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
        twoFactorAction === "disable" ? t("couldNotDisableAuthenticator") : t("couldNotUpdateAuthenticator"),
        getFriendlyTwoFactorError(
          error,
          twoFactorAction === "disable"
            ? t("unableToDisable2FA")
            : t("unableToFinishAuthenticatorSetup")
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
            titleStyle={{ color: theme.colors.onSurface, fontWeight: "700", fontSize: listTitleFontSize }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant, fontSize: listDescriptionFontSize }}
            right={() => <Switch value={isDarkMode} onValueChange={toggleTheme} />}
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
            titleStyle={{ color: theme.colors.onSurface, fontWeight: "700", fontSize: listTitleFontSize }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant, fontSize: listDescriptionFontSize }}
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
                titleStyle={{ color: theme.colors.onSurface, fontWeight: "700", fontSize: listTitleFontSize }}
                descriptionStyle={{ color: theme.colors.onSurfaceVariant, fontSize: listDescriptionFontSize }}
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
                titleStyle={{ color: theme.colors.onSurface, fontWeight: "700", fontSize: listTitleFontSize }}
                descriptionStyle={{ color: theme.colors.onSurfaceVariant, fontSize: listDescriptionFontSize }}
                onPress={() => setFontMenuVisible(true)}
                style={{ minHeight: isSimpleMode || highContrast ? 72 : undefined }}
              />
            }
          >
            <Menu.Item
              onPress={() => {
                setFontScalePreset("small");
                setFontMenuVisible(false);
              }}
              title={t("small")}
            />
            <Menu.Item
              onPress={() => {
                setFontScalePreset("standard");
                setFontMenuVisible(false);
              }}
              title={t("standard")}
            />
            <Menu.Item
              onPress={() => {
                setFontScalePreset("large");
                setFontMenuVisible(false);
              }}
              title={t("large")}
            />
          </Menu>

          <Menu
            visible={fontFamilyMenuVisible}
            onDismiss={() => setFontFamilyMenuVisible(false)}
            anchor={
              <List.Item
                title={t("fontStyle")}
                description={fontFamilyLabel}
                left={(props) => (
                  <List.Icon {...props} icon="format-font" color={theme.colors.tertiary} />
                )}
                titleStyle={{ color: theme.colors.onSurface, fontWeight: "700", fontSize: listTitleFontSize }}
                descriptionStyle={{ color: theme.colors.onSurfaceVariant, fontSize: listDescriptionFontSize }}
                onPress={() => setFontFamilyMenuVisible(true)}
                style={{ minHeight: isSimpleMode || highContrast ? 72 : undefined }}
              />
            }
          >
            <Menu.Item
              onPress={() => {
                setFontFamilyPreset("system");
                setFontFamilyMenuVisible(false);
              }}
              title={t("systemFont")}
            />
            <Menu.Item
              onPress={() => {
                setFontFamilyPreset("serif");
                setFontFamilyMenuVisible(false);
              }}
              title={t("serifFont")}
            />
            <Menu.Item
              onPress={() => {
                setFontFamilyPreset("mono");
                setFontFamilyMenuVisible(false);
              }}
              title={t("monoFont")}
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
            right={() => <Switch value={ttsEnabled} onValueChange={setTtsEnabled} />}
            titleStyle={{ color: theme.colors.onSurface, fontWeight: "700", fontSize: listTitleFontSize }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant, fontSize: listDescriptionFontSize }}
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
            {t("security")}
          </Text>

          <List.Item
            title={t("passkeySignIn")}
            description={
              loadingPasskeyStatus
                ? t("checkingPasskeyStatus")
                : passkeyStatus.enabled
                  ? `${passkeyStatus.count} ${t("passkeySaved")}`
                  : passkeyStatus.available
                    ? t("addPasskeyDesc")
                    : t("passkeysNotSupported")
            }
            left={(props) => (
              <List.Icon {...props} icon="key-chain-variant" color={theme.colors.tertiary} />
            )}
            right={() =>
              loadingPasskeyStatus ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null
            }
            titleStyle={{ color: theme.colors.onSurface, fontWeight: "700", fontSize: listTitleFontSize }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant, fontSize: listDescriptionFontSize }}
            style={{ minHeight: isSimpleMode || highContrast ? 72 : undefined }}
          />

          <View style={styles.passkeyActionRow}>
            <Button
              mode="contained"
              onPress={() => openPasskeyModal("create")}
              disabled={!passkeyStatus.available || passkeySubmitting}
            >
              {passkeyStatus.enabled ? t("addAnotherPasskey") : t("createPasskey")}
            </Button>
            <Button
              mode="outlined"
              onPress={() => openPasskeyModal("disable")}
              disabled={!passkeyStatus.enabled || passkeySubmitting}
              textColor={theme.colors.error}
            >
              {t("disable")}
            </Button>
          </View>

          <List.Item
            title={t("authenticator2FA")}
            description={
              loadingTwoFactorStatus
                ? t("checkingAuthenticatorStatus")
                : twoFactorStatus.enabled
                  ? t("authenticatorProtectionEnabled")
                  : t("useAuthenticatorApp")
            }
            left={(props) => (
              <List.Icon {...props} icon="shield-key-outline" color={theme.colors.tertiary} />
            )}
            right={() =>
              loadingTwoFactorStatus ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null
            }
            titleStyle={{ color: theme.colors.onSurface, fontWeight: "700", fontSize: listTitleFontSize }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant, fontSize: listDescriptionFontSize }}
            style={{ minHeight: isSimpleMode || highContrast ? 72 : undefined }}
          />

          <View style={styles.passkeyActionRow}>
            <Button
              mode="contained"
              onPress={() => openTwoFactorModal("create")}
              disabled={twoFactorSubmitting}
            >
              {twoFactorStatus.enabled ? t("resetAuthenticator") : t("setUpAuthenticator")}
            </Button>
            <Button
              mode="outlined"
              onPress={() => openTwoFactorModal("disable")}
              disabled={!twoFactorStatus.enabled || twoFactorSubmitting}
              textColor={theme.colors.error}
            >
              {t("disable")}
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
          {t("logout")}
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
            {passkeyAction === "disable" ? t("disablePasskey") : t("createPasskey")}
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 14 }}>
            {passkeyAction === "disable"
              ? t("enterPasswordDisablePasskey")
              : t("enterPasswordCreatePasskey")}
          </Text>

          {passkeyAction === "create" ? (
            <TextInput
              label={t("passkeyLabelOptional")}
              mode="outlined"
              value={passkeyLabel}
              onChangeText={setPasskeyLabel}
              style={styles.input}
            />
          ) : null}

          <TextInput
            label={t("currentPassword")}
            mode="outlined"
            secureTextEntry
            value={passkeyPassword}
            onChangeText={setPasskeyPassword}
            style={styles.input}
          />

          <View style={styles.modalActionRow}>
            <Button mode="outlined" onPress={closePasskeyModal} disabled={passkeySubmitting}>
              {t("cancel")}
            </Button>
            <Button mode="contained" onPress={handlePasskeySubmit} loading={passkeySubmitting} disabled={passkeySubmitting}>
              {passkeyAction === "disable" ? t("disable") : t("continueAction")}
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
            {twoFactorAction === "disable" ? t("disableAuthenticator") : t("setUpAuthenticator")}
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 14 }}>
            {twoFactorAction === "disable"
              ? t("enterPasswordDisable2FA")
              : twoFactorSetupData
                ? t("scanQrOrCopySecret")
                : t("enterPasswordGenerateSecret")}
          </Text>

          <TextInput
            label={t("currentPassword")}
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
                {t("secretKey")}
              </Text>
              <Text selectable style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
                {twoFactorSetupData.secret}
              </Text>
            </View>
          ) : null}

          {(twoFactorAction === "disable" || twoFactorSetupData) ? (
            <TextInput
              label={t("authenticatorCode")}
              mode="outlined"
              keyboardType="number-pad"
              value={twoFactorCode}
              onChangeText={setTwoFactorCode}
              style={styles.input}
            />
          ) : null}

          <View style={styles.modalActionRow}>
            <Button mode="outlined" onPress={closeTwoFactorModal} disabled={twoFactorSubmitting}>
              {t("cancel")}
            </Button>
            <Button mode="contained" onPress={handleTwoFactorSubmit} loading={twoFactorSubmitting} disabled={twoFactorSubmitting}>
              {twoFactorAction === "disable"
                ? t("disable")
                : twoFactorSetupData
                  ? t("verifyAndEnable")
                  : t("generateSetup")}
            </Button>
          </View>
        </Modal>

        <Dialog
          visible={logoutDialogVisible}
          onDismiss={() => setLogoutDialogVisible(false)}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title>{t("logout")}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{t("logoutConfirm")}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLogoutDialogVisible(false)}>{t("cancel")}</Button>
            <Button textColor={theme.colors.error} onPress={confirmSecureLogout}>
              {t("signOut")}
            </Button>
          </Dialog.Actions>
        </Dialog>
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
