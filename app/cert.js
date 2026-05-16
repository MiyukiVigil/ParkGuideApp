import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Avatar,
  Card,
  Chip,
  Divider,
  Modal,
  Portal,
  ProgressBar,
  Text,
  useTheme,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useRouter } from 'expo-router';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';

import badgeService from '../services/badgeService';
import { getAvatarUrl } from '../constants/config';
import { getProfile } from '../services/profileService';
import { useScreenSpeech } from '../contexts/ScreenSpeechContext';

const BADGE_IMAGE_PLACEHOLDER = 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=900&q=80';
const TILT_LIMIT = 0.18;
const BADGES_PER_ROW = 3;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const withAlpha = (hex, alpha) => {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return hex;
  let normalized = hex.slice(1);
  if (normalized.length === 3) normalized = normalized.split('').map((char) => char + char).join('');
  if (normalized.length !== 6) return hex;
  const value = Math.round(clamp(alpha, 0, 1) * 255).toString(16).padStart(2, '0');
  return `#${normalized}${value}`;
};

const chunkBadges = (badges, size) => {
  const rows = [];
  for (let index = 0; index < badges.length; index += size) {
    rows.push(badges.slice(index, index + size));
  }
  return rows;
};

const normalizeLanguageCode = (language) => {
  const normalized = String(language || 'en').toLowerCase();
  if (normalized.startsWith('zh')) return 'zh';
  if (normalized.startsWith('ms') || normalized.startsWith('ms-my')) return 'ms';
  if (normalized.startsWith('en')) return 'en';
  return normalized.split('-')[0] || 'en';
};

