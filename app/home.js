import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ScrollView, View, StyleSheet, Platform, useWindowDimensions, Animated, Easing, Alert } from 'react-native';
import { Text, Avatar, Surface, TouchableRipple, useTheme, IconButton } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api';

export default function Home() {
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { t, i18n } = useTranslation();

  const [trainingProgress, setTrainingProgress] = useState(0);
  const [remainingModules, setRemainingModules] = useState(0);
  const [completedModules, setCompletedModules] = useState([]);
  const [courses, setCourses] = useState([]);
  
  // Animation Refs
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const tiltAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const authAlertShown = useRef(false);

  const isWeb = Platform.OS === 'web';
  const contentWidth = isWeb && width > 1200 ? 800 : '100%';

  // Sync data on focus to ensure progress updates immediately after training
  useFocusEffect(
    useCallback(() => {
      const loadTrainingProgress = async () => {
        try {
          const stored = await AsyncStorage.getItem('completedModules');
          const cachedCompleted = stored ? JSON.parse(stored) : [];

          const [coursesRes, progressRes] = await Promise.all([
            api.get('/courses/'),
            api.get('/progress/'),
          ]);

          const backendCourses = Array.isArray(coursesRes.data) ? coursesRes.data : [];
          const backendCompleted = (progressRes.data || [])
            .map((entry) => (typeof entry === 'object' ? entry.module : entry))
            .filter((id) => id != null);

          const completed = backendCompleted.length ? backendCompleted : cachedCompleted;

          let courseProgressMap = {};
          try {
            const courseProgressRes = await api.get('/course-progress/');
            const rows = Array.isArray(courseProgressRes.data) ? courseProgressRes.data : [];
            courseProgressMap = rows.reduce((acc, row) => {
              acc[row.course] = row;
              return acc;
            }, {});
          } catch (_) {
          }

          const current = backendCourses.find((course) =>
            (course.modules || []).some((mod) => !completed.includes(mod.id))
          ) || backendCourses[backendCourses.length - 1];

          const currentModules = current?.modules || [];
          const completedInCourse = currentModules.filter((mod) =>
            completed.includes(mod.id)
          ).length;

          const currentCourseProgress = current
            ? (courseProgressMap[current.id]?.progress ?? (currentModules.length
              ? completedInCourse / currentModules.length
              : 0))
            : 0;

          const totalIncomplete = backendCourses.reduce((acc, course) => {
            if (courseProgressMap[course.id]) {
              const row = courseProgressMap[course.id];
              return acc + Math.max((row.total_modules || 0) - (row.completed_modules || 0), 0);
            }

            return acc + (course.modules || []).filter((m) => !completed.includes(m.id)).length;
          }, 0);

          setCourses(backendCourses);
          setCompletedModules(completed);
          setTrainingProgress(currentCourseProgress);
          setRemainingModules(totalIncomplete);

          await AsyncStorage.setItem('completedModules', JSON.stringify(completed));
        } catch (err) {
          if (err.response?.status === 401 || err.response?.status === 403 || err.isSessionExpired) {
            if (!authAlertShown.current) {
              authAlertShown.current = true;
              Alert.alert(
                'Session expired',
                'Your session has expired. Please log in again.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      authAlertShown.current = false;
                      router.replace('/');
                    },
                  },
                ]
              );
            }
            return;
          }
          console.log('Failed to load progress', err);
        }
      };

      loadTrainingProgress();
    }, [])
  );

  // Background loops and entrance animations
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(tiltAnim, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(tiltAnim, { toValue: 0, duration: 3000, easing: Easing.linear, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(shimmerAnim, { toValue: 1, duration: 2200, easing: Easing.linear, useNativeDriver: false })
    ).start();
  }, []);

  // Smooth spring for progress bar
  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: trainingProgress,
      tension: 15,
      friction: 6,
      useNativeDriver: false,
    }).start();
  }, [trainingProgress]);

  // Interpolations
  const rotateX = tiltAnim.interpolate({ inputRange: [0, 1], outputRange: ['-1.2deg', '1.2deg'] });
  const rotateY = tiltAnim.interpolate({ inputRange: [0, 1], outputRange: ['-1.2deg', '1.2deg'] });
  const barWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const shimmerTranslate = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: ['-150%', '350%'] });

  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }).start();

  const currentCourse = courses.find((course) =>
    (course.modules || []).some((mod) => !completedModules.includes(mod.id))
  ) || courses[courses.length - 1];

  const getLocalizedTitle = (titleData) => {
    if (typeof titleData === 'string') return titleData;
    return titleData[i18n.language] || titleData['en'] || "Untitled Course";
  };

  return (
    <View style={[styles.masterContainer, { backgroundColor: theme.colors.background }]}>
      
      {/* STICKY HEADER: Placed outside ScrollView to stay on top */}
      <Animated.View style={[styles.topBar, { opacity: fadeAnim, alignSelf: 'center', width: contentWidth }]}>
        <View style={styles.topIcons}>
          <Avatar.Image 
            size={54} 
            source={{ uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=Miyuki' }} 
          />
        </View>
        <View style={{ flex: 1, marginLeft: 15 }}>
          <Text variant="labelLarge" style={{ color: theme.colors.primary, fontWeight: '900', letterSpacing: 2 }}>
            SARAWAK FORESTRY
          </Text>
          <Text variant="headlineMedium" style={[styles.nameText, { color: theme.colors.onBackground }]}>
            Miyuki Vigil
          </Text>
        </View>
        <IconButton 
          icon="bell-badge-outline" 
          iconColor={theme.colors.primary} 
          size={28} 
          onPress={() => router.push('/notification')}
        />
      </Animated.View>

      <ScrollView 
        style={[styles.container, { alignSelf: 'center', width: contentWidth }]} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 10 }}
      >
        
        {/* Hero Card */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }, { rotateX }, { rotateY }], opacity: fadeAnim }}>
          <Surface style={[styles.mainFeature, { backgroundColor: theme.colors.primary }]} elevation={8}>
            <TouchableRipple 
              onPressIn={handlePressIn} 
              onPressOut={handlePressOut} 
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.push('/training');
              }}
              style={styles.cardRipple}
            >
              <View>
                <View style={styles.featureBadge}>
                  <Text style={styles.badgeText}>{t('inProgress').toUpperCase()}</Text>
                </View>

                <Text variant="headlineSmall" style={styles.featureTitle}>
                  {currentCourse ? getLocalizedTitle(currentCourse.title) : t('training')}
                </Text>

                <View style={styles.progressInfo}>
                  <Text style={styles.featureSub}>{t('courseCompletion')}</Text>
                  <Text style={styles.percentText}>{Math.round(trainingProgress * 100)}%</Text>
                </View>

                <View style={styles.customBarContainer}>
                  <Animated.View style={[styles.customBarFill, { width: barWidth }]}>
                    <Animated.View style={[styles.shimmerOverlay, { left: shimmerTranslate }]} />
                  </Animated.View>
                </View>
              </View>
            </TouchableRipple>
          </Surface>
        </Animated.View>

        <Text variant="titleMedium" style={styles.sectionHeader}>{t('guideOperations').toUpperCase()}</Text>

        <Animated.View style={[styles.grid, { opacity: fadeAnim }]}>
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
            progress={trainingProgress} 
            subtitle={`${remainingModules} ${t('remainingDesc')}`} 
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
        </Animated.View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// Internal Component for Grid Cards
