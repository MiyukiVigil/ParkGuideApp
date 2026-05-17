/**
 * Course Service
 * Handles API calls to the course backend
 */

import CONFIG from '../constants/config';
import api from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AR_CHAPTER_ID,
  AR_COURSE_ID,
  buildArTrainingCourse,
  isLocalArChapterId,
  isLocalArCourseId,
  isLocalArLessonId,
} from '../constants/arCourse';

const API_URL = CONFIG.API_BASE_URL;
const CACHE_PREFIX = 'courseServiceCache:';
const LOCAL_AR_COMPLETED_KEY = 'courseServiceLocalArCompletedLessons';
const ENROLLMENTS_CACHE_KEY = 'enrollments:me';

const readCache = async (key) => {
  const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
  return cached ? JSON.parse(cached) : null;
};

const writeCache = async (key, data) => {
  await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(data));
};

const readLocalArCompletedLessonIds = async () => {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_AR_COMPLETED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalArCompletedLessonIds = async (ids) => {
  await AsyncStorage.setItem(LOCAL_AR_COMPLETED_KEY, JSON.stringify([...new Set(ids)]));
};

const getLocalArCourse = async () => buildArTrainingCourse(await readLocalArCompletedLessonIds());

const getLocalizedSearchText = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return [value.en, value.ms, value.zh].filter(Boolean).join(' ');
};

const isArBackedCourse = (course) => {
  const text = [
    course?.code,
    ...(Array.isArray(course?.tags) ? course.tags : []),
    getLocalizedSearchText(course?.title),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return text.includes('ar') || text.includes('immersive');
};

const appendLocalArCourse = async (data, search = '') => {
  const localCourse = await getLocalArCourse();
  const normalizedSearch = String(search || '').trim().toLowerCase();
  const localSearchText = [
    localCourse.code,
    getLocalizedSearchText(localCourse.title),
    getLocalizedSearchText(localCourse.description),
    ...(localCourse.tags || []),
  ].join(' ').toLowerCase();
  const shouldIncludeLocalCourse = !normalizedSearch || localSearchText.includes(normalizedSearch);

  if (Array.isArray(data)) {
    const withoutDuplicate = data.filter((course) => course?.id !== AR_COURSE_ID && course?.code !== localCourse.code);
    if (withoutDuplicate.some(isArBackedCourse)) return withoutDuplicate;
    return shouldIncludeLocalCourse ? [localCourse, ...withoutDuplicate] : withoutDuplicate;
  }

  const results = Array.isArray(data?.results) ? data.results : [];
  const withoutDuplicate = results.filter((course) => course?.id !== AR_COURSE_ID && course?.code !== localCourse.code);
  if (withoutDuplicate.some(isArBackedCourse)) {
    return {
      ...data,
      results: withoutDuplicate,
    };
  }

  const nextResults = shouldIncludeLocalCourse ? [localCourse, ...withoutDuplicate] : withoutDuplicate;
  return {
    ...data,
    count: typeof data?.count === 'number' && shouldIncludeLocalCourse && results.length === withoutDuplicate.length ? data.count + 1 : data?.count,
    results: nextResults,
  };
};

const getEnrollmentProgressPercentage = (enrollment = {}) => {
  const direct = Number(
    enrollment.progress_percentage ??
    enrollment.completion_percentage ??
    enrollment.progress_percent ??
    enrollment.progress
  );
  if (Number.isFinite(direct)) return Math.max(0, Math.min(100, direct));

  const nested = Number(
    enrollment.progress_data?.progress_percentage ??
    enrollment.course_progress?.progress_percentage ??
    enrollment.progress_summary?.progress_percentage
  );
  if (Number.isFinite(nested)) return Math.max(0, Math.min(100, nested));

  const completedLessons = Number(
    enrollment.completed_lessons ??
    enrollment.lessons_completed ??
    enrollment.progress_data?.completed_lessons ??
    enrollment.course_progress?.completed_lessons
  );
  const totalLessons = Number(
    enrollment.total_lessons ??
    enrollment.lessons_count ??
    enrollment.progress_data?.total_lessons ??
    enrollment.course_progress?.total_lessons
  );

  if (Number.isFinite(completedLessons) && Number.isFinite(totalLessons) && totalLessons > 0) {
    return Math.round((completedLessons / totalLessons) * 100);
  }

  return 0;
};

const normalizeEnrollment = (enrollment = {}) => {
  const progressPercentage = getEnrollmentProgressPercentage(enrollment);
  const status = String(enrollment.status || enrollment.enrollment_status || '').toLowerCase();

  return {
    ...enrollment,
    status: status || (progressPercentage >= 100 ? 'completed' : progressPercentage > 0 ? 'in_progress' : 'enrolled'),
    progress_percentage: progressPercentage,
    course_title:
      enrollment.course_title ??
      enrollment.title ??
      enrollment.course?.title ??
      enrollment.course_details?.title,
    course_code:
      enrollment.course_code ??
      enrollment.code ??
      enrollment.course?.code ??
      enrollment.course_details?.code,
  };
};

const getAxiosData = (error) => {
  const data = error?.response?.data;
  if (!data) return '';
  return typeof data === 'string' ? data : JSON.stringify(data);
};

const getErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (data?.course && Array.isArray(data.course)) return data.course[0];
  if (data?.detail) return data.detail;
  if (data?.error) return data.error;
  if (typeof data === 'string' && data.trim()) return data;
  return fallback || error?.message || 'Network request failed';
};

