import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBuilding } from '@/lib/building';
import { Body, Button, Card, Caption, Heading, LoadingState, StatusBadge } from '@/components/ui';
import { colors, spacing, typography } from '@/lib/theme';
import { t } from '@/lib/i18n';

type DashboardData = {
  nextReservation: {
    id: string;
    startTime: string;
    endTime: string;
    machine: { name: string; laundryRoom: { name: string } };
  } | null;
  activeTimer: {
    id: string;
    expectedCompletionTime: string;
    machine: { name: string };
  } | null;
  machinesAvailable: number;
  machinesInUse: number;
  defectiveMachines: Array<{ id: string; name: string; status: string }>;
  openChecklistNeeded: boolean;
};

export default function DashboardScreen() {
  const { token } = useAuth();
  const { buildingId, loading: buildingLoading } = useBuilding();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', buildingId],
    enabled: !!token && !!buildingId,
    queryFn: () =>
      apiRequest<DashboardData>(`/buildings/${buildingId}/dashboard`, { token: token! }),
    refetchInterval: 30_000,
  });

  if (buildingLoading || isLoading) return <LoadingState />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Heading>{t('dashboard.title')}</Heading>

      <Card>
        <Text style={typography.label}>{t('dashboard.nextReservation')}</Text>
        {data?.nextReservation ? (
          <>
            <Body>{data.nextReservation.machine.name}</Body>
            <Caption>
              {data.nextReservation.machine.laundryRoom.name} ·{' '}
              {new Date(data.nextReservation.startTime).toLocaleString('de-CH')}
            </Caption>
          </>
        ) : (
          <Caption>{t('dashboard.noReservation')}</Caption>
        )}
      </Card>

      <Card>
        <Text style={typography.label}>{t('dashboard.activeTimer')}</Text>
        {data?.activeTimer ? (
          <>
            <Body>{data.activeTimer.machine.name}</Body>
            <Caption>
              {new Date(data.activeTimer.expectedCompletionTime).toLocaleTimeString('de-CH')}
            </Caption>
            <Button label={t('timer.remaining')} onPress={() => router.push('/(main)/timer')} />
          </>
        ) : (
          <Caption>{t('dashboard.noTimer')}</Caption>
        )}
      </Card>

      <View style={styles.statsRow}>
        <Card>
          <Text style={styles.statNumber}>{data?.machinesAvailable ?? 0}</Text>
          <Caption>{t('dashboard.available')}</Caption>
        </Card>
        <Card>
          <Text style={styles.statNumber}>{data?.machinesInUse ?? 0}</Text>
          <Caption>{t('dashboard.inUse')}</Caption>
        </Card>
        <Card>
          <Text style={[styles.statNumber, { color: colors.danger }]}>
            {data?.defectiveMachines.length ?? 0}
          </Text>
          <Caption>{t('dashboard.defective')}</Caption>
        </Card>
      </View>

      {data?.defectiveMachines.map((machine) => (
        <Card key={machine.id}>
          <View style={styles.row}>
            <Body>{machine.name}</Body>
            <StatusBadge status={machine.status} />
          </View>
        </Card>
      ))}

      {data?.openChecklistNeeded ? (
        <Button
          label={t('machine.checklist')}
          onPress={() => router.push('/(main)/checklist')}
        />
      ) : null}

      <Button label={t('dashboard.reserve')} onPress={() => router.push('/(main)/reserve')} />
      <Button
        label={t('dashboard.scanQr')}
        variant="secondary"
        onPress={() => router.push('/(main)/scan')}
      />
      <Button
        label={t('dashboard.reportProblem')}
        variant="secondary"
        onPress={() => router.push('/(main)/defects')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statNumber: { fontSize: 28, fontWeight: '700', color: colors.primary },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
