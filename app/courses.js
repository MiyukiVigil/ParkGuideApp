import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions, RefreshControl, Alert, Image } from 'react-native';
import { useTheme, Surface, Text, Button, ActivityIndicator, Searchbar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useRouter, useFocusEffect } from 'expo-router';
import AppHeader from '../components/AppHeader';
import ThemedBackground from '../components/ThemedBackground';
import { useThemeContext } from '../contexts/ThemeContext';
import courseService from '../services/courseService';

export default function CourseCatalog() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { isSimpleMode, highContrast } = useThemeContext();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  const containerWidth = width > 1200 ? 800 : '100%';
  const containerMargin = width > 1200 ? 'auto' : 0;

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await courseService.getCourses({ 
        is_published: true,
        search: searchQuery 
      });
      setCourses(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(err.message);
      console.error('Error loading courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCourses();
    setRefreshing(false);
  };

  useEffect(() => {
    loadCourses();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadCourses();
    }, [searchQuery])
  );

  const handleEnroll = async (courseId) => {
    try {
      await courseService.enrollCourse(courseId);
      // Refresh the courses list to update enrollment status
      await loadCourses();
    } catch (err) {
      console.error('Error enrolling:', err);
      // Error is now a user-friendly message from the backend
      Alert.alert(
        t('cannotEnroll'),
        err.message,
        [{ text: t('ok') }]
      );
    }
  };

  const handleCoursePress = (courseId) => {
    router.push(`/courses/${courseId}`);
  };

  const cardRadius = isSimpleMode || highContrast ? 16 : 24;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ThemedBackground />
      <AppHeader
        title={t('browseCourses')}
        subtitle={t('selectAndEnrollCourses') || 'Available courses'}
        showBack
        showHome
      />

      <ScrollView
        style={[styles.container, { width: containerWidth, marginLeft: containerMargin, marginRight: containerMargin }]}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <Searchbar
          placeholder={t('search') || 'Search courses...'}
          onChangeText={setSearchQuery}
          value={searchQuery}
          onSubmitEditing={loadCourses}
          style={{ backgroundColor: theme.colors.surface, marginBottom: 16 }}
        />

        {error && (
          <Surface style={[styles.errorContainer, { backgroundColor: theme.colors.errorContainer }]}>
            <Text style={{ color: theme.colors.error, marginBottom: 12 }}>{error}</Text>
            <Button mode="contained" onPress={loadCourses}>
              {t('tryAgain')}
            </Button>
          </Surface>
        )}

        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator animating={true} size="large" color={theme.colors.primary} />
            <Text style={{ marginTop: 16, color: theme.colors.onSurface }}>{t('loadingCourses')}</Text>
          </View>
        ) : courses.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 16 }}>{t('noCourses')}</Text>
          </View>
        ) : (
          <View style={styles.coursesGrid}>
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                theme={theme}
                isSimpleMode={isSimpleMode}
                highContrast={highContrast}
                cardRadius={cardRadius}
                onPress={() => handleCoursePress(course.id)}
                onEnroll={() => handleEnroll(course.id)}
                t={t}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function CourseCard({ course, theme, isSimpleMode, highContrast, cardRadius, onPress, onEnroll, t }) {
  const [enrolling, setEnrolling] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      await onEnroll();
    } finally {
      setEnrolling(false);
    }
  };

  // Debug enrollment status
  console.log(`[CourseCard] ${course.code}:`, {
    enrollmentStatus: course.enrollment_status,
    statusValue: course.enrollment_status?.status,
    prerequisites: course.prerequisites_info,
  });

  // Determine enrollment status - FIXED LOGIC
  const enrollmentStatus = course.enrollment_status?.status;
  const isCompleted = enrollmentStatus === 'completed';
  const isEnrolled = !isCompleted && (enrollmentStatus === 'in_progress' || enrollmentStatus === 'enrolled');
  const hasUnmetPrerequisites = !isEnrolled && !isCompleted && course.prerequisites_info?.some(p => !p.is_completed);
  const completionPercentage = course.enrollment_status?.progress_percentage || 0;

  console.log(`[CourseCard] ${course.code} state:`, {
    isCompleted,
    isEnrolled,
    hasUnmetPrerequisites,
    completionPercentage,
  });

  return (
    <Surface
      style={[
        styles.courseCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
          borderRadius: cardRadius,
        },
      ]}
      elevation={highContrast ? 0 : isSimpleMode ? 1 : 2}
    >
      {/* Thumbnail */}
      <View
        style={[
          styles.thumbnail,
          { backgroundColor: theme.colors.primaryContainer, borderRadius: cardRadius },
        ]}
      >
        {course.thumbnail && !thumbnailError ? (
          <Image
            source={{ uri: course.thumbnail }}
            style={[styles.thumbnailImage, { borderRadius: cardRadius }]}
            resizeMode="cover"
            onLoad={() => console.log(`✓ Loaded thumbnail for ${course.code}`)}
            onError={(e) => {
              console.error(`✗ Error loading thumbnail for ${course.code}:`, e.nativeEvent);
              setThumbnailError(true);
            }}
          />
        ) : (
          <Text style={{ color: theme.colors.primary, fontSize: 32, fontWeight: 'bold' }}>
            {course.code?.[0]?.toUpperCase() || 'C'}
          </Text>
        )}
      </View>

      {/* Course Info */}
      <View style={styles.courseInfo}>
        <Text
          variant={isSimpleMode || highContrast ? 'titleMedium' : 'titleSmall'}
          style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 4 }}
          numberOfLines={2}
        >
          {course.title?.en || course.title || 'Untitled Course'}
        </Text>

        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}
          numberOfLines={2}
        >
          {course.description?.en || 'No description'}
        </Text>

        {/* Status Badge */}
        {isCompleted && (
          <View style={[styles.statusBadge, { backgroundColor: theme.colors.secondaryContainer }]}>
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.onSecondaryContainer, fontWeight: '600' }}
            >
              ✓ {t('completed') || 'Completed'}
            </Text>
          </View>
        )}

        {isEnrolled && !isCompleted && (
          <>
            <View style={[styles.statusBadge, { backgroundColor: theme.colors.secondaryContainer }]}>
              <Text
                variant="labelSmall"
                style={{ color: theme.colors.onSecondaryContainer, fontWeight: '600' }}
              >
                {t('enrolled')}
              </Text>
            </View>
            {completionPercentage > 0 && (
              <View style={styles.progressContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { backgroundColor: theme.colors.secondary, width: `${completionPercentage}%` },
                  ]}
                />
              </View>
            )}
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              {Math.round(completionPercentage)}% {t('complete') || 'Complete'}
            </Text>
          </>
        )}

        {!isCompleted && !isEnrolled && hasUnmetPrerequisites && (
          <View style={[styles.statusBadge, { backgroundColor: theme.colors.errorContainer }]}>
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.error, fontWeight: '600' }}
            >
              ⚠️ {t('prerequisitesRequired') || 'Prerequisites Required'}
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {isCompleted ? (
          <Button
            mode="contained"
            onPress={onPress}
            style={{ flex: 1 }}
            disabled
            compact
          >
            ✓ {t('completed') || 'Completed'}
          </Button>
        ) : isEnrolled ? (
          <Button
            mode="contained"
            onPress={onPress}
            style={{ flex: 1 }}
            disabled={enrolling}
            compact
          >
            {t('continueCourse') || 'Continue'}
          </Button>
        ) : (
          <>
            <Button
              mode="outlined"
              onPress={onPress}
              style={{ flex: 1, marginRight: 8 }}
              compact
            >
              {t('viewCourse') || 'View'}
            </Button>
            <Button
              mode="contained"
              onPress={handleEnroll}
              disabled={hasUnmetPrerequisites || enrolling}
              compact
              loading={enrolling}
              style={{
                opacity: hasUnmetPrerequisites ? 0.5 : 1,
              }}
            >
              {t('enrollNow') || 'Enroll'}
            </Button>
          </>
        )}
      </View>
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
  errorContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  coursesGrid: {
    gap: 12,
  },
  courseCard: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  thumbnail: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: 120,
  },
  courseInfo: {
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  progressContainer: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
