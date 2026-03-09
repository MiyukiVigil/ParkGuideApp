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
  const { isDarkMode, toggleTheme, fontScale, setFontScale } = useThemeContext();

  const [langMenuVisible, setLangMenuVisible] = useState(false);
  const [fontMenuVisible, setFontMenuVisible] = useState(false);
  const [isTTS, setIsTTS] = useState(false);

  // Helper for Language Label
  const getLangLabel = () => {
    switch (i18n.language) {
      case 'ms': return 'Bahasa Melayu';
      case 'zh': return '中文';
      default: return 'English';
    }
  };

  // Helper for Font Label
  const getFontLabel = (scale) => {
    if (scale < 1) return 'Small';
    if (scale > 1) return 'Large';
    return 'Standard';
  };

  const updateLanguage = async (lang) => {
    i18n.changeLanguage(lang);
    await AsyncStorage.setItem('appLanguage', lang);
    setLangMenuVisible(false);
  };

  const updateFontScale = async (scale) => {
    setFontScale(scale);
    await AsyncStorage.setItem('appFontScale', scale.toString());
    setFontMenuVisible(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <List.Section>
       <List.Subheader style={[styles.Subheader, { color: theme.colors.onSurfaceVariant }]}>{t("setHeader")}</List.Subheader>
        
        {/* Dark Mode Toggle */}
        <List.Item
          title={t("darkMode")}
          description={t("darkModeDesc")}
          left={props => <List.Icon {...props} icon="weather-night" />}
          right={() => <Switch value={isDarkMode} onValueChange={toggleTheme} />}
        />

        {/* Language Selection */}
        <Menu
          visible={langMenuVisible}
          onDismiss={() => setLangMenuVisible(false)}
          anchor={
            <List.Item
              title={t("langSwitch")}
              description={getLangLabel()}
              left={props => <List.Icon {...props} icon="translate" />}
              onPress={() => setLangMenuVisible(true)}
            />
          }>
          <Menu.Item onPress={() => updateLanguage('en')} title="English" />
          <Menu.Item onPress={() => updateLanguage('ms')} title="Bahasa Melayu" />
          <Menu.Item onPress={() => updateLanguage('zh')} title="中文" />
        </Menu>
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>{t("accessSet")}</List.Subheader>
        
        {/* TTS Toggle */}
        <List.Item
          title={t("ttsSwitch")}
          description={t("ttsSwitchDesc")}
          right={() => <Switch value={isTTS} onValueChange={() => setIsTTS(!isTTS)} />}
        />

        {/* Font Size Selection */}
        <Menu
          visible={fontMenuVisible}
          onDismiss={() => setFontMenuVisible(false)}
          anchor={
            <List.Item
              title={t("fontSet")}
              description={getFontLabel(fontScale)}
              left={props => <List.Icon {...props} icon="format-size" />}
              onPress={() => setFontMenuVisible(true)}
            />
          }>
          <Menu.Item onPress={() => updateFontScale(0.85)} title="Small" />
          <Menu.Item onPress={() => updateFontScale(1.0)} title="Standard" />
          <Menu.Item onPress={() => updateFontScale(1.25)} title="Large" />
        </Menu>
      </List.Section>

      <Divider />

      <Button
        mode="outlined"
        textColor={theme.colors.error}
        style={[styles.logout, { borderColor: theme.colors.error }]}
        onPress={() => { /* Handle Logout */ }}
      >
        {t("logoutButton")}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  Subheader: { marginTop: 20},
  logout: { margin: 20 }
});