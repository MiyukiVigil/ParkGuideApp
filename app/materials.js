import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Surface, TouchableRipple, Avatar, useTheme } from 'react-native-paper';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { useNavigation } from "@react-navigation/native";
import { useRouter } from 'expo-router';
 
const STUDY_MATERIALS = [
  { id: '1', title: 'Bako Flora Guide', sub: 'PDF • 2.4 MB', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
  { id: '2', title: 'Orangutan Ethics', sub: 'PDF • 1.1 MB', url: 'https://example-files.pdf2go.com/testing/pdf_collection/example_multipage_landscape.pdf' },
];

export default function Materials() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();

  const navigation = useNavigation();

  const openPDF = (url) => {
    router.push({
      pathname: "/pdfViewer",
      params: {url: url}
    })
  };

  const renderItem = ({ item }) => (
    <Surface
      style={[
        styles.card,
        {
          backgroundColor: theme.dark ? theme.colors.surfaceVariant : theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.dark ? 'transparent' : 'rgba(0,0,0,0.05)',
        },
      ]}
      elevation={theme.dark ? 2 : 0}
    >
      <TouchableRipple
        onPress={() => openPDF(item.url)}
        borderRadius={20}
        style={styles.ripple}
      >
        <View style={styles.cardContent}>
          <Avatar.Icon
            icon="file-pdf-box"
            size={48}
            color={theme.colors.error}
            style={{ backgroundColor: theme.colors.errorContainer, marginBottom: 10 }}
          />

          <Text
            style={[styles.cardTitle, { color: theme.colors.onSurface }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          <Text
            style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
          >
            {item.sub}
          </Text>
        </View>
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
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { marginTop: 15, marginBottom: 20, fontWeight: '900', letterSpacing: 0.5 },
  card: {
    flex: 1,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 4,
  },
  ripple: {
    paddingVertical: 18,
    paddingHorizontal: 12,
  },
  cardContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardTitle: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
});