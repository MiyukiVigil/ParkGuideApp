import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { List, Text, Surface, TouchableRipple, Avatar, useTheme } from 'react-native-paper';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';

const STUDY_MATERIALS = [
  { id: '1', title: 'Bako Flora Guide', sub: 'PDF • 2.4 MB', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
  { id: '2', title: 'Orangutan Ethics', sub: 'PDF • 1.1 MB', url: 'https://www.africau.edu/images/default/sample.pdf' },
];

export default function Materials() {
  const theme = useTheme();
   const { t } = useTranslation();

  const openPDF = async (url) => {
    await WebBrowser.openBrowserAsync(url, {
      toolbarColor: theme.colors.primary,
      showTitle: true,
      enableBarCollapsing: true,
    });
  };

  const renderItem = ({ item }) => (
    <Surface
      style={[
        styles.card,
        {
          // 1. Light mode uses 'surface' (white) for a cleaner look than 'surfaceVariant'
          backgroundColor: theme.dark ? theme.colors.surfaceVariant : theme.colors.surface,
          // 2. Add a crisp border instead of a blurry shadow
          borderWidth: 1,
          borderColor: theme.dark ? 'transparent' : 'rgba(0,0,0,0.05)',
        },
      ]}
      // 3. Lower elevation for a modern, flatter feel
      elevation={theme.dark ? 2 : 0} 
    >
      <TouchableRipple
        onPress={() => openPDF(item.url)}
        borderRadius={18}
        style={styles.ripple}
      >
        <List.Item
          title={item.title}
          titleStyle={{ color: theme.colors.onSurface, fontWeight: '700' }}
          description={item.sub}
          descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
          left={(props) => (
            <Avatar.Icon
              {...props}
              icon="file-pdf-box"
              size={40}
              color={theme.colors.error}
              style={{ backgroundColor: theme.colors.errorContainer }}
            />
          )}
          right={(props) => (
            <List.Icon
              {...props}
              icon="open-in-new"
              color={theme.colors.onSurfaceVariant}
            />
          )}
        />
      </TouchableRipple>
    </Surface>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text
        variant="headlineSmall"
        style={[styles.header, { color: theme.colors.onBackground }]}
      >
        {t('matHeadline')}
      </Text>

      <FlatList
        data={STUDY_MATERIALS}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { marginTop: 15, marginBottom: 20, fontWeight: '900', letterSpacing: 0.5 },
  card: {
    marginBottom: 14,
    borderRadius: 20, // Increased to 20 to match your dashboard grid
    overflow: 'hidden',
    // 4. REMOVED manual shadow properties to fix the "weird" look
  },
  ripple: { paddingVertical: 4, paddingLeft: 8 },
});