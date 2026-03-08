import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { List, Switch, Divider, Button, Menu, useTheme } from 'react-native-paper';
import { useThemeContext } from './_layout';

export default function Settings() {
  const theme = useTheme();
  
  // Toggles State
  const { isDarkMode, toggleTheme } = useThemeContext();

  // TTS State
  const [isTTS, setIsTTS] = useState(false);

  // Language Menu State
  const [visible, setVisible] = useState(false);
  const [language, setLanguage] = useState('English (Sarawak)');

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <List.Section>
        <List.Subheader style={[styles.subheader, { color: theme.colors.onSurfaceVariant }]}>
          General Settings
        </List.Subheader>
        
        <List.Item
          title="Dark Mode"
          description="Better for night tours"
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
              title="Language"
              description={language}
              left={props => <List.Icon {...props} icon="translate" />}
              onPress={() => setVisible(true)}
            />
          }>
          <Menu.Item onPress={() => {setLanguage('English'); setVisible(false)}} title="English" />
          <Menu.Item onPress={() => {setLanguage('Bahasa Melayu'); setVisible(false)}} title="Bahasa Melayu" />
          <Menu.Item onPress={() => {setLanguage('Iban'); setVisible(false)}} title="Iban" />
        </Menu>
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>Accessibility</List.Subheader>
        <List.Item
          title="Text-to-Speech (TTS)"
          description="Read training modules aloud"
          right={() => <Switch value={isTTS} onValueChange={() => setIsTTS(!isTTS)} />}
        />
        <List.Item
          title="Font Size"
          description="Standard"
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
        Secure Logout
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