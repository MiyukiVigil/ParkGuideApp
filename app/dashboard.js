import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Appbar, Button, Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import CONFIG from '../constants/config';
import { clearAuthTokens, getAccessToken } from '../utils/tokenStorage';
import { unregisterPushNotifications } from '../services/notificationService';
import { useScreenSpeech } from '../contexts/ScreenSpeechContext';

// Dashboard URLs from configuration
const DASHBOARD_BASE_URL = CONFIG.DASHBOARD_BASE_URL;
const DASHBOARD_URL = CONFIG.DASHBOARD_URL;
const SSO_URL = CONFIG.SSO_URL;

if (!DASHBOARD_BASE_URL) {
  console.warn(
    "⚠️  DASHBOARD_BASE_URL is not configured. Please check constants/config.js or EAS environment variables."
  );
}

export default function Dashboard() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const webViewRef = useRef(null);
  const logoutRequestedRef = useRef(false);
  const [initialUrl, setInitialUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        await clearAuthTokens();
        router.replace('/');
        return;
      }

      setInitialUrl(`${SSO_URL}?token=${encodeURIComponent(accessToken)}`);
      setLoading(false);
    };

    bootstrap();
  }, [router]);

  const navigateToLogout = async () => {
    logoutRequestedRef.current = true;

    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`window.location.href = '${DASHBOARD_URL}logout/'; true;`);
      return;
    }

    await unregisterPushNotifications();
    await clearAuthTokens();
    router.replace('/');
  };

  const handleNavigation = async (navState) => {
    const currentUrl = navState?.url || '';

    if (!logoutRequestedRef.current) {
      return;
    }

    if (currentUrl.includes('/dashboard/login/') || currentUrl.includes('/dashboard/logout/')) {
      await unregisterPushNotifications();
      await clearAuthTokens();
      logoutRequestedRef.current = false;
      router.replace('/');
    }
  };

  const loadingOverlay = useMemo(() => (
    <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={{ marginTop: 12, color: theme.colors.onBackground }}>{t("loadingDashboard")}</Text>
    </View>
  ), [t, theme.colors.background, theme.colors.onBackground, theme.colors.primary]);

  useScreenSpeech(
    [
      t("adminDashboard"),
      t("parkGuideWebApp"),
      initialUrl ? "The web dashboard is ready." : "Loading the dashboard.",
    ].join(" "),
    { priority: 100 }
  );

  if (loading || !initialUrl) {
    return loadingOverlay;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <Appbar.Header elevated>
        <Appbar.Content title={t("adminDashboard")} subtitle={t("parkGuideWebApp")} />
        <Button mode="text" onPress={navigateToLogout} textColor={theme.colors.error}>
          {t("logout")}
        </Button>
      </Appbar.Header>

      <WebView
        ref={webViewRef}
        source={{ uri: initialUrl }}
        style={styles.webview}
        onNavigationStateChange={handleNavigation}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => loadingOverlay}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});