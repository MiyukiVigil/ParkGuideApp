import React, { useRef, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
  Alert,
} from "react-native";
import { TextInput, Button, Text, Surface } from "react-native-paper";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import ThemedBackground from "../components/ThemedBackground";
import api from "../utils/api";
import { clearAuthTokens, getAccessToken, getRefreshToken, getUserRole, setAccessToken, setRefreshToken, setUserRole } from "../utils/tokenStorage";
import { clearProgressData } from "../utils/progressSync";
import { getModuleMapping } from "../utils/moduleMapping";

export default function Login() {
  const router = useRouter();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        const role = String(await getUserRole() || '').trim().toLowerCase();
        if (!access && !refresh) {
          setCheckingAuth(false);
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

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }

    try {
      const response = await api.post("/accounts/login/", {
        email: email.trim(), // must match your Django JWT username_field
        password: password,
      });

      const { access, refresh } = response.data;
      const isAdmin = resolveAdminFlag(response.data);
      const role = isAdmin ? "admin" : "learner";

      // Save tokens for future API calls
      await setAccessToken(access);
      await setRefreshToken(refresh);
      await setUserRole(role);

      // Build module ID mapping from backend courses
      getModuleMapping().catch(err => console.log('Module mapping build failed (non-critical):', err.message));

      router.replace(isAdmin ? "/dashboard" : "/home");
    } catch (err) {
      console.log("Login error:", err.response?.data || err.message);

      if (err.response?.status === 401 || err.response?.status === 400) {
        Alert.alert("Login Failed", t("loginError") || "Invalid email or password");
      } else {
        Alert.alert("Login Failed", "Something went wrong. Try again.");
      }
    } finally {
      setLoading(false);
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
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
            buttonColor="#D6B36A"
            textColor="#0B1F17"
          >
            {loading ? "Signing in..." : t("loginButton")}
          </Button>

          <View style={styles.helperRow}>
            <Text variant="bodySmall" style={styles.helperText}>
              Demo login enabled for frontend preview
            </Text>
          </View>
        </Surface>

        <View style={styles.footer}>
          <Text variant="labelSmall" style={styles.footerMain}>
            Protected session • Verified access
          </Text>
          <Text variant="labelSmall" style={styles.footerSub}>
            v1.0.0 - Sarawak Forestry Corporation
          </Text>
        </View>
      </Animated.View>
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
    padding: 24,
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
    maxWidth: 280,
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
});
