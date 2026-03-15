import React, { useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform, Image } from "react-native";
import { TextInput, Button, Text, Avatar, Surface, useTheme } from "react-native-paper";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Create an Axios instance for your API
const api = axios.create({
  baseURL: "http://localhost:8000/api", // replace with your backend base URL or IP
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token automatically before each request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();

  // Login handler
  const handleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/accounts/login/", {
        email: email.trim(), // must match your Django JWT username_field
        password: password,
      });

      const { access, refresh } = response.data;

      // Save tokens for future API calls
      await AsyncStorage.setItem("accessToken", access);
      await AsyncStorage.setItem("refreshToken", refresh);

      // Navigate to Home screen
      router.replace("/home");
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
            loading={loading}
          >
            {t("loginButton")}
          </Button>

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