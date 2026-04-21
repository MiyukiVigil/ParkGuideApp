import React, { useRef, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
  Alert,
  useWindowDimensions,
} from "react-native";
import { TextInput, Button, Text, Surface, Portal, Modal } from "react-native-paper";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import ThemedBackground from "../components/ThemedBackground";
import api from "../utils/api";
import { clearAuthTokens, getAccessToken, getMustChangePassword, getRefreshToken, getUserRole, setAccessToken, setMustChangePassword, setRefreshToken, setUserRole } from "../utils/tokenStorage";
import { clearProgressData } from "../utils/progressSync";
import { getModuleMapping } from "../utils/moduleMapping";
import * as NotificationService from "../services/notificationService";
import { getFriendlyPasskeyError, isPasskeySupported, signInWithPasskey } from "../services/passkeyService";
import { getFriendlyTwoFactorError, verifyTwoFactorLogin } from "../services/twoFactorService";
import { saveProfileSnapshotFromAuthPayload } from "../services/profileService";

export default function Login() {
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const contentWidth = isWeb ? Math.min(460, width - 28) : "100%";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [error, setError] = useState("");
  const [twoFactorVisible, setTwoFactorVisible] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorSubmitting, setTwoFactorSubmitting] = useState(false);
  const [twoFactorRequestId, setTwoFactorRequestId] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const liftAnim = useRef(new Animated.Value(18)).current;

  const resolveAdminFlag = (payload) => {
    const role = String(payload?.role || payload?.user?.user_type || '').trim().toLowerCase();
    return role === 'admin' || payload?.user?.is_staff || payload?.user?.is_superuser;
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
      Alert.alert(t("missingFields"), t("pleaseEnterEmailPassword"));
      return;
    }

    try {
      setLoading(true);
      console.log("🔐 Login attempt - API Base URL:", api.defaults.baseURL);
      console.log("🔐 Full endpoint would be:", api.defaults.baseURL + "/accounts/login/");
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
      console.log("Login error - Full error object:", err);
      console.log("Login error - URL attempted:", err.config?.url);
      console.log("Login error - Response status:", err.response?.status);
      console.log("Login error - Response data:", err.response?.data || err.message);

      if (err.response?.status === 401 || err.response?.status === 400) {
        Alert.alert(t("loginFailed"), t("somethingWentWrong"));
      } else {
        Alert.alert(t("loginFailed"), t("somethingWentWrong"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorLogin = async () => {
    if (!twoFactorCode.trim()) {
      Alert.alert("Authenticator code required", "Enter the 6-digit code from your authenticator app.");
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
      Alert.alert("Two-factor sign in failed", getFriendlyTwoFactorError(err, "Unable to verify authenticator code."));
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
      Alert.alert("Passkey sign in failed", getFriendlyPasskeyError(err, "Unable to sign in with passkey."));
    } finally {
      setPasskeyLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.master}
    >
      <ThemedBackground />

      <View style={styles.backgroundBase}>
        <View style={styles.deepForest} />
        <View style={styles.midForest} />
        <View style={styles.topGlow} />
        <View style={styles.mistOne} />
        <View style={styles.mistTwo} />
      </View>

      <Animated.View
        style={[
          styles.container,
          { width: contentWidth },
          {
            opacity: fadeAnim,
            transform: [{ translateY: liftAnim }],
          },
        ]}
      >
        <View style={styles.headerSection}>
          <Surface style={styles.logoSurface} elevation={3}>
            <Image source={require("../assets/icon.png")} style={styles.logo} />
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
              {passkeyLoading ? "Checking passkey..." : "Sign in with passkey"}
            </Button>
          ) : null}

          <View style={styles.helperRow}>
            <Button
              mode="text"
              onPress={() => router.push('/register')}
              textColor="#D6B36A"
              style={styles.applyButton}
            >
              Apply for account
            </Button>
            <Button
              mode="text"
              onPress={() => router.push('/forgot-password')}
              textColor="#A8CFAF"
              style={styles.applyButton}
            >
              Forgot password
            </Button>
          </View>
        </Surface>

        <View style={styles.footer}>
          <Text variant="labelSmall" style={styles.footerMain}>
            {t("protectedSession")}
          </Text>
          <Text variant="labelSmall" style={styles.footerSub}>
            1.2.0
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
            Authenticator Check
          </Text>
          <Text style={styles.twoFactorSubtitle}>
            Enter the 6-digit code from your authenticator app to finish signing in.
          </Text>
          <TextInput
            label="Authenticator code"
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
              Cancel
            </Button>
            <Button
              mode="contained"
              loading={twoFactorSubmitting}
              disabled={twoFactorSubmitting}
              onPress={handleTwoFactorLogin}
            >
              Verify
            </Button>
          </View>
        </Modal>
      </Portal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  master: {
    flex: 1,
    backgroundColor: "#0B1F17",
  },
  backgroundBase: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  deepForest: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#091B14",
  },
  midForest: {
    position: "absolute",
    top: 0,
    left: -40,
    right: -40,
    height: 360,
    backgroundColor: "#123024",
    opacity: 0.45,
    borderBottomLeftRadius: 120,
    borderBottomRightRadius: 120,
  },
  topGlow: {
    position: "absolute",
    top: 80,
    alignSelf: "center",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(80,140,103,0.12)",
  },
  mistOne: {
    position: "absolute",
    top: 140,
    left: -80,
    width: 260,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  mistTwo: {
    position: "absolute",
    top: 240,
    right: -80,
    width: 280,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignSelf: "center",
    padding: 20,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 34,
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
  helperText: {
    color: "rgba(244,247,242,0.65)",
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
});
