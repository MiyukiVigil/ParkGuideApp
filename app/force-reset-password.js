import React, { useState } from "react";
import { Alert, StyleSheet } from "react-native";
import { Button, Surface, Text, TextInput } from "react-native-paper";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import AuthScreenLayout from "../components/AuthScreenLayout";
import { changePassword } from "../services/authService";
import { setMustChangePassword } from "../utils/tokenStorage";

export default function ForceResetPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const response = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      await setMustChangePassword(false);
      router.replace({
        pathname: "/security-setup",
        params: {
          recommended: response?.passkey_setup_recommended ? "true" : "false",
        },
      });
    } catch (error) {
      Alert.alert(t("error"), error?.detail || error?.message || t("somethingWentWrong"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScreenLayout maxWidth={440}>
        <Surface style={styles.card} elevation={3}>
          <Text variant="headlineSmall" style={styles.title}>
            {t("changeTemporaryPassword")}
          </Text>
          <Text style={styles.subtitle}>
            {t("changeTemporaryPasswordSubtitle")}
          </Text>

          <TextInput
            label={t("temporaryPassword")}
            mode="outlined"
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
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
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
            style={styles.primaryButton}
            buttonColor="#D6B36A"
            textColor="#0B1F17"
          >
            {t("continueAction")}
          </Button>
        </Surface>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: "rgba(8, 28, 20, 0.94)",
    width: "100%",
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
});
