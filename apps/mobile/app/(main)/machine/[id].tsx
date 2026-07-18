import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Body, Button, Caption, Card, Heading, LoadingState, StatusBadge } from '@/components/ui';
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
    Alert.alert(t('common.confirm'), 'Reservation stornieren?', [
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Heading>{machine.name}</Heading>
      <Caption>{machine.laundryRoom.name}</Caption>
      <StatusBadge status={machine.status} />

      <Card>
        <Body>{machine.machineType === 'WASHING_MACHINE' ? 'Waschmaschine' : 'Tumbler'}</Body>
      </Card>

      <Button
        label={t('machine.startTimer')}
        onPress={() => router.push({ pathname: '/(main)/timer', params: { machineId: machine.id } })}
      />
      <Button
        label={t('machine.reportDefect')}
        variant="secondary"
        onPress={() => router.push({ pathname: '/(main)/defect', params: { machineId: machine.id } })}
      />
      <Button
        label={t('machine.checklist')}
        variant="secondary"
        onPress={() =>
          router.push({
            pathname: '/(main)/checklist',
            params: { machineId: machine.id, machineType: machine.machineType },
          })
        }
      />

      {reservations.map((r) => (
        <Card key={r.id}>
          <Caption>
            {new Date(r.startTime).toLocaleString('de-CH')} –{' '}
            {new Date(r.endTime).toLocaleTimeString('de-CH')}
          </Caption>
          <Button label="Stornieren" variant="danger" onPress={() => cancelReservation(r.id)} />
        </Card>
      ))}

      {defects.map((d) => (
        <Card key={d.id}>
          <Body>{d.category}</Body>
          <Caption>{d.description}</Caption>
          <StatusBadge status={d.status} />
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.sm },
});
