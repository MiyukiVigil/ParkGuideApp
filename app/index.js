import React, { useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform, Image } from "react-native";
import { TextInput, Button, Text, Avatar, Surface, useTheme } from "react-native-paper";
import { useRouter } from "expo-router";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();
    const theme = useTheme();

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={[styles.master, { backgroundColor: theme.colors.background }]}
        >
            <View style={styles.container}>
                {/* 1. Branding Section */}
                <View style={styles.headerSection}>
                    <Surface style={[styles.logoSurface, { backgroundColor: theme.colors.surface }]} elevation={2}>
                        <Image
                            source={require('../assets/icon.png')}
                            style={{ width: 100, height: 100 }}
                        />   
                    </Surface>
                    <Text 
                        variant="headlineMedium" 
                        style={[styles.title, { color: theme.colors.onBackground }]}
                    >
                        SFC Guide Portal
                    </Text>
                    <Text 
                        variant="bodyMedium" 
                        style={{ color: theme.colors.onBackgroundVariant, marginTop: 5 }}
                    >
                        Secure Access for Park Professionals
                    </Text>
                </View>

                {/* 2. Form Section */}
                <Surface style={[styles.formCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                    <TextInput
                        label="Guide Email"
                        value={email}
                        onChangeText={setEmail}
                        mode="flat"
                        left={<TextInput.Icon icon="email-outline" />}
                        style={styles.input}
                        textColor={theme.colors.onSurface}
                        placeholderTextColor={theme.colors.onSurfaceVariant}
                    />
                    <TextInput
                        label="Password"
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
                        onPress={() => router.replace('/home')}
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                        buttonColor={theme.colors.primary}
                        textColor={theme.colors.onPrimary}
                    >
                        Secure Login
                    </Button>
                </Surface>

                {/* 3. Security Badge Section */}
                <View style={styles.footer}>
                    <View style={styles.securityBadge}>
                        <Avatar.Icon 
                            size={20} 
                            icon="shield-check" 
                            style={{ backgroundColor: 'transparent' }} 
                            color={theme.colors.primary} 
                        />
                        <Text variant="bodySmall" style={[styles.securityText, { color: theme.colors.primary }]}>
                            AES-256 Encrypted Connection
                        </Text>
                    </View>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        v1.0.4 - Sarawak Forestry Corporation
                    </Text>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    master: { flex: 1 },
    container: { flex: 1, justifyContent: 'center', padding: 25 },
    headerSection: { alignItems: 'center', marginBottom: 40 },
    logoSurface: { borderRadius: 25, padding: 10, marginBottom: 20 },
    title: { fontWeight: '900', letterSpacing: -0.5 },
    formCard: { padding: 25, borderRadius: 24, width: '100%' },
    input: { backgroundColor: 'transparent', marginBottom: 15 },
    button: { marginTop: 10, borderRadius: 12 },
    buttonContent: { paddingVertical: 8 },
    footer: { alignItems: 'center', marginTop: 30 },
    securityBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    securityText: { fontWeight: 'bold', marginLeft: 5 },
});