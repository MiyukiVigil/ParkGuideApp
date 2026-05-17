/**
 * Badge Service
 * Handles API calls for user badge progress and achievements
 */

import CONFIG from '../constants/config';
import { getAccessToken } from '../utils/tokenStorage';
import { ensureFreshSession } from '../utils/api';

const API_URL = CONFIG.API_BASE_URL;

const getBadgeStatus = (badge) => String(
  badge?.status ||
  badge?.user_badge_status ||
  badge?.progress_status ||
  badge?.badge_status ||
  badge?.user_badge?.status ||
  ''
).toLowerCase();

const isGrantedBadge = (badge) => (
  badge?.earned === true ||
  badge?.granted === true ||
  badge?.is_granted === true ||
  badge?.is_earned === true ||
  badge?.obtained === true ||
  badge?.approved === true ||
  ['granted', 'earned', 'obtained', 'awarded', 'approved', 'completed'].includes(getBadgeStatus(badge)) ||
  Boolean(badge?.earned_at || badge?.granted_at || badge?.awarded_at || badge?.approved_at || badge?.obtained_at)
);

const isPendingBadge = (badge) => (
  badge?.pending === true ||
  badge?.is_pending === true ||
  ['pending', 'pending_approval', 'waiting_approval', 'submitted', 'requested'].includes(getBadgeStatus(badge))
);

// Helper function to make authenticated requests
const authenticatedFetch = async (endpoint, options = {}) => {
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

  const fullUrl = `${API_URL}${endpoint}`;
  const performRequest = async () => {
    const headers = await buildHeaders();
    console.log(`[badgeService] Fetching: ${fullUrl}`);
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
        console.error(`[badgeService] API Error: ${response.status} ${response.statusText}`, errorText);
      }
      
      const error = new Error(`API Error: ${response.status} ${response.statusText}`);
      error.status = response.status;
      error.originalMessage = errorText;
      throw error;
    }

    return response.json();
  } catch (error) {
    if (error.status !== 401) {
      console.error(`[badgeService] Network error for ${fullUrl}:`, error.message);
    }
    throw error;
  }
};

export const badgeService = {
  /**
   * Get all available badges
   */
  getAllBadges: async () => {
    return authenticatedFetch(`/user-progress/badges/?sync=1&_=${Date.now()}`);
  },

  /**
   * Get user's badge progress
   */
  getUserBadges: async () => {
    return authenticatedFetch(`/user-progress/my-badges/?_=${Date.now()}`);
  },

  /**
   * Get single badge details
   */
  getBadge: async (badgeId) => {
    return authenticatedFetch(`/user-progress/badges/${badgeId}/?_=${Date.now()}`);
  },

  /**
   * Get user's granted badges (achievements)
   */
  getGrantedBadges: async () => {
    try {
      const allBadges = await badgeService.getAllBadges();
      // Filter for granted/earned badges
      if (Array.isArray(allBadges)) {
        return allBadges.filter(isGrantedBadge);
      }
      // Handle paginated response
      if (allBadges.results) {
        return allBadges.results.filter(isGrantedBadge);
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
      const allBadges = await badgeService.getAllBadges();
      // Filter for pending badges
      if (Array.isArray(allBadges)) {
        return allBadges.filter(isPendingBadge);
      }
      // Handle paginated response
      if (allBadges.results) {
        return allBadges.results.filter(isPendingBadge);
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
      const allBadges = await badgeService.getAllBadges();
      // Filter for major/achievement badges
      if (Array.isArray(allBadges)) {
        return allBadges.filter(badge => badge.is_major_badge === true && isGrantedBadge(badge));
      }
      // Handle paginated response
      if (allBadges.results) {
        return allBadges.results.filter(badge => badge.is_major_badge === true && isGrantedBadge(badge));
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
      const userBadges = await badgeService.getAllBadges();
      
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
        if (isGrantedBadge(badge)) stats.earned++;
        if (isPendingBadge(badge)) stats.pending++;
        if (badge.in_progress || badge.status === 'in_progress') stats.inProgress++;
        if (badge.rejected || badge.status === 'rejected') stats.rejected++;
          if (badge.is_major_badge && isGrantedBadge(badge)) stats.achievements++;
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
