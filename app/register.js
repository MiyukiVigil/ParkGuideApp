import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Button, Surface, Text, TextInput } from "react-native-paper";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import ThemedBackground from "../components/ThemedBackground";
import { registerAccountApplication } from "../services/authService";

const ACCEPTED_CV_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const isValidBirthdate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const contentWidth = isWeb ? Math.min(520, width - 28) : "100%";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [cvFile, setCvFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePickCv = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ACCEPTED_CV_TYPES,
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      const mimeType = String(asset.mimeType || asset.type || "").toLowerCase();
      const fileName = String(asset.name || "").toLowerCase();
      const isAllowedMime = ACCEPTED_CV_TYPES.includes(mimeType);
      const isAllowedExtension = fileName.endsWith(".pdf") || fileName.endsWith(".doc") || fileName.endsWith(".docx");

      if (!isAllowedMime && !isAllowedExtension) {
        Alert.alert(t("error"), t("acceptedFormats"));
        return;
      }

      setCvFile(asset);
    } catch (error) {
      Alert.alert(t("error"), t("somethingWentWrong"));
    }
  };

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !phoneNumber.trim() || !birthdate.trim() || !cvFile) {
      Alert.alert(t("missingFields"), t("fillAllRegistrationFields"));
      return;
    }

    if (!isValidBirthdate(birthdate)) {
      Alert.alert(t("error"), t("birthdateFormat"));
      return;
    }

    try {
      setLoading(true);
      await registerAccountApplication({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phoneNumber: phoneNumber.trim(),
        birthdate: birthdate.trim(),
        cvFile,
      });

      Alert.alert(
        t("applicationSubmitted"),
        t("applicationSubmittedMessage"),
        [
          {
            text: t("backToLogin"),
            onPress: () => router.replace("/"),
          },
        ]
      );
    } catch (error) {
      const detail =
        error?.response?.data?.email?.[0] ||
        error?.response?.data?.full_name?.[0] ||
        error?.response?.data?.phone_number?.[0] ||
        error?.response?.data?.birthdate?.[0] ||
        error?.response?.data?.cv_file?.[0] ||
        error?.response?.data?.non_field_errors?.[0] ||
        error?.response?.data?.detail ||
        error?.message ||
        t("somethingWentWrong");

      Alert.alert(t("error"), detail);
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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.container, { width: contentWidth }]}>
          <View style={styles.headerSection}>
            <Text variant="headlineMedium" style={styles.title}>
              {t("parkGuideApplication")}
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              {t("parkGuideApplicationSubtitle")}
            </Text>
          </View>

          <Surface style={styles.formCard} elevation={2}>
            <TextInput
              label={t("fullName")}
              mode="outlined"
              value={fullName}
              onChangeText={setFullName}
              style={styles.input}
            />
            <TextInput
              label={t("email")}
              mode="outlined"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            <TextInput
              label={t("phoneNumber")}
              mode="outlined"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              placeholder="+60123456789"
              style={styles.input}
            />
            <TextInput
              label={t("birthdate")}
              mode="outlined"
              value={birthdate}
              onChangeText={setBirthdate}
              placeholder="YYYY-MM-DD"
              style={styles.input}
            />

            <Button
              mode="outlined"
              onPress={handlePickCv}
              style={styles.pickButton}
              textColor="#E6F2EA"
            >
              {cvFile ? t("changeCv") : t("attachCv")}
            </Button>

            <Text style={styles.fileHint}>
              {cvFile ? `${t("selected")}: ${cvFile.name}` : t("acceptedFormats")}
            </Text>

            <Button
              mode="contained"
              onPress={handleRegister}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}
              buttonColor="#D6B36A"
              textColor="#0B1F17"
            >
              {loading ? t("signingIn") : t("submitApplication")}
            </Button>

            <Button
              mode="text"
              onPress={() => router.back()}
              textColor="#D6B36A"
              style={styles.backButton}
            >
              {t("back")}
            </Button>
          </Surface>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  master: {
    flex: 1,
    backgroundColor: "#0C1E17",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  container: {
    maxWidth: 520,
  },
  headerSection: {
    marginBottom: 18,
  },
  title: {
    color: "#F4F7F2",
    fontWeight: "900",
  },
  subtitle: {
    color: "#B9D0BF",
    marginTop: 8,
  },
  formCard: {
    padding: 18,
    borderRadius: 24,
    backgroundColor: "rgba(8, 28, 20, 0.92)",
  },
  input: {
    marginBottom: 12,
    backgroundColor: "transparent",
  },
  pickButton: {
    marginTop: 4,
    borderRadius: 14,
    borderColor: "rgba(214,179,106,0.65)",
  },
  fileHint: {
    marginTop: 10,
    color: "#B9D0BF",
  },
  button: {
    marginTop: 16,
    borderRadius: 14,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  backButton: {
    marginTop: 10,
  },
});
