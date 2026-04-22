import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Button, Surface, Text, TextInput } from "react-native-paper";
import { useRouter } from "expo-router";

import ThemedBackground from "../components/ThemedBackground";
import { changePassword } from "../services/authService";
import { setMustChangePassword } from "../utils/tokenStorage";

export default function ForceResetPasswordScreen() {
  const router = useRouter();
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
      Alert.alert("Password Reset Failed", error?.detail || error?.message || "Unable to update password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.screen}>
      <ThemedBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <Surface style={styles.card} elevation={3}>
          <Text variant="headlineSmall" style={styles.title}>
            Change Temporary Password
          </Text>
          <Text style={styles.subtitle}>
            Your account was created with a temporary password. Set a new password before continuing.
          </Text>

          <TextInput
            label="Temporary Password"
            mode="outlined"
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
            style={styles.input}
          />
          <TextInput
            label="New Password"
            mode="outlined"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            style={styles.input}
          />
          <TextInput
            label="Confirm New Password"
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
            Continue
          </Button>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0C1E17" },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
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
});
