import React, { useEffect, useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import {
  Surface,
  Text,
  List,
  Avatar,
  Button,
  useTheme,
  TextInput,
  Portal,
  Modal,
  ActivityIndicator,
} from "react-native-paper";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import AppHeader from "../components/AppHeader";
import ThemedBackground from "../components/ThemedBackground";
import { getProfile, updateProfile, uploadProfileImage } from "../services/profileService";
import { changePassword } from "../services/authService";
import { clearAuthTokens } from "../utils/tokenStorage";
import { clearProgressData } from "../utils/progressSync";
import { unregisterPushNotifications } from "../services/notificationService";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function AccountScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [draftProfile, setDraftProfile] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    try {
      setIsLoading(true);
      const data = await getProfile();
      setProfile(data);
      setDraftProfile(data);
    } catch (error) {
      Alert.alert(t("error"), t("failedToLoadAccountInfo"));
    } finally {
      setIsLoading(false);
    }
  };

  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);
  const validatePhone = (phone) => phone.trim().length >= 8;

  const handleSaveProfile = async () => {
    if (!draftProfile.name.trim()) {
      Alert.alert(t("invalidName"), t("pleaseEnterValidName"));
      return;
    }

    if (!validateEmail(draftProfile.email)) {
      Alert.alert(t("invalidEmail"), t("pleaseEnterValidEmailAddress"));
      return;
    }

    if (!validatePhone(draftProfile.phone)) {
      Alert.alert(t("invalidPhone"), t("pleaseEnterValidPhoneNumber"));
      return;
    }

    try {
      setIsSavingProfile(true);

      const updated = await updateProfile({
        name: draftProfile.name.trim(),
        email: draftProfile.email.trim(),
        phone: draftProfile.phone.trim(),
      });

      setProfile(updated);
      setDraftProfile(updated);
      setIsEditing(false);

      Alert.alert(t("saved"), t("accountDetailsUpdated"));
    } catch (error) {
      Alert.alert(t("error"), t("failedToSaveProfileChanges"));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUploadProfileImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      const fileSize = Number(asset.size || 0);
      const fileType = String(asset.mimeType || asset.type || '').toLowerCase();

      if (fileType && !fileType.startsWith('image/')) {
        Alert.alert(t('unsupportedFile'), t('pleaseChooseImageFile'));
        return;
      }

      if (fileSize > 5 * 1024 * 1024) {
        Alert.alert(t('imageTooLarge'), t('pleaseChooseSmallerImage'));
        return;
      }

      setIsUploadingImage(true);
      await Haptics.selectionAsync();
      const uploadedProfile = await uploadProfileImage(asset);
      setProfile(uploadedProfile);
      setDraftProfile((prev) => ({
        ...prev,
        ...uploadedProfile,
      }));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('profilePhotoUpdated'), t('profilePhotoSaved'));
    } catch (error) {
      console.log('Profile image upload error:', error?.response?.data || error?.message || error);
      const detail = error?.response?.data?.profile_image?.[0] || error?.response?.data?.detail;
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('uploadFailed'), detail || t('couldNotUploadPhoto'));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleCancelEdit = () => {
    if (profile) {
      setDraftProfile(profile);
    }
    setIsEditing(false);
  };

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSignOut = async () => {
    Alert.alert(
      t("signOut"),
      t("logoutConfirm"),
      [
        { text: t("cancel"), onPress: () => {}, style: "cancel" },
        {
          text: t("signOut"),
          onPress: async () => {
            try {
              await unregisterPushNotifications();
              await clearAuthTokens();
              await clearProgressData();
              await AsyncStorage.removeItem("userProfile");
              router.replace("/");
            } catch (error) {
              Alert.alert(t("error"), t("failedToSignOut"));
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const handleChangePassword = async () => {
    try {
      setIsChangingPassword(true);

      await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      resetPasswordForm();
      setPasswordModalVisible(false);
      Alert.alert(t("success"), t("yourPasswordHasBeenChanged"));
    } catch (error) {
      let errorMessage = t("error");

      const errorCodeMap = {
        FILL_ALL_PASSWORD_FIELDS: "fillAllPasswordFields",
        PASSWORD_MUST_BE_8: "passwordMustBe8",
        PASSWORDS_DO_NOT_MATCH: "passwordsDoNotMatch",
        CURRENT_PASSWORD_INCORRECT: "currentPasswordIncorrect",
      };

      if (error.code && errorCodeMap[error.code]) {
        errorMessage = t(errorCodeMap[error.code]);
      }

      Alert.alert(t("error"), errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading || !profile) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <ThemedBackground />
        <AppHeader title={t("accountSettings")} subtitle={t("profileAndSecurity")} showBack showHome />
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ThemedBackground />
      <AppHeader title={t("accountSettings")} subtitle={t("profileAndSecurity")} showBack showHome />

      <View style={styles.container}>
        <Surface
          style={[
            styles.profileCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
          elevation={2}
        >
          <View style={styles.avatarColumn}>
            {profile.profile_image_url ? (
              <Avatar.Image size={76} source={{ uri: profile.profile_image_url }} />
            ) : (
              <Avatar.Icon
                size={76}
                icon="account"
                style={{ backgroundColor: theme.colors.primaryContainer }}
                color={theme.colors.primary}
              />
            )}
            <Button
              mode="text"
              compact
              onPress={handleUploadProfileImage}
              loading={isUploadingImage}
              disabled={isUploadingImage}
              style={styles.uploadButton}
            >
              {isUploadingImage ? t("uploadingPhoto") : t("choosePhoto")}
            </Button>
          </View>

          <View style={{ marginLeft: 14, flex: 1 }}>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: "900" }}>
              {profile.name}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              {profile.email}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.tertiary, marginTop: 8, fontWeight: "700" }}>
              {profile.role}
            </Text>
          </View>
        </Surface>

        <Surface
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
          elevation={1}
        >
          {isEditing ? (
            <View style={styles.formWrap}>
              <TextInput
                label={t("fullName")}
                mode="outlined"
                value={draftProfile.name}
                onChangeText={(text) => setDraftProfile((prev) => ({ ...prev, name: text }))}
                style={styles.input}
              />

              <TextInput
                label={t("email")}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                value={draftProfile.email}
                onChangeText={(text) => setDraftProfile((prev) => ({ ...prev, email: text }))}
                style={styles.input}
              />

              <TextInput
                label={t("phone")}
                mode="outlined"
                keyboardType="phone-pad"
                value={draftProfile.phone}
                onChangeText={(text) => setDraftProfile((prev) => ({ ...prev, phone: text }))}
                style={styles.input}
              />

              <View style={styles.actionRow}>
                <Button mode="outlined" onPress={handleCancelEdit} style={styles.flexButton}>
                  {t("cancel")}
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSaveProfile}
                  style={styles.flexButton}
                  loading={isSavingProfile}
                  disabled={isSavingProfile}
                >
                  {t("save")}
                </Button>
              </View>
            </View>
          ) : (
            <>
              <List.Item
                title={t("email")}
                description={profile.email}
                left={(props) => <List.Icon {...props} icon="email-outline" color={theme.colors.tertiary} />}
                titleStyle={{ color: theme.colors.onSurface, fontWeight: "700" }}
                descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              />
              <List.Item
                title={t("phone")}
                description={profile.phone}
                left={(props) => <List.Icon {...props} icon="phone-outline" color={theme.colors.tertiary} />}
                titleStyle={{ color: theme.colors.onSurface, fontWeight: "700" }}
                descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              />
              <List.Item
                title={t("changePassword")}
                description={t("updateYourLoginPassword")}
                left={(props) => <List.Icon {...props} icon="lock-reset" color={theme.colors.primary} />}
                titleStyle={{ color: theme.colors.onSurface, fontWeight: "700" }}
                descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                onPress={() => setPasswordModalVisible(true)}
              />

              <View style={styles.actionGroup}>
                <Button mode="contained" onPress={() => setIsEditing(true)}>
                  {t("editProfile")}
                </Button>
              </View>
            </>
          )}
        </Surface>

        <Button
          mode="outlined"
          style={[styles.signOut, { borderColor: theme.colors.error }]}
          textColor={theme.colors.error}
          onPress={handleSignOut}
        >
          {t("signOut")}
        </Button>
      </View>

      <Portal>
        <Modal
          visible={passwordModalVisible}
          onDismiss={() => {
            setPasswordModalVisible(false);
            resetPasswordForm();
          }}
          contentContainerStyle={[
            styles.modalContainer,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: "900", marginBottom: 16 }}>
            {t("changePassword")}
          </Text>

          <TextInput
            label={t("currentPassword")}
            mode="outlined"
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
            style={styles.input}
          />

          <TextInput
            label={t("newPassword")}
            mode="outlined"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            style={styles.input}
          />

          <TextInput
            label={t("confirmNewPassword")}
            mode="outlined"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            style={styles.input}
          />

          <View style={styles.actionRow}>
            <Button
              mode="outlined"
              onPress={() => {
                setPasswordModalVisible(false);
                resetPasswordForm();
              }}
              style={styles.flexButton}
              disabled={isChangingPassword}
            >
              {t("cancel")}
            </Button>
            <Button
              mode="contained"
              onPress={handleChangePassword}
              style={styles.flexButton}
              loading={isChangingPassword}
              disabled={isChangingPassword}
            >
              {t("update")}
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: {
    flex: 1,
    padding: 20,
  },
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 26,
    borderWidth: 1,
    marginBottom: 18,
  },
  avatarColumn: {
    alignItems: "center",
    justifyContent: "center",
  },
  uploadButton: {
    marginTop: 8,
  },
  sectionCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
    paddingVertical: 6,
  },
  formWrap: {
    padding: 16,
  },
  input: {
    marginBottom: 14,
  },
  actionGroup: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  flexButton: {
    flex: 1,
  },
  modalContainer: {
    margin: 18,
    borderRadius: 24,
    padding: 20,
  },
  signOut: {
    borderRadius: 16,
    marginTop: 10,
  },
});
