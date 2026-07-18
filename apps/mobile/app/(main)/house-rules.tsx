import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBuilding } from '@/lib/building';
import { Body, Button, Caption, Card, Heading, LoadingState } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Heading>{t('houseRules.title')}</Heading>
      {data &&
        Object.entries(data).map(([key, value]) => (
          <Card key={key}>
            <Caption>{key}</Caption>
            <Body>{value}</Body>
          </Card>
        ))}
      <Button label={t('common.back')} variant="secondary" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
});
