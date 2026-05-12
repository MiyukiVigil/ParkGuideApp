/**
 * Course Service
 * Handles API calls to the course backend
 */

import CONFIG from '../constants/config';
import { getAccessToken } from '../utils/tokenStorage';
import { ensureFreshSession } from '../utils/api';
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

// Helper function to make authenticated requests
const authenticatedFetch = async (endpoint, options = {}) => {
  const fullUrl = `${API_URL}${endpoint}`;
  const buildHeaders = async () => {
    const token = await getAccessToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  };

  const performRequest = async () => {
    const headers = await buildHeaders();

    console.log(`[courseService] Fetching: ${fullUrl}`);
    return fetch(fullUrl, {
      ...options,
      headers,
    });
  };

  try {
    let response = await performRequest();

    if (response.status === 401) {
      const refreshed = await ensureFreshSession();
      if (refreshed) {
        response = await performRequest();
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status !== 401) {
        console.error(`[courseService] API Error: ${response.status} ${response.statusText}`, errorText);
      }
      
      // Try to parse error details from response
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        
        // Handle prerequisite errors
        if (errorData.course && Array.isArray(errorData.course)) {
          errorMessage = errorData.course[0];
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        // If JSON parsing fails, use generic error message
      }
      
      const error = new Error(errorMessage);
      error.status = response.status;
      error.originalMessage = errorText;
      throw error;
    }

    return response.json();
  } catch (error) {
    if (error.status !== 401) {
      console.error(`[courseService] Network error for ${fullUrl}:`, error.message);
    }
    if (!error.status) {
      error.message = error.message || 'Network request failed';
      error.isNetworkError = true;
    }
    throw error;
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
      const response = await authenticatedFetch(`/enrollments/?_=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });
      const rows = Array.isArray(response) ? response : (response?.results || []);
      return [localEnrollment, ...rows.filter((item) => item?.course !== AR_COURSE_ID && item?.course_code !== localCourse.code)];
    } catch (error) {
      return [localEnrollment];
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
