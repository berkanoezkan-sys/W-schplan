import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Caption, Card, EmptyState, Heading, LoadingState } from '@/components/ui';
import { colors, spacing, typography } from '@/lib/theme';
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Heading>{t('notifications.title')}</Heading>
      {!data?.length ? (
        <EmptyState message={t('notifications.empty')} />
      ) : (
        data.map((n) => (
          <Pressable
            key={n.id}
            accessibilityRole="button"
            onPress={() => !n.read && markRead.mutate(n.id)}
          >
            <Card>
              <Text style={[styles.title, !n.read && styles.unread]}>{n.title}</Text>
              <Caption>{n.body}</Caption>
              <Caption>{new Date(n.createdAt).toLocaleString('de-CH')}</Caption>
            </Card>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  title: { ...typography.body, fontWeight: '600' },
  unread: { color: colors.primary },
});
