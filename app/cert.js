import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Card, Text, Avatar, Divider, List, Chip, useTheme, ActivityIndicator, ProgressBar, Portal, Modal, Button } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useRouter } from 'expo-router';

import badgeService from '../services/badgeService';
import CONFIG, { getAvatarUrl } from '../constants/config';

export default function Certification() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allBadges, setAllBadges] = useState([]);
  const [selectedBadge, setSelectedBadge] = useState(null);

  const showSessionExpiredAlert = useCallback(() => {
    router.replace('/');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadCertificationData = async () => {
        setLoading(true);
        try {
          const allBadgesData = await badgeService.getAllBadges();
          const normalizedBadges = Array.isArray(allBadgesData)
            ? allBadgesData
            : (allBadgesData?.results || []);

          if (!isActive) return;

          setAllBadges(normalizedBadges);
        } catch (err) {
          if (err.status === 401 || err.status === 403) {
            showSessionExpiredAlert();
            return;
          }
          console.error('Failed loading certifications:', err.message);
          setAllBadges([]);
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

  const grantedBadges = useMemo(
    () => allBadges.filter((badge) => badge.earned || badge.status === 'granted'),
    [allBadges]
  );

  const pendingBadges = useMemo(
    () => allBadges.filter((badge) => badge.pending || badge.status === 'pending'),
    [allBadges]
  );

  const achievements = useMemo(
    () => allBadges.filter((badge) => badge.is_major_badge && (badge.earned || badge.status === 'granted')),
    [allBadges]
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

  const sortedModules = useMemo(() => [], []);

  const courseGroupedBadges = useMemo(() => {
    return allBadges.reduce((acc, badge) => {
      const groupKey = badge.course_title || 'Global Achievements';
      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(badge);
      return acc;
    }, {});
  }, [allBadges]);

  const groupedBadgeEntries = useMemo(() => {
    return Object.entries(courseGroupedBadges)
      .map(([courseTitle, badges]) => {
        const earnedCount = badges.filter((badge) => badge.earned || badge.status === 'granted').length;
        return {
          courseTitle,
          badges,
          earnedCount,
          totalCount: badges.length,
        };
      })
      .sort((a, b) => b.earnedCount - a.earnedCount);
  }, [courseGroupedBadges]);

  const getBadgeStatusLabel = useCallback((badge) => {
    if (badge.earned || badge.status === 'granted') return 'Earned';
    if (badge.pending || badge.status === 'pending') return 'Pending approval';
    if (badge.eligible) return 'Ready to claim';
    return 'In progress';
  }, []);

  const getBadgeStatusColor = useCallback((badge) => {
    if (badge.earned || badge.status === 'granted') return '#1B8A5A';
    if (badge.pending || badge.status === 'pending') return '#B98900';
    if (badge.eligible) return '#2E7D5A';
    return '#546E7A';
  }, []);

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
            {eligibleBadges.map((badge) => (
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

            {lockedBadges.map((badge) => (
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

            {eligibleBadges.length === 0 && lockedBadges.length === 0 ? (
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
        Course Badges
      </Text>

      {loading ? (
        <Card style={{ marginBottom: 20, backgroundColor: theme.colors.surface }}>
          <View style={styles.loadingBox}>
            <ActivityIndicator animating color={theme.colors.primary} />
          </View>
        </Card>
      ) : groupedBadgeEntries.length === 0 ? (
        <Card style={{ marginBottom: 20, backgroundColor: theme.colors.surface }}>
          <List.Item
            title={t("noBadgesEarnedYet")}
            description={t("completeMoreModulesEarnBadges")}
            titleStyle={{ color: theme.colors.onSurface }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            left={props => <List.Icon {...props} icon="medal-outline" color={theme.colors.primary} />}
          />
        </Card>
      ) : (
        groupedBadgeEntries.map((group) => (
          <Card key={group.courseTitle} style={[styles.groupCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.groupHeader}>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                  {group.courseTitle}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {group.earnedCount}/{group.totalCount} badges earned
                </Text>
              </View>
              <Chip icon="medal" compact>
                {Math.round((group.earnedCount / Math.max(group.totalCount, 1)) * 100)}%
              </Chip>
            </View>

            <Divider style={{ marginBottom: 12 }} />

            {group.badges.map((badge) => (
              <TouchableOpacity
                key={`badge-${group.courseTitle}-${badge.id}`}
                activeOpacity={0.85}
                onPress={() => setSelectedBadge(badge)}
              >
                <View style={[styles.badgeItem, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <View style={styles.badgeItemLeft}>
                    <List.Icon
                      icon={badge.is_major_badge ? 'trophy' : 'medal-outline'}
                      color={theme.colors.primary}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.badgeName, { color: theme.colors.onSurfaceVariant }]}>{badge.name}</Text>
                      <Text style={{ color: theme.colors.onSurfaceVariant, opacity: 0.8 }}>
                        {getBadgeStatusLabel(badge)}
                      </Text>
                    </View>
                  </View>
                  <Chip
                    compact
                    style={{ backgroundColor: getBadgeStatusColor(badge) }}
                    textStyle={{ color: '#FFFFFF', fontWeight: '700' }}
                  >
                    {badge.earned || badge.status === 'granted' ? 'Done' : 'View'}
                  </Chip>
                </View>
              </TouchableOpacity>
            ))}
          </Card>
        ))
      )}
      
      <Text 
        variant="bodySmall" 
        style={[styles.disclaimer, { color: theme.colors.onSurfaceVariant }]}
      >
        {t("certSecDesc")}
      </Text>

      <Portal>
        <Modal
          visible={Boolean(selectedBadge)}
          onDismiss={() => setSelectedBadge(null)}
          contentContainerStyle={[styles.badgeModal, { backgroundColor: theme.colors.surface }]}
        >
          {selectedBadge ? (
            <>
              <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                {selectedBadge.name}
              </Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                {selectedBadge.course_title || 'Global Achievement'}
              </Text>

              <View style={styles.modalChipRow}>
                <Chip
                  icon={selectedBadge.is_major_badge ? 'trophy' : 'medal'}
                  style={{ backgroundColor: theme.colors.secondaryContainer }}
                >
                  {selectedBadge.is_major_badge ? 'Achievement Badge' : 'Course Badge'}
                </Chip>
                <Chip
                  style={{ backgroundColor: getBadgeStatusColor(selectedBadge) }}
                  textStyle={{ color: '#FFFFFF' }}
                >
                  {getBadgeStatusLabel(selectedBadge)}
                </Chip>
              </View>

              <Divider style={{ marginVertical: 12 }} />

              <Text style={[styles.modalLabel, { color: theme.colors.onSurfaceVariant }]}>What You Achieved</Text>
              <Text style={{ color: theme.colors.onSurface }}>
                {selectedBadge.earned || selectedBadge.status === 'granted'
                  ? `You completed ${selectedBadge.completed_modules || selectedBadge.completed_badges || 0} required module milestones and earned this badge.`
                  : selectedBadge.pending || selectedBadge.status === 'pending'
                    ? 'You met the requirement. This badge is waiting for admin approval.'
                    : `Progress is ${selectedBadge.completed_modules || selectedBadge.completed_badges || 0} of ${selectedBadge.required_completed_modules || selectedBadge.required_badges_count || 1} requirements.`}
              </Text>

              <Text style={[styles.modalLabel, { color: theme.colors.onSurfaceVariant, marginTop: 12 }]}>Progress</Text>
              <ProgressBar
                progress={getBadgeProgressValue(selectedBadge)}
                color={theme.colors.primary}
                style={styles.badgeProgressBar}
              />

              <Button mode="contained" onPress={() => setSelectedBadge(null)} style={styles.modalCloseButton}>
                Close
              </Button>
            </>
          ) : null}
        </Modal>
      </Portal>
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

  groupCard: { marginBottom: 14, borderRadius: 14, padding: 12 },

  groupHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },

  badgeItem: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  badgeItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  badgeName: {
    fontWeight: '700',
    marginBottom: 2,
  },

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

  badgeModal: {
    margin: 20,
    borderRadius: 14,
    padding: 18,
  },

  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },

  modalChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },

  modalCloseButton: {
    marginTop: 16,
  },

  disclaimer: { marginTop: 20, textAlign: 'center' }
});
