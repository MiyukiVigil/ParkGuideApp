import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions, Alert } from 'react-native';
import { useTheme, Surface, Text, Button, ActivityIndicator, ProgressBar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import ThemedBackground from '../../components/ThemedBackground';
import { useThemeContext } from '../../contexts/ThemeContext';
import courseService from '../../services/courseService';

export default function CourseDetail() {
  const theme = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const { isSimpleMode, highContrast } = useThemeContext();
  const { id } = useLocalSearchParams();

  const getLocalizedText = (textData) => {
    if (!textData) return '';
    if (typeof textData === 'string') return textData;
    return textData[i18n.language] || textData.en || '';
  };

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState(null);

  const containerWidth = width > 1200 ? 800 : '100%';
  const containerMargin = width > 1200 ? 'auto' : 0;

  const cardRadius = isSimpleMode || highContrast ? 16 : 24;

  useEffect(() => {
    loadCourseDetails();
  }, [id]);

  const loadCourseDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await courseService.getCourseDetails(id);
      console.log(`[courseDetail] Full course data received:`, JSON.stringify(data, null, 2));
      console.log(`[courseDetail] Chapter data:`, data?.chapters);
      console.log(`[courseDetail] Chapters count:`, data?.chapters?.length);
      setCourse(data);
    } catch (err) {
      setError(err.message);
      console.error('Error loading course:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    try {
      setEnrolling(true);
      console.log(`[courseDetail] Attempting to enroll in course ${id}`);
      const response = await courseService.enrollCourse(id);
      console.log(`[courseDetail] Enrollment response:`, response);
      Alert.alert(
        t('enrollmentSuccess'), 
        'You have successfully enrolled in this course',
        [
          { 
            text: 'OK', 
            onPress: () => {
              console.log(`[courseDetail] Reloading course details after enrollment`);
              loadCourseDetails();
            } 
          },
        ]
      );
    } catch (err) {
      console.error(`[courseDetail] Enrollment error:`, err);
      Alert.alert(
        t('enrollmentFailed'), 
        err.message || 'An unknown error occurred during enrollment'
      );
    } finally {
      setEnrolling(false);
    }
  };

  const handleStartCourse = () => {
    console.log(`[courseDetail] handleStartCourse called`, { chaptersArray: course?.chapters, firstChapter: course?.chapters?.[0] });
    if (course?.chapters && course.chapters.length > 0) {
      router.push(`/chapters/${course.chapters[0].id}`);
    } else {
      Alert.alert(t('noChapters') || 'No Chapters', 'This course has no chapters yet.');
    }
  };

  // Check enrollment status from response
  // The backend returns the full enrollment object or null
  const enrollmentData = course?.enrollment_status;
  const isEnrolled = enrollmentData && (enrollmentData.status === 'enrolled' || enrollmentData === 'enrolled');
  
  // Check if prerequisites are met
  const hasUnmetPrerequisites = course?.enrollment_status === 'prerequisites_not_met';
  const canEnroll = !isEnrolled && !hasUnmetPrerequisites;
  const prerequisites = course?.prerequisites_info || [];

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <ThemedBackground />
        <AppHeader title={t('courseDetails')} showBack />
        <View style={styles.centerContainer}>
          <ActivityIndicator animating={true} size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (!course) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <ThemedBackground />
        <AppHeader title={t('courseDetails')} showBack />
        <View style={styles.centerContainer}>
          <Text>{t('errorLoadingCourse')}</Text>
          <Button onPress={loadCourseDetails} style={{ marginTop: 16 }}>
            {t('tryAgain')}
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ThemedBackground />
      <AppHeader title={getLocalizedText(course.title) || 'Course'} showBack />

      <ScrollView
        style={[styles.container, { width: containerWidth, marginLeft: containerMargin, marginRight: containerMargin }]}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Course Header */}
        <Surface
          style={[
            styles.headerCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
              borderRadius: cardRadius,
            },
          ]}
          elevation={highContrast ? 0 : isSimpleMode ? 1 : 2}
        >
          <View
            style={[
              styles.thumbnail,
              { backgroundColor: theme.colors.primaryContainer, borderRadius: cardRadius },
            ]}
          >
            <Text style={{ color: theme.colors.primary, fontSize: 48, fontWeight: 'bold' }}>
              {course.code?.[0]?.toUpperCase()}
            </Text>
          </View>

          <Text
            variant={isSimpleMode || highContrast ? 'headlineSmall' : 'headlineMedium'}
            style={{ color: theme.colors.onSurface, fontWeight: '800', marginBottom: 8 }}
          >
            {getLocalizedText(course.title)}
          </Text>

          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}
          >
            {getLocalizedText(course.description)}
          </Text>

          {/* Progress if enrolled */}
          {isEnrolled && enrollmentData?.progress_percentage !== undefined && (
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurface }}>
                  {t('courseProgress')}
                </Text>
                <Text
                  variant="labelMedium"
                  style={{ color: theme.colors.primary, fontWeight: '700' }}
                >
                  {Math.round(enrollmentData.progress_percentage)}%
                </Text>
              </View>
              <ProgressBar
                progress={enrollmentData.progress_percentage / 100}
                color={theme.colors.secondary}
              />
            </View>
          )}

          {/* Prerequisites */}
          {prerequisites.length > 0 && (
            <View
              style={[
                styles.prerequisiteBox,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
            >
              <Text variant="labelMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 8 }}>
                {t('prerequisites')}
              </Text>
              {prerequisites.map((prereq) => (
                <Text
                  key={prereq.id}
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}
                >
                  • {getLocalizedText(prereq.title)}
                </Text>
              ))}
            </View>
          )}

          {/* Enrollment Actions */}
          {!isEnrolled && (
            <Button
              mode="contained"
              onPress={handleEnroll}
              disabled={!canEnroll || enrolling}
              loading={enrolling}
              style={{ marginTop: 16 }}
            >
              {t('enrollNow')}
            </Button>
          )}

          {isEnrolled && (
            <Button mode="contained" onPress={handleStartCourse} style={{ marginTop: 16 }}>
              {enrollmentData?.progress_percentage > 0
                ? t('continueCourse')
                : t('startCourse')}
            </Button>
          )}
        </Surface>

        {/* Chapters */}
        {course.chapters && course.chapters.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text
              variant={isSimpleMode || highContrast ? 'titleMedium' : 'titleSmall'}
              style={{
                color: theme.colors.onSurface,
                fontWeight: '800',
                marginBottom: 12,
              }}
            >
              {t('chapters')}
            </Text>

            {course.chapters.map((chapter, index) => (
              <ChapterCard
                key={chapter.id}
                chapter={chapter}
                theme={theme}
                isSimpleMode={isSimpleMode}
                highContrast={highContrast}
                cardRadius={cardRadius}
                isEnrolled={isEnrolled}
                onPress={() =>
                  isEnrolled ? router.push(`/chapters/${chapter.id}`) : null
                }
                t={t}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ChapterCard({
  chapter,
  theme,
  isSimpleMode,
  highContrast,
  cardRadius,
  isEnrolled,
  onPress,
  t,
}) {
  const lessonsCount = chapter.lessons?.length || 0;
  const progress = chapter.progress?.progress_percentage || 0;

  return (
    <Surface
      style={[
        styles.chapterCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
          borderRadius: cardRadius,
          opacity: isEnrolled ? 1 : 0.6,
        },
      ]}
      elevation={highContrast ? 0 : 1}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View
          style={[
            styles.chapterNumber,
            { backgroundColor: theme.colors.primaryContainer },
          ]}
        >
          <Text
            style={{
              color: theme.colors.primary,
              fontWeight: '700',
              fontSize: 16,
            }}
          >
            {chapter.order || '1'}
          </Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text
            variant="titleSmall"
            style={{
              color: theme.colors.onSurface,
              fontWeight: '700',
            }}
          >
            {chapter.title?.en}
          </Text>
        </View>
      </View>

      <Text
        variant="bodySmall"
        style={{
          color: theme.colors.onSurfaceVariant,
          marginBottom: 12,
        }}
      >
        {t('lessonsCompleted', {
          completed: chapter.progress?.lessons_completed || 0,
          total: lessonsCount,
        })}
      </Text>

      {isEnrolled && progress > 0 && (
        <ProgressBar progress={progress / 100} color={theme.colors.secondary} />
      )}

      {isEnrolled && (
        <Button
          mode="outlined"
          size="small"
          onPress={onPress}
          style={{ marginTop: 12 }}
        >
          {progress > 0 ? t('continue') : t('start')}
        </Button>
      )}
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
  headerCard: {
    padding: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  thumbnail: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  prerequisiteBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  chapterCard: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  chapterNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
