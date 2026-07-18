import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBuilding } from '@/lib/building';
import { Card, Caption, EmptyState, Heading, LoadingState, StatusBadge } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Heading>{view === 'day' ? t('schedule.today') : t('schedule.week')}</Heading>

      <ViewToggle view={view} onChange={setView} />

      {!data?.reservations.length ? (
        <EmptyState message={t('schedule.empty')} />
      ) : (
        data.reservations.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            onPress={() => router.push(`/(main)/machine/${item.machine.id}`)}
          >
            <Card>
              <Text style={styles.machineName}>{item.machine.name}</Text>
              <Caption>
                {item.machine.laundryRoom.name} · {item.localStart}–{item.localEnd}
              </Caption>
              <Caption>{item.privacyLabel}</Caption>
              <StatusBadge status={item.machine.status} />
            </Card>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: 'day' | 'week';
  onChange: (v: 'day' | 'week') => void;
}) {
  return (
    <View style={styles.toggle}>
      {(['day', 'week'] as const).map((v) => (
        <Pressable
          key={v}
          accessibilityRole="button"
          accessibilityState={{ selected: view === v }}
          onPress={() => onChange(v)}
          style={[styles.toggleBtn, view === v && styles.toggleBtnActive]}
        >
          <Text style={[styles.toggleText, view === v && styles.toggleTextActive]}>
            {v === 'day' ? t('schedule.today') : t('schedule.week')}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  toggle: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  toggleBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  toggleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleText: { fontWeight: '600', color: colors.text },
  toggleTextActive: { color: '#fff' },
  machineName: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 4 },
});
