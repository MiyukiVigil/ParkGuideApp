import React, { useEffect, useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform, Image, Alert } from "react-native";
import { TextInput, Button, Text, Avatar, Surface, useTheme } from "react-native-paper";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../utils/api";
import * as LocalAuthentication from 'expo-local-authentication';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();

  // Check if biometric login is available and user opted in
  useEffect(() => {
    const checkBiometricAvailability = async () => {
      try {
        const access = await AsyncStorage.getItem("accessToken");
        const optIn = await AsyncStorage.getItem("biometricOptIn");
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricAvailable(compatible && enrolled && access && optIn === "true");
      } catch {
        setBiometricAvailable(false);
      }
    };

    // We do NOT auto-login here; just check biometric availability
    checkBiometricAvailability();
    setCheckingAuth(false);
  }, []);

  // Login handler
  const handleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/accounts/login/", {
        email: email.trim(),
        password: password,
      });

      const { access, refresh } = response.data;

      // Save tokens for future API calls
      await AsyncStorage.setItem("accessToken", access);
      await AsyncStorage.setItem("refreshToken", refresh);

      // Prompt user for biometric opt-in if device supports it
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();

      if (compatible && enrolled) {
        Alert.alert(
          t("enableBiometricsTitle") || "Enable Biometrics?",
          t("enableBiometricsMessage") || "Do you want to use Touch ID / Face ID for future logins?",
          [
            {
              text: t("no") || "No",
              onPress: async () => {
                await AsyncStorage.setItem("biometricOptIn", "false");
                setBiometricAvailable(false);
                router.replace("/home");
              },
              style: "cancel",
            },
            {
              text: t("yes") || "Yes",
              onPress: async () => {
                await AsyncStorage.setItem("biometricOptIn", "true");
                setBiometricAvailable(true);
                router.replace("/home");
              },
            },
          ],
          { cancelable: false }
        );
      } else {
        // If biometrics not supported, just proceed
        await AsyncStorage.setItem("biometricOptIn", "false");
        setBiometricAvailable(false);
        router.replace("/home");
      }
    } catch (err) {
      console.log("Login error:", err.response?.data || err.message);

      if (err.response?.status === 401 || err.response?.status === 400) {
        setError(t("loginError") || "Invalid email or password");
      } else {
        setError("Something went wrong. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Biometric login handler
  const handleBiometricLogin = async () => {
    setError("");
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();

      if (!compatible || !enrolled) {
        setError("Biometric authentication is not available on this device.");
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t("biometricPrompt") || "Login with Biometrics",
        fallbackLabel: t("enterPassword") || "Enter Password",
      });

      if (result.success) {
        const access = await AsyncStorage.getItem("accessToken");
        const refresh = await AsyncStorage.getItem("refreshToken");

        if (access && refresh) {
          router.replace("/home");
        } else {
          setError("No saved session. Please login manually first.");
        }
      } else {
        setError("Biometric authentication failed.");
      }
    } catch (err) {
      console.log("Biometric error:", err);
      setError("Biometric login error. Try again.");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.master, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.container}>
        {/* Branding Section */}
        <View style={styles.headerSection}>
          <Surface style={[styles.logoSurface, { backgroundColor: theme.colors.surface }]} elevation={2}>
            <Image source={require("../assets/icon.png")} style={{ width: 100, height: 100 }} />
          </Surface>
          <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
            {t("loginHeadline")}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onBackgroundVariant, marginTop: 5 }}>
            {t("loginMedium")}
          </Text>
        </View>

        {/* Form Section */}
        <Surface style={[styles.formCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
          <TextInput
            label={t("loginEmail")}
            value={email}
            onChangeText={setEmail}
            mode="flat"
            left={<TextInput.Icon icon="email-outline" />}
            style={styles.input}
            textColor={theme.colors.onSurface}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            autoCapitalize="none"
          />
          <TextInput
            label={t("loginPassword")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            mode="flat"
            left={<TextInput.Icon icon="lock-outline" />}
            style={styles.input}
            textColor={theme.colors.onSurface}
            placeholderTextColor={theme.colors.onSurfaceVariant}
          />

          <Button
            mode="contained"
            onPress={handleLogin}
            style={styles.button}
            contentStyle={styles.buttonContent}
            buttonColor={theme.colors.primary}
            textColor={theme.colors.onPrimary}
            loading={loading || checkingAuth}
            disabled={loading || checkingAuth}
          >
            {checkingAuth ? t("checkingSession") || "Checking session..." : t("loginButton")}
          </Button>

          {biometricAvailable && !loading && !checkingAuth && (
            <Button
              mode="outlined"
              onPress={handleBiometricLogin}
              style={[styles.button, { marginTop: 10 }]}
              contentStyle={styles.buttonContent}
              icon="fingerprint"
            >
              {t("loginWithBiometrics") || "Login with Biometrics"}
            </Button>
          )}

          {error ? <Text style={{ color: "red", marginTop: 10 }}>{error}</Text> : null}
        </Surface>

        {/* Security Footer */}
        <View style={styles.footer}>
          <View style={styles.securityBadge}>
            <Avatar.Icon
              size={20}
              icon="shield-check"
              style={{ backgroundColor: "transparent" }}
              color={theme.colors.primary}
            />
            <Text variant="bodySmall" style={[styles.securityText, { color: theme.colors.primary }]}>
              {t("securityText")}
            </Text>
          </View>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            v1.0.0 - Sarawak Forestry Corporation
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  master: { flex: 1 },
  container: { flex: 1, justifyContent: "center", padding: 25 },
  headerSection: { alignItems: "center", marginBottom: 40 },
  logoSurface: { borderRadius: 25, padding: 10, marginBottom: 20 },
  title: { fontWeight: "900", letterSpacing: -0.5 },
  formCard: { padding: 25, borderRadius: 24, width: "100%" },
  input: { backgroundColor: "transparent", marginBottom: 15 },
  button: { marginTop: 10, borderRadius: 12 },
  buttonContent: { paddingVertical: 8 },
  footer: { alignItems: "center", marginTop: 30 },
  securityBadge: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  securityText: { fontWeight: "bold", marginLeft: 5 },
});