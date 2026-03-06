import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { List, Switch, Text, Divider, Button } from 'react-native-paper';

export default function Settings() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isTTS, setIsTTS] = useState(false);

  return (
    <View style={styles.container}>
      <List.Section>
        <List.Subheader>General Settings</List.Subheader>
        <List.Item
          title="Dark Mode"
          right={() => <Switch value={isDarkMode} onValueChange={setIsDarkMode} />}
        />
        <List.Item
          title="Language"
          description="English (Sarawak)"
          left={props => <List.Icon {...props} icon="translate" />}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>Accessibility</List.Subheader>
        <List.Item
          title="Text-to-Speech (TTS)"
          description="Read training modules aloud"
          right={() => <Switch value={isTTS} onValueChange={setIsTTS} />}
        />
        <List.Item
          title="Font Size"
          description="Standard"
          left={props => <List.Icon {...props} icon="format-size" />}
          onPress={() => {}}
        />
      </List.Section>

      <Divider />

      <Button mode="outlined" style={styles.logout} onPress={() => {}}>
        Secure Logout
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  logout: { margin: 20, borderColor: '#d32f2f' }
});