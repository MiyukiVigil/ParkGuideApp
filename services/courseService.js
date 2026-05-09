/**
 * Course Service
 * Handles API calls to the course backend
 */

import CONFIG from '../constants/config';
import { getAccessToken } from '../utils/tokenStorage';
import { ensureFreshSession } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = CONFIG.API_BASE_URL;
const CACHE_PREFIX = 'courseServiceCache:';

const readCache = async (key) => {
  const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
  return cached ? JSON.parse(cached) : null;
};

const writeCache = async (key, data) => {
  await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(data));
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

    return withOfflineCache(`courses:${params.toString()}`, () => authenticatedFetch(url));
  },

  /**
   * Get course details with chapters and enrollment status
   */
  getCourseDetails: async (courseId) => {
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
    return authenticatedFetch(`/courses/${courseId}/enroll/`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  /**
   * Get user's course enrollments
   */
  getUserEnrollments: async () => {
    const response = await authenticatedFetch(`/enrollments/?_=${Date.now()}`, {
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });
    return Array.isArray(response) ? response : (response?.results || []);
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
    return authenticatedFetch(`/chapters/${chapterId}/`);
  },

  /**
   * Get lesson content
   */
  getLesson: async (lessonId) => {
    return withOfflineCache(`lesson:${lessonId}`, () => authenticatedFetch(`/lessons/${lessonId}/`));
  },

  /**
   * Mark lesson as complete
   */
  markLessonComplete: async (lessonId) => {
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
