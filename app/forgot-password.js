import React, { useState } from "react";
import { Alert, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Button, Surface, Text, TextInput } from "react-native-paper";
import { useTranslation } from "react-i18next";

import AuthScreenLayout from "../components/AuthScreenLayout";
import { confirmForgotPassword, requestForgotPasswordCode } from "../services/authService";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleRequestCode = async () => {
    if (!email.trim()) {
      Alert.alert(t("missingFields"), t("pleaseEnterEmailPassword"));
      return;
    }

    try {
      setSubmitting(true);
      await requestForgotPasswordCode(email.trim());
      setCodeRequested(true);
      Alert.alert(t("resetCodeSent"), t("resetCodeSentMessage"));
    } catch (error) {
      Alert.alert(t("error"), error?.response?.data?.detail || t("somethingWentWrong"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim() || !code.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert(t("missingFields"), t("fillAllPasswordFields"));
      return;
    }

    try {
      setSubmitting(true);
      await confirmForgotPassword({
        email: email.trim(),
        code: code.trim(),
        newPassword,
        confirmPassword,
      });
      Alert.alert(t("passwordResetSuccess"), t("passwordResetSuccessMessage"), [
        {
          text: t("ok"),
          onPress: () => router.replace("/"),
        },
      ]);
    } catch (error) {
      Alert.alert(t("error"), error?.response?.data?.detail || t("somethingWentWrong"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScreenLayout centerContent={false} maxWidth={440}>
      <Surface style={styles.card} elevation={3}>
        <Text variant="headlineSmall" style={styles.title}>
          {t("forgotPasswordTitle")}
        </Text>
        <Text style={styles.subtitle}>{t("forgotPasswordSubtitle")}</Text>

        <TextInput
          label={t("loginEmail")}
          mode="outlined"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />

        {codeRequested ? (
          <>
            <TextInput
              label={t("resetCodeLabel")}
              mode="outlined"
              keyboardType="number-pad"
              value={code}
              onChangeText={setCode}
              style={styles.input}
            />
            <TextInput
              label={t("newPasswordLabel")}
              mode="outlined"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              style={styles.input}
            />
            <TextInput
              label={t("confirmNewPasswordLabel")}
              mode="outlined"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={styles.input}
            />
            <Button
              mode="contained"
              onPress={handleResetPassword}
              loading={submitting}
              disabled={submitting}
              style={styles.primaryButton}
              buttonColor="#D6B36A"
              textColor="#0B1F17"
            >
              {t("verifyResetCode")}
            </Button>
          </>
        ) : (
          <Button
            mode="contained"
            onPress={handleRequestCode}
            loading={submitting}
            disabled={submitting}
            style={styles.primaryButton}
            buttonColor="#D6B36A"
            textColor="#0B1F17"
          >
            {t("sendResetCode")}
          </Button>
        )}

        <Button mode="text" onPress={() => router.replace("/")} textColor="#A8CFAF" style={styles.secondaryButton}>
          {t("backToLogin")}
        </Button>
      </Surface>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 24,
    padding: 20,
    backgroundColor: "rgba(8, 28, 20, 0.94)",
  },
  title: {
    color: "#F4F7F2",
    fontWeight: "900",
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
  primaryButton: {
    marginTop: 8,
    borderRadius: 14,
  },
  secondaryButton: {
    marginTop: 10,
  },
});
