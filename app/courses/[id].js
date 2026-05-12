import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useTheme, Surface, Text, Button, ActivityIndicator, ProgressBar, Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import ThemedBackground from '../../components/ThemedBackground';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useScreenSpeech } from '../../contexts/ScreenSpeechContext';
import courseService from '../../services/courseService';
import { useAppAlert } from '../../components/AppAlertProvider';

const isLessonCompleted = (lesson) => Boolean(
  lesson?.is_completed ||
  lesson?.completed ||
  lesson?.progress?.completed ||
  lesson?.progress?.is_completed
);

const getChapterProgress = (chapter) => {
  const lessons = chapter?.lessons || [];
  const completedFromLessons = lessons.filter(isLessonCompleted).length;
  const reportedLessonsCompleted =
    chapter?.progress?.lessons_completed ??
    chapter?.progress?.completed_lessons ??
    0;
  const lessonsCompleted = Math.max(reportedLessonsCompleted, completedFromLessons);
  const progressPercentage =
    Math.max(
      chapter?.progress?.progress_percentage ?? 0,
      (lessons.length > 0 ? lessonsCompleted / lessons.length : 0) * 100
    );

  return {
    lessonsCompleted,
    progressPercentage,
  };
};

const hasArMarker = (value) => {
  if (!value) return false;
  const text = typeof value === 'string'
    ? value
    : [value.en, value.ms, value.zh, value.code, value.scenario_type].filter(Boolean).join(' ');
  const normalized = text.toLowerCase().replace(/[-_/]+/g, ' ');
  return /\bar\b/.test(normalized) || normalized.includes('immersive') || normalized.includes('360');
};

const isArLesson = (lesson) => Boolean(
  lesson?.ar_scenario_info ||
  lesson?.ar_scenario ||
  hasArMarker(lesson?.title) ||
  hasArMarker(lesson?.code)
);

const getArLessons = (course) => (
  (course?.chapters || []).flatMap((chapter) => chapter.lessons || []).filter(isArLesson)
);

const isArCourse = (course) => Boolean(
  getArLessons(course).length ||
  hasArMarker(course?.course_type) ||
  hasArMarker(course?.code) ||
  hasArMarker(course?.title) ||
  (Array.isArray(course?.tags) && course.tags.some(hasArMarker))
);

