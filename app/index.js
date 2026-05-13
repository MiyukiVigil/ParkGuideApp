import React, { useRef, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Platform,
  Image,
  Animated,
} from "react-native";
import { TextInput, Button, Text, Surface, Portal, Modal, Menu, ActivityIndicator } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import AuthScreenLayout from "../components/AuthScreenLayout";
import api from "../utils/api";
import { clearAuthTokens, getAccessToken, getMustChangePassword, getRefreshToken, getUserRole, setAccessToken, setMustChangePassword, setRefreshToken, setUserRole } from "../utils/tokenStorage";
import { clearProgressData } from "../utils/progressSync";
import { getModuleMapping } from "../utils/moduleMapping";
import * as NotificationService from "../services/notificationService";
import { getFriendlyPasskeyError, isPasskeySupported, signInWithPasskey } from "../services/passkeyService";
import { getFriendlyTwoFactorError, verifyTwoFactorLogin } from "../services/twoFactorService";
import { saveProfileSnapshotFromAuthPayload } from "../services/profileService";
import { useAppAlert } from "../components/AppAlertProvider";

export default function Login() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { showAlert } = useAppAlert();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [error, setError] = useState("");
  const [twoFactorVisible, setTwoFactorVisible] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorSubmitting, setTwoFactorSubmitting] = useState(false);
  const [twoFactorRequestId, setTwoFactorRequestId] = useState("");
  const [langMenuVisible, setLangMenuVisible] = useState(false);

  const getLangLabel = () => {
    switch (i18n.language) {
      case "ms": return "BM";
      case "zh": return "中文";
      default: return "EN";
    }
  };

  const updateLanguage = async (lang) => {
    await i18n.changeLanguage(lang);
    await AsyncStorage.setItem("appLanguage", lang);
    setLangMenuVisible(false);
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const liftAnim = useRef(new Animated.Value(18)).current;

  const resolveAdminFlag = (payload) => {
    const role = String(payload?.role || payload?.user?.user_type || '').trim().toLowerCase();
    return role === 'admin' || payload?.user?.is_staff || payload?.user?.is_superuser;
  };

  const getLoginErrorMessage = (err) => {
    if (!err?.response) {
      if (err?.code === "ECONNABORTED") return t("connectionTimeout");
      return t("networkError");
    }

    const data = err.response?.data || {};
    const detail =
      data.detail ||
      data.error ||
      data.non_field_errors?.[0] ||
      data.email?.[0] ||
      data.password?.[0];

    if (detail && typeof detail === "string") return detail;
    if (err.response.status === 401 || err.response.status === 400) return t("loginError");
    if (err.response.status >= 500) return t("serverError");
    return t("somethingWentWrong");
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 550,
        useNativeDriver: true,
      }),
      Animated.timing(liftAnim, {
        toValue: 0,
        duration: 550,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, liftAnim]);

  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const access = await getAccessToken();
        const refresh = await getRefreshToken();
        const mustResetPassword = await getMustChangePassword();
        const role = String(await getUserRole() || '').trim().toLowerCase();
        if (!access && !refresh) {
          setCheckingAuth(false);
          return;
        }

        if (mustResetPassword) {
          router.replace('/force-reset-password');
          return;
        }

        await api.get("/courses/");
        
        // Build module ID mapping from backend courses
        getModuleMapping().catch(err => console.log('Module mapping build failed (non-critical):', err.message));
        
        router.replace(role === "admin" ? "/dashboard" : "/home");
      } catch (err) {
        const isAuthFailure =
          err?.isSessionExpired ||
          err?.response?.status === 401 ||
          err?.response?.status === 403;

        if (isAuthFailure) {
          await clearAuthTokens();
          await clearProgressData();
        }

        setCheckingAuth(false);
      }
    };

    bootstrapAuth();
  }, [router]);

  const completeLogin = async (payload) => {
    const { access, refresh } = payload;
    const mustChangePassword = Boolean(payload?.must_change_password || payload?.user?.must_change_password);
    const isAdmin = resolveAdminFlag(payload);
    const role = isAdmin ? "admin" : "learner";

    await setAccessToken(access);
    await setRefreshToken(refresh);
    await setUserRole(role);
    await setMustChangePassword(mustChangePassword);
    await saveProfileSnapshotFromAuthPayload(payload);

    if (mustChangePassword) {
      router.replace("/force-reset-password");
      return;
    }

    NotificationService.registerForPushNotifications().catch((err) =>
      console.log("Push notification registration failed (non-critical):", err.message)
    );
    getModuleMapping().catch((err) =>
      console.log("Module mapping build failed (non-critical):", err.message)
    );

    router.replace(isAdmin ? "/dashboard" : "/home");
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showAlert(t("missingFields"), t("pleaseEnterEmailPassword"));
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await api.post("/accounts/login/", {
        email: email.trim(), // must match your Django JWT username_field
        password: password,
      });

      if (response.data?.requires_2fa && response.data?.request_id) {
        setTwoFactorRequestId(response.data.request_id);
        setTwoFactorCode("");
        setTwoFactorVisible(true);
        return;
      }

      await completeLogin(response.data);
    } catch (err) {
      const message = getLoginErrorMessage(err);
      setError(message);
      showAlert(t("loginFailed"), message);
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorLogin = async () => {
    if (!twoFactorCode.trim()) {
      showAlert(t("error"), t("authenticatorCodeRequired"));
      return;
    }

    try {
      setTwoFactorSubmitting(true);
      const payload = await verifyTwoFactorLogin({
        requestId: twoFactorRequestId,
        code: twoFactorCode.trim(),
      });
      setTwoFactorVisible(false);
      setTwoFactorCode("");
      setTwoFactorRequestId("");
      await completeLogin(payload);
    } catch (err) {
      showAlert(t("error"), getFriendlyTwoFactorError(err, t("somethingWentWrong")));
    } finally {
      setTwoFactorSubmitting(false);
    }
  };

  const handlePasskeyLogin = async () => {
    try {
      setPasskeyLoading(true);
      const payload = await signInWithPasskey(email);
      await completeLogin(payload);
    } catch (err) {
      showAlert(t("error"), getFriendlyPasskeyError(err, t("somethingWentWrong")));
    } finally {
      setPasskeyLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <AuthScreenLayout maxWidth={360}>
        <Surface style={styles.checkingCard} elevation={2}>
          <ActivityIndicator animating color="#D6B36A" />
          <Text style={styles.checkingText}>{t("restoringSession")}</Text>
        </Surface>
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout maxWidth={Platform.OS === "web" ? 460 : 430}>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY: liftAnim }],
          },
        ]}
      >
        <View style={styles.langRow}>
          <Menu
            visible={langMenuVisible}
            onDismiss={() => setLangMenuVisible(false)}
            anchor={
              <Button
                icon="translate"
                mode="outlined"
                onPress={() => setLangMenuVisible(true)}
                textColor="#D6B36A"
                style={styles.langButton}
                compact
              >
                {getLangLabel()}
              </Button>
            }
          >
            <Menu.Item onPress={() => updateLanguage("en")} title={t("english")} />
            <Menu.Item onPress={() => updateLanguage("ms")} title={t("malay")} />
            <Menu.Item onPress={() => updateLanguage("zh")} title={t("chinese")} />
          </Menu>
        </View>

        <View style={styles.headerSection}>
          <Surface style={styles.logoSurface} elevation={3}>
            <Image source={require("../assets/old_icon.png")} style={styles.logo} />
          </Surface>

          <Text variant="headlineMedium" style={styles.title}>
            {t("loginHeadline")}
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {t("loginMedium")}
          </Text>
        </View>

        <Surface style={styles.formCard} elevation={2}>
          <TextInput
            label={t("loginEmail")}
            mode="outlined"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            left={<TextInput.Icon icon="email-outline" />}
            style={styles.input}
            outlineColor="rgba(127,169,138,0.24)"
            activeOutlineColor="#2E7D5A"
            textColor="#F4F7F2"
          />

          <TextInput
            label={t("loginPassword")}
            mode="outlined"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            left={<TextInput.Icon icon="lock-outline" />}
            style={styles.input}
            outlineColor="rgba(127,169,138,0.24)"
            activeOutlineColor="#2E7D5A"
            textColor="#F4F7F2"
          />

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading || passkeyLoading}
            style={styles.button}
            contentStyle={styles.buttonContent}
            buttonColor="#D6B36A"
            textColor="#0B1F17"
          >
            {loading ? t("signingIn") : t("loginButton")}
          </Button>

          {error ? <Text style={styles.inlineError}>{error}</Text> : null}

          {isPasskeySupported() ? (
            <Button
              mode="outlined"
              onPress={handlePasskeyLogin}
              loading={passkeyLoading}
              disabled={loading || passkeyLoading}
              style={styles.passkeyButton}
              contentStyle={styles.buttonContent}
              textColor="#E6F2EA"
            >
              {passkeyLoading ? t("checkingPasskey") : t("signInWithPasskey")}
            </Button>
          ) : null}

          <View style={styles.helperRow}>
            <Button
              mode="text"
              onPress={() => router.push('/register')}
              textColor="#D6B36A"
              style={styles.applyButton}
            >
              {t("applyForAccount")}
            </Button>
            <Button
              mode="text"
              onPress={() => router.push('/forgot-password')}
              textColor="#A8CFAF"
              style={styles.applyButton}
            >
              {t("forgotPasswordLink")}
            </Button>
          </View>
        </Surface>

        <View style={styles.footer}>
          <Text variant="labelSmall" style={styles.footerMain}>
            {t("protectedSession")}
          </Text>
          <Text variant="labelSmall" style={styles.footerSub}>
            1.6.2
          </Text>
        </View>
      </Animated.View>

      <Portal>
        <Modal
          visible={twoFactorVisible}
          dismissable={!twoFactorSubmitting}
          onDismiss={() => {
            if (twoFactorSubmitting) return;
            setTwoFactorVisible(false);
            setTwoFactorCode("");
            setTwoFactorRequestId("");
          }}
          contentContainerStyle={styles.twoFactorModal}
        >
          <Text variant="titleLarge" style={styles.twoFactorTitle}>
            {t("authenticatorCheck")}
          </Text>
          <Text style={styles.twoFactorSubtitle}>
            {t("authenticatorCheckSubtitle")}
          </Text>
          <TextInput
            label={t("authenticatorCodeLabel")}
            mode="outlined"
            keyboardType="number-pad"
            value={twoFactorCode}
            onChangeText={setTwoFactorCode}
            style={styles.input}
          />
          <View style={styles.twoFactorActions}>
            <Button
              mode="outlined"
              disabled={twoFactorSubmitting}
              onPress={() => {
                setTwoFactorVisible(false);
                setTwoFactorCode("");
                setTwoFactorRequestId("");
              }}
            >
              {t("cancel")}
            </Button>
            <Button
              mode="contained"
              loading={twoFactorSubmitting}
              disabled={twoFactorSubmitting}
              onPress={handleTwoFactorLogin}
            >
              {t("verify")}
            </Button>
          </View>
        </Modal>
      </Portal>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoSurface: {
    borderRadius: 30,
    padding: 14,
    marginBottom: 22,
    backgroundColor: "rgba(24,54,40,0.95)",
    borderWidth: 1,
    borderColor: "rgba(127,169,138,0.16)",
  },
  logo: {
    width: 96,
    height: 96,
  },
  title: {
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -0.5,
    color: "#F4F7F2",
  },
  subtitle: {
    marginTop: 8,
    textAlign: "center",
    maxWidth: 340,
    lineHeight: 22,
    color: "rgba(244,247,242,0.72)",
  },
  formCard: {
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    backgroundColor: "rgba(24,54,40,0.95)",
    borderColor: "rgba(127,169,138,0.16)",
  },
  inlineError: {
    color: "#FFB4AB",
    marginTop: 12,
    textAlign: "center",
    lineHeight: 20,
  },
  checkingCard: {
    alignItems: "center",
    borderRadius: 18,
    padding: 24,
    backgroundColor: "rgba(24,54,40,0.95)",
    borderWidth: 1,
    borderColor: "rgba(127,169,138,0.16)",
  },
  checkingText: {
    color: "#F4F7F2",
    fontWeight: "700",
    marginTop: 14,
  },
  input: {
    marginBottom: 14,
    backgroundColor: "transparent",
  },
  button: {
    marginTop: 10,
    borderRadius: 18,
  },
  passkeyButton: {
    marginTop: 10,
    borderRadius: 18,
    borderColor: "rgba(214,179,106,0.45)",
  },
  buttonContent: {
    height: 54,
  },
  helperRow: {
    marginTop: 14,
    alignItems: "center",
  },
  applyButton: {
    marginTop: 4,
  },
  footer: {
    alignItems: "center",
    marginTop: 26,
  },
  footerMain: {
    color: "#D6B36A",
    fontWeight: "700",
  },
  footerSub: {
    color: "rgba(244,247,242,0.58)",
    marginTop: 6,
  },
  twoFactorModal: {
    margin: 20,
    borderRadius: 24,
    padding: 20,
    backgroundColor: "#10261C",
  },
  twoFactorTitle: {
    color: "#F4F7F2",
    fontWeight: "900",
    marginBottom: 8,
  },
  twoFactorSubtitle: {
    color: "rgba(244,247,242,0.78)",
    marginBottom: 14,
  },
  twoFactorActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 6,
  },
  langRow: {
    alignItems: "flex-end",
    marginBottom: 12,
  },
  langButton: {
    borderColor: "rgba(214,179,106,0.4)",
    borderRadius: 20,
  },
});
