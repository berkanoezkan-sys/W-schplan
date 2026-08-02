import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useBuildingNotices } from '@/lib/hooks/useBuildingNotices';
import { NoticeCard } from '@/components/notices/NoticeCard';
import { EmptyState, LoadingState, PageShell, SegmentedControl } from '@/components/ui';
import { colors, spacing, typography } from '@/lib/theme';
import { t } from '@/lib/i18n';

export default function BuildingNoticesResidentScreen() {
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  const { data, isLoading } = useBuildingNotices(false);

  const notices = useMemo(() => {
    const all = data?.notices ?? [];
    if (filter === 'active') {
      return all.filter((n) => n.isActive || n.isUpcoming);
    }
    return all;
  }, [data?.notices, filter]);

  if (isLoading) return <LoadingState />;

  return (
    <PageShell>
      <Text style={styles.intro}>{t('notices.residentHint')}</Text>

      <SegmentedControl
        value={filter}
        onChange={(v) => setFilter(v as 'active' | 'all')}
        options={[
          { value: 'active', label: t('notices.tabActive') },
          { value: 'all', label: t('notices.tabAll') },
        ]}
      />

      {notices.length === 0 ? (
        <EmptyState message={t('notices.emptyResident')} />
      ) : (
        <View style={styles.list}>
          {notices.map((notice) => (
            <NoticeCard key={notice.id} notice={notice} showUnread />
          ))}
        </View>
      )}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  intro: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.md },
  list: { marginTop: spacing.md },
});
