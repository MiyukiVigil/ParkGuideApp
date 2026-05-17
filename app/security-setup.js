import React, { useState } from "react";
import { Alert, Image, StyleSheet, useWindowDimensions, View } from "react-native";
import { Button, Divider, Surface, Text, TextInput } from "react-native-paper";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import AuthScreenLayout from "../components/AuthScreenLayout";
import {
  getFriendlyPasskeyError,
  isPasskeySupported,
  registerPasskey,
} from "../services/passkeyService";
import {
  confirmTwoFactor,
  getFriendlyTwoFactorError,
  getTwoFactorQrUrl,
  setupTwoFactor,
} from "../services/twoFactorService";
import { getUserRole } from "../utils/tokenStorage";

export default function SecuritySetupScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { recommended } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const [password, setPassword] = useState("");
  const [passkeyLabel, setPasskeyLabel] = useState("");
  const [passkeySubmitting, setPasskeySubmitting] = useState(false);
  const [twoFactorSubmitting, setTwoFactorSubmitting] = useState(false);
  const [twoFactorSetupData, setTwoFactorSetupData] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [securityConfigured, setSecurityConfigured] = useState(false);
  const qrSize = Math.max(180, Math.min(240, width - 132));

  const goToApp = async () => {
    const role = String(await getUserRole() || "").trim().toLowerCase();
    router.replace(role === "admin" ? "/dashboard" : "/home");
  };

  const handleCreatePasskey = async () => {
    if (!password.trim()) {
      Alert.alert(t("error"), t("passwordRequired"));
      return;
    }

    try {
      setPasskeySubmitting(true);
      await registerPasskey({
        currentPassword: password.trim(),
        label: passkeyLabel.trim(),
      });
      setSecurityConfigured(true);
      Alert.alert(t("saved"), t("passkeySaved"));
    } catch (error) {
      Alert.alert(t("error"), getFriendlyPasskeyError(error, t("somethingWentWrong")));
    } finally {
      setPasskeySubmitting(false);
    }
  };

  const handleTwoFactorSetup = async () => {
    if (!password.trim()) {
      Alert.alert(t("error"), t("passwordRequired"));
      return;
    }

    try {
      setTwoFactorSubmitting(true);
      if (!twoFactorSetupData) {
        const payload = await setupTwoFactor(password.trim());
        setTwoFactorSetupData(payload);
      } else {
        if (!twoFactorCode.trim()) {
          Alert.alert(t("error"), t("authenticatorCodeRequired"));
          return;
        }
        await confirmTwoFactor(twoFactorCode.trim());
        setSecurityConfigured(true);
        Alert.alert(t("saved"), t("authenticatorEnabled"));
        setTwoFactorSetupData(null);
        setTwoFactorCode("");
      }
    } catch (error) {
      Alert.alert(t("error"), getFriendlyTwoFactorError(error, t("somethingWentWrong")));
    } finally {
      setTwoFactorSubmitting(false);
    }
  };

  const handleCopyTwoFactorSecret = async () => {
    const secret = String(twoFactorSetupData?.secret || "").trim();
    if (!secret) {
      Alert.alert(t("error"), t("somethingWentWrong"));
      return;
    }
    try {
      await Clipboard.setStringAsync(secret);
      Alert.alert(
        t("copied", { defaultValue: "Copied" }),
        t("secretKeyCopied", { defaultValue: "Authenticator secret key copied to clipboard." })
      );
    } catch {
      Alert.alert(
        t("error"),
        t("copySecretFailed", {
          defaultValue: "Unable to copy the secret key. You can still select and copy it manually.",
        })
      );
    }
  };

  return (
    <AuthScreenLayout
      centerContent={false}
      maxWidth={520}
      contentContainerStyle={styles.layoutContent}
    >
        <Surface style={styles.card} elevation={3}>
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.title}>
              {t("secureYourNewAccount")}
            </Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>
                {recommended === "true" ? t("securitySetupRecommendedLabel") : t("securitySetupOptionalLabel")}
              </Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            {recommended === "true"
              ? t("securitySetupRecommended")
              : t("securitySetupOptional")}
          </Text>

          <View style={styles.passwordBlock}>
            <Text style={styles.sectionLabel}>{t("securitySetupConfirmPassword")}</Text>
            <Text style={styles.helperText}>{t("securitySetupPasswordHint")}</Text>
            <TextInput
              label={t("currentPassword")}
              mode="outlined"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              style={styles.input}
            />
          </View>

          <Surface style={styles.optionCard} elevation={1}>
            <View style={styles.optionHeader}>
              <View style={styles.optionNumber}>
                <Text style={styles.optionNumberText}>1</Text>
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{t("securitySetupPasskeyTitle")}</Text>
                <Text style={styles.optionBody}>
                  {t("passkeyDescription")}
                </Text>
              </View>
            </View>
            <Divider style={styles.optionDivider} />
            <Text style={styles.optionBody}>
              {t("securitySetupPasskeyHint")}
            </Text>
            {isPasskeySupported() ? (
              <>
                <TextInput
                  label={t("passkeyLabelOptional")}
                  mode="outlined"
                  value={passkeyLabel}
                  onChangeText={setPasskeyLabel}
                  style={styles.input}
                />
                <Button
                  mode="contained"
                  icon="key-variant"
                  onPress={handleCreatePasskey}
                  loading={passkeySubmitting}
                  disabled={passkeySubmitting}
                  style={styles.actionButton}
                  buttonColor="#2E7D5A"
                >
                  {t("createPasskey")}
                </Button>
              </>
            ) : (
              <Text style={styles.unsupportedText}>{t("passkeyNotSupported")}</Text>
            )}
          </Surface>

          <Surface style={styles.optionCard} elevation={1}>
            <View style={styles.optionHeader}>
              <View style={styles.optionNumber}>
                <Text style={styles.optionNumberText}>2</Text>
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{t("authenticator2fa")}</Text>
                <Text style={styles.optionBody}>
                  {t("authenticatorDescription")}
                </Text>
              </View>
            </View>
            <Divider style={styles.optionDivider} />

            {twoFactorSetupData ? (
              <View style={styles.qrBlock}>
                <Text style={styles.stepTitle}>{t("securitySetupAuthenticatorStepScan")}</Text>
                <Text style={styles.helperText}>{t("securitySetupEnterCodeAfterScan")}</Text>
                <Image source={{ uri: getTwoFactorQrUrl(twoFactorSetupData.otpauth_uri) }} style={[styles.qrImage, { width: qrSize, height: qrSize }]}/>
                <View style={styles.secretBox}>
                  <View style={styles.secretHeader}>
                    <Text style={styles.secretLabel}>{t("secretKey")}</Text>
                    <Button mode="text" compact icon="content-copy" onPress={handleCopyTwoFactorSecret} textColor="#F5D58E" style={styles.copySecretButton} labelStyle={styles.copySecretButtonLabel}>
                      {t("copy", { defaultValue: "Copy" })}
                    </Button>
                  </View>
                  <Text selectable style={styles.secretValue}>
                    {twoFactorSetupData.secret}
                  </Text>
                  <Text style={styles.secretHelp}>{t("securitySetupAuthenticatorSecretHelp")}</Text>
                </View>
                <TextInput label={t("authenticatorCodeLabel")} mode="outlined" keyboardType="number-pad" value={twoFactorCode} onChangeText={setTwoFactorCode} style={styles.input}/>
              </View>
            ) : (
              <View style={styles.setupPreview}>
                <Text style={styles.stepTitle}>{t("securitySetupAuthenticatorStepReady")}</Text>
                <Text style={styles.helperText}>{t("securitySetupAuthenticatorStepConfirm")}</Text>
              </View>
            )}

            <Button
              mode="contained"
              icon={twoFactorSetupData ? "shield-check" : "qrcode"}
              onPress={handleTwoFactorSetup}
              loading={twoFactorSubmitting}
              disabled={twoFactorSubmitting}
              style={styles.actionButton}
              buttonColor="#2E7D5A"
            >
              {twoFactorSetupData ? t("verifyAndEnable") : t("securitySetupGenerateAuthenticatorSecret")}
            </Button>
          </Surface>

          <Button mode="outlined" onPress={goToApp} textColor="#F4F7F2" style={styles.footerButton}>
            {securityConfigured ? t("securitySetupContinueToApp") : t("skipForNow")}
          </Button>
        </Surface>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  layoutContent: {
    paddingBottom: 56,
  },
  card: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: "rgba(8, 28, 20, 0.94)",
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    color: "#F4F7F2",
    fontWeight: "900",
    flex: 1,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(214, 179, 106, 0.18)",
  },
  statusPillText: {
    color: "#F5D58E",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  subtitle: {
    color: "#B9D0BF",
    marginTop: 8,
    marginBottom: 18,
    lineHeight: 20,
  },
  input: {
    marginBottom: 12,
    backgroundColor: "transparent",
  },
  passwordBlock: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(244, 247, 242, 0.06)",
    marginBottom: 2,
  },
  sectionLabel: {
    color: "#F4F7F2",
    fontWeight: "800",
    marginBottom: 4,
  },
  helperText: {
    color: "#B9D0BF",
    lineHeight: 19,
    marginBottom: 12,
  },
  optionCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(15, 43, 31, 0.92)",
  },
  optionHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  optionNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(214, 179, 106, 0.18)",
  },
  optionNumberText: {
    color: "#F5D58E",
    fontWeight: "900",
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    color: "#F4F7F2",
    fontWeight: "800",
    fontSize: 18,
  },
  optionBody: {
    color: "#B9D0BF",
    marginTop: 6,
    marginBottom: 12,
    lineHeight: 20,
  },
  optionDivider: {
    marginVertical: 14,
    backgroundColor: "rgba(185, 208, 191, 0.18)",
  },
  actionButton: {
    borderRadius: 12,
    marginTop: 4,
  },
  unsupportedText: {
    color: "#B9D0BF",
  },
  qrBlock: {
    marginBottom: 12,
  },
  qrImage: {
    alignSelf: "center",
    borderRadius: 16,
    marginBottom: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 8,
    borderColor: "#FFFFFF",
  },
  setupPreview: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: "rgba(244, 247, 242, 0.06)",
    marginBottom: 12,
  },
  stepTitle: {
    color: "#F4F7F2",
    fontWeight: "800",
    marginBottom: 6,
  },
  secretBox: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: "rgba(8, 28, 20, 0.72)",
    marginBottom: 12,
  },
  secretHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  secretLabel: {
    color: "#F4F7F2",
    fontWeight: "700",
    flex: 1,
  },
  copySecretButton: {
    marginVertical: -6,
    marginRight: -8,
  },
  copySecretButtonLabel: {
    fontSize: 12,
    fontWeight: "800",
  },
  secretValue: {
    color: "#F5D58E",
    marginBottom: 8,
    fontWeight: "800",
    lineHeight: 20,
  },
  secretHelp: {
    color: "#B9D0BF",
    lineHeight: 18,
    fontSize: 12,
  },
  footerButton: {
    marginTop: 16,
    borderRadius: 12,
    borderColor: "rgba(244, 247, 242, 0.38)",
  },
});
