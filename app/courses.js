import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions, RefreshControl, Image, Pressable } from 'react-native';
import { useTheme, Surface, Text, Button, ActivityIndicator, Searchbar, Chip, SegmentedButtons } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useRouter, useFocusEffect } from 'expo-router';
import AppHeader from '../components/AppHeader';
import ThemedBackground from '../components/ThemedBackground';
import { useThemeContext } from '../contexts/ThemeContext';
import { useScreenSpeech } from '../contexts/ScreenSpeechContext';
import courseService from '../services/courseService';
import { useAppAlert } from '../components/AppAlertProvider';

const isCourseCompleted = (course) => {
  const status = course?.enrollment_status?.status;
  return status === 'completed' || Number(course?.enrollment_status?.progress_percentage || 0) >= 100;
};

const isParkSpecificCourse = (course) => (
  course?.course_type === 'park_specific' ||
  (course?.prerequisites_info || []).length > 0
);

const isArCourse = (course) => {
  const source = [
    course?.course_type,
    course?.code,
    ...(Array.isArray(course?.tags) ? course.tags : []),
    course?.title?.en,
    course?.title?.ms,
    course?.title?.zh,
    course?.description?.en,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const normalized = source.replace(/[-_/]+/g, ' ');
  return /\bar\b/.test(normalized) || normalized.includes('immersive') || normalized.includes('360');
};

const getParkCategory = (course) => {
  const source = [
    ...(Array.isArray(course?.tags) ? course.tags : []),
    course?.code,
    course?.title?.en,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (source.includes('bako')) return 'bako';
  if (source.includes('semenggoh')) return 'semenggoh';
  return 'other';
};

export default function CourseCatalog() {
  const theme = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { showAlert } = useAppAlert();
  const { width } = useWindowDimensions();
  const { isSimpleMode, highContrast } = useThemeContext();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const [selectedPark, setSelectedPark] = useState(null);

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
      const rows = Array.isArray(data) ? data : data.results || [];
      setCourses(rows);
      if (data?._fromCache) {
        setError(t('showingOfflineCourses'));
      }
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
      showAlert(t('cannotEnroll'), err.message, [{ text: t('ok') }]);
    }
  };

  const handleCoursePress = (courseId) => {
    router.push(`/courses/${courseId}`);
  };

  const handleTabChange = (value) => {
    setActiveTab(value);
    setSelectedPark(null);
  };

  const cardRadius = isSimpleMode || highContrast ? 16 : 24;
  const getLocalizedText = (value, fallback = "") => {
    if (!value) return fallback;
    if (typeof value === "string") return value;
    return value[i18n.language] || value.en || value.ms || value.zh || fallback;
  };

  const speechText = [
    t('browseCourses'),
    error || '',
    loading && !refreshing ? t('loadingCourses') : '',
    !loading && courses.length === 0 ? t('noCourses') : '',
    ...courses.flatMap((course, index) => [
      `${index + 1}. ${getLocalizedText(course.title, t('courseDetails'))}`,
      getLocalizedText(course.description, ''),
    ]),
  ]
    .filter(Boolean)
    .join('. ');

  useScreenSpeech(speechText, { priority: 100 });

  const arCourses = courses.filter(isArCourse);
  const generalCourses = courses.filter((course) => !isParkSpecificCourse(course) && !isArCourse(course));
  const parkSpecificCourses = courses.filter((course) => isParkSpecificCourse(course) && !isArCourse(course));
  const generalCoursesComplete = generalCourses.length === 0 || generalCourses.every(isCourseCompleted);
  const displayedCourses = activeTab === 'general' ? generalCourses : activeTab === 'ar' ? arCourses : parkSpecificCourses;
  const activeTabLocked = activeTab === 'park' && !generalCoursesComplete;
  const parkCourseGroups = [
    {
      key: 'bako',
      title: t('bakoCourses'),
      subtitle: t('bakoCoursesSubtitle'),
      courses: parkSpecificCourses.filter((course) => getParkCategory(course) === 'bako'),
    },
    {
      key: 'semenggoh',
      title: t('semenggohCourses'),
      subtitle: t('semenggohCoursesSubtitle'),
      courses: parkSpecificCourses.filter((course) => getParkCategory(course) === 'semenggoh'),
    },
    {
      key: 'other',
      title: t('otherParkCourses'),
      subtitle: t('otherParkCoursesSubtitle'),
      courses: parkSpecificCourses.filter((course) => getParkCategory(course) === 'other'),
    },
  ].filter((group) => group.courses.length > 0);
  const selectedParkGroup = parkCourseGroups.find((group) => group.key === selectedPark);

  const showParkLockedAlert = () => {
    showAlert(t('parkSpecificCoursesLocked'), t('completeGeneralCoursesFirst'), [{ text: t('ok') }]);
  };

  const handleParkGroupPress = (parkKey) => {
    if (activeTabLocked) {
      showParkLockedAlert();
      return;
    }
    setSelectedPark(parkKey);
  };

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

        <SegmentedButtons
          value={activeTab}
          onValueChange={handleTabChange}
          style={styles.segmentedTabs}
          buttons={[
            {
              value: 'general',
              label: `${t('generalCoursesShort')} (${generalCourses.length})`,
              icon: 'book-open-page-variant',
            },
            {
              value: 'ar',
              label: `${t('arClasses')} (${arCourses.length})`,
              icon: 'cube-scan',
            },
            {
              value: 'park',
              label: `${t('parkSpecificCoursesShort')} (${parkSpecificCourses.length})`,
              icon: generalCoursesComplete ? 'map-marker-radius' : 'lock-outline',
            },
          ]}
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
        ) : displayedCourses.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 16 }}>
              {activeTab === 'ar' ? t('noArClasses') : t('noCourses')}
            </Text>
          </View>
        ) : activeTab === 'ar' ? (
          <CourseSection
            title={t('arClasses')}
            subtitle={t('arClassesSubtitle')}
            courses={displayedCourses}
            theme={theme}
            isSimpleMode={isSimpleMode}
            highContrast={highContrast}
            cardRadius={cardRadius}
            onPress={handleCoursePress}
            onEnroll={handleEnroll}
            onLockedPress={showParkLockedAlert}
            t={t}
            getLocalizedText={getLocalizedText}
          />
        ) : activeTab === 'park' && !selectedParkGroup ? (
          <View>
            <View style={styles.parkIntro}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                {t('chooseParkCourses')}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {generalCoursesComplete ? t('chooseParkCoursesSubtitle') : t('completeGeneralCoursesFirst')}
              </Text>
              {activeTabLocked ? <Chip icon="lock-outline" style={styles.lockChip}>{t('locked')}</Chip> : null}
            </View>
            <View style={styles.parkBoxGrid}>
              {parkCourseGroups.map((group) => (
                <ParkCourseBox
                  key={group.key}
                  group={group}
                  theme={theme}
                  cardRadius={cardRadius}
                  highContrast={highContrast}
                  isSimpleMode={isSimpleMode}
                  locked={activeTabLocked}
                  onPress={() => handleParkGroupPress(group.key)}
                  t={t}
                />
              ))}
            </View>
          </View>
        ) : activeTab === 'park' ? (
          <View>
            <View style={styles.parkIntro}>
              <Button
                mode="text"
                icon="arrow-left"
                compact
                onPress={() => setSelectedPark(null)}
                style={styles.backToParksButton}
              >
                {t('backToParks')}
              </Button>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                {selectedParkGroup.title}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {selectedParkGroup.subtitle}
              </Text>
              {activeTabLocked ? <Chip icon="lock-outline" style={styles.lockChip}>{t('locked')}</Chip> : null}
            </View>
            <CourseSection
              title={selectedParkGroup.title}
              subtitle={selectedParkGroup.subtitle}
              courses={selectedParkGroup.courses}
              theme={theme}
              isSimpleMode={isSimpleMode}
              highContrast={highContrast}
              cardRadius={cardRadius}
              onPress={handleCoursePress}
              onEnroll={handleEnroll}
              onLockedPress={showParkLockedAlert}
              t={t}
              getLocalizedText={getLocalizedText}
              locked={activeTabLocked}
              hideHeader
            />
          </View>
        ) : (
          <CourseSection
            title={t('generalCourses')}
            subtitle={t('generalCoursesSubtitle')}
            courses={displayedCourses}
            theme={theme}
            isSimpleMode={isSimpleMode}
            highContrast={highContrast}
            cardRadius={cardRadius}
            onPress={handleCoursePress}
            onEnroll={handleEnroll}
            onLockedPress={showParkLockedAlert}
            t={t}
            getLocalizedText={getLocalizedText}
            locked={activeTabLocked}
          />
        )}
      </ScrollView>
    </View>
  );
}

