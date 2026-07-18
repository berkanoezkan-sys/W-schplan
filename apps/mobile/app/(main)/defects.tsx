import { useQuery } from '@tanstack/react-query';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBuilding } from '@/lib/building';
import { Body, Button, Caption, Card, EmptyState, Heading, LoadingState, StatusBadge } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';
import { t } from '@/lib/i18n';

type Defect = {
  id: string;
  category: string;
  description: string;
  status: string;
  machine: { id: string; name: string; laundryRoom: { name: string } };
};

export default function DefectsScreen() {
  const { token } = useAuth();
  const { buildingId, isAdmin } = useBuilding();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['defects', buildingId],
    enabled: !!token && !!buildingId,
    queryFn: () => apiRequest<Defect[]>(`/buildings/${buildingId}/defects`, { token: token! }),
  });

  async function notifyAdmin(defectId: string) {
    await apiRequest(`/defects/${defectId}/notify-administration`, {
      token: token!,
      method: 'POST',
    });
    refetch();
  }

  async function resolve(defectId: string) {
    await apiRequest(`/defects/${defectId}/resolve`, { token: token!, method: 'POST' });
    refetch();
  }

  if (isLoading) return <LoadingState />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Heading>Defekte</Heading>
      {!data?.length ? (
        <EmptyState message="Keine offenen Defektmeldungen" />
      ) : (
        data.map((d) => (
          <Card key={d.id}>
            <Body>{d.machine.name}</Body>
            <Caption>{d.machine.laundryRoom.name}</Caption>
            <Caption>{d.description}</Caption>
            <StatusBadge status={d.status} />
            {d.status === 'REPORTED' ? (
              <Button
                label={t('defect.notifyAdmin')}
                variant="secondary"
                onPress={() => notifyAdmin(d.id)}
              />
            ) : null}
            {isAdmin && d.status !== 'RESOLVED' ? (
              <Button label={t('defect.resolve')} onPress={() => resolve(d.id)} />
            ) : null}
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
});