export default function CourseDetail() {
  const theme = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { showAlert } = useAppAlert();
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

  useFocusEffect(
    React.useCallback(() => {
      loadCourseDetails();
    }, [id])
  );

  const loadCourseDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await courseService.getCourseDetails(id);
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
      await courseService.enrollCourse(id);
      // Reload immediately after API success
      await loadCourseDetails();
      showAlert(t('enrollmentSuccess'), t('enrollmentSuccessMessage'));
    } catch (err) {
      console.error(`[courseDetail] Enrollment error:`, err);
      showAlert(t('cannotEnroll'), err.message || t('unknownEnrollmentError'));
    } finally {
      setEnrolling(false);
    }
  };

  const handleStartCourse = () => {
    if (course?.chapters && course.chapters.length > 0) {
      router.push(`/chapters/${course.chapters[0].id}`);
    } else {
      showAlert(t('noChapters'), t('noChaptersMessage'));
    }
  };

  // Check enrollment status from response
  // The backend returns the full enrollment object or null
  // User is enrolled if enrollment_status exists and has any active status (enrolled, in_progress, completed)
  const enrollmentData = course?.enrollment_status;
  const enrollmentStatus = enrollmentData?.status;
  const isCompleted = enrollmentStatus === 'completed' || (enrollmentData?.progress_percentage || 0) >= 100;
  const isEnrolled = !!enrollmentData;
  
  // Check if prerequisites are met
  const prerequisites = course?.prerequisites_info || [];
  const allPrerequisitesMet = prerequisites.length === 0 || prerequisites.every(p => p.is_completed);
  const canEnroll = !isEnrolled && allPrerequisitesMet;
  const arLessons = getArLessons(course);
  const isArTrainingCourse = isArCourse(course);

  const chapterText = (course?.chapters || []).flatMap((chapter, index) => {
    const chapterTitle = getLocalizedText(chapter.title) || `${t('chapter')} ${index + 1}`;
    const lessonTitles = (chapter.lessons || []).map((lesson, lessonIndex) => {
      const lessonTitle = getLocalizedText(lesson.title) || `${t('lesson')} ${lessonIndex + 1}`;
      return `Lesson ${lessonIndex + 1}: ${lessonTitle}`;
    });

    return [`Chapter ${index + 1}: ${chapterTitle}`, ...lessonTitles];
  });

  const speechText = loading
    ? [t('courseDetails'), t('loadingCourses')].join('. ')
    : !course
      ? [t('courseDetails'), t('errorLoadingCourse')].join('. ')
      : [
          getLocalizedText(course.title) || t('courseDetails'),
          getLocalizedText(course.description),
          enrollmentStatus ? `${t('status')}: ${enrollmentStatus}` : '',
          ...(prerequisites.length > 0
            ? [t('prerequisites'), ...prerequisites.map((item, index) => `${index + 1}. ${getLocalizedText(item.title || item.name || item.course_title || '')}`)]
            : []),
          ...chapterText,
        ]
          .filter(Boolean)
          .join('. ');

  useScreenSpeech(speechText, { priority: 100 });
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
      <AppHeader title={getLocalizedText(course.title) || t('courseDetails')} showBack />

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

          {Array.isArray(course.tags) && course.tags.length > 0 && (
            <View style={styles.tagRow}>
              {course.tags.map((tag) => (
                <Chip key={tag} compact>{tag}</Chip>
              ))}
            </View>
          )}

          {isArTrainingCourse ? (
            <View
              style={[
                styles.arCourseBanner,
                {
                  backgroundColor: theme.colors.primaryContainer,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
            >
              <Chip icon="cube-scan" compact style={styles.arChip}>
                {t('arIntegratedCourse')}
              </Chip>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onPrimaryContainer, lineHeight: 20 }}
              >
                {t('arCourseExplainer', { count: arLessons.length })}
              </Text>
            </View>
          ) : null}

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
                <View key={prereq.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ 
                    color: prereq.is_completed ? theme.colors.primary : theme.colors.error,
                    fontSize: 18,
                    marginRight: 8
                  }}>
                    {prereq.is_completed ? '✓' : '•'}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ 
                      color: prereq.is_completed ? theme.colors.primary : theme.colors.error,
                      flex: 1
                    }}
                  >
                    {getLocalizedText(prereq.title)}
                    {prereq.is_completed ? ` ${t('prerequisiteCompleted')}` : ` ${t('prerequisiteRequired')}`}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Enrollment Actions */}
          {!isEnrolled && !allPrerequisitesMet && (
            <View style={{ 
              marginTop: 16, 
              padding: 12, 
              backgroundColor: theme.colors.errorContainer,
              borderRadius: 8
            }}>
              <Text style={{ color: theme.colors.error, fontWeight: '600' }}>
                ⚠️ {t('cannotEnrollYet')}
              </Text>
              <Text style={{ color: theme.colors.error, marginTop: 4 }}>
                {t('completePrerequisitesFirst')}
              </Text>
            </View>
          )}

          {!isEnrolled && allPrerequisitesMet && (
            <Button
              mode="contained"
              onPress={handleEnroll}
              disabled={enrolling}
              loading={enrolling}
              style={{ marginTop: 16 }}
            >
              {t('enrollNow')}
            </Button>
          )}

          {isCompleted ? (
            <Button mode="contained" disabled style={{ marginTop: 16 }}>
              {t('completed')}
            </Button>
          ) : isEnrolled ? (
            <Button
              mode="contained"
              icon={isArTrainingCourse ? 'cube-scan' : undefined}
              onPress={handleStartCourse}
              style={{ marginTop: 16 }}
            >
              {enrollmentData?.progress_percentage > 0
                ? t('continueCourse')
                : isArTrainingCourse ? t('startArTraining') : t('startCourse')}
            </Button>
          ) : null}
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
                arLessonsCount={(chapter.lessons || []).filter(isArLesson).length}
                theme={theme}
                isSimpleMode={isSimpleMode}
                highContrast={highContrast}
                cardRadius={cardRadius}
                isEnrolled={isEnrolled}
                onPress={() =>
                  isEnrolled ? router.push(`/chapters/${chapter.id}`) : null
                }
                t={t}
                getLocalizedText={getLocalizedText}
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
  arLessonsCount,
  theme,
  isSimpleMode,
  highContrast,
  cardRadius,
  isEnrolled,
  onPress,
  t,
  getLocalizedText,
}) {
  const lessonsCount = chapter.lessons?.length || 0;
  const chapterProgress = getChapterProgress(chapter);
  const progress = chapterProgress.progressPercentage || 0;
  const hasArLessons = arLessonsCount > 0;

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
            {getLocalizedText(chapter.title)}
          </Text>
          {hasArLessons ? (
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.primary, fontWeight: '700', marginTop: 4 }}
            >
              {t('arLessonsCount', { count: arLessonsCount })}
            </Text>
          ) : null}
        </View>
      </View>

      {hasArLessons ? (
        <View
          style={[
            styles.arChapterNotice,
            {
              backgroundColor: theme.colors.primaryContainer,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
        >
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onPrimaryContainer, lineHeight: 18 }}
          >
            {t('arChapterExplainer')}
          </Text>
        </View>
      ) : null}

      <Text
        variant="bodySmall"
        style={{
          color: theme.colors.onSurfaceVariant,
          marginBottom: 12,
        }}
      >
        {t('lessonsCompleted', {
          completed: chapterProgress.lessonsCompleted,
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
          {hasArLessons ? t('openArLessons') : progress > 0 ? t('continue') : t('start')}
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
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  arCourseBanner: {
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 16,
    padding: 12,
  },
  arChip: {
    alignSelf: 'flex-start',
  },
  arChapterNotice: {
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    padding: 10,
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
