import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBuilding } from '@/lib/building';
import {
  AlertBanner,
  HeroCard,
  LoadingState,
  PageShell,
  QuickActionBar,
  StatPill,
} from '@/components/ui';
import { colors, spacing } from '@/lib/theme';
import { t } from '@/lib/i18n';

type DashboardData = {
  nextReservation: {
    id: string;
    startTime: string;
    endTime: string;
    machine: { id: string; name: string; laundryRoom: { name: string } };
  } | null;
  activeTimer: {
    id: string;
    expectedCompletionTime: string;
    machine: { id: string; name: string };
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

  const defectiveCount = data?.defectiveMachines.length ?? 0;

  return (
    <PageShell>
      {data?.activeTimer ? (
        <HeroCard
          label={t('dashboard.hero.timer')}
          title={data.activeTimer.machine.name}
          subtitle={new Date(data.activeTimer.expectedCompletionTime).toLocaleTimeString('de-CH', {
            hour: '2-digit',
            minute: '2-digit',
          })}
          accentColor={colors.accent}
          actionLabel={t('dashboard.viewTimer')}
          onPress={() => router.push('/(main)/timer')}
        />
      ) : data?.nextReservation ? (
        <HeroCard
          label={t('dashboard.hero.reservation')}
          title={data.nextReservation.machine.name}
          subtitle={`${data.nextReservation.machine.laundryRoom.name} · ${new Date(data.nextReservation.startTime).toLocaleString('de-CH', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
          accentColor={colors.primary}
          actionLabel={t('dashboard.viewReservation')}
          onPress={() => router.push(`/(main)/machine/${data.nextReservation!.machine.id}`)}
        />
      ) : (
        <HeroCard
          label={t('dashboard.hero.empty')}
          title={t('dashboard.hero.emptySubtitle')}
          accentColor={colors.primaryLight}
          actionLabel={t('dashboard.reserveNow')}
          onPress={() => router.push('/(main)/reserve')}
        />
      )}

      <View style={styles.statsRow}>
        <StatPill label={t('dashboard.available')} count={data?.machinesAvailable ?? 0} color={colors.success} />
        <StatPill label={t('dashboard.inUse')} count={data?.machinesInUse ?? 0} color={colors.primary} />
        <StatPill
          label={t('dashboard.defective')}
          count={defectiveCount}
          color={colors.danger}
          onPress={defectiveCount > 0 ? () => router.push('/(main)/defects') : undefined}
        />
      </View>

      {data?.openChecklistNeeded ? (
        <AlertBanner
          message={t('dashboard.checklistNeeded')}
          actionLabel={t('dashboard.completeChecklist')}
          onAction={() => router.push('/(main)/checklist')}
        />
      ) : null}

      <QuickActionBar
        actions={[
          { icon: 'qr-code-outline', label: t('dashboard.scanQr'), onPress: () => router.push('/(main)/scan') },
          { icon: 'calendar-outline', label: t('dashboard.reserve'), onPress: () => router.push('/(main)/reserve') },
          { icon: 'alert-circle-outline', label: t('dashboard.reportProblem'), onPress: () => router.push('/(main)/defects') },
        ]}
      />
    </PageShell>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: spacing.sm },
});
