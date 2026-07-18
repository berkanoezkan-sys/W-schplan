import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBuilding } from '@/lib/building';
import { Body, Button, Caption, Card, LoadingState, PageShell } from '@/components/ui';
import { t } from '@/lib/i18n';

export default function HouseRulesScreen() {
  const { token } = useAuth();
  const { buildingId } = useBuilding();

  const { data, isLoading } = useQuery({
    queryKey: ['house-rules', buildingId],
    enabled: !!token && !!buildingId,
    queryFn: () =>
      apiRequest<Record<string, string>>(`/buildings/${buildingId}/house-rules`, {
        token: token!,
      }),
  });

  if (isLoading) return <LoadingState />;

  return (
    <PageShell>
      {data &&
        Object.entries(data).map(([key, value]) => (
          <Card key={key}>
            <Caption>{key}</Caption>
            <Body>{value}</Body>
          </Card>
        ))}
      <Button label={t('common.back')} variant="secondary" onPress={() => router.back()} />
    </PageShell>
  );
}
