import React, { useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
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
            style={styles.master}
        >
            <View style={styles.container}>
                {/* 1. Branding Section */}
                <View style={styles.headerSection}>
                    <Surface style={styles.logoSurface} elevation={2}>
                        <Avatar.Icon size={80} icon="leaf" style={{ backgroundColor: '#2E7D32' }} />
                    </Surface>
                    <Text variant="headlineMedium" style={styles.title}>SFC Guide Portal</Text>
                    <Text variant="bodyMedium" style={styles.subtitle}>Secure Access for Park Professionals</Text>
                </View>

                {/* 2. Form Section */}
                <Surface style={styles.formCard} elevation={1}>
                    <TextInput
                        label="Guide Email"
                        value={email}
                        onChangeText={setEmail}
                        mode="flat"
                        left={<TextInput.Icon icon="email-outline" />}
                        style={styles.input}
                    />
                    <TextInput
                        label="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        mode="flat"
                        left={<TextInput.Icon icon="lock-outline" />}
                        style={styles.input}
                    />
                    
                    <Button
                        mode="contained"
                        onPress={() => router.replace('/home')}
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                        buttonColor="#2E7D32"
                    >
                        Secure Login
                    </Button>
                </Surface>

                {/* 3. Security Badge Section */}
                <View style={styles.footer}>
                    <View style={styles.securityBadge}>
                        <Avatar.Icon size={20} icon="shield-check" style={{ backgroundColor: 'transparent' }} color="#2E7D32" />
                        <Text variant="bodySmall" style={styles.securityText}>AES-256 Encrypted Connection</Text>
                    </View>
                    <Text variant="labelSmall" style={styles.version}>v1.0.4 - Sarawak Forestry Corporation</Text>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    master: { flex: 1, backgroundColor: '#F0F2F5' },
    container: { flex: 1, justifyContent: 'center', padding: 25 },
    headerSection: { alignItems: 'center', marginBottom: 40 },
    logoSurface: { borderRadius: 25, padding: 10, backgroundColor: '#fff', marginBottom: 20 },
    title: { fontWeight: '900', color: '#1A1A1A', letterSpacing: -0.5 },
    subtitle: { color: '#666', marginTop: 5 },
    formCard: { backgroundColor: '#fff', padding: 25, borderRadius: 24, width: '100%' },
    input: { backgroundColor: 'transparent', marginBottom: 15 },
    button: { marginTop: 10, borderRadius: 12 },
    buttonContent: { paddingVertical: 8 },
    footer: { alignItems: 'center', marginTop: 30 },
    securityBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    securityText: { color: '#2E7D32', fontWeight: 'bold', marginLeft: 5 },
    version: { color: '#999', opacity: 0.7 }
});