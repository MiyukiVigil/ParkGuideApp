import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Card, Text, Avatar, Divider, List, Chip } from 'react-native-paper';

export default function Certification() {
  return (
    <View style={styles.container}>
      {/* Digital ID Card */}
      <Card style={styles.idCard}>
        <View style={styles.idContent}>
          <Avatar.Image 
            size={80} 
            source={{ uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=Miyuki' }} 
          />
          <View style={styles.idText}>
            <Text variant="titleLarge" style={{ color: '#fff' }}>MIYUKI VIGIL</Text>
            <Text variant="bodyMedium" style={{ color: '#fff' }}>Official Park Guide</Text>
            <Text variant="labelSmall" style={{ color: '#FFD700', marginTop: 4 }}>ID: SFC-2026-0042</Text>
          </View>
        </View>
        <Divider style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
        <View style={styles.idFooter}>
          <Chip icon="check-decagram" style={styles.chip}>Verified Guide</Chip>
          <Text style={{ color: '#fff', fontSize: 10 }}>Exp: 12/2026</Text>
        </View>
      </Card>

      {/* Progress & Records */}
      <Text variant="titleMedium" style={styles.sectionTitle}>Completed Modules</Text>
      <Card>
        <List.Item
          title="Eco-Tourism Ethics"
          description="Completed March 01, 2026"
          left={props => <List.Icon {...props} icon="certificate" color="#2E7D32" />}
        />
        <Divider />
        <List.Item
          title="Biodiversity Level 1"
          description="Completed Feb 15, 2026"
          left={props => <List.Icon {...props} icon="certificate" color="#2E7D32" />}
        />
      </Card>
      
      <Text variant="bodySmall" style={styles.disclaimer}>
        Digital certificates are encrypted and stored securely on the SFC private server.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  idCard: { backgroundColor: '#2E7D32', padding: 15, borderRadius: 15, marginBottom: 25 },
  idContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  idText: { marginLeft: 15 },
  idFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  chip: { backgroundColor: '#fff', height: 30 },
  sectionTitle: { marginBottom: 10, fontWeight: 'bold' },
  disclaimer: { marginTop: 20, textAlign: 'center', color: '#888' }
});