import React, { useState, useEffect } from 'react';
import { Image, Linking, TouchableOpacity, View, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useTheme, Surface, Text, Button, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import ThemedBackground from '../../components/ThemedBackground';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useScreenSpeech } from '../../contexts/ScreenSpeechContext';
import courseService from '../../services/courseService';
import { useAppAlert } from '../../components/AppAlertProvider';

const getMediaUrl = (item) => {
  if (!item) return "";
  if (typeof item === "string") return item;
  return item.url || item.uri || item.src || "";
};

const getMediaTitle = (item, fallback) => {
  if (!item || typeof item === "string") return fallback;
  if (typeof item.title === "string") return item.title;
  return item.title?.en || item.name || fallback;
};

export default function LessonView() {
  const theme = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { showAlert } = useAppAlert();
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
  const getLocalizedText = (textData) => {
    if (!textData) return "";
    if (typeof textData === "string") return textData;
    return textData[i18n.language] || textData.en || textData.ms || textData.zh || "";
  };

  const isCompleted = lesson?.is_completed || (lesson?.progress?.completed) || false;
  const arScenario = lesson?.ar_scenario_info;

  const speechText = loading
    ? [t('lesson'), t('loadingLessons')].join('. ')
    : !lesson
      ? [t('lesson'), t('errorLoadingCourse')].join('. ')
      : [
          getLocalizedText(lesson.title) || t('lesson'),
          getLocalizedText(lesson.content_text),
          isCompleted ? t('lessonCompleted') : '',
          (lesson.content_images || []).length > 0 ? t('images') : '',
          (lesson.content_videos || lesson.videos || []).length > 0 ? t('videos') : '',
        ]
          .filter(Boolean)
          .join('. ');

  useScreenSpeech(speechText, { priority: 100 });

  useEffect(() => {
    loadLesson();
  }, [id]);

  // Reload lesson when screen comes into focus (e.g., after marking complete)
  useFocusEffect(
    React.useCallback(() => {
      loadLesson();
    }, [id])
  );

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
      // Reload immediately after API success
      await loadLesson();
      showAlert(t('lessonCompleted'), t('goodJobKeepGoing'));
    } catch (err) {
      showAlert(t('error'), err.message);
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

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ThemedBackground />
      <AppHeader
        title={getLocalizedText(lesson.title) || t('lesson')}
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
            {getLocalizedText(lesson.title)}
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
          {getLocalizedText(lesson.content_text) ? (
            <View style={{ marginBottom: 20 }}>
              <Text
                variant="bodyLarge"
                style={{
                  color: theme.colors.onSurface,
                  lineHeight: 24,
                }}
              >
                {getLocalizedText(lesson.content_text)}
              </Text>
            </View>
          ) : null}

          {/* Images */}
          {lesson?.content_images && lesson.content_images.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text
                variant="titleSmall"
                style={{
                  color: theme.colors.onSurface,
                  fontWeight: '700',
                  marginBottom: 12,
                }}
              >
                {t('images')}
              </Text>
              {lesson.content_images.map((image, index) => {
                const imageUrl = getMediaUrl(image);
                return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.86}
                  onPress={() => imageUrl ? Linking.openURL(imageUrl) : null}
                  style={[
                    styles.imageContainer,
                    {
                      backgroundColor: theme.colors.surfaceVariant,
                      borderColor: theme.colors.outlineVariant,
                      borderRadius: 12,
                    },
                  ]}
                >
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.lessonImage} resizeMode="cover" />
                  ) : (
                    <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                      {t('imageUnavailable')}
                    </Text>
                  )}
                </TouchableOpacity>
              )})}
            </View>
          )}

          {/* Videos */}
          {(lesson.content_videos || lesson.videos) && (lesson.content_videos?.length > 0 || lesson.videos?.length > 0) && (
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
              {(lesson.content_videos || lesson.videos || []).map((video, index) => {
                const videoUrl = getMediaUrl(video);
                const videoTitle = getMediaTitle(video, `${t('video')} ${index + 1}`);
                return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.86}
                  onPress={() => videoUrl ? Linking.openURL(videoUrl) : null}
                  style={[
                    styles.videoContainer,
                    {
                      backgroundColor: theme.colors.surfaceVariant,
                      borderColor: theme.colors.outlineVariant,
                      borderRadius: 12,
                      padding: 12,
                    },
                  ]}
                >
                  <Text variant="titleSmall" style={{ color: theme.colors.onSurface, textAlign: 'center', fontWeight: '700' }}>
                    {videoTitle}
                  </Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 6 }}>
                    {videoUrl ? t('tapToOpenVideo') : t('videoUnavailable')}
                  </Text>
                </TouchableOpacity>
              )})}
            </View>
          )}

          {arScenario ? (
            <View
              style={[
                styles.arBox,
                {
                  backgroundColor: theme.colors.primaryContainer,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
            >
              <Text
                variant="titleSmall"
                style={{
                  color: theme.colors.onPrimaryContainer,
                  fontWeight: '800',
                  marginBottom: 6,
                }}
              >
                {t('integratedARLesson')}
              </Text>
              <Text
                style={{
                  color: theme.colors.onPrimaryContainer,
                  lineHeight: 20,
                  marginBottom: 12,
                }}
              >
                {getLocalizedText(arScenario.title) || arScenario.code}
              </Text>
              <Button
                mode="contained"
                icon="cube-scan"
                onPress={() => {
                  const params = new URLSearchParams({
                    scenarioId: String(arScenario.id),
                    scenario: arScenario.scenario_type || 'biodiversity',
                  });
                  const image = arScenario.initial_panorama_url || arScenario.thumbnail;
                  if (image) params.set('image', image);
                  router.push(`/ar-training/forest-biodiversity?${params.toString()}`);
                }}
              >
                {t('launchARLesson')}
              </Button>
            </View>
          ) : null}

          {/* Key Takeaways */}
          {getLocalizedText(lesson.key_takeaways) ? (
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
                {t('keyTakeaways')}
              </Text>
              <Text
                variant="bodySmall"
                style={{
                  color: theme.colors.onTertiaryContainer,
                  lineHeight: 20,
                }}
              >
                {getLocalizedText(lesson.key_takeaways)}
              </Text>
            </View>
          ) : null}

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
              ⏱️ {t('estimatedTime')}: {lesson.time_estimate} {t('minutes')}
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
    overflow: 'hidden',
  },
  lessonImage: {
    width: '100%',
    height: '100%',
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
  arBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  infoCard: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
});
