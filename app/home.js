import React from 'react';
import { ScrollView, View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Text, ProgressBar, Avatar, Surface, TouchableRipple, useTheme, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function Home() {
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { t } = useTranslation();

  const isWeb = Platform.OS === 'web';
  const contentWidth = isWeb && width > 1200 ? 800 : '100%';

  return (
    <View style={[styles.masterContainer, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={[styles.container, { alignSelf: 'center', width: contentWidth }]}
        showsVerticalScrollIndicator={false}
      >

        {/* Top Bar */}
        <View style={styles.topBar}>
           <View style={styles.topIcons}>
            <Avatar.Image
              size={48}
              source={{ uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=Miyuki' }}
            />
          </View>
          <View>
            <Text
              variant="labelLarge"
              style={{ color: theme.colors.primary, fontWeight: '900', letterSpacing: 1 }}
            >
              SARAWAK FORESTRY
            </Text>

            <Text
              variant="headlineMedium"
              style={[styles.nameText, { color: theme.colors.onBackground }]}
            >
              Miyuki Vigil
            </Text>
          </View>
          <View>
            <IconButton icon="bell-badge-outline" iconColor={theme.colors.primary} size={28} onPress={() => router.push('/notification')}/>
          </View>
        </View>

        {/* Main Feature Card */}
        <Surface
          style={[styles.mainFeature, { backgroundColor: theme.colors.primary }]}
          elevation={5}
        >
          <View style={styles.featureBadge}>
            <Text style={[styles.badgeText, { color: theme.colors.onPrimary }]}>
              {t('inProgress')}
            </Text>
          </View>

          <Text
            variant="headlineSmall"
            style={[styles.featureTitle, { color: theme.colors.onPrimary }]}
          >
            Advanced Biodiversity
          </Text>

          <View style={styles.progressInfo}>
            <Text style={[styles.featureSub, { color: theme.colors.onPrimary }]}>
              {t('courseCompletion')}
            </Text>

            <Text
              style={[styles.percentText, { color: theme.colors.percentageText }]}
            >
              75%
            </Text>
          </View>

          <ProgressBar
            progress={0.75}
            color={theme.colors.progressBar}
            style={styles.mainBar}
          />
        </Surface>

        {/* Section Header */}
        <Text
          variant="titleMedium"
          style={[styles.sectionHeader, { color: theme.colors.onSurfaceVariant }]}
        >
          {t('guideOperations')}
        </Text>

        {/* Grid */}
        <View style={styles.grid}>
          <OperationCard
            theme={theme}
            icon="book-open-variant"
            label={t('materials')}
            progress={0.6}
            subtitle={`6 ${t('remainingDesc')}`}
            onPress={() => router.push('/materials')}
          />

          <OperationCard
            theme={theme}
            icon="school"
            label={t('training')}
            progress={0.4}
            subtitle={`4 ${t('remainingDesc')}`}
            onPress={() => router.push('/training')}
          />

          <OperationCard
            theme={theme}
            icon="map-marker-path"
            label={t('map')}
            subtitle={t('mapDesc')}
            onPress={() => router.push('/map')}
          />

          <OperationCard
            theme={theme}
            icon="certificate"
            label={t('certs')}
            progress={1.0}
            subtitle={t('certsDesc')}
            onPress={() => router.push('/cert')}
          />

          <OperationCard
            theme={theme}
            icon="video-check"
            label={t('tourMonitor')}
            isLive
            subtitle={t('monitorDesc')}
            color={theme.colors.primaryContainer}
            onPress={() => router.push('/monitor')}
          />

          <OperationCard
            theme={theme}
            icon="cog"
            label={t('settings')}
            subtitle={t('settingsDesc')}
            onPress={() => router.push('/settings')}
          />
        </View>

        <View style={{ height: 40 }} />

      </ScrollView>
    </View>
  );
}

const OperationCard = ({ icon, label, progress, subtitle, color, isLive, onPress, theme }) => (
  <Surface
    style={[
      styles.opCard,
      {
        backgroundColor: color || theme.colors.surfaceVariant,
        borderWidth: theme.dark ? 1 : 0,
        borderColor: theme.colors.outline
      }
    ]}
    elevation={theme.dark ? 2 : 1}
  >
    <TouchableRipple onPress={onPress} style={styles.ripple} borderRadius={20}>
      <View style={{ flex: 1, justifyContent: 'space-between' }}>

        <View style={styles.cardTop}>
          <Avatar.Icon
            size={36}
            icon={icon}
            style={{ backgroundColor: theme.colors.secondaryContainer }}
            color={theme.colors.primaryIcon}
          />

          {isLive && (
            <View
              style={[styles.liveDot, { backgroundColor: theme.colors.error }]}
            />
          )}
        </View>

        <View>
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}
          >
            {label}
          </Text>

          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {subtitle}
          </Text>

          {progress !== undefined && (
            <ProgressBar
              progress={progress}
              color={theme.colors.primary}
              style={styles.miniBar}
            />
          )}
        </View>

      </View>
    </TouchableRipple>
  </Surface>
);

const styles = StyleSheet.create({
  masterContainer: { flex: 1 },

  container: {
    flex: 1,
    paddingHorizontal: 20
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 25
  },

  topIcons: {
    flexDirection: 'row',
    alignItems: 'center'
  },

  nameText: {
    fontWeight: '900',
    marginTop: -4
  },

  mainFeature: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 30
  },

  featureBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12
  },

  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1
  },

  featureTitle: {
    fontWeight: 'bold'
  },

  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 20,
    marginBottom: 8
  },

  featureSub: {
    fontSize: 12
  },

  percentText: {
    fontWeight: 'bold',
    fontSize: 18
  },

  mainBar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.2)'
  },

  sectionHeader: {
    marginBottom: 15,
    fontWeight: '800',
    letterSpacing: 0.5
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },

  opCard: {
    width: '48%',
    height: 160,
    borderRadius: 24,
    marginBottom: 16,
    overflow: 'hidden'
  },

  ripple: {
    flex: 1,
    padding: 16
  },

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },

  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },

  miniBar: {
    height: 4,
    borderRadius: 2
  }
});