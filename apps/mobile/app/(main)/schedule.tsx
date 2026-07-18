import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBuilding } from '@/lib/building';
import { EmptyState, ListRow, LoadingState, PageShell, SegmentedControl } from '@/components/ui';
import { colors, machineStatusColors, spacing } from '@/lib/theme';
import { t } from '@/lib/i18n';

type ScheduleItem = {
  id: string;
  privacyLabel: string;
  localStart: string;
  localEnd: string;
  status: string;
  machine: {
    id: string;
    name: string;
    machineType: string;
    status: string;
    laundryRoom: { name: string };
  };
};

export default function ScheduleScreen() {
  const { token } = useAuth();
  const { buildingId } = useBuilding();
  const [view, setView] = useState<'day' | 'week'>('day');

  const { data, isLoading } = useQuery({
    queryKey: ['schedule', buildingId, view],
    enabled: !!token && !!buildingId,
    queryFn: () =>
      apiRequest<{ reservations: ScheduleItem[] }>(
        `/buildings/${buildingId}/schedule?view=${view}`,
        { token: token! },
      ),
  });

  if (isLoading) return <LoadingState />;

  return (
    <PageShell>
      <SegmentedControl
        value={view}
        onChange={setView}
        options={[
          { value: 'day', label: t('schedule.today') },
          { value: 'week', label: t('schedule.week') },
        ]}
      />

      {!data?.reservations.length ? (
        <EmptyState
          message={t('schedule.empty')}
          actionLabel={t('schedule.emptyAction')}
          onAction={() => router.push('/(main)/reserve')}
        />
      ) : (
        <View style={styles.list}>
          {data.reservations.map((item) => (
            <ListRow
              key={item.id}
              title={item.machine.name}
              subtitle={`${item.machine.laundryRoom.name} · ${item.localStart}–${item.localEnd} · ${item.privacyLabel}`}
              statusColor={machineStatusColors[item.machine.status]}
              showChevron
              onPress={() => router.push(`/(main)/machine/${item.machine.id}`)}
            />
          ))}
        </View>
      )}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    paddingHorizontal: spacing.xs,
  },
});
