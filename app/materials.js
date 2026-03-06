import React from 'react';
import { View, StyleSheet, FlatList, Platform } from 'react-native';
import { List, Text, Surface, TouchableRipple, Avatar } from 'react-native-paper';
import * as WebBrowser from 'expo-web-browser';

const STUDY_MATERIALS = [
  { id: '1', title: 'Bako Flora Guide', sub: 'PDF • 2.4 MB', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
  { id: '2', title: 'Orangutan Ethics', sub: 'PDF • 1.1 MB', url: 'https://www.africau.edu/images/default/sample.pdf' },
];

export default function Materials() {
  const openPDF = async (url) => {
    // This opens the PDF in a "Slick" in-app modal
    await WebBrowser.openBrowserAsync(url, {
      toolbarColor: '#2E7D32',
      showTitle: true,
      enableBarCollapsing: true,
    });
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.header}>Learning Materials</Text>
      <FlatList
        data={STUDY_MATERIALS}
        renderItem={({ item }) => (
          <Surface style={styles.card} elevation={1}>
            <TouchableRipple onPress={() => openPDF(item.url)} style={styles.ripple}>
              <List.Item
                title={item.title}
                description={item.sub}
                left={props => <Avatar.Icon {...props} icon="file-pdf-box" color="#D32F2F" style={styles.iconBg} />}
                right={props => <List.Icon {...props} icon="open-in-new" />}
              />
            </TouchableRipple>
          </Surface>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 20 },
  header: { marginBottom: 25, fontWeight: '900', color: '#1A1A1A' },
  card: { marginBottom: 15, borderRadius: 16, backgroundColor: '#fff', overflow: 'hidden' },
  ripple: { padding: 4 },
  iconBg: { backgroundColor: '#FFEBEE' }
});