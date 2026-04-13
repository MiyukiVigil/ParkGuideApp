import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions, RefreshControl } from 'react-native';
import { useTheme, Surface, Text, Button, ActivityIndicator, ProgressBar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import AppHeader from '../components/AppHeader';
import ThemedBackground from '../components/ThemedBackground';
import { useThemeContext } from '../contexts/ThemeContext';
import courseService from '../services/courseService';

export default function MyProgress() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { isSimpleMode, highContrast } = useThemeContext();

  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const containerWidth = width > 1200 ? 800 : '100%';
  const containerMargin = width > 1200 ? 'auto' : 0;

  const cardRadius = isSimpleMode || highContrast ? 16 : 24;

  useEffect(() => {
    loadEnrollments();
  }, []);

  const loadEnrollments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await courseService.getUserEnrollments();
      setEnrollments(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(err.message);
      console.error('Error loading enrollments:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEnrollments();
    setRefreshing(false);
  };

  // Calculate overall statistics
  const totalEnrolled = enrollments.length;
  const completed = enrollments.filter(
    (e) => e.progress_percentage === 100
  ).length;
  const inProgress = enrollments.filter(
    (e) => e.progress_percentage > 0 && e.progress_percentage < 100
  ).length;
  const notStarted = enrollments.filter(
    (e) => e.progress_percentage === 0
  ).length;
  const avgProgress = enrollments.length > 0
      ? Math.round(
        enrollments.reduce((sum, e) => sum + (e.progress_percentage || 0), 0) /
          enrollments.length
      )
      : 0;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ThemedBackground />
      <AppHeader
        title={t('myProgress')}
        subtitle={t('trackYourPerformance') || 'Track your learning progress'}
        showBack
        showHome
      />

      <ScrollView
        style={[styles.container, { width: containerWidth, marginLeft: containerMargin, marginRight: containerMargin }]}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {/* Statistics Cards */}
        {!loading && enrollments.length > 0 && (
          <View style={styles.statsGrid}>
            <StatisticCard
              title={t('completed')}
              value={completed}
              total={totalEnrolled}
              color={theme.colors.secondary}
              theme={theme}
              cardRadius={cardRadius}
            />
            <StatisticCard
              title={t('inProgress')}
              value={inProgress}
              total={totalEnrolled}
              color={theme.colors.primary}
              theme={theme}
              cardRadius={cardRadius}
            />
            <StatisticCard
              title={t('notStarted')}
              value={notStarted}
              total={totalEnrolled}
              color={theme.colors.outline}
              theme={theme}
              cardRadius={cardRadius}
            />
          </View>
        )}

        {/* Overall Progress */}
        {!loading && enrollments.length > 0 && (
          <Surface
            style={[
              styles.overallCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
                borderRadius: cardRadius,
              },
            ]}
            elevation={highContrast ? 0 : isSimpleMode ? 1 : 2}
          >
            <Text
              variant="titleMedium"
              style={{
                color: theme.colors.onSurface,
                fontWeight: '700',
                marginBottom: 16,
              }}
            >
              {t('overall')} {t('progress')}
            </Text>

            <View style={{ marginBottom: 12 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <Text
                  variant="labelMedium"
                  style={{ color: theme.colors.onSurface }}
                >
                  {t('average')}
                </Text>
                <Text
                  variant="labelMedium"
                  style={{ color: theme.colors.primary, fontWeight: '700' }}
                >
                  {avgProgress}%
                </Text>
              </View>
              <ProgressBar
                progress={avgProgress / 100}
                color={theme.colors.secondary}
              />
            </View>

            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.onSurfaceVariant,
              }}
            >
              {t('youAreEnrolled', {
                count: totalEnrolled,
              }) || `You are enrolled in ${totalEnrolled} course${totalEnrolled !== 1 ? 's' : ''}`}
            </Text>
          </Surface>
        )}

        {/* Loading State */}
        {loading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator animating={true} size="large" color={theme.colors.primary} />
          </View>
        )}

        {/* Empty State */}
        {!loading && enrollments.length === 0 && (
          <View style={styles.emptyState}>
            <Text
              variant="headlineSmall"
              style={{
                color: theme.colors.onSurfaceVariant,
                marginBottom: 8,
                textAlign: 'center',
              }}
            >
              {t('noCourses')}
            </Text>
            <Text
              variant="bodyMedium"
              style={{
                color: theme.colors.onSurfaceVariant,
                marginBottom: 20,
                textAlign: 'center',
              }}
            >
              {t('enrollInCoursesToGetStarted') || 'Enroll in courses to get started with your learning journey.'}
            </Text>
            <Button mode="contained" onPress={() => router.push('/courses')}>
              {t('browseCourses')}
            </Button>
          </View>
        )}

        {/* Enrolled Courses */}
        {!loading && enrollments.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text
              variant="titleMedium"
              style={{
                color: theme.colors.onSurface,
                fontWeight: '800',
                marginBottom: 12,
              }}
            >
              {t('myCourses')} ({enrollments.length})
            </Text>

            {enrollments.map((enrollment) => (
              <EnrollmentCard
                key={enrollment.id}
                enrollment={enrollment}
                theme={theme}
                isSimpleMode={isSimpleMode}
                highContrast={highContrast}
                cardRadius={cardRadius}
                onPress={() => router.push(`/courses/${enrollment.course}`)}
                t={t}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StatisticCard({
  title,
  value,
  total,
  color,
  theme,
  cardRadius,
}) {
  return (
    <Surface
      style={[
        styles.statCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
          borderRadius: cardRadius,
        },
      ]}
      elevation={0}
    >
      <Text
        variant="headlineSmall"
        style={{
          color,
          fontWeight: '800',
          marginBottom: 8,
        }}
      >
        {value}
      </Text>
      <Text
        variant="labelSmall"
        style={{
          color: theme.colors.onSurfaceVariant,
        }}
      >
        {title}
      </Text>
      <Text
        variant="bodySmall"
        style={{
          color: theme.colors.onSurfaceVariant,
          marginTop: 4,
        }}
      >
        of {total}
      </Text>
    </Surface>
  );
}

function EnrollmentCard({
  enrollment,
  theme,
  isSimpleMode,
  highContrast,
  cardRadius,
  onPress,
  t,
}) {
  const progress = enrollment.progress_percentage || 0;
  const isCompleted = progress === 100;

  return (
    <Surface
      style={[
        styles.enrollmentCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
          borderRadius: cardRadius,
        },
      ]}
      elevation={highContrast ? 0 : 1}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 12,
        }}
      >
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text
            variant="titleSmall"
            style={{
              color: theme.colors.onSurface,
              fontWeight: '700',
              marginBottom: 4,
            }}
            numberOfLines={2}
          >
            {enrollment.course_title?.en || 'Course'}
          </Text>
          <Text
            variant="bodySmall"
            style={{
              color: theme.colors.onSurfaceVariant,
            }}
          >
            {enrollment.course_code}
          </Text>
        </View>

        {isCompleted && (
          <Surface
            style={{
              backgroundColor: theme.colors.secondaryContainer,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
            }}
          >
            <Text
              variant="labelSmall"
              style={{
                color: theme.colors.onSecondaryContainer,
                fontWeight: '700',
              }}
            >
              ✓ {t('completed')}
            </Text>
          </Surface>
        )}
      </View>

      {/* Progress Bar */}
      <View style={{ marginBottom: 12 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 6,
          }}
        >
          <Text
            variant="labelSmall"
            style={{ color: theme.colors.onSurface }}
          >
            {t('courseProgress')}
          </Text>
          <Text
            variant="labelSmall"
            style={{
              color: theme.colors.primary,
              fontWeight: '700',
            }}
          >
            {Math.round(progress)}%
          </Text>
        </View>
        <ProgressBar
          progress={progress / 100}
          color={isCompleted ? theme.colors.secondary : theme.colors.primary}
        />
      </View>

      {/* Progress Details */}
      <View style={styles.progressDetails}>
        {enrollment.practice_score !== null && (
          <Text
            variant="bodySmall"
            style={{
              color: theme.colors.onSurfaceVariant,
              marginRight: 12,
            }}
          >
            {t('practiceScore', { score: Math.round(enrollment.practice_score) })}
          </Text>
        )}
        {enrollment.quiz_score !== null && (
          <Text
            variant="bodySmall"
            style={{
              color: theme.colors.onSurfaceVariant,
            }}
          >
            {t('quizScore', { score: Math.round(enrollment.quiz_score) })}
          </Text>
        )}
      </View>

      {/* Action Button */}
      <Button
        mode="outlined"
        size="small"
        onPress={onPress}
        style={{ marginTop: 12 }}
      >
        {isCompleted ? t('review') : t('resumeCourse')}
      </Button>
    </Surface>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 40 },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
    paddingVertical: 40,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  overallCard: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  enrollmentCard: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  progressDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
