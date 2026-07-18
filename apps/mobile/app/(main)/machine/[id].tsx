import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Alert, View, StyleSheet } from 'react-native';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  ActionRow,
  Body,
  Button,
  Caption,
  Card,
  ListRow,
  LoadingState,
  PageShell,
  SectionLabel,
  StatusBadge,
} from '@/components/ui';
import { colors, spacing } from '@/lib/theme';
import { t } from '@/lib/i18n';

export default function MachineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['machine', id],
    enabled: !!token && !!id,
    queryFn: () =>
      apiRequest<{
        machine: {
          id: string;
          name: string;
          machineType: string;
          status: string;
          laundryRoom: { name: string };
        };
        reservations: Array<{ id: string; startTime: string; endTime: string }>;
        defects: Array<{ id: string; category: string; status: string; description: string }>;
      }>(`/buildings/machines/${id}`, { token: token! }),
  });

  async function cancelReservation(reservationId: string) {
    Alert.alert(t('common.confirm'), t('machine.cancelConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        style: 'destructive',
        onPress: async () => {
          await apiRequest(`/buildings/reservations/${reservationId}`, {
            token: token!,
            method: 'DELETE',
          });
          refetch();
        },
      },
    ]);
  }

  if (isLoading || !data) return <LoadingState />;

  const { machine, reservations, defects } = data;
  const isInUse = machine.status === 'IN_USE';
  const machineTypeLabel =
    machine.machineType === 'WASHING_MACHINE' ? t('machine.type.washer') : t('machine.type.dryer');

  return (
    <PageShell>
      <Card>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Body>{machine.name}</Body>
            <Caption>{machine.laundryRoom.name} · {machineTypeLabel}</Caption>
          </View>
          <StatusBadge status={machine.status} />
        </View>
      </Card>

      <View style={styles.actions}>
        <ActionRow
          icon={isInUse ? 'timer-outline' : 'play-outline'}
          label={isInUse ? t('machine.viewTimer') : t('machine.startTimer')}
          onPress={() =>
            router.push({ pathname: '/(main)/timer', params: { machineId: machine.id } })
          }
        />
        <ActionRow
          icon="alert-circle-outline"
          label={t('machine.reportDefect')}
          onPress={() =>
            router.push({ pathname: '/(main)/defect', params: { machineId: machine.id } })
          }
        />
        <ActionRow
          icon="checkbox-outline"
          label={t('machine.checklist')}
          onPress={() =>
            router.push({
              pathname: '/(main)/checklist',
              params: { machineId: machine.id, machineType: machine.machineType },
            })
          }
        />
      </View>

      {reservations.length > 0 ? (
        <>
          <SectionLabel>{t('machine.upcoming')}</SectionLabel>
          {reservations.map((r) => (
            <Card key={r.id}>
              <ListRow
                title={new Date(r.startTime).toLocaleString('de-CH', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                subtitle={`– ${new Date(r.endTime).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`}
              />
              <Button
                label={t('machine.cancelReservation')}
                variant="danger"
                onPress={() => cancelReservation(r.id)}
              />
            </Card>
          ))}
        </>
      ) : null}

      {defects.length > 0 ? (
        <>
          <SectionLabel>{t('machine.openDefects')}</SectionLabel>
          {defects.map((d) => (
            <ListRow
              key={d.id}
              title={t(`defect.category.${d.category}`) !== `defect.category.${d.category}` ? t(`defect.category.${d.category}`) : d.category}
              subtitle={d.description}
              statusColor={colors.danger}
            />
          ))}
        </>
      ) : null}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerText: { flex: 1, gap: 4 },
  actions: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
});
