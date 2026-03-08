import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, FlatList, ScrollView, Animated, Easing } from 'react-native';
import { Text, Surface, TouchableRipple, Avatar, Button, Portal, Modal, IconButton, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const NOTIFICATIONS = [
  { id: '1', title: 'New Module Available', description: 'Advanced Biodiversity 2.0 is unlocked.', fullText: 'Complete the new module within 14 days to maintain guide status.', time: '10 mins ago', isRead: false },
  { id: '2', title: 'Park Alert', description: 'Heavy rain expected in Bako National Park.', fullText: 'Flash flood warning: reroute tours immediately.', time: '2 hours ago', isRead: false },
  { id: '3', title: 'Certification Approved', description: 'Eco-Tourism Ethics certificate is ready.', fullText: 'Your certificate is verified. Check the Certs section.', time: 'Mar 07, 2026', isRead: true },
];

export default function Notifications() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [selected, setSelected] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);

  // Persist animated value across renders
  const scaleAnim = useRef(new Animated.Value(0)).current;

  const openModal = (item) => {
    setSelected({ ...item, isRead: true });
    setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n));
    setModalVisible(true);
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => setModalVisible(false));
  };

  const clearRead = () => setNotifications(prev => prev.filter(n => !n.isRead));

  const renderItem = ({ item }) => (
    <Surface
      style={[
        styles.card,
        { backgroundColor: item.isRead ? theme.colors.surfaceVariant : theme.colors.surface,
          borderColor: theme.colors.outline,
          borderWidth: 1
        },
      ]}
      elevation={item.isRead ? 0 : 2}
    >
      <TouchableRipple onPress={() => openModal(item)} style={styles.ripple} borderless>
        <View style={styles.cardContent}>
          <Avatar.Icon
            size={40}
            icon={item.isRead ? "email-open-outline" : "email-alert-outline"}
            style={{ backgroundColor: item.isRead ? theme.colors.surfaceVariant : theme.colors.primaryContainer, marginRight: 15 }}
            color={item.isRead ? theme.colors.onSurfaceVariant : theme.colors.primary}
          />
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={{ fontWeight: item.isRead ? '400' : '700', color: item.isRead ? theme.colors.onSurfaceVariant : theme.colors.onSurface }} numberOfLines={1}>
              {item.title}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
              {item.description}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{item.time}</Text>
          </View>
        </View>
      </TouchableRipple>
    </Surface>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineSmall" style={[styles.header, { color: theme.colors.onBackground }]}>Notifications</Text>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Footer */}
      <Surface style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20), backgroundColor: theme.colors.surface }]} elevation={4}>
        <Button mode="contained" onPress={clearRead} style={{ borderRadius: 12 }} buttonColor={theme.colors.primary} icon="check-all">
          Clear All Read Notifications
        </Button>
      </Surface>

      {/* Modal */}
      <Portal>
        <Modal
            visible={isModalVisible}
            onDismiss={closeModal}
            // Move the styling directly to the contentContainerStyle
            contentContainerStyle={[
            styles.modalContainer, 
            { backgroundColor: theme.colors.surface }
            ]}
        >
            {selected && (
            <View>
                <View style={styles.modalHeader}>
                <Avatar.Icon size={48} icon="email" style={{ backgroundColor: theme.colors.primaryContainer }} color={theme.colors.primary} />
                <IconButton icon="close" size={24} onPress={closeModal} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                <Text variant="titleLarge" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                    {selected.title}
                </Text>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, marginTop: 15 }}>
                    {selected.fullText}
                </Text>
                </ScrollView>

                <Button mode="contained" onPress={closeModal} style={styles.modalButton}>
                Close
                </Button>
            </View>
            )}
        </Modal>
    </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 20, fontWeight: '900' },
  card: { marginBottom: 15, borderRadius: 16, overflow: 'hidden' },
  ripple: { padding: 15 },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  footer: { position: 'absolute', bottom: 20, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalContainer: {
    width: '90%',
    alignSelf: 'center',
    borderRadius: 24,
    padding: 25,
    minHeight: 300, // Ensure it has a base height
    },
    modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
    },
    modalButton: {
    borderRadius: 12,
    marginTop: 20
    }
});