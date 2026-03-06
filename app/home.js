import React from 'react';
import { ScrollView, View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Card, Text, ProgressBar, Avatar, Surface, TouchableRipple, useTheme, IconButton, Badge } from 'react-native-paper';
import { useRouter } from 'expo-router';

export default function Home() {
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  
  const isWeb = Platform.OS === 'web';
  const contentWidth = isWeb && width > 1200 ? 800 : '100%';

  return (
    <View style={styles.masterContainer}>
      <ScrollView 
        style={[styles.container, { alignSelf: 'center', width: contentWidth }]} 
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Brand Header */}
        <View style={styles.topBar}>
          <View>
            <Text variant="labelLarge" style={{ color: '#2E7D32', fontWeight: '900', letterSpacing: 1 }}>SARAWAK FORESTRY</Text>
            <Text variant="headlineMedium" style={styles.nameText}>Miyuki Vigil</Text>
          </View>
          <View style={styles.topIcons}>
            <View>
                <IconButton icon="bell-badge-outline" iconColor="#2E7D32" size={28} onPress={() => {}} />
            </View>
            <Avatar.Image size={48} source={{ uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=Miyuki' }} />
          </View>
        </View>

        {/* 2. Primary Milestone Card (The one you liked) */}
        <Surface style={styles.mainFeature} elevation={5}>
          <View style={styles.featureBadge}>
            <Text style={styles.badgeText}>IN PROGRESS</Text>
          </View>
          <Text variant="headlineSmall" style={styles.featureTitle}>Advanced Biodiversity</Text>
          <View style={styles.progressInfo}>
            <Text style={styles.featureSub}>Course Completion</Text>
            <Text style={styles.percentText}>75%</Text>
          </View>
          <ProgressBar progress={0.75} color="#FFD700" style={styles.mainBar} />
        </Surface>

        {/* 3. Guide Operations Grid with Progress Mini-Bars */}
        <Text variant="titleMedium" style={styles.sectionHeader}>Guide Operations</Text>
        <View style={styles.grid}>
            <OperationCard
             icon="book-open-variant"
             label="Materials"
             progress={0.6}
             subtitle="6 Modules Left"
             onPress={() => router.push('/materials')}
          />
          <OperationCard 
            icon="school" 
            label="Training" 
            progress={0.4} 
            subtitle="4 Modules Left"
            onPress={() => router.push('/training')} 
          />
          <OperationCard 
            icon="map-marker-path" 
            label="Map"
            subtitle="Live Map"
            onPress={() => router.push('/map')} 
          />
          <OperationCard 
            icon="certificate" 
            label="Certs" 
            progress={1.0} 
            subtitle="Verified"
            onPress={() => router.push('/cert')} 
          />
          <OperationCard 
            icon="video-check" 
            label="Tour Monitor" 
            isLive 
            subtitle="IoT Stream Active"
            color="#1B5E20" 
            onPress={() => router.push('/monitor')} 
          />
          <OperationCard 
            icon="cog" 
            label="Settings" 
            subtitle="Customize App"
            onPress={() => router.push('/settings')} 
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// Custom Component for the Grid Items
const OperationCard = ({ icon, label, progress, subtitle, color, isLive, onPress }) => (
  <Surface style={[styles.opCard, { backgroundColor: color || '#fff' }]} elevation={1}>
    <TouchableRipple onPress={onPress} style={styles.ripple} borderRadius={20}>
      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        <View style={styles.cardTop}>
          <Avatar.Icon size={36} icon={icon} style={{ backgroundColor: color ? 'rgba(255,255,255,0.2)' : '#E8F5E9' }} color={color ? '#fff' : '#2E7D32'} />
          {isLive && <View style={styles.liveDot} />}
        </View>
        
        <View>
          <Text variant="titleMedium" style={[styles.cardLabel, color && { color: '#fff' }]}>{label}</Text>
          <Text variant="bodySmall" style={{ color: color ? 'rgba(255,255,255,0.7)' : '#757575', marginBottom: 8 }}>{subtitle}</Text>
          
          {progress !== undefined && (
            <ProgressBar progress={progress} color={color ? '#FFD700' : '#2E7D32'} style={styles.miniBar} />
          )}
        </View>
      </View>
    </TouchableRipple>
  </Surface>
);

const styles = StyleSheet.create({
  masterContainer: { flex: 1, backgroundColor: '#FBFBFB' },
  container: { flex: 1, paddingHorizontal: 20 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 25 },
  topIcons: { flexDirection: 'row', alignItems: 'center' },
  nameText: { fontWeight: '900', color: '#1A1A1A', marginTop: -4 },
  mainFeature: { backgroundColor: '#2E7D32', borderRadius: 24, padding: 24, marginBottom: 30 },
  featureBadge: { backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 12 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  featureTitle: { color: '#fff', fontWeight: 'bold' },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 20, marginBottom: 8 },
  featureSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  percentText: { color: '#FFD700', fontWeight: 'bold', fontSize: 18 },
  mainBar: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.2)' },
  sectionHeader: { marginBottom: 15, fontWeight: '800', color: '#444', letterSpacing: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  opCard: { width: '48%', height: 160, borderRadius: 24, marginBottom: 16, overflow: 'hidden' },
  ripple: { flex: 1, padding: 16 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF5252' },
  cardLabel: { fontWeight: 'bold', fontSize: 16 },
  miniBar: { height: 4, borderRadius: 2, backgroundColor: '#EEEEEE' }
});