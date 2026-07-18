import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBuilding } from '@/lib/building';
import {
  Button,
  Card,
  EmptyState,
  ListRow,
  LoadingState,
  PageShell,
  StatusBadge,
} from '@/components/ui';
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
    <PageShell>
      {!data?.length ? (
        <EmptyState message={t('defect.empty')} />
      ) : (
        data.map((d) => (
          <Card key={d.id}>
            <ListRow
              title={d.machine.name}
              subtitle={`${d.machine.laundryRoom.name} · ${d.description}`}
              statusColor={colors.danger}
            />
            <StatusBadge status={d.status} />
            {d.status === 'REPORTED' ? (
              <Button
                label={t('defect.notifyAdmin')}
                variant="secondary"
                onPress={() => notifyAdmin(d.id)}
              />
            ) : null}
            {isAdmin && d.status !== 'RESOLVED' ? (
              <Button label={t('defect.resolve')} onPress={() => resolve(d.id)} variant="accent" />
            ) : null}
          </Card>
        ))
      )}
    </PageShell>
  );
}
