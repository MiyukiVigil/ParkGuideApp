import React, { useState } from "react";
import { Alert, Image, StyleSheet, useWindowDimensions, View } from "react-native";
import { Button, Surface, Text, TextInput } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";

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
  const { recommended } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const [password, setPassword] = useState("");
  const [passkeyLabel, setPasskeyLabel] = useState("");
  const [passkeySubmitting, setPasskeySubmitting] = useState(false);
  const [twoFactorSubmitting, setTwoFactorSubmitting] = useState(false);
  const [twoFactorSetupData, setTwoFactorSetupData] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const qrSize = Math.max(168, Math.min(220, width - 160));

  const goToApp = async () => {
    const role = String(await getUserRole() || "").trim().toLowerCase();
    router.replace(role === "admin" ? "/dashboard" : "/home");
  };

  const handleCreatePasskey = async () => {
    if (!password.trim()) {
      Alert.alert("Password Required", "Enter your new password before saving a passkey.");
      return;
    }

    try {
      setPasskeySubmitting(true);
      await registerPasskey({
        currentPassword: password.trim(),
        label: passkeyLabel.trim(),
      });
      Alert.alert("Passkey Saved", "Passkey sign in is now ready on this device.");
    } catch (error) {
      Alert.alert("Passkey Setup Failed", getFriendlyPasskeyError(error, "Unable to create passkey."));
    } finally {
      setPasskeySubmitting(false);
    }
  };

  const handleTwoFactorSetup = async () => {
    if (!password.trim()) {
      Alert.alert("Password Required", "Enter your new password before setting up authenticator 2FA.");
      return;
    }

    try {
      setTwoFactorSubmitting(true);
      if (!twoFactorSetupData) {
        const payload = await setupTwoFactor(password.trim());
        setTwoFactorSetupData(payload);
      } else {
        if (!twoFactorCode.trim()) {
          Alert.alert("Authenticator Code Required", "Enter the 6-digit code from your authenticator app.");
          return;
        }
        await confirmTwoFactor(twoFactorCode.trim());
        Alert.alert("Authenticator Enabled", "Two-factor sign in is now active for your account.");
        setTwoFactorSetupData(null);
        setTwoFactorCode("");
      }
    } catch (error) {
      Alert.alert("Authenticator Setup Failed", getFriendlyTwoFactorError(error, "Unable to finish authenticator setup."));
    } finally {
      setTwoFactorSubmitting(false);
    }
  };

  return (
    <AuthScreenLayout centerContent={false} maxWidth={460}>
        <Surface style={styles.card} elevation={3}>
          <Text variant="headlineSmall" style={styles.title}>
            Secure Your New Account
          </Text>
          <Text style={styles.subtitle}>
            {recommended === "true"
              ? "Your password is updated. You can now add a passkey or authenticator 2FA before entering the app."
              : "You can optionally add extra sign-in protection now, or skip and set it up later in Settings."}
          </Text>

          <TextInput
            label="Current Password"
            mode="outlined"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />

          <Surface style={styles.optionCard} elevation={1}>
            <Text style={styles.optionTitle}>Passkey</Text>
            <Text style={styles.optionBody}>
              Save a device passkey for faster passwordless sign in.
            </Text>
            {isPasskeySupported() ? (
              <>
                <TextInput
                  label="Passkey Label (Optional)"
                  mode="outlined"
                  value={passkeyLabel}
                  onChangeText={setPasskeyLabel}
                  style={styles.input}
                />
                <Button
                  mode="contained"
                  onPress={handleCreatePasskey}
                  loading={passkeySubmitting}
                  disabled={passkeySubmitting}
                  style={styles.actionButton}
                  buttonColor="#2E7D5A"
                >
                  Create Passkey
                </Button>
              </>
            ) : (
              <Text style={styles.unsupportedText}>Passkeys are not supported on this device.</Text>
            )}
          </Surface>

          <Surface style={styles.optionCard} elevation={1}>
            <Text style={styles.optionTitle}>Authenticator 2FA</Text>
            <Text style={styles.optionBody}>
              Add a one-time code from an authenticator app when you sign in.
            </Text>

            {twoFactorSetupData ? (
              <View style={styles.qrBlock}>
                <Image
                  source={{ uri: getTwoFactorQrUrl(twoFactorSetupData.otpauth_uri) }}
                  style={[styles.qrImage, { width: qrSize, height: qrSize }]}
                />
                <Text style={styles.secretLabel}>Secret key</Text>
                <Text selectable style={styles.secretValue}>
                  {twoFactorSetupData.secret}
                </Text>
                <TextInput
                  label="Authenticator Code"
                  mode="outlined"
                  keyboardType="number-pad"
                  value={twoFactorCode}
                  onChangeText={setTwoFactorCode}
                  style={styles.input}
                />
              </View>
            ) : null}

            <Button
              mode="contained"
              onPress={handleTwoFactorSetup}
              loading={twoFactorSubmitting}
              disabled={twoFactorSubmitting}
              style={styles.actionButton}
              buttonColor="#2E7D5A"
            >
              {twoFactorSetupData ? "Verify & Enable" : "Set Up Authenticator"}
            </Button>
          </Surface>

          <Button mode="text" onPress={goToApp} textColor="#D6B36A" style={styles.skipButton}>
            Skip for Now
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
  optionCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(15, 43, 31, 0.92)",
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
  actionButton: {
    borderRadius: 12,
    marginTop: 4,
  },
  unsupportedText: {
    color: "#B9D0BF",
  },
  qrBlock: {
    alignItems: "center",
    marginBottom: 12,
  },
  qrImage: {
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  secretLabel: {
    color: "#F4F7F2",
    fontWeight: "700",
    marginBottom: 6,
  },
  secretValue: {
    color: "#B9D0BF",
    marginBottom: 12,
    textAlign: "center",
  },
  skipButton: {
    marginTop: 14,
  },
});