// Helper function to make authenticated requests
const authenticatedFetch = async (endpoint, options = {}) => {
  const fullUrl = `${API_URL}${endpoint}`;

  try {
    console.log(`[courseService] Fetching: ${fullUrl}`);
    const response = await api.request({
      url: endpoint,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      data: options.body,
    });
    return response.data;
  } catch (error) {
    const status = error?.response?.status || error.status;
    if (status !== 401) {
      const detail = getAxiosData(error);
      if (status) {
        console.warn(`[courseService] API Error: ${status}`, detail || error.message);
      } else {
        console.warn(`[courseService] Network error for ${fullUrl}:`, error.message);
      }
    }

    const nextError = new Error(getErrorMessage(error, status ? `API Error: ${status}` : 'Network request failed'));
    nextError.status = status;
    nextError.originalMessage = getAxiosData(error);
    nextError.isNetworkError = !status;
    throw nextError;
  }
};

const withOfflineCache = async (cacheKey, request) => {
  try {
    const data = await request();
    await writeCache(cacheKey, data);
    return data;
  } catch (error) {
    if (error.isNetworkError || !error.status) {
      const cached = await readCache(cacheKey);
      if (cached) {
        if (Array.isArray(cached)) {
          cached._fromCache = true;
          return cached;
        }
        return { ...cached, _fromCache: true };
      }
    }
    throw error;
  }
};

