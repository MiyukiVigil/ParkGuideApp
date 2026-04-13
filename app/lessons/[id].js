import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions, Alert } from 'react-native';
import { useTheme, Surface, Text, Button, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import ThemedBackground from '../../components/ThemedBackground';
import { useThemeContext } from '../../contexts/ThemeContext';
import courseService from '../../services/courseService';

export default function LessonView() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { isSimpleMode, highContrast } = useThemeContext();
  const { id } = useLocalSearchParams();

  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState(null);

  const containerWidth = width > 1200 ? 800 : '100%';
  const containerMargin = width > 1200 ? 'auto' : 0;

  const cardRadius = isSimpleMode || highContrast ? 16 : 24;

  useEffect(() => {
    loadLesson();
  }, [id]);

  const loadLesson = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await courseService.getLesson(id);
      setLesson(data);
    } catch (err) {
      setError(err.message);
      console.error('Error loading lesson:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async () => {
    try {
      setMarking(true);
      await courseService.markLessonComplete(id);
      Alert.alert(
        t('lessonCompleted'),
        t('goodJobKeepGoing') || 'Great! Continue to the next lesson.',
        [
          {
            text: t('continue'),
            onPress: () => {
              loadLesson();
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert(t('error'), err.message);
    } finally {
      setMarking(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <ThemedBackground />
        <AppHeader title={t('lesson')} showBack />
        <View style={styles.centerContainer}>
          <ActivityIndicator animating={true} size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 16, color: theme.colors.onSurface }}>
            {t('loadingLessons')}
          </Text>
        </View>
      </View>
    );
  }

  if (!lesson) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <ThemedBackground />
        <AppHeader title={t('lesson')} showBack />
        <View style={styles.centerContainer}>
          <Text>{t('errorLoadingCourse')}</Text>
          <Button onPress={loadLesson} style={{ marginTop: 16 }}>
            {t('tryAgain')}
          </Button>
        </View>
      </View>
    );
  }

  const isCompleted = lesson.is_completed;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ThemedBackground />
      <AppHeader
        title={lesson.title?.en || t('lesson')}
        showBack
      />

      <ScrollView
        style={[styles.container, { width: containerWidth, marginLeft: containerMargin, marginRight: containerMargin }]}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Lesson Content */}
        <Surface
          style={[
            styles.contentCard,
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
              marginBottom: 16,
            }}
          >
            {lesson.title?.en}
          </Text>

          {isCompleted && (
            <View
              style={[
                styles.completionBanner,
                { backgroundColor: theme.colors.secondaryContainer },
              ]}
            >
              <Text
                style={{
                  color: theme.colors.onSecondaryContainer,
                  fontWeight: '700',
                }}
              >
                ✓ {t('lessonCompleted')}
              </Text>
            </View>
          )}

          {/* Text Content */}
          {lesson.content_text?.en && (
            <View style={{ marginBottom: 20 }}>
              <Text
                variant="bodyLarge"
                style={{
                  color: theme.colors.onSurface,
                  lineHeight: 24,
                }}
              >
                {lesson.content_text.en}
              </Text>
            </View>
          )}

          {/* Images */}
          {lesson.images && lesson.images.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text
                variant="titleSmall"
                style={{
                  color: theme.colors.onSurface,
                  fontWeight: '700',
                  marginBottom: 12,
                }}
              >
                {t('images') || 'Images'}
              </Text>
              {lesson.images.map((image, index) => (
                <View
                  key={index}
                  style={[
                    styles.imageContainer,
                    {
                      backgroundColor: theme.colors.surfaceVariant,
                      borderColor: theme.colors.outlineVariant,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      textAlign: 'center',
                    }}
                  >
                    📷 {image}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Videos */}
          {lesson.videos && lesson.videos.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text
                variant="titleSmall"
                style={{
                  color: theme.colors.onSurface,
                  fontWeight: '700',
                  marginBottom: 12,
                }}
              >
                {t('videos') || 'Videos'}
              </Text>
              {lesson.videos.map((video, index) => (
                <View
                  key={index}
                  style={[
                    styles.videoContainer,
                    {
                      backgroundColor: theme.colors.surfaceVariant,
                      borderColor: theme.colors.outlineVariant,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      textAlign: 'center',
                    }}
                  >
                    🎥 {video}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Key Takeaways */}
          {lesson.key_takeaways?.en && (
            <View
              style={[
                styles.takeawaysBox,
                {
                  backgroundColor: theme.colors.tertiaryContainer,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
            >
              <Text
                variant="titleSmall"
                style={{
                  color: theme.colors.onTertiaryContainer,
                  fontWeight: '700',
                  marginBottom: 8,
                }}
              >
                {t('keyTakeaways') || 'Key Takeaways'}
              </Text>
              <Text
                variant="bodySmall"
                style={{
                  color: theme.colors.onTertiaryContainer,
                  lineHeight: 20,
                }}
              >
                {lesson.key_takeaways.en}
              </Text>
            </View>
          )}

          {/* Mark Complete Button */}
          {!isCompleted && (
            <Button
              mode="contained"
              onPress={handleMarkComplete}
              loading={marking}
              style={{ marginTop: 20 }}
            >
              {t('markComplete')}
            </Button>
          )}

          {/* Next Steps */}
          {isCompleted && (
            <Button
              mode="contained"
              onPress={() => router.back()}
              style={{ marginTop: 20 }}
            >
              {t('goToChapter')}
            </Button>
          )}
        </Surface>

        {/* Lesson Info */}
        {lesson.time_estimate && (
          <Surface
            style={[
              styles.infoCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
                borderRadius: cardRadius,
              },
            ]}
            elevation={0}
          >
            <Text
              variant="labelMedium"
              style={{
                color: theme.colors.onSurfaceVariant,
              }}
            >
              ⏱️ {t('estimatedTime') || 'Estimated time'}: {lesson.time_estimate} {t('minutes')}
            </Text>
          </Surface>
        )}
      </ScrollView>
    </View>
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
  contentCard: {
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  completionBanner: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  imageContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  videoContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  takeawaysBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 20,
  },
  infoCard: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
});
