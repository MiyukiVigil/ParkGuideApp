import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { List, Switch, Divider, Button, Menu, useTheme } from 'react-native-paper';
import { useThemeContext } from './_layout';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Settings() {
  const theme = useTheme();
  const { t } = useTranslation();
  
  // Toggles State
  const { isDarkMode, toggleTheme } = useThemeContext();

  // TTS State
  const [isTTS, setIsTTS] = useState(false);

  // Language Menu State
  const [visible, setVisible] = useState(false);
  const initialLangLabel = i18n.language === 'en' ? 'English' :
                         i18n.language === 'ms' ? 'Bahasa Melayu' : '中文';
  const [language, setLanguage] = useState(initialLangLabel);

  const changeLanguage = async (lang, label) => {
    setLanguage(label);
    i18n.changeLanguage(lang);
    await AsyncStorage.setItem('appLanguage', lang);
  };
  
  useEffect(() => {
    const loadLanguage = async () => {
      const savedLang = await AsyncStorage.getItem('appLanguage');
      if (savedLang) {
        i18n.changeLanguage(savedLang);
        setLanguage(savedLang === 'en' ? 'English' : savedLang === 'ms' ? 'Bahasa Melayu' : '中文');
      }
    };
    loadLanguage();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <List.Section>
        <List.Subheader style={[styles.subheader, { color: theme.colors.onSurfaceVariant }]}>
          {t("setHeader")}
        </List.Subheader>
        
        <List.Item
          title={t("darkMode")}
          description={t("darkModeDesc")}
          left={props => <List.Icon {...props} icon="weather-night" />}
          right={() => (
            <Switch 
              value={isDarkMode} 
              onValueChange={toggleTheme}
            />
          )}
        />

        {/* Functional Language Selection */}
        <Menu
          visible={visible}
          onDismiss={() => setVisible(false)}
          contentStyle={{ backgroundColor: theme.colors.surface }}
          anchor={
            <List.Item
              title={t("langSwitch")}
              description={language}
              left={props => <List.Icon {...props} icon="translate" />}
              onPress={() => setVisible(true)}
            />
          }>
          <Menu.Item
            onPress={() => changeLanguage('en', 'English')}
            title="English"
          />

          <Menu.Item
            onPress={() => changeLanguage('ms', 'Bahasa Melayu')}
            title="Bahasa Melayu"
          />

          <Menu.Item
            onPress={() => changeLanguage('zh', 'Mandarin')}
            title="中文"
          />
        </Menu>
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>{t("accessSet")}</List.Subheader>
        <List.Item
          title={t("ttsSwitch")}
          description={t("ttsSwitchDesc")}
          right={() => <Switch value={isTTS} onValueChange={() => setIsTTS(!isTTS)} />}
        />
        <List.Item
          title={t("fontSet")}
          description={t("fontDesc")}
          left={props => <List.Icon {...props} icon="format-size" />}
          onPress={() => { /* Navigate to Font settings */ }}
        />
      </List.Section>

      <Divider />

      <Button
        mode="outlined"
        textColor={theme.colors.error}
        style={[styles.logout, { borderColor: theme.colors.error }]}
      >
        {t("logoutButton")}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },

  subheader: {
    marginTop: 20,
    marginBottom: 8,
    fontWeight: '600',
  },

  logout: {
    margin: 20
  }
});