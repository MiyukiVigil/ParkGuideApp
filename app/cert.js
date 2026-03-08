import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Avatar, Divider, List, Chip, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

export default function Certification() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Digital ID Card */}
      <Card style={[styles.idCard, { backgroundColor: theme.colors.primary }]}>
        <View style={styles.idContent}>
          <Avatar.Image 
            size={80} 
            source={{ uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=Miyuki' }} 
          />
          <View style={styles.idText}>
            <Text 
              variant="titleLarge" 
              style={{ color: theme.colors.onPrimary, fontWeight: 'bold' }}
            >
              MIYUKI VIGIL
            </Text>
            <Text 
              variant="bodyMedium" 
              style={{ color: theme.colors.onPrimary, marginTop: 2 }}
            >
              {t("certMedium")}
            </Text>
            <Text 
              variant="labelSmall" 
              style={{ color: '#FFD700', marginTop: 4 }}
            >
              ID: SFC-2026-0042
            </Text>
          </View>
        </View>

        <Divider style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />

        <View style={styles.idFooter}>
          <Chip 
            icon="check-decagram" 
            style={[styles.chip, { backgroundColor: theme.colors.surface }]}
            textStyle={{ color: theme.colors.onSurface, fontWeight: '600' }}
          >
            {t("verifiedGuide")}
          </Chip>
          <Text style={{ color: theme.colors.onPrimary, fontSize: 10 }}>Exp: 12/2026</Text>
        </View>
      </Card>

      {/* Progress & Records */}
      <Text 
        variant="titleMedium" 
        style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
      >
        {t("comModules")}
      </Text>

      <Card style={{ marginBottom: 20, backgroundColor: theme.colors.surface }}>
        <List.Item
          title="Eco-Tourism Ethics"
          description="Completed March 01, 2026"
          titleStyle={{ color: theme.colors.onSurface }}
          descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
          left={props => <List.Icon {...props} icon="certificate" color={theme.colors.primary} />}
        />
        <Divider />
        <List.Item
          title="Biodiversity Level 1"
          description="Completed Feb 15, 2026"
          titleStyle={{ color: theme.colors.onSurface }}
          descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
          left={props => <List.Icon {...props} icon="certificate" color={theme.colors.primary} />}
        />
      </Card>
      
      <Text 
        variant="bodySmall" 
        style={[styles.disclaimer, { color: theme.colors.onSurfaceVariant }]}
      >
        {t("certSecDesc")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },

  idCard: { padding: 15, borderRadius: 18, marginBottom: 25, marginTop:25 },

  idContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },

  idText: { marginLeft: 15 },

  idFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },

  chip: { height: 30 },

  sectionTitle: { marginBottom: 12, fontWeight: 'bold', fontSize: 16 },

  disclaimer: { marginTop: 20, textAlign: 'center' }
});