import { ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useBuilding } from '@/lib/building';
import { Body, Button, Caption, Card, Heading } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';
import { t } from '@/lib/i18n';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { building, isAdmin } = useBuilding();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Heading>{t('settings.title')}</Heading>

      <Card>
        <Body>
          {user?.firstName} {user?.lastName}
        </Body>
        <Caption>{user?.email}</Caption>
        {building ? <Caption>{building.name}</Caption> : null}
        {isAdmin ? <Caption>Administrator</Caption> : <Caption>Bewohner</Caption>}
      </Card>

      <Button label={t('houseRules.title')} variant="secondary" onPress={() => router.push('/(main)/house-rules')} />
      <Button label={t('settings.logout')} variant="danger" onPress={logout} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
});