const parseMaybeJson = (value) => {
  if (!value || typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    try {
      return JSON.parse(value.replace(/'/g, '"'));
    } catch {
      return value;
    }
  }
};

const BADGE_ARRAY_FALLBACK_TRANSLATIONS = {
  ms: {
    'Orangutan Behaviour Basics': 'Asas Tingkah Laku Orang Utan',
    'AR Wildlife Safety Practice': 'Latihan Keselamatan Hidupan Liar AR',
    'Visitor Etiquette Coaching': 'Bimbingan Etika Pelawat',
    'Movement and feeding cues': 'Petunjuk pergerakan dan pemakanan',
    'Stress signs': 'Tanda tekanan',
    'Mother-infant sensitivity': 'Kepekaan ibu dan anak',
    'Scenario briefing': 'Taklimat senario',
    'Launch AR response drill': 'Lancarkan latihan respons AR',
    'Decision debrief': 'Ulasan keputusan',
    'Silence and stillness': 'Senyap dan tenang',
    'Camera behaviour': 'Tingkah laku kamera',
  },
  zh: {
    'Orangutan Behaviour Basics': '红毛猩猩行为基础',
    'AR Wildlife Safety Practice': 'AR 野生动物安全练习',
    'Visitor Etiquette Coaching': '游客礼仪指导',
    'Movement and feeding cues': '移动与进食线索',
    'Stress signs': '压力迹象',
    'Mother-infant sensitivity': '母婴敏感性',
    'Scenario briefing': '场景简报',
    'Launch AR response drill': '启动 AR 应对演练',
    'Decision debrief': '决策复盘',
    'Silence and stillness': '安静与静止',
    'Camera behaviour': '拍摄行为',
  },
};

const normalizeBadgeStatus = (badge) => String(
  badge?.status ||
  badge?.user_badge_status ||
  badge?.progress_status ||
  badge?.badge_status ||
  badge?.user_badge?.status ||
  ''
).toLowerCase();

const isBadgeRequirementComplete = (badge) => {
  const progressRequired = Number(badge?.progress_required || 0);
  const progressCurrent = Number(badge?.progress_current || 0);
  if (progressRequired > 0) return progressCurrent >= progressRequired;

  const explicitProgress = Number(
    badge?.progress_percentage ??
    badge?.completion_percentage ??
    badge?.progress
  );
  if (Number.isFinite(explicitProgress) && explicitProgress >= 100) return true;

  const requiredModules = Number(badge?.required_completed_modules || 0);
  const completedModules = Number(badge?.completed_modules || 0);
  if (requiredModules > 0 && completedModules >= requiredModules) return true;

  const requiredBadges = Number(badge?.required_badges_count || 0);
  const completedBadges = Number(badge?.completed_badges || 0);
  if (requiredBadges > 0 && completedBadges >= requiredBadges) return true;

  return false;
};

const badgeHasAnyDate = (badge, fields) => fields.some((field) => Boolean(badge?.[field] || badge?.user_badge?.[field]));

const isBadgeEarned = (badge) => {
  const status = normalizeBadgeStatus(badge);
  return Boolean(
    status === 'granted' ||
    badge?.earned ||
    badge?.granted ||
    badge?.is_granted ||
    badge?.is_earned ||
    badge?.obtained ||
    badge?.approved
  );
};

const isBadgePending = (badge) => {
  const status = normalizeBadgeStatus(badge);
  return Boolean(
    badge?.pending ||
    badge?.is_pending ||
    ['pending', 'pending_approval', 'waiting_approval', 'submitted', 'requested'].includes(status)
  );
};

const getNestedTranslation = (translations, language, field) => {
  const parsed = parseMaybeJson(translations);
  if (!parsed || typeof parsed !== 'object') return '';

  const languageValue = parsed[language] || parsed.en || parsed.ms || parsed.zh;
  if (typeof languageValue === 'string') return languageValue;
  if (languageValue && typeof languageValue === 'object') {
    return languageValue[field] || languageValue.name || languageValue.title || languageValue.description || '';
  }

  return parsed[field]?.[language] || parsed[field]?.en || '';
};

export default function Certification() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allBadges, setAllBadges] = useState([]);
  const [badgeLoadError, setBadgeLoadError] = useState('');
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [tiltEnabled, setTiltEnabled] = useState(false);
  const [profile, setProfile] = useState(null);
  const badgeTiltEnabled = true;
  const caseTiltX = useRef(new Animated.Value(0)).current;
  const caseTiltY = useRef(new Animated.Value(0)).current;
  const activeLanguage = useMemo(() => normalizeLanguageCode(i18n.language || i18n.resolvedLanguage), [i18n.language, i18n.resolvedLanguage]);

  const palette = useMemo(() => {
    const surface = theme.colors.surface;
    const surfaceVariant = theme.colors.surfaceVariant || theme.colors.surface;
    const outline = theme.colors.outline || '#CDBA92';
    const primary = theme.colors.primary;
    const onSurface = theme.colors.onSurface;
    const onSurfaceVariant = theme.colors.onSurfaceVariant || theme.colors.onSurface;

    return {
      pageBackground: theme.colors.background,
      summaryBackground: surface,
      summaryBorder: withAlpha(outline, 0.42),
      summaryChip: withAlpha(primary, 0.12),
      summaryChipText: onSurface,
      sectionTitle: onSurface,
      caseFrame: '#D2B279',
      caseFrameBorder: '#A88749',
      caseInnerBorder: '#F1DEAF',
      caseInterior: surfaceVariant,
      caseShelf: withAlpha(onSurface, 0.18),
      caseShelfFoot: withAlpha(onSurface, 0.28),
      glarePrimary: withAlpha('#FFFFFF', 0.04),
      glareSecondary: withAlpha('#FFFFFF', 0.02),
      badgeLocked: withAlpha(onSurfaceVariant, 0.34),
      badgeLockedBorder: withAlpha(onSurfaceVariant, 0.54),
      badgePending: '#F6C343',
      badgePendingBorder: '#B87800',
      badgeEarned: '#38A169',
      badgeEarnedBorder: '#1F7A4B',
      progressTrack: withAlpha(onSurface, 0.12),
      progressLocked: withAlpha(onSurface, 0.24),
      progressEarned: '#2F9E5B',
      progressPending: '#F0B429',
      overlay: withAlpha('#10141A', 0.82),
      modalBackground: surface,
      modalAccentSoft: withAlpha(primary, 0.12),
      modalBorder: withAlpha(outline, 0.35),
      badgeCard: withAlpha(primary, 0.04),
    };
  }, [theme.colors]);

  const showSessionExpiredAlert = useCallback(() => {
    router.replace('/');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadProfile = async () => {
        try {
          const data = await getProfile();
          if (!isActive) return;
          setProfile(data);
        } catch (err) {
          console.log('Failed loading profile:', err?.message || err);
        }
      };

      const loadCertificationData = async () => {
        setLoading(true);
        setBadgeLoadError('');
        try {
          const normalizedBadges = await badgeService.getAllBadges({ sync: true, language: activeLanguage });

          if (!isActive) return;
          setAllBadges(normalizedBadges);
        } catch (err) {
          const status = err.status || err.response?.status;
          if (status === 401 || status === 403 || err.isSessionExpired) {
            showSessionExpiredAlert();
            return;
          }
          console.error('Failed loading certifications:', err?.message || err);
          if (isActive) {
            setAllBadges([]);
            setBadgeLoadError(err?.message || t('badgeLoadFailedDesc'));
          }
        } finally {
          if (isActive) setLoading(false);
        }
      };

      loadProfile();
      loadCertificationData();

      return () => {
        isActive = false;
      };
    }, [activeLanguage, showSessionExpiredAlert, t])
  );

  useEffect(() => {
    let subscription;
    let mounted = true;

    const startTilt = async () => {
      try {
        const available = await Accelerometer.isAvailableAsync();
        if (!mounted || !available) {
          setTiltEnabled(false);          return;
        }

        Accelerometer.setUpdateInterval(60);
        subscription = Accelerometer.addListener(({ x, y, z }) => {
          const nextX = clamp(y * 0.9, -TILT_LIMIT, TILT_LIMIT);
          const nextY = clamp((-x) * 0.9, -TILT_LIMIT, TILT_LIMIT);
          const hasReading = Math.abs(x) > 0.005 || Math.abs(y) > 0.005 || Math.abs(z) > 0.005;

          if (mounted) {
            setTiltEnabled(hasReading);          }

          Animated.parallel([
            Animated.spring(caseTiltX, {
              toValue: nextX,
              damping: 22,
              stiffness: 130,
              mass: 1,
              useNativeDriver: true,
            }),
            Animated.spring(caseTiltY, {
              toValue: nextY,
              damping: 22,
              stiffness: 130,
              mass: 1,
              useNativeDriver: true,
            }),
          ]).start();
        });
      } catch (error) {
        console.error('Accelerometer setup failed:', error.message);
        setTiltEnabled(false);      }
    };

    startTilt();

    return () => {
      mounted = false;
      if (subscription) subscription.remove();
      Animated.parallel([
        Animated.spring(caseTiltX, {
          toValue: 0,
          damping: 22,
          stiffness: 130,
          mass: 1,
          useNativeDriver: true,
        }),
        Animated.spring(caseTiltY, {
          toValue: 0,
          damping: 22,
          stiffness: 130,
          mass: 1,
          useNativeDriver: true,
        }),
      ]).start();
    };
  }, [caseTiltX, caseTiltY]);

  const caseRotateX = useMemo(() => caseTiltX.interpolate({
    inputRange: [-TILT_LIMIT, 0, TILT_LIMIT],
    outputRange: ['4deg', '0deg', '-4deg'],
  }), [caseTiltX]);

  const caseRotateY = useMemo(() => caseTiltY.interpolate({
    inputRange: [-TILT_LIMIT, 0, TILT_LIMIT],
    outputRange: ['-5deg', '0deg', '5deg'],
  }), [caseTiltY]);

  const badgeRotateX = useMemo(() => caseTiltX.interpolate({
    inputRange: [-TILT_LIMIT, 0, TILT_LIMIT],
    outputRange: ['6deg', '0deg', '-6deg'],
  }), [caseTiltX]);

  const badgeRotateY = useMemo(() => caseTiltY.interpolate({
    inputRange: [-TILT_LIMIT, 0, TILT_LIMIT],
    outputRange: ['-8deg', '0deg', '8deg'],
  }), [caseTiltY]);

  const badgeShiftX = useMemo(() => caseTiltY.interpolate({
    inputRange: [-TILT_LIMIT, 0, TILT_LIMIT],
    outputRange: [-4, 0, 4],
  }), [caseTiltY]);

  const badgeShiftY = useMemo(() => caseTiltX.interpolate({
    inputRange: [-TILT_LIMIT, 0, TILT_LIMIT],
    outputRange: [3, 0, -3],
  }), [caseTiltX]);

  const isEarnedBadge = useCallback(isBadgeEarned, []);
  const isPendingBadge = useCallback(isBadgePending, []);
  const getLocalizedObjectText = useCallback((value, fallback = '') => {
    const parsed = parseMaybeJson(value);
    if (!parsed) return fallback;
    if (typeof parsed === 'string') return parsed;
    if (typeof parsed === 'object') {
      const localized = parsed[activeLanguage] || parsed.en || parsed.ms || parsed.zh;
      if (typeof localized === 'string') return localized;
      if (localized && typeof localized === 'object') {
        return localized.name || localized.title || localized.description || fallback;
      }
      return fallback;
    }
    return fallback;
  }, [activeLanguage]);

  const translateBadgeArrayItem = useCallback((value) => {
    const localized = getLocalizedObjectText(value);
    if (!localized) return '';
    return BADGE_ARRAY_FALLBACK_TRANSLATIONS[activeLanguage]?.[localized] || localized;
  }, [activeLanguage, getLocalizedObjectText]);

  const getLocalizedBadgeText = useCallback((badge, field) => {
    const localizedValue = badge?.[`localized_${field}`] || badge?.[`badge_localized_${field}`];
    if (localizedValue) return localizedValue;

    const directValue = badge?.[field] || badge?.[`badge_${field}`];

    const translationCandidates = [
      badge?.[`${field}_translations`],
      badge?.[`badge_${field}_translations`],
      badge?.translations?.[field],
      badge?.translations?.[activeLanguage]?.[field],
      badge?.badge?.[`${field}_translations`],
      badge?.badge?.[`badge_${field}_translations`],
      badge?.badge?.translations?.[field],
      badge?.badge?.translations?.[activeLanguage]?.[field],
    ].filter(Boolean);

    for (const translations of translationCandidates) {
      const translated = getNestedTranslation(translations, activeLanguage, field) || getLocalizedObjectText(translations);
      if (translated) return translated;
    }

    if (field === 'name') {
      const courseTitle = getLocalizedObjectText(
        badge?.course_title_translations ||
          badge?.badge_course_title_translations ||
          badge?.course?.title ||
          badge?.course?.title_translations
      );
      if (courseTitle && activeLanguage !== 'en') return t('badgeNameForCourse', { course: courseTitle });
    }

    if (field === 'description') {
      const courseTitle = getLocalizedObjectText(
        badge?.course_title_translations ||
          badge?.badge_course_title_translations ||
          badge?.course?.title ||
          badge?.course?.title_translations
      );
      if (courseTitle && activeLanguage !== 'en') return t('badgeDescriptionForCourse', { course: courseTitle });
    }

    return getLocalizedObjectText(directValue);
  }, [activeLanguage, getLocalizedObjectText, t]);

  const getLocalizedBadgeCourseTitle = useCallback((badge) => {
    if (badge?.localized_course_title || badge?.badge_localized_course_title) {
      return badge.localized_course_title || badge.badge_localized_course_title;
    }

    return getLocalizedObjectText(
      badge?.course_title_translations ||
        badge?.badge_course_title_translations ||
        badge?.course?.title ||
        badge?.course?.title_translations,
      badge?.course_title || badge?.badge_course_title || t('milestoneBadge')
    );
  }, [getLocalizedObjectText, t]);

  const getLocalizedBadgeArray = useCallback((badge, field) => {
    const localizedItems = parseMaybeJson(badge?.[`localized_${field}`] || badge?.[`badge_localized_${field}`]);
    if (Array.isArray(localizedItems) && localizedItems.length > 0) {
      return localizedItems.map(translateBadgeArrayItem).filter(Boolean);
    }

    const translatedItems = parseMaybeJson(
      badge?.[`${field}_translations`] ||
        badge?.[`badge_${field}_translations`] ||
        badge?.translations?.[field]
    );

    if (Array.isArray(translatedItems) && translatedItems.length > 0) {
      return translatedItems.map(translateBadgeArrayItem).filter(Boolean);
    }

    const fallbackItems = parseMaybeJson(badge?.[field] || badge?.[`badge_${field}`]);

    if (Array.isArray(fallbackItems)) {
      return fallbackItems.map(translateBadgeArrayItem).filter(Boolean);
    }

    return [];
  }, [translateBadgeArrayItem]);

  const getBadgeStatusLabel = useCallback((badge) => {
    if (isEarnedBadge(badge)) return t('badgeStatusObtained');
    if (isPendingBadge(badge)) return t('badgeStatusPendingApproval');
    if (badge.rejected || badge.status === 'rejected') return t('badgeStatusRetryNeeded');
    return t('badgeStatusLocked');
  }, [isEarnedBadge, isPendingBadge, t]);

  const getBadgeStatusTone = useCallback((badge) => {
    if (isEarnedBadge(badge)) return { chip: palette.badgeEarned, text: '#FFFFFF', progress: palette.progressEarned };
    if (isPendingBadge(badge)) return { chip: palette.badgePending, text: '#2B2110', progress: palette.progressPending };
    return { chip: withAlpha(theme.colors.onSurfaceVariant || theme.colors.onSurface, 0.7), text: theme.colors.surface, progress: palette.progressLocked };
  }, [isEarnedBadge, isPendingBadge, palette.badgeEarned, palette.badgePending, palette.progressEarned, palette.progressLocked, palette.progressPending, theme.colors]);

  const getBadgeImageUri = useCallback((badge) => {
    if (badge?.badge_image_url) return badge.badge_image_url;
    if (badge?.image_url) return badge.image_url;
    if (badge?.course_image_url) return badge.course_image_url;
    if (badge?.course_thumbnail) return badge.course_thumbnail;
    return BADGE_IMAGE_PLACEHOLDER;
  }, []);

  const getBadgeProgressValue = useCallback((badge) => {
    if (isEarnedBadge(badge) || isBadgeRequirementComplete(badge)) return 1;

    const progressRequired = Number(badge?.progress_required || 0);
    const progressCurrent = Number(badge?.progress_current || 0);
    if (progressRequired > 0) return Math.min(1, progressCurrent / progressRequired);

    const explicitProgress = Number(
      badge?.progress_percentage ??
      badge?.completion_percentage ??
      badge?.progress
    );
    if (Number.isFinite(explicitProgress) && explicitProgress > 0) {
      return Math.min(1, explicitProgress / 100);
    }

    if (badge?.is_major_badge) {
      const required = Number(badge?.required_badges_count || 0);
      const completed = Number(badge?.completed_badges || 0);
      if (required <= 0) return completed > 0 ? 1 : 0;
      return Math.min(1, completed / required);
    }

    const required = Number(badge?.required_completed_modules || 0);
    const completed = Number(badge?.completed_modules || 0);
    if (required <= 0) return completed > 0 ? 1 : 0;
    return Math.min(1, completed / required);
  }, [isEarnedBadge]);

  const badgeSummary = useMemo(() => {
    const earned = allBadges.filter((badge) => isEarnedBadge(badge)).length;
    const pending = allBadges.filter((badge) => isPendingBadge(badge)).length;
    const locked = allBadges.filter((badge) => !isEarnedBadge(badge) && !isPendingBadge(badge)).length;

    return {
      total: allBadges.length,
      earned,
      pending,
      locked,
    };
  }, [allBadges, isEarnedBadge, isPendingBadge]);

  const displayBadges = useMemo(() => {
    return [...allBadges].sort((a, b) => {
      const statusDelta = Number(isEarnedBadge(b)) - Number(isEarnedBadge(a));
      if (statusDelta !== 0) return statusDelta;
      const pendingDelta = Number(isPendingBadge(a)) - Number(isPendingBadge(b));
      if (pendingDelta !== 0) return pendingDelta;
      return getLocalizedBadgeText(a, 'name').localeCompare(getLocalizedBadgeText(b, 'name'));
    });
  }, [allBadges, getLocalizedBadgeText, isEarnedBadge, isPendingBadge]);

  const badgeRows = useMemo(() => chunkBadges(displayBadges, BADGES_PER_ROW), [displayBadges]);
  const caseMinHeight = 138 + (Math.max(1, badgeRows.length) * 126);

  const isVerifiedGuide = useMemo(() => {
    if (loading || badgeSummary.total === 0) return false;
    return badgeSummary.earned === badgeSummary.total;
  }, [loading, badgeSummary]);

  useEffect(() => {
    if (!selectedBadge) return;
    const refreshedBadge = allBadges.find((badge) => badge.id === selectedBadge.id);
    if (refreshedBadge && refreshedBadge !== selectedBadge) {
      setSelectedBadge(refreshedBadge);
    }
  }, [allBadges, selectedBadge]);

  const handleOpenImageSource = useCallback(async () => {
    if (!selectedBadge?.badge_image_source) return;
    try {
      await Linking.openURL(selectedBadge.badge_image_source);
    } catch (error) {
      console.error('Failed opening badge image source:', error.message);
    }
  }, [selectedBadge]);

  const handleBadgePress = useCallback(async (badge) => {
    try {
      await Haptics.selectionAsync();
    } catch (error) {
      console.error('Haptic feedback failed:', error.message);
    }
    setSelectedBadge(badge);
  }, []);

  const closeModal = useCallback(async () => {
    try {
      await Haptics.selectionAsync();
    } catch (error) {
      console.error('Haptic feedback failed:', error.message);
    }
    setSelectedBadge(null);
  }, []);

  const renderBadgeTile = useCallback((badge) => {
    const earned = isEarnedBadge(badge);
    const pending = isPendingBadge(badge);
    const imageUri = getBadgeImageUri(badge);
    const progress = getBadgeProgressValue(badge);
    const tone = getBadgeStatusTone(badge);

    const tiltTransform = badgeTiltEnabled
      ? [
          { perspective: 1000 },
          { translateX: badgeShiftX },
          { translateY: badgeShiftY },
          { rotateX: badgeRotateX },
          { rotateY: badgeRotateY },
        ]
      : [];

    return (
      <TouchableOpacity
        key={`badge-${badge.id}`}
        activeOpacity={0.9}
        onPress={() => handleBadgePress(badge)}
        style={styles.badgeCell}
        hitSlop={{ top: 10, bottom: 14, left: 10, right: 10 }}
      >
        <View style={[styles.badgeCard, { backgroundColor: palette.badgeCard }]}> 
          <Animated.View style={{ transform: tiltTransform }}>
            <View
              style={[
                styles.badgeEmblemFrame,
                {
                  borderColor: earned ? palette.badgeEarnedBorder : pending ? palette.badgePendingBorder : palette.badgeLockedBorder,
                  backgroundColor: earned ? palette.badgeEarned : pending ? palette.badgePending : palette.badgeLocked,
                  opacity: earned ? 1 : pending ? 0.92 : 0.58,
                },
              ]}
            >
              <Image
                source={{ uri: imageUri }}
                style={[styles.badgeEmblem, !earned && !pending && styles.badgeEmblemMuted]}
              />
              {!earned ? (
                <View style={[styles.lockBadgePill, { backgroundColor: palette.overlay }]}>
                  <Text style={styles.lockBadgePillText}>{pending ? t('badgePillPending') : t('badgePillLocked')}</Text>
                </View>
              ) : null}
            </View>
          </Animated.View>

          <View style={[styles.progressWrap, { backgroundColor: palette.progressTrack }]}> 
            <ProgressBar
              progress={progress}
              color={tone.progress}
              style={[styles.badgeProgressBar, { backgroundColor: 'transparent' }]}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [badgeRotateX, badgeRotateY, badgeShiftX, badgeShiftY, badgeTiltEnabled, getBadgeImageUri, getBadgeProgressValue, getBadgeStatusTone, handleBadgePress, isEarnedBadge, isPendingBadge, palette, t]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: palette.pageBackground }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Card style={[styles.idCard, { backgroundColor: theme.colors.primary }]}> 
        <View style={styles.idContent}>
          <Avatar.Image size={80} source={{ uri: profile?.profile_image_url || getAvatarUrl(profile?.name || profile?.email || t('parkGuide')) }} />
          <View style={styles.idText}>
            <Text variant="titleLarge" style={{ color: theme.colors.onPrimary, fontWeight: 'bold' }}>
              {(profile?.name || t('parkGuide')).toUpperCase()}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onPrimary, marginTop: 2 }}>
              {profile?.role || t('certMedium')}
            </Text>
            <Text variant="labelSmall" style={{ color: withAlpha(theme.colors.onPrimary, 0.92), marginTop: 4 }}>
              ID: SFC-2026-0042
            </Text>
          </View>
        </View>

        <Divider style={{ backgroundColor: withAlpha(theme.colors.onPrimary, 0.2) }} />

        <View style={styles.idFooter}>
          <View style={styles.headerChipRow}>
            <Chip
              icon={isVerifiedGuide ? 'check-decagram' : 'shield-alert'}
              style={[styles.headerChip, { backgroundColor: withAlpha(theme.colors.background, 0.16) }]}
              textStyle={[styles.headerChipText, { color: theme.colors.onPrimary }]}
            >
              {isVerifiedGuide ? t('verifiedGuide') : t('badgeCaseInProgress')}
            </Chip>
          </View>
        </View>
      </Card>

      <Card style={[styles.summaryCard, { backgroundColor: palette.summaryBackground, borderColor: palette.summaryBorder }]}> 
        <Text variant="titleMedium" style={[styles.summaryTitle, { color: theme.colors.onSurface }]}>
          {t('badgeCaseSummary')}
        </Text>

        <View style={styles.summaryRow}>
          <Chip style={[styles.summaryChip, { backgroundColor: palette.summaryChip }]} textStyle={[styles.summaryChipText, { color: palette.summaryChipText }]}>{t('badgeSummaryObtained', { count: badgeSummary.earned })}</Chip>
          <Chip style={[styles.summaryChip, { backgroundColor: palette.summaryChip }]} textStyle={[styles.summaryChipText, { color: palette.summaryChipText }]}>{t('badgeSummaryPending', { count: badgeSummary.pending })}</Chip>
        </View>
        <View style={styles.summaryRow}>
          <Chip style={[styles.summaryChip, { backgroundColor: palette.summaryChip }]} textStyle={[styles.summaryChipText, { color: palette.summaryChipText }]}>{t('badgeSummaryLocked', { count: badgeSummary.locked })}</Chip>
        </View>
      </Card>

      <Text variant="titleMedium" style={[styles.sectionTitle, { color: palette.sectionTitle }]}>
        {t('badgeDisplayCase')}
      </Text>

      {loading ? (
        <Card style={[styles.loadingCard, { backgroundColor: palette.summaryBackground, borderColor: palette.summaryBorder }]}>
          <View style={styles.loadingBox}>
            <ActivityIndicator animating color={theme.colors.primary} />
          </View>
        </Card>
      ) : badgeLoadError ? (
        <Card style={[styles.loadingCard, { backgroundColor: palette.summaryBackground, borderColor: palette.summaryBorder }]}>
          <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>{t('badgeLoadFailed')}</Text>
          <Text style={[styles.emptyBody, { color: theme.colors.onSurfaceVariant }]}>{t('badgeLoadFailedDesc')}</Text>
        </Card>
      ) : displayBadges.length === 0 ? (
        <Card style={[styles.loadingCard, { backgroundColor: palette.summaryBackground, borderColor: palette.summaryBorder }]}>
          <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>{t('noBadgesEarnedYet')}</Text>
          <Text style={[styles.emptyBody, { color: theme.colors.onSurfaceVariant }]}>{t('completeMoreModulesEarnBadges')}</Text>
        </Card>
      ) : (
        <Animated.View
          style={{
            transform: [
              { perspective: 1400 },
              { rotateX: caseRotateX },
              { rotateY: caseRotateY },
            ],
          }}
        >
          <Card style={styles.caseCard}>
            <View style={[styles.caseFrameOuter, { backgroundColor: palette.caseFrame, borderColor: palette.caseFrameBorder }]}> 
              <View style={[styles.caseFrameInner, { borderColor: palette.caseInnerBorder, backgroundColor: palette.caseInterior }]}> 
                <View pointerEvents="none" style={[styles.caseGlassGlarePrimary, { backgroundColor: palette.glarePrimary }]} />
                <View pointerEvents="none" style={[styles.caseGlassGlareSecondary, { backgroundColor: palette.glareSecondary }]} />
                <View style={[styles.caseInterior, { minHeight: caseMinHeight }]}> 
                  {badgeRows.map((row, rowIndex) => (
                    <View key={`row-${rowIndex}`} style={styles.badgeRow}>
                      {row.map(renderBadgeTile)}
                      {row.length < BADGES_PER_ROW
                        ? Array.from({ length: BADGES_PER_ROW - row.length }).map((_, fillerIndex) => (
                            <View key={`filler-${rowIndex}-${fillerIndex}`} style={styles.badgeCell} />
                          ))
                        : null}
                    </View>
                  ))}
                </View>
                <View pointerEvents="none" style={[styles.caseShelfRail, { backgroundColor: palette.caseShelf }]} />
                <View pointerEvents="none" style={[styles.caseShelfFoot, { backgroundColor: palette.caseShelfFoot }]} />
              </View>
            </View>
          </Card>
        </Animated.View>
      )}

      <Text variant="bodySmall" style={[styles.disclaimer, { color: theme.colors.onSurfaceVariant }]}> 
        {t('certSecDesc')}
      </Text>

      <Portal>
        <Modal
          visible={Boolean(selectedBadge)}
          onDismiss={closeModal}
          contentContainerStyle={[styles.badgeModal, { backgroundColor: palette.modalBackground, borderColor: palette.modalBorder }]}
        >
          {selectedBadge ? (
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalHeader}>
                <Image source={{ uri: getBadgeImageUri(selectedBadge) }} style={styles.modalBadgeImage} />
                <View style={styles.modalHeaderText}>
                  <Text variant="titleLarge" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
                    {getLocalizedBadgeText(selectedBadge, 'name')}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                    {getLocalizedBadgeCourseTitle(selectedBadge)}
                  </Text>
                  <View style={styles.modalChipRow}>
                    <Chip style={[styles.modalStateChip, { backgroundColor: getBadgeStatusTone(selectedBadge).chip }]} textStyle={[styles.modalStateChipText, { color: getBadgeStatusTone(selectedBadge).text }]}>
                      {getBadgeStatusLabel(selectedBadge)}
                    </Chip>
                    <Chip style={[styles.modalTypeChip, { backgroundColor: palette.modalAccentSoft }]} textStyle={[styles.modalTypeChipText, { color: theme.colors.onSurface }]}>
                      {selectedBadge.is_major_badge ? t('majorBadge') : t('courseBadge')}
                    </Chip>
                  </View>
                </View>
              </View>

              <Divider style={[styles.modalDivider, { backgroundColor: palette.summaryBorder }]} />

              <Text style={[styles.modalLabel, { color: theme.colors.onSurfaceVariant }]}>{t('badgeDetails')}</Text>
              <Text style={[styles.modalBody, { color: theme.colors.onSurface }]}>
                {getLocalizedBadgeText(selectedBadge, 'description') || t('badgeDefaultDesc')}
              </Text>

              <Text style={[styles.modalLabel, { color: theme.colors.onSurfaceVariant }]}>{t('badgeProgressLabel')}</Text>
              <Text style={[styles.modalBody, { color: theme.colors.onSurface }]}>
                {isEarnedBadge(selectedBadge)
                  ? t('badgeProgressEarned', { count: selectedBadge.progress_current || selectedBadge.completed_modules || selectedBadge.completed_badges || 0 })
                  : isPendingBadge(selectedBadge)
                    ? t('badgeProgressPending')
                    : t('badgeProgressCurrent', { completed: selectedBadge.progress_current || selectedBadge.completed_modules || selectedBadge.completed_badges || 0, total: selectedBadge.progress_required || selectedBadge.required_completed_modules || selectedBadge.required_badges_count || 1 })}
              </Text>
              <ProgressBar
                progress={getBadgeProgressValue(selectedBadge)}
                color={getBadgeStatusTone(selectedBadge).progress}
                style={[styles.modalProgressBar, { backgroundColor: palette.progressTrack }]}
              />

              <Text style={[styles.modalLabel, { color: theme.colors.onSurfaceVariant }]}>{t('skillsCovered')}</Text>
              <View style={styles.modalSkillWrap}>
                {getLocalizedBadgeArray(selectedBadge, 'skills_awarded').length ? (
                  getLocalizedBadgeArray(selectedBadge, 'skills_awarded').map((skill, index) => (
                    <Chip key={`${skill}-${index}`} compact style={[styles.skillChip, { backgroundColor: palette.modalAccentSoft }]} textStyle={[styles.skillChipText, { color: theme.colors.onSurface }]}>
                      {skill}
                    </Chip>
                  ))
                ) : (
                  <Text style={[styles.modalBody, { color: theme.colors.onSurface }]}>{t('noSkillHighlights')}</Text>
                )}
              </View>

              <Text style={[styles.modalLabel, { color: theme.colors.onSurfaceVariant }]}>{t('lessonHighlights')}</Text>
              {getLocalizedBadgeArray(selectedBadge, 'lesson_highlights').length ? (
                <View style={styles.lessonList}>
                  {getLocalizedBadgeArray(selectedBadge, 'lesson_highlights').map((lesson, index) => (
                    <View key={`${lesson}-${index}`} style={styles.lessonRow}>
                      <View style={[styles.lessonDot, { backgroundColor: theme.colors.primary }]} />
                      <Text style={[styles.lessonText, { color: theme.colors.onSurface }]}>{lesson}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.modalBody, { color: theme.colors.onSurface }]}>{t('noLessonHighlights')}</Text>
              )}

              {selectedBadge.badge_image_source ? (
                <TouchableOpacity onPress={handleOpenImageSource} activeOpacity={0.85}>
                  <Text style={[styles.imageSourceLink, { color: theme.colors.primary }]}>{t('openImageSource')}</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.colors.primary }]} onPress={closeModal} activeOpacity={0.92}>
                <Text style={[styles.closeButtonText, { color: theme.colors.onPrimary }]}>{t('closeBadge')}</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : null}
        </Modal>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 32 },
  idCard: { padding: 15, borderRadius: 22, marginBottom: 18, marginTop: 16 },
  idContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  idText: { marginLeft: 15 },
  idFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 10 },
  headerChipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, flex: 1, marginRight: 10 },
  headerChip: { minHeight: 34, borderRadius: 12 },
  headerChipText: { fontWeight: '800' },
  gyroChip: { minHeight: 34, borderRadius: 12 },
  gyroChipText: { fontWeight: '800' },
  summaryCard: {
    borderRadius: 22,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
  },
  summaryTitle: { fontWeight: '800', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  summaryChip: { marginRight: 8, marginBottom: 8, borderRadius: 12 },
  summaryChipText: { fontWeight: '800' },
  sectionTitle: { marginBottom: 12, fontWeight: '800', fontSize: 18 },
  loadingCard: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  loadingBox: { paddingVertical: 24, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontWeight: '800', marginBottom: 6 },
  emptyBody: {},
  caseCard: {
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    elevation: 0,
    marginBottom: 8,
  },
  caseFrameOuter: {
    padding: 11,
    borderRadius: 28,
    borderWidth: 1.5,
  },
  caseFrameInner: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  caseGlassGlarePrimary: {
    position: 'absolute',
    top: -20,
    left: 28,
    width: 58,
    height: '130%',
    transform: [{ skewX: '-12deg' }],
    zIndex: 1,
  },
  caseGlassGlareSecondary: {
    position: 'absolute',
    top: -6,
    right: 32,
    width: 22,
    height: '110%',
    transform: [{ skewX: '-14deg' }],
    zIndex: 1,
  },
  caseInterior: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 54,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  badgeCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeCard: {
    width: '100%',
    minHeight: 132,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 18,
  },
  caseShelfRail: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 16,
    height: 8,
    borderRadius: 999,
  },
  caseShelfFoot: {
    position: 'absolute',
    left: '34%',
    right: '34%',
    bottom: 8,
    height: 5,
    borderRadius: 999,
  },
  badgeEmblemFrame: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
    overflow: 'hidden',
  },
  badgeEmblem: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#D9D4C8',
  },
  badgeEmblemMuted: { opacity: 0.22 },
  lockBadgePill: {
    position: 'absolute',
    bottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  lockBadgePillText: {
    color: '#E9EEF3',
    fontSize: 8,
    letterSpacing: 0.8,
    fontWeight: '800',
  },
  progressWrap: {
    width: '74%',
    marginTop: 12,
    borderRadius: 999,
    overflow: 'hidden',
  },
  badgeProgressBar: {
    height: 6,
    borderRadius: 999,
  },
  disclaimer: { marginTop: 6, textAlign: 'center' },
  badgeModal: {
    margin: 18,
    borderRadius: 24,
    maxHeight: '88%',
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  modalHeaderText: {
    flex: 1,
    flexShrink: 1,
    marginLeft: 14,
  },
  modalBadgeImage: {
    width: 96,
    height: 96,
    borderRadius: 20,
    backgroundColor: '#D7E2E4',
  },
  modalTitle: { fontWeight: '800', flexShrink: 1 },
  modalSubtitle: { marginTop: 4 },
  modalChipRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, marginBottom: 2 },
  modalStateChip: { marginRight: 8, marginBottom: 8 },
  modalStateChipText: { fontWeight: '800' },
  modalTypeChip: { marginRight: 8, marginBottom: 8 },
  modalTypeChipText: { fontWeight: '700' },
  modalDivider: { marginVertical: 14 },
  modalLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 10,
  },
  modalBody: { lineHeight: 20, flexShrink: 1 },
  modalProgressBar: { height: 8, borderRadius: 8, marginTop: 8 },
  modalSkillWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 },
  skillChip: { marginRight: 8, marginBottom: 8 },
  skillChipText: { fontWeight: '700' },
  lessonList: { marginTop: 2 },
  lessonRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  lessonDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 10,
  },
  lessonText: { flex: 1, lineHeight: 20 },
  imageSourceLink: {
    marginTop: 16,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  closeButton: {
    marginTop: 18,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: { fontWeight: '800', fontSize: 15 },
});