function ParkCourseBox({ group, theme, cardRadius, highContrast, isSimpleMode, locked, onPress, t }) {
  const [imageError, setImageError] = useState(false);
  const thumbnail = group.courses.find((course) => course.thumbnail)?.thumbnail;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [{ opacity: locked ? 0.68 : pressed ? 0.84 : 1 }]}>
      <Surface
        style={[
          styles.parkCourseBox,
          {
            backgroundColor: theme.colors.surface,
            borderColor: locked ? theme.colors.error : theme.colors.outlineVariant,
            borderRadius: cardRadius,
          },
        ]}
        elevation={highContrast ? 0 : isSimpleMode ? 1 : 3}
      >
        <View style={[styles.parkBoxImage, { backgroundColor: theme.colors.primaryContainer, borderRadius: Math.max(cardRadius - 6, 12) }]}>
          {thumbnail && !imageError ? (
            <Image
              source={{ uri: thumbnail }}
              style={styles.parkBoxImageAsset}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <Text style={{ color: theme.colors.primary, fontSize: 36, fontWeight: '800' }}>
              {group.title?.[0] || 'P'}
            </Text>
          )}
          {locked ? (
            <View style={[styles.parkBoxLock, { backgroundColor: theme.colors.errorContainer }]}>
              <Text style={{ color: theme.colors.error, fontWeight: '700' }}>{t('locked')}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.parkBoxBody}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '800' }} numberOfLines={1}>
            {group.title}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
            {group.subtitle}
          </Text>
          <View style={styles.parkBoxFooter}>
            <Chip compact icon="book-open-page-variant">
              {t('courseCount', { count: group.courses.length })}
            </Chip>
            <Button mode="contained-tonal" compact icon={locked ? 'lock-outline' : 'chevron-right'} onPress={onPress}>
              {t('viewParkCourses')}
            </Button>
          </View>
        </View>
      </Surface>
    </Pressable>
  );
}

