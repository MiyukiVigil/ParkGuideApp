import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Text, Avatar, Divider, List, Chip, useTheme, ActivityIndicator, ProgressBar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useRouter } from 'expo-router';

import api from '../utils/api';
import badgeService from '../services/badgeService';
import CONFIG, { getAvatarUrl } from '../constants/config';

export default function Certification() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [grantedBadges, setGrantedBadges] = useState([]);
  const [pendingBadges, setPendingBadges] = useState([]);
  const [allBadges, setAllBadges] = useState([]);
  const [achievements, setAchievements] = useState([]);

  const showSessionExpiredAlert = useCallback(() => {
    router.replace('/');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadCertificationData = async () => {
        setLoading(true);
        try {
          // Use badgeService to fetch badges
          const [granted, pending, allBadgesData, achievementBadges] = await Promise.all([
            badgeService.getGrantedBadges(),
            badgeService.getPendingBadges(),
            badgeService.getAllBadges(),
            badgeService.getAchievementBadges(),
          ]);

          if (!isActive) return;

          setGrantedBadges(granted || []);
          setPendingBadges(pending || []);
          setAllBadges(allBadgesData || []);
          setAchievements(achievementBadges || []);
        } catch (err) {
          if (err.status === 401 || err.status === 403) {
            showSessionExpiredAlert();
            return;
          }
          console.error('Failed loading certifications:', err.message);
          setGrantedBadges([]);
          setPendingBadges([]);
          setAllBadges([]);
          setAchievements([]);
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      };

      loadCertificationData();

      return () => {
        isActive = false;
      };
    }, [showSessionExpiredAlert])
  );

  const lockedBadges = useMemo(
    () => allBadges.filter((badge) => !badge.earned && !badge.pending && !badge.eligible),
    [allBadges]
  );

  const eligibleBadges = useMemo(
    () => allBadges.filter((badge) => !badge.earned && badge.eligible && !badge.pending),
    [allBadges]
  );

  const badgeSummary = useMemo(() => ({
    total: allBadges.length,
    earned: grantedBadges.length,
    achievements: achievements.length,
    pending: pendingBadges.length,
    locked: lockedBadges.length,
    eligible: eligibleBadges.length,
  }), [allBadges.length, grantedBadges.length, achievements.length, pendingBadges.length, lockedBadges.length, eligibleBadges.length]);

  const isVerifiedGuide = useMemo(() => {
    if (loading) return false;
    if (badgeSummary.total === 0) return false;
    return badgeSummary.earned === badgeSummary.total;
  }, [loading, badgeSummary]);

  const getBadgeProgressValue = useCallback((badge) => {
    const required = Number(badge?.required_badges_count || 0);
    const completed = Number(badge?.completed_badges || 0);
    if (required <= 0 || required === 1) return completed > 0 ? 1 : 0;
    return Math.min(1, completed / required);
  }, []);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Digital ID Card */}
      <Card style={[styles.idCard, { backgroundColor: theme.colors.primary }]}>
        <View style={styles.idContent}>
          <Avatar.Image 
            size={80} 
            source={{ uri: getAvatarUrl("Miyuki") }} 
          />
          <View style={styles.idText}>
            <Text 
              variant="titleLarge" 
              style={{ color: theme.colors.onPrimary, fontWeight: 'bold' }}
            >
              MIYUKI VIGIL
            </Text>
            <Text 
              variant="bodyMedium" 
              style={{ color: theme.colors.onPrimary, marginTop: 2 }}
            >
              {t("certMedium")}
            </Text>
            <Text 
              variant="labelSmall" 
              style={{ color: theme.colors.onPrimary, opacity: 0.92, marginTop: 4 }}
            >
              ID: SFC-2026-0042
            </Text>
          </View>
        </View>

        <Divider style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />

        <View style={styles.idFooter}>
          <Chip 
            icon={isVerifiedGuide ? 'check-decagram' : 'shield-alert'}
            style={[styles.chip, { backgroundColor: theme.colors.surface }]}
            textStyle={{ color: theme.colors.onSurface, fontWeight: '600' }}
          >
            {isVerifiedGuide ? t("verifiedGuide") : 'Pending Verification'}
          </Chip>
          <Text style={{ color: theme.colors.onPrimary, fontSize: 10 }}>Exp: 12/2026</Text>
        </View>
      </Card>

      <Card style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}> 
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 10 }}>
          Badge Summary
        </Text>

        <View style={styles.summaryRow}>
          <Chip
            icon="medal"
            style={[styles.summaryChip, { backgroundColor: theme.colors.secondaryContainer }]}
            textStyle={{ color: theme.colors.onSecondaryContainer }}
          >
            Earned: {badgeSummary.earned}
          </Chip>
          <Chip
            icon="gift"
            style={[styles.summaryChip, { backgroundColor: theme.colors.tertiaryContainer }]}
            textStyle={{ color: theme.colors.onTertiaryContainer }}
          >
            Pending: {badgeSummary.pending}
          </Chip>
        </View>

        <View style={styles.summaryRow}>
          <Chip
            icon="lock"
            style={[styles.summaryChip, { backgroundColor: theme.colors.surfaceVariant }]}
            textStyle={{ color: theme.colors.onSurfaceVariant }}
          >
            Locked: {badgeSummary.locked}
          </Chip>
          <Chip
            icon="shape"
            style={[styles.summaryChip, { backgroundColor: theme.colors.surfaceVariant }]}
            textStyle={{ color: theme.colors.onSurfaceVariant }}
          >
            Total: {badgeSummary.total}
          </Chip>
        </View>
      </Card>

      {/* Progress & Records */}
      <Text 
        variant="titleMedium" 
        style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
      >
        {t("comModules")}
      </Text>

      <Card style={{ marginBottom: 20, backgroundColor: theme.colors.surface }}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator animating color={theme.colors.primary} />
          </View>
        ) : sortedModules.length === 0 ? (
          <List.Item
            title={t("noCompletedModulesYet")}
            description={t("finishTrainingModulesUnlockBadges")}
            titleStyle={{ color: theme.colors.onSurface }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            left={props => <List.Icon {...props} icon="book-open-page-variant" color={theme.colors.primary} />}
          />
        ) : (
          sortedModules.slice(0, 6).map((row, index) => (
            <View key={row.id || `${row.module}-${index}`}>
              <List.Item
                title={row.moduleTitle}
                description={`${row.courseTitle}${row.completed_at ? ` • ${new Date(row.completed_at).toLocaleDateString()}` : ''}`}
                titleStyle={{ color: theme.colors.onSurface }}
                descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                left={props => <List.Icon {...props} icon="certificate" color={theme.colors.primary} />}
              />
              {index < Math.min(sortedModules.length, 6) - 1 ? <Divider /> : null}
            </View>
          ))
        )}
      </Card>

      <Text
        variant="titleMedium"
        style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
      >
        Badge Progress
      </Text>

      <Card style={{ marginBottom: 20, backgroundColor: theme.colors.surface }}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator animating color={theme.colors.primary} />
          </View>
        ) : (
          <View style={styles.badgeWrap}>
            {lockedEligibleBadges.map((badge) => (
              <Card key={`eligible-${badge.id}`} style={[styles.badgeCard, { backgroundColor: theme.colors.secondaryContainer }]}>
                <List.Item
                  title={badge.name}
                  description={badge.course_title ? `Course: ${badge.course_title}` : 'Global badge'}
                  titleStyle={{ color: theme.colors.onSecondaryContainer, fontWeight: '700' }}
                  descriptionStyle={{ color: theme.colors.onSecondaryContainer }}
                  left={props => <List.Icon {...props} icon="lock-open-check" color={theme.colors.onSecondaryContainer} />}
                  right={() => (
                    <View style={styles.badgeRight}>
                      <Chip compact icon="gift" style={{ backgroundColor: theme.colors.primary }} textStyle={{ color: theme.colors.onPrimary }}>
                        Ready
                      </Chip>
                    </View>
                  )}
                />
              </Card>
            ))}

            {lockedIneligibleBadges.map((badge) => (
              <Card key={`locked-${badge.id}`} style={[styles.badgeCard, { backgroundColor: theme.colors.surfaceVariant }]}>
                <View style={styles.lockedTopRow}>
                  <View style={styles.lockedTitleWrap}>
                    <List.Icon icon="lock" color={theme.colors.onSurfaceVariant} />
                    <View style={styles.lockedTextWrap}>
                      <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, fontWeight: '700' }}>
                        {badge.name}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {badge.course_title ? `Course: ${badge.course_title}` : 'Global badge'}
                      </Text>
                    </View>
                  </View>

                  <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    {badge.completed_modules}/{badge.required_completed_modules}
                  </Text>
                </View>

                <ProgressBar
                  progress={getBadgeProgressValue(badge)}
                  color={theme.colors.primary}
                  style={styles.badgeProgressBar}
                />
              </Card>
            ))}

            {lockedEligibleBadges.length === 0 && lockedIneligibleBadges.length === 0 ? (
              <List.Item
                title={t("allActiveBadgesEarned")}
                description={t("greatWorkUnlockedEveryActiveBadge")}
                titleStyle={{ color: theme.colors.onSurface }}
                descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                left={props => <List.Icon {...props} icon="star-circle" color={theme.colors.primary} />}
              />
            ) : null}
          </View>
        )}
      </Card>

      <Text
        variant="titleMedium"
        style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
      >
        Badges
      </Text>

      <Card style={{ marginBottom: 20, backgroundColor: theme.colors.surface }}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator animating color={theme.colors.primary} />
          </View>
        ) : earnedBadges.length === 0 ? (
          <List.Item
            title={t("noBadgesEarnedYet")}
            description={t("completeMoreModulesEarnBadges")}
            titleStyle={{ color: theme.colors.onSurface }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            left={props => <List.Icon {...props} icon="medal-outline" color={theme.colors.primary} />}
          />
        ) : (
          <View style={styles.badgeWrap}>
            {earnedBadges.map((row) => (
              <Card key={row.id} style={[styles.badgeCard, { backgroundColor: theme.colors.surfaceVariant }]}>
                <List.Item
                  title={row.name}
                  description={row.course_title ? `Course: ${row.course_title}` : (row.is_major_badge ? 'Achievement Badge' : 'Global badge')}
                  titleStyle={{ color: theme.colors.onSurfaceVariant, fontWeight: '700' }}
                  descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                  left={props => <List.Icon {...props} icon={row.is_major_badge ? 'trophy' : 'medal'} color={theme.colors.primary} />}
                  right={() => (
                    <View style={styles.badgeRight}>
                      <Chip compact icon="check-circle" style={{ backgroundColor: theme.colors.secondaryContainer }} textStyle={{ color: theme.colors.onSecondaryContainer }}>
                        Earned
                      </Chip>
                    </View>
                  )}
                />
              </Card>
            ))}
          </View>
        )}
      </Card>
      
      <Text 
        variant="bodySmall" 
        style={[styles.disclaimer, { color: theme.colors.onSurfaceVariant }]}
      >
        {t("certSecDesc")}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  contentContainer: { padding: 20, paddingBottom: 32 },

  idCard: { padding: 15, borderRadius: 18, marginBottom: 25, marginTop: 25 },

  idContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },

  idText: { marginLeft: 15 },

  idFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },

  chip: { height: 30 },

  summaryCard: { borderRadius: 16, padding: 12, marginBottom: 20 },

  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 2 },

  summaryChip: { marginRight: 8, marginBottom: 8 },

  sectionTitle: { marginBottom: 12, fontWeight: 'bold', fontSize: 16 },

  loadingBox: { paddingVertical: 20, alignItems: 'center', justifyContent: 'center' },

  badgeWrap: { padding: 12 },

  badgeChip: { marginRight: 8, marginBottom: 8 },

  badgeCard: { marginBottom: 10, borderRadius: 14 },

  badgeRight: { justifyContent: 'center', marginRight: 10 },

  lockedTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
  },

  lockedTitleWrap: { flexDirection: 'row', alignItems: 'center', flex: 1 },

  lockedTextWrap: { flexShrink: 1, marginLeft: -2 },

  badgeProgressBar: { marginHorizontal: 14, marginBottom: 14, marginTop: 8, height: 8, borderRadius: 8 },

  disclaimer: { marginTop: 20, textAlign: 'center' }
});
