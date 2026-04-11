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
import { useRouter } from "expo-router";
import AppHeader from "../components/AppHeader";
import ThemedBackground from "../components/ThemedBackground";
import { getProfile, updateProfile } from "../services/profileService";
import { ensureMockPassword, changePassword } from "../services/authService";
import { clearAuthTokens } from "../utils/tokenStorage";
import { clearProgressData } from "../utils/progressSync";
import { unregisterPushNotifications } from "../services/notificationService";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function AccountScreen() {
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
      await ensureMockPassword();
      const data = await getProfile();
      setProfile(data);
      setDraftProfile(data);
    } catch (error) {
      Alert.alert("Error", "Failed to load account information.");
    } finally {
      setIsLoading(false);
    }
  };

  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);
  const validatePhone = (phone) => phone.trim().length >= 8;

  const handleSaveProfile = async () => {
    if (!draftProfile.name.trim()) {
      Alert.alert("Invalid Name", "Please enter a valid name.");
      return;
    }

    if (!validateEmail(draftProfile.email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    if (!validatePhone(draftProfile.phone)) {
      Alert.alert("Invalid Phone", "Please enter a valid phone number.");
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

      Alert.alert("Saved", "Your account details have been updated.");
    } catch (error) {
      Alert.alert("Error", "Failed to save profile changes.");
    } finally {
      setIsSavingProfile(false);
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
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", onPress: () => {}, style: "cancel" },
        {
          text: "Sign Out",
          onPress: async () => {
            try {
              // Unregister push notifications first
              await unregisterPushNotifications();
              await clearAuthTokens();
              await clearProgressData();
              router.replace("/");
            } catch (error) {
              Alert.alert("Error", "Failed to sign out.");
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
      Alert.alert("Success", "Your password has been changed.");
    } catch (error) {
      Alert.alert("Password Error", error.message || "Failed to change password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading || !profile) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <ThemedBackground />
        <AppHeader title="Account Settings" subtitle="Profile and security" showBack showHome />
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ThemedBackground />
      <AppHeader title="Account Settings" subtitle="Profile and security" showBack showHome />

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
          <Avatar.Icon
            size={64}
            icon="account"
            style={{ backgroundColor: theme.colors.primaryContainer }}
            color={theme.colors.primary}
          />
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
                label="Full Name"
                mode="outlined"
                value={draftProfile.name}
                onChangeText={(text) => setDraftProfile((prev) => ({ ...prev, name: text }))}
                style={styles.input}
              />

              <TextInput
                label="Email"
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                value={draftProfile.email}
                onChangeText={(text) => setDraftProfile((prev) => ({ ...prev, email: text }))}
                style={styles.input}
              />

              <TextInput
                label="Phone"
                mode="outlined"
                keyboardType="phone-pad"
                value={draftProfile.phone}
                onChangeText={(text) => setDraftProfile((prev) => ({ ...prev, phone: text }))}
                style={styles.input}
              />

              <View style={styles.actionRow}>
                <Button mode="outlined" onPress={handleCancelEdit} style={styles.flexButton}>
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSaveProfile}
                  style={styles.flexButton}
                  loading={isSavingProfile}
                  disabled={isSavingProfile}
                >
                  Save
                </Button>
              </View>
            </View>
          ) : (
            <>
              <List.Item
                title="Email"
                description={profile.email}
                left={(props) => <List.Icon {...props} icon="email-outline" color={theme.colors.tertiary} />}
                titleStyle={{ color: theme.colors.onSurface, fontWeight: "700" }}
                descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              />
              <List.Item
                title="Phone"
                description={profile.phone}
                left={(props) => <List.Icon {...props} icon="phone-outline" color={theme.colors.tertiary} />}
                titleStyle={{ color: theme.colors.onSurface, fontWeight: "700" }}
                descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              />
              <List.Item
                title="Change Password"
                description="Update your login password"
                left={(props) => <List.Icon {...props} icon="lock-reset" color={theme.colors.primary} />}
                titleStyle={{ color: theme.colors.onSurface, fontWeight: "700" }}
                descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                onPress={() => setPasswordModalVisible(true)}
              />

              <View style={styles.actionGroup}>
                <Button mode="contained" onPress={() => setIsEditing(true)}>
                  Edit Profile
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
          Sign Out
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
            Change Password
          </Text>

          <TextInput
            label="Current Password"
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
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleChangePassword}
              style={styles.flexButton}
              loading={isChangingPassword}
              disabled={isChangingPassword}
            >
              Update
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