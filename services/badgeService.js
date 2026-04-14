/**
 * Badge Service
 * Handles API calls for user badge progress and achievements
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
  console.log(`[badgeService] Fetching: ${fullUrl}`);

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[badgeService] API Error: ${response.status} ${response.statusText}`, errorText);
      
      const error = new Error(`API Error: ${response.status} ${response.statusText}`);
      error.status = response.status;
      error.originalMessage = errorText;
      throw error;
    }

    return response.json();
  } catch (error) {
    console.error(`[badgeService] Network error for ${fullUrl}:`, error.message);
    throw error;
  }
};

export const badgeService = {
  /**
   * Get all available badges
   */
  getAllBadges: async () => {
    return authenticatedFetch('/user-progress/badges/');
  },

  /**
   * Get user's badge progress
   */
  getUserBadges: async () => {
    return authenticatedFetch('/user-progress/my-badges/');
  },

  /**
   * Get single badge details
   */
  getBadge: async (badgeId) => {
    return authenticatedFetch(`/user-progress/badges/${badgeId}/`);
  },

  /**
   * Get user's granted badges (achievements)
   */
  getGrantedBadges: async () => {
    try {
      const allBadges = await authenticatedFetch('/user-progress/my-badges/');
      // Filter for granted/earned badges
      if (Array.isArray(allBadges)) {
        return allBadges.filter(badge => badge.earned === true || badge.status === 'granted');
      }
      // Handle paginated response
      if (allBadges.results) {
        return allBadges.results.filter(badge => badge.earned === true || badge.status === 'granted');
      }
      return [];
    } catch (error) {
      console.error('[badgeService] Error fetching granted badges:', error);
      return [];
    }
  },

  /**
   * Get user's pending badges (waiting for approval)
   */
  getPendingBadges: async () => {
    try {
      const allBadges = await authenticatedFetch('/user-progress/my-badges/');
      // Filter for pending badges
      if (Array.isArray(allBadges)) {
        return allBadges.filter(badge => badge.pending === true || badge.status === 'pending');
      }
      // Handle paginated response
      if (allBadges.results) {
        return allBadges.results.filter(badge => badge.pending === true || badge.status === 'pending');
      }
      return [];
    } catch (error) {
      console.error('[badgeService] Error fetching pending badges:', error);
      return [];
    }
  },

  /**
   * Get user's achievement badges (major milestones)
   */
  getAchievementBadges: async () => {
    try {
      const allBadges = await authenticatedFetch('/user-progress/my-badges/');
      // Filter for major/achievement badges
      if (Array.isArray(allBadges)) {
        return allBadges.filter(badge => badge.is_major_badge === true);
      }
      // Handle paginated response
      if (allBadges.results) {
        return allBadges.results.filter(badge => badge.is_major_badge === true);
      }
      return [];
    } catch (error) {
      console.error('[badgeService] Error fetching achievement badges:', error);
      return [];
    }
  },

  /**
   * Get badge progress statistics
   */
  getBadgeStatistics: async () => {
    try {
      const userBadges = await authenticatedFetch('/user-progress/my-badges/');
      
      const stats = {
        total: 0,
        earned: 0,
        pending: 0,
        inProgress: 0,
        rejected: 0,
        achievements: 0,
      };

      const badges = Array.isArray(userBadges) ? userBadges : (userBadges.results || []);

      badges.forEach(badge => {
        stats.total++;
        if (badge.earned || badge.status === 'granted') stats.earned++;
        if (badge.pending || badge.status === 'pending') stats.pending++;
        if (badge.in_progress || badge.status === 'in_progress') stats.inProgress++;
        if (badge.rejected || badge.status === 'rejected') stats.rejected++;
        if (badge.is_major_badge && badge.earned) stats.achievements++;
      });

      return stats;
    } catch (error) {
      console.error('[badgeService] Error calculating badge statistics:', error);
      return {
        total: 0,
        earned: 0,
        pending: 0,
        inProgress: 0,
        rejected: 0,
        achievements: 0,
      };
    }
  },
};

export default badgeService;