const OperationCard = ({ icon, label, progress, subtitle, color, isLive, theme, onPress }) => (
  <Surface style={[styles.opCard, { backgroundColor: color || theme.colors.surfaceVariant }]} elevation={2}>
    <TouchableRipple 
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }} 
      style={styles.ripple} 
      borderRadius={32}
    >
      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        <View style={styles.cardTop}>
          <Avatar.Icon 
            size={44} 
            icon={icon} 
            color="#FFFFFF" 
            style={{ backgroundColor: theme.colors.primary }} 
          />
          {isLive && <View style={[styles.liveDot, { backgroundColor: theme.colors.error }]} />}
        </View>
        <View>
          <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>{label}</Text>
          <Text variant="bodySmall" style={{ opacity: 0.7, color: theme.colors.onSurfaceVariant }}>{subtitle}</Text>
          {progress !== undefined && (
            <View style={styles.miniBarContainer}>
              <View style={[styles.miniBarFill, { width: `${progress * 100}%`, backgroundColor: theme.colors.primary }]} />
            </View>
          )}
        </View>
      </View>
    </TouchableRipple>
  </Surface>
);

const styles = StyleSheet.create({
  masterContainer: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 22 },
  topBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingTop: 60, 
    paddingBottom: 20, 
    paddingHorizontal: 22 
  },
  topIcons: { flexDirection: 'row', alignItems: 'center' },
  nameText: { fontWeight: '900', marginTop: -5 },
  mainFeature: { borderRadius: 35, marginBottom: 35, overflow: 'hidden' },
  cardRipple: { padding: 28 },
  featureBadge: { backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14, marginBottom: 18 },
  badgeText: { fontSize: 11, fontWeight: '900', color: '#FFF', letterSpacing: 1.5 },
  featureTitle: { fontWeight: 'bold', color: '#FFF', fontSize: 28, lineHeight: 34 },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 25, marginBottom: 12 },
  featureSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  percentText: { fontWeight: '900', fontSize: 26, color: '#FFF' },
  customBarContainer: { height: 14, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 7, overflow: 'hidden' },
  customBarFill: { height: '100%', backgroundColor: '#FFFFFF', borderRadius: 7, overflow: 'hidden' },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    width: '80%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    transform: [{ skewX: '-25deg' }],
  },
  sectionHeader: { marginBottom: 20, fontWeight: '900', letterSpacing: 1.5, fontSize: 12, color: 'gray' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  opCard: { width: '48%', height: 180, borderRadius: 32, marginBottom: 18, overflow: 'hidden' },
  ripple: { flex: 1, padding: 18 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  liveDot: { width: 12, height: 12, borderRadius: 6 },
  miniBarContainer: { height: 7, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 4, marginTop: 10, overflow: 'hidden' },
  miniBarFill: { height: '100%', borderRadius: 4 }
});