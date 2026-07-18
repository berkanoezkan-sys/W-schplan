import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { EmptyState, ListRow, LoadingState, PageShell } from '@/components/ui';
import { t } from '@/lib/i18n';

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export default function NotificationsScreen() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    enabled: !!token,
    queryFn: () => apiRequest<Notification[]>('/notifications', { token: token! }),
  });

  const markRead = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/notifications/${id}/read`, { token: token!, method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (isLoading) return <LoadingState />;

  return (
    <PageShell>
      {!data?.length ? (
        <EmptyState message={t('notifications.empty')} />
      ) : (
        data.map((n) => (
          <ListRow
            key={n.id}
            title={n.title}
            subtitle={`${n.body} · ${new Date(n.createdAt).toLocaleString('de-CH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
            unread={!n.read}
            onPress={() => !n.read && markRead.mutate(n.id)}
          />
        ))
      )}
    </PageShell>
  );
}
