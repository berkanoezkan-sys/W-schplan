import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBuilding } from '@/lib/building';
import { useBuildingNotices, useNoticeMutations } from '@/lib/hooks/useBuildingNotices';
import { NoticeCard } from '@/components/notices/NoticeCard';
import {
  Button,
  EmptyState,
  LoadingState,
  PageShell,
  SegmentedControl,
} from '@/components/ui';
import { colors, spacing, typography } from '@/lib/theme';
import { t } from '@/lib/i18n';

export default function BuildingNoticesAdminScreen() {
  const { isAdmin, building } = useBuilding();
  const [showArchived, setShowArchived] = useState(false);
  const { data, isLoading } = useBuildingNotices(showArchived);
  const { archive } = useNoticeMutations();

  const notices = data?.notices ?? [];
  const activeCount = useMemo(
    () => notices.filter((n) => !n.archivedAt && (n.isActive || n.isUpcoming)).length,
    [notices],
  );

  if (!isAdmin) {
    return (
      <PageShell>
        <EmptyState message={t('notices.adminOnly')} />
      </PageShell>
    );
  }

  if (isLoading) return <LoadingState />;

  function confirmArchive(noticeId: string, title: string) {
    Alert.alert(t('notices.archiveTitle'), title, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('notices.archive'),
        style: 'destructive',
        onPress: () => void archive.mutateAsync(noticeId),
      },
    ]);
  }

  return (
    <PageShell
      footer={
        <Button
          label={t('notices.create')}
          onPress={() => router.push('/(main)/building-notice-edit')}
        />
      }
    >
      <Text style={styles.intro}>{t('notices.adminHint')}</Text>
      {building ? (
        <Text style={styles.buildingScope}>
          {t('notices.buildingScope').replace('{building}', building.name)}
        </Text>
      ) : null}

      <SegmentedControl
        value={showArchived ? 'archived' : 'active'}
        onChange={(v) => setShowArchived(v === 'archived')}
        options={[
          { value: 'active', label: `${t('notices.tabActive')} (${activeCount})` },
          { value: 'archived', label: t('notices.tabArchived') },
        ]}
      />

      {notices.length === 0 ? (
        <EmptyState
          message={showArchived ? t('notices.emptyArchived') : t('notices.emptyActive')}
          actionLabel={showArchived ? undefined : t('notices.create')}
          onAction={showArchived ? undefined : () => router.push('/(main)/building-notice-edit')}
        />
      ) : (
        notices.map((notice) => (
          <View key={notice.id}>
            <NoticeCard
              notice={notice}
              onPress={() =>
                router.push({ pathname: '/(main)/building-notice-edit', params: { id: notice.id } })
              }
            />
            {!notice.archivedAt ? (
              <Pressable
                style={styles.archiveBtn}
                onPress={() => confirmArchive(notice.id, notice.title)}
                accessibilityRole="button"
              >
                <Ionicons name="archive-outline" size={16} color={colors.textMuted} />
                <Text style={styles.archiveText}>{t('notices.archive')}</Text>
              </Pressable>
            ) : null}
          </View>
        ))
      )}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  intro: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.md },
  buildingScope: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.md,
    marginTop: -spacing.xs,
  },
  archiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minHeight: 44,
  },
  archiveText: { ...typography.caption, color: colors.textMuted },
});
