import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useTheme, Surface, Text, Button, ActivityIndicator, ProgressBar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import ThemedBackground from '../../components/ThemedBackground';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useScreenSpeech } from '../../contexts/ScreenSpeechContext';
import courseService from '../../services/courseService';

const isLessonCompleted = (lesson) => Boolean(
  lesson?.is_completed ||
  lesson?.completed ||
  lesson?.progress?.completed ||
  lesson?.progress?.is_completed
);

const getChapterProgress = (chapter) => {
  const lessons = chapter?.lessons || [];
  const completedFromLessons = lessons.filter(isLessonCompleted).length;
  const totalLessons = chapter?.progress?.total_lessons ?? lessons.length ?? 0;
  const reportedCompletedLessons =
    chapter?.progress?.completed_lessons ??
    chapter?.progress?.lessons_completed ??
    0;
  const completedLessons = Math.max(reportedCompletedLessons, completedFromLessons);

  const progressPercentage =
    Math.max(
      chapter?.progress?.progress_percentage ?? 0,
      totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0
    );

  return {
    totalLessons,
    completedLessons,
    progressPercentage,
  };
};

export default function ChapterView() {
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

  const [chapter, setChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const containerWidth = width > 1200 ? 800 : '100%';
  const containerMargin = width > 1200 ? 'auto' : 0;

  const cardRadius = isSimpleMode || highContrast ? 16 : 24;

  const lessons = chapter?.lessons || [];
  const chapterProgress = chapter ? getChapterProgress(chapter) : { totalLessons: 0, completedLessons: 0, progressPercentage: 0 };
  const progress = chapterProgress.progressPercentage || 0;

  const speechText = loading
    ? [t('chapter'), t('loadingCourses')].join('. ')
    : !chapter
      ? [t('chapter'), t('errorLoadingCourse')].join('. ')
      : [
          getLocalizedText(chapter.title) || t('chapter'),
          getLocalizedText(chapter.description),
          `${t('chapterProgress')}: ${Math.round(progress)}%`,
          t('lessonsCompleted', {
            completed: chapterProgress.completedLessons,
            total: chapterProgress.totalLessons,
          }),
          ...lessons.map((lesson, index) => `${t('lesson')} ${index + 1}. ${getLocalizedText(lesson.title)}`),
          ...(chapter.practice_exercises || []).length > 0 ? [t('practiceExercise')] : [],
          ...(chapter.quizzes || []).length > 0 ? [t('quiz')] : [],
        ]
          .filter(Boolean)
          .join('. ');

  useScreenSpeech(speechText, { priority: 100 });

  useEffect(() => {
    loadChapter();
  }, [id]);

  // Reload chapter when screen comes into focus (e.g., after marking lesson complete)
  useFocusEffect(
    React.useCallback(() => {
      console.log(`[Chapter] useFocusEffect triggered for chapter ${id}, reloading data...`);
      loadChapter();
    }, [id])
  );

  const loadChapter = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await courseService.getChapter(id);
      console.log(`[Chapter] Data loaded:`, {
        id: data?.id,
        title: data?.title,
        lessonsCount: data?.lessons?.length,
        progressPercentage: data?.progress?.progress_percentage,
        completedLessons: data?.progress?.completed_lessons,
        totalLessons: data?.progress?.total_lessons,
        quizzesCount: data?.quizzes?.length,
        quizScore: data?.quizzes?.[0]?.score,
      });
      setChapter(data);
    } catch (err) {
      setError(err.message);
      console.error('Error loading chapter:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <ThemedBackground />
        <AppHeader title={t('chapter')} showBack />
        <View style={styles.centerContainer}>
          <ActivityIndicator animating={true} size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (!chapter) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <ThemedBackground />
        <AppHeader title={t('chapter')} showBack />
        <View style={styles.centerContainer}>
          <Text>{t('errorLoadingCourse')}</Text>
          <Button onPress={loadChapter} style={{ marginTop: 16 }}>
            {t('tryAgain')}
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ThemedBackground />
      <AppHeader
        title={getLocalizedText(chapter.title) || t('chapter')}
        subtitle={t('chapter')}
        showBack
      />

      <ScrollView
        style={[styles.container, { width: containerWidth, marginLeft: containerMargin, marginRight: containerMargin }]}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Chapter Header */}
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
          <Text
            variant={isSimpleMode || highContrast ? 'headlineSmall' : 'headlineMedium'}
            style={{
              color: theme.colors.onSurface,
              fontWeight: '800',
              marginBottom: 8,
            }}
          >
            {getLocalizedText(chapter.title)}
          </Text>

          {getLocalizedText(chapter.description) ? (
            <Text
              variant="bodyMedium"
              style={{
                color: theme.colors.onSurfaceVariant,
                marginBottom: 16,
              }}
            >
              {getLocalizedText(chapter.description)}
            </Text>
          ) : null}

          {/* Progress */}
          <View style={{ marginBottom: 16 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <Text
                variant="labelMedium"
                style={{ color: theme.colors.onSurface, fontWeight: '600' }}
              >
                {t('chapterProgress')}
              </Text>
              <Text
                variant="labelMedium"
                style={{ color: theme.colors.primary, fontWeight: '700' }}
              >
                {Math.round(progress)}%
              </Text>
            </View>
            <ProgressBar progress={progress / 100} color={theme.colors.secondary} />
          </View>

          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {t('lessonsCompleted', {
              completed: chapterProgress.completedLessons,
              total: chapterProgress.totalLessons,
            })}
          </Text>
        </Surface>

        {/* Lessons */}
        {lessons.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text
              variant={isSimpleMode || highContrast ? 'titleMedium' : 'titleSmall'}
              style={{
                color: theme.colors.onSurface,
                fontWeight: '800',
                marginBottom: 12,
              }}
            >
              {t('lessons')}
            </Text>

            {lessons.map((lesson, index) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                index={index + 1}
                theme={theme}
                isSimpleMode={isSimpleMode}
                highContrast={highContrast}
                cardRadius={cardRadius}
                onPress={() => router.push(`/lessons/${lesson.id}`)}
                t={t}
                getLocalizedText={getLocalizedText}
              />
            ))}
          </View>
        )}

        {/* Practice & Quiz Section */}
        {(chapter.practice_exercises?.length > 0 || chapter.quizzes?.length > 0) && (
          <View style={{ marginTop: 20 }}>
            <Text
              variant={isSimpleMode || highContrast ? 'titleMedium' : 'titleSmall'}
              style={{
                color: theme.colors.onSurface,
                fontWeight: '800',
                marginBottom: 12,
              }}
            >
              {t('assessments')}
            </Text>

            {chapter.practice_exercises && chapter.practice_exercises.map((exercise) => (
              <AssessmentCard
                key={exercise.id}
                title={t('practice')}
                description={getLocalizedText(exercise.description) || t('practiceExercise')}
                score={exercise.user_best_score}
                theme={theme}
                cardRadius={cardRadius}
                onPress={() =>
                  router.push(`/practice/${exercise.id}`)
                }
                t={t}
              />
            ))}

            {chapter.quizzes && chapter.quizzes.map((quiz) => (
              <AssessmentCard
                key={quiz.id}
                title={getLocalizedText(quiz.title) || t('quiz')}
                description={t('quiz')}
                score={quiz.user_best_score}
                theme={theme}
                cardRadius={cardRadius}
                onPress={() => router.push(`/quizzes/${quiz.id}`)}
                t={t}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function LessonCard({
  lesson,
  index,
  theme,
  isSimpleMode,
  highContrast,
  cardRadius,
  onPress,
  t,
  getLocalizedText,
}) {
  const isCompleted = isLessonCompleted(lesson);

  return (
    <Surface
      style={[
        styles.lessonCard,
        {
          backgroundColor: isCompleted ? theme.colors.surfaceVariant : theme.colors.surface,
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
          alignItems: 'center',
        }}
      >
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            <View
              style={[
                styles.lessonNumber,
                {
                  backgroundColor: isCompleted
                    ? theme.colors.secondary
                    : theme.colors.primaryContainer,
                },
              ]}
            >
              <Text
                style={{
                  color: isCompleted
                    ? theme.colors.onSecondary
                    : theme.colors.primary,
                  fontWeight: '700',
                  fontSize: 12,
                }}
              >
                {index}
              </Text>
            </View>
            <Text
              variant="titleSmall"
              style={{
                color: theme.colors.onSurface,
                fontWeight: '700',
                marginLeft: 12,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {getLocalizedText(lesson.title)}
            </Text>
            {isCompleted && (
              <Text
                variant="labelSmall"
                style={{ color: theme.colors.secondary, fontWeight: '700' }}
              >
                ✓
              </Text>
            )}
          </View>

          {lesson.time_estimate && (
            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.onSurfaceVariant,
                marginLeft: 32,
              }}
            >
              {lesson.time_estimate} {t('minutes')}
            </Text>
          )}
        </View>
      </View>

      <Button
        mode="outlined"
        size="small"
        onPress={onPress}
        style={{ marginTop: 12 }}
      >
        {isCompleted ? t('review') : t('start')}
      </Button>
    </Surface>
  );
}

function AssessmentCard({
  title,
  description,
  score,
  theme,
  cardRadius,
  onPress,
  t,
}) {
  const isPassed = score !== null && score >= 70;

  return (
    <Surface
      style={[
        styles.assessmentCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor:
            score === null
              ? theme.colors.outlineVariant
              : isPassed
              ? theme.colors.secondaryContainer
              : theme.colors.errorContainer,
          borderRadius: cardRadius,
        },
      ]}
      elevation={1}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <View>
          <Text
            variant="titleSmall"
            style={{
              color: theme.colors.onSurface,
              fontWeight: '700',
            }}
          >
            {title}
          </Text>
          <Text
            variant="bodySmall"
            style={{
              color: theme.colors.onSurfaceVariant,
            }}
          >
            {description}
          </Text>
        </View>

        {score !== null && (
          <Text
            variant="headlineSmall"
            style={{
              color: isPassed
                ? theme.colors.secondary
                : theme.colors.error,
              fontWeight: '700',
            }}
          >
            {Math.round(score)}%
          </Text>
        )}
      </View>

      <Button mode="contained" size="small" onPress={onPress}>
        {score === null ? t('start') : t('retake')}
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
  headerCard: {
    padding: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  lessonCard: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  lessonNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assessmentCard: {
    padding: 16,
    borderWidth: 2,
    borderRadius: 12,
    marginBottom: 12,
  },
});
