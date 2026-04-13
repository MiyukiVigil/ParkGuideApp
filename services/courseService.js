/**
 * Course Service
 * Handles API calls to the course backend
 */

import CONFIG from '../constants/config';
import { getAccessToken } from '../utils/tokenStorage';

const API_URL = CONFIG.API_BASE_URL;

// Helper function to make authenticated requests
const authenticatedFetch = async (endpoint, options = {}) => {
  const token = await getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fullUrl = `${API_URL}${endpoint}`;
  console.log(`[courseService] Fetching: ${fullUrl}`);

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[courseService] API Error: ${response.status} ${response.statusText}`, errorText);
      
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
    console.error(`[courseService] Network error for ${fullUrl}:`, error.message);
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

    return authenticatedFetch(url);
  },

  /**
   * Get course details with chapters and enrollment status
   */
  getCourseDetails: async (courseId) => {
    const data = await authenticatedFetch(`/courses/${courseId}/`);
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
    return authenticatedFetch('/enrollments/');
  },

  /**
   * Get enrollment details with progress
   */
  getEnrollmentDetails: async (enrollmentId) => {
    return authenticatedFetch(`/enrollments/${enrollmentId}/`);
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
    return authenticatedFetch(`/lessons/${lessonId}/`);
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