function CourseSection({ title, subtitle, courses, locked = false, theme, isSimpleMode, highContrast, cardRadius, onPress, onEnroll, onLockedPress, t, getLocalizedText, hideHeader = false }) {
  if (!courses.length) return null;

  return (
    <View style={styles.section}>
      {!hideHeader && (
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              {title}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {subtitle}
            </Text>
          </View>
          {locked ? <Chip icon="lock-outline">{t('locked')}</Chip> : null}
        </View>
      )}
      <View style={styles.coursesGrid}>
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            theme={theme}
            isSimpleMode={isSimpleMode}
            highContrast={highContrast}
            cardRadius={cardRadius}
            onPress={() => onPress(course.id)}
            onEnroll={() => onEnroll(course.id)}
            onLockedPress={onLockedPress}
            t={t}
            getLocalizedText={getLocalizedText}
            sectionLocked={locked}
          />
        ))}
      </View>
    </View>
  );
}

function CourseCard({ course, theme, isSimpleMode, highContrast, cardRadius, onPress, onEnroll, onLockedPress, t, getLocalizedText, sectionLocked = false }) {
  const [enrolling, setEnrolling] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);

  const handleEnroll = async () => {
    if (sectionLocked) {
      onLockedPress?.();
      return;
    }
    setEnrolling(true);
    try {
      await onEnroll();
    } finally {
      setEnrolling(false);
    }
  };

  // Determine enrollment status - FIXED LOGIC
  const enrollmentStatus = course.enrollment_status?.status;
  const isCompleted = enrollmentStatus === 'completed';
  const isEnrolled = !isCompleted && (enrollmentStatus === 'in_progress' || enrollmentStatus === 'enrolled');
  const hasUnmetPrerequisites = sectionLocked || (!isEnrolled && !isCompleted && course.prerequisites_info?.some(p => !p.is_completed));
  const completionPercentage = course.enrollment_status?.progress_percentage || 0;
  const handleOpenCourse = () => {
    if (sectionLocked) {
      onLockedPress?.();
      return;
    }
    onPress();
  };

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
          {getLocalizedText(course.title, t('courseDetails'))}
        </Text>

        {Array.isArray(course.tags) && course.tags.length > 0 && (
          <View style={styles.tagRow}>
            {course.tags.slice(0, 3).map((tag) => (
              <Chip key={tag} compact style={styles.tagChip}>{tag}</Chip>
            ))}
          </View>
        )}

        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}
          numberOfLines={2}
        >
          {getLocalizedText(course.description, '')}
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
              {Math.round(completionPercentage)}% {t('completed')}
            </Text>
          </>
        )}

        {!isCompleted && !isEnrolled && hasUnmetPrerequisites && (
          <View style={[styles.statusBadge, { backgroundColor: theme.colors.errorContainer }]}>
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.error, fontWeight: '600' }}
            >
              ⚠️ {t('prerequisites')}
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {isCompleted ? (
          <Button
            mode="contained"
            onPress={handleOpenCourse}
            style={{ flex: 1 }}
            disabled
            compact
          >
            ✓ {t('completed')}
          </Button>
        ) : isEnrolled ? (
          <Button
            mode="contained"
            onPress={handleOpenCourse}
            style={{ flex: 1 }}
            disabled={enrolling}
            compact
          >
            {t('continueCourse')}
          </Button>
        ) : (
          <>
            <Button
              mode="outlined"
              onPress={handleOpenCourse}
              style={{ flex: 1, marginRight: 8 }}
              compact
            >
              {t('viewCourse')}
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
              {t('enrollNow')}
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
  segmentedTabs: {
    marginBottom: 16,
  },
  coursesGrid: {
    gap: 12,
  },
  section: {
    marginBottom: 22,
  },
  parkIntro: {
    gap: 6,
    marginBottom: 14,
  },
  lockChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  backToParksButton: {
    alignSelf: 'flex-start',
    marginLeft: -8,
  },
  parkBoxGrid: {
    gap: 14,
  },
  parkCourseBox: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  parkBoxImage: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 12,
    overflow: 'hidden',
  },
  parkBoxImageAsset: {
    height: '100%',
    width: '100%',
  },
  parkBoxLock: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    position: 'absolute',
    right: 10,
    top: 10,
  },
  parkBoxBody: {
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  parkBoxFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '800',
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
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tagChip: {
    height: 28,
  },
});