export const courseService = {
  /**
   * Get all published courses with enrollment status
   */
  getCourses: async (filters = {}) => {
    let url = '/courses/';
    const params = new URLSearchParams();

    if (filters.search) params.append('search', filters.search);
    if (filters.is_published !== undefined) params.append('is_published', filters.is_published);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    try {
      const data = await withOfflineCache(`courses:${params.toString()}`, () => authenticatedFetch(url));
      return appendLocalArCourse(data, filters.search);
    } catch (error) {
      const localOnly = await appendLocalArCourse([], filters.search);
      localOnly._fromCache = true;
      return localOnly;
    }
  },

  /**
   * Get course details with chapters and enrollment status
   */
  getCourseDetails: async (courseId) => {
    if (isLocalArCourseId(courseId)) {
      return getLocalArCourse();
    }

    const data = await withOfflineCache(`course:${courseId}`, () => authenticatedFetch(`/courses/${courseId}/`));
    console.log(`[courseService] getCourseDetails response for course ${courseId}:`, {
      hasChapters: !!data.chapters,
      chaptersCount: data.chapters?.length || 0,
      firstChapterTitle: data.chapters?.[0]?.title,
      fullData: data
    });
    return data;
  },

  /**
   * Enroll in a course
   */
  enrollCourse: async (courseId) => {
    if (isLocalArCourseId(courseId)) {
      return (await getLocalArCourse()).enrollment_status;
    }

    return authenticatedFetch(`/courses/${courseId}/enroll/`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  /**
   * Get user's course enrollments
   */
  getUserEnrollments: async () => {
    const localCourse = await getLocalArCourse();
    const localEnrollment = {
      ...localCourse.enrollment_status,
      course_code: localCourse.code,
      course_type: localCourse.course_type,
      course_title: localCourse.title,
    };

    try {
      const response = await withOfflineCache(ENROLLMENTS_CACHE_KEY, () => authenticatedFetch(`/enrollments/?_=${Date.now()}`));
      const rows = Array.isArray(response) ? response : (response?.results || []);
      return [localEnrollment, ...rows.map(normalizeEnrollment).filter((item) => item?.course !== AR_COURSE_ID && item?.course_code !== localCourse.code)];
    } catch (error) {
      const cached = await readCache(ENROLLMENTS_CACHE_KEY);
      const rows = Array.isArray(cached) ? cached : (cached?.results || []);
      return [localEnrollment, ...rows.map(normalizeEnrollment).filter((item) => item?.course !== AR_COURSE_ID && item?.course_code !== localCourse.code)];
    }
  },

  /**
   * Get enrollment details with full course and chapter information
   */
  getEnrollmentWithChapters: async (enrollmentId) => {
    const enrollment = await authenticatedFetch(`/enrollments/${enrollmentId}/`);
    // Fetch full course details including chapters
    const courseDetails = await authenticatedFetch(`/courses/${enrollment.course}/`);
    return {
      ...enrollment,
      chapters: courseDetails.chapters || []
    };
  },

  /**
   * Get chapter details
   */
  getChapter: async (chapterId) => {
    if (isLocalArChapterId(chapterId)) {
      const course = await getLocalArCourse();
      return course.chapters.find((chapter) => chapter.id === AR_CHAPTER_ID);
    }

    return authenticatedFetch(`/chapters/${chapterId}/`);
  },

  /**
   * Get lesson content
   */
  getLesson: async (lessonId) => {
    if (isLocalArLessonId(lessonId)) {
      const course = await getLocalArCourse();
      const lessons = course.chapters.flatMap((chapter) => chapter.lessons || []);
      const lesson = lessons.find((item) => String(item.id) === String(lessonId));
      if (lesson) return lesson;
    }

    return withOfflineCache(`lesson:${lessonId}`, () => authenticatedFetch(`/lessons/${lessonId}/`));
  },

  /**
   * Mark lesson as complete
   */
  markLessonComplete: async (lessonId) => {
    if (isLocalArLessonId(lessonId)) {
      const completedIds = await readLocalArCompletedLessonIds();
      await writeLocalArCompletedLessonIds([...completedIds, String(lessonId)]);
      return {
        id: `${lessonId}-progress`,
        completed: true,
        completed_at: new Date().toISOString(),
      };
    }

    return authenticatedFetch(`/lessons/${lessonId}/mark_complete/`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  /**
   * Get practice exercise
   */
  getPracticeExercise: async (practiceId) => {
    return authenticatedFetch(`/practice/${practiceId}/`);
  },

  /**
   * Submit practice exercise answers
   * answers: array of selected option indices
   */
  submitPracticeExercise: async (practiceId, answers) => {
    return authenticatedFetch(`/practice/${practiceId}/submit/`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  },

  /**
   * Get quiz
   */
  getQuiz: async (quizId) => {
    return authenticatedFetch(`/quizzes/${quizId}/`);
  },

  /**
   * Submit quiz answers
   * answers: array of selected option indices
   */
  submitQuiz: async (quizId, answers) => {
    return authenticatedFetch(`/quizzes/${quizId}/submit/`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  },
};

export default courseService;
