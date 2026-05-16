/**
 * Badge Service
 * Handles API calls for user badge progress and achievements
 */

import api from '../utils/api';

const BADGE_REQUEST_TIMEOUT_MS = 12000;
const lastGoodBadgeListsByLanguage = {};

const normalizeLanguage = (language) => {
  const normalized = String(language || 'en').toLowerCase();
  if (normalized.startsWith('zh')) return 'zh';
  if (normalized.startsWith('ms')) return 'ms';
  return 'en';
};

const normalizeBadge = (badge = {}) => {
  const status = getBadgeStatus(badge) || 'in_progress';
  const progressKind = badge.progress_kind || (badge.is_major_badge ? 'badges' : 'modules');
  const progressCurrent = Number(
    badge.progress_current ??
      (progressKind === 'badges' ? badge.completed_badges : badge.completed_modules) ??
      0
  );
  const progressRequired = Number(
    badge.progress_required ??
      (progressKind === 'badges' ? badge.required_badges_count : badge.required_completed_modules) ??
      0
  );

  return {
    ...badge,
    status,
    progress_kind: progressKind,
    progress_current: Number.isFinite(progressCurrent) ? progressCurrent : 0,
    progress_required: Number.isFinite(progressRequired) ? progressRequired : 0,
    earned: status === 'granted' || badge.earned === true,
    pending: status === 'pending' || badge.pending === true,
    rejected: status === 'rejected' || badge.rejected === true,
    in_progress: status === 'in_progress' || badge.in_progress === true,
    eligible: Boolean(badge.eligible),
  };
};

const normalizeBadgeList = (payload) => {
  const badges = Array.isArray(payload) ? payload : (payload?.results || []);
  return badges.map(normalizeBadge);
};

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

// Helper function to make authenticated requests through the shared API client.
const authenticatedRequest = async (endpoint, options = {}) => {
  try {
    console.log(`[badgeService] Fetching: ${endpoint}`);
    const response = await api.get(endpoint, {
      timeout: BADGE_REQUEST_TIMEOUT_MS,
      headers: options.headers,
    });
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      error.status = 408;
      error.message = `Badge request timed out after ${BADGE_REQUEST_TIMEOUT_MS / 1000}s`;
    }

    const status = error.status || error.response?.status;
    if (status !== 401) {
      console.error(`[badgeService] Request failed for ${endpoint}:`, error.response?.data || error.message);
    }
    throw error;
  }
};

export const badgeService = {
  /**
   * Get all available badges
   */
  getAllBadges: async ({ sync = false, language = 'en' } = {}) => {
    const languageKey = normalizeLanguage(language);
    const syncParam = sync ? 'sync=1&' : '';
    const compactParam = 'compact=1&';
    const languageParam = `lang=${encodeURIComponent(languageKey)}&`;
    const requestOptions = {
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        'Accept-Language': languageKey,
      },
    };

    try {
      const payload = await authenticatedRequest(`/user-progress/badges/?${syncParam}${compactParam}${languageParam}_=${Date.now()}`, requestOptions);
      const badges = normalizeBadgeList(payload);
      lastGoodBadgeListsByLanguage[languageKey] = badges;
      return badges;
    } catch (error) {
      const status = error.status || error.response?.status;
      if (!sync || status === 401 || status === 403) {
        const cachedBadges = lastGoodBadgeListsByLanguage[languageKey] || [];
        if (cachedBadges.length > 0 && status !== 401 && status !== 403) {
          console.warn(`[badgeService] Returning cached ${languageKey} badges after request failure.`);
          return cachedBadges;
        }
        throw error;
      }

      console.warn('[badgeService] Badge sync failed; retrying without sync.', error.message);
      try {
        const fallbackPayload = await authenticatedRequest(`/user-progress/badges/?${compactParam}${languageParam}_=${Date.now()}`, requestOptions);
        const badges = normalizeBadgeList(fallbackPayload);
        lastGoodBadgeListsByLanguage[languageKey] = badges;
        return badges;
      } catch (fallbackError) {
        const cachedBadges = lastGoodBadgeListsByLanguage[languageKey] || [];
        if (cachedBadges.length > 0) {
          console.warn(`[badgeService] Returning cached ${languageKey} badges after sync and fallback failed.`);
          return cachedBadges;
        }
        throw fallbackError;
      }
    }
  },

  /**
   * Get user's badge progress
   */
  getUserBadges: async () => {
    const payload = await authenticatedRequest(`/user-progress/my-badges/?_=${Date.now()}`, {
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });
    return Array.isArray(payload) ? payload : (payload?.results || []);
  },

  /**
   * Get single badge details
   */
  getBadge: async (badgeId) => {
    const payload = await authenticatedRequest(`/user-progress/badges/${badgeId}/?_=${Date.now()}`, {
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });
    return normalizeBadge(payload);
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
