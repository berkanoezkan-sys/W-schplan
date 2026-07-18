import { router } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '@/lib/auth';
import { useBuilding } from '@/lib/building';
import {
  ActionRow,
  Body,
  Button,
  Caption,
  Card,
  PageShell,
  SectionLabel,
} from '@/components/ui';
import { colors, spacing } from '@/lib/theme';
import { t } from '@/lib/i18n';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { building, isAdmin } = useBuilding();

  return (
    <PageShell>
      <Card>
        <SectionLabel>{t('settings.profile')}</SectionLabel>
        <Body>
          {user?.firstName} {user?.lastName}
        </Body>
        <Caption>{user?.email}</Caption>
        {building ? <Caption>{building.name}</Caption> : null}
        <Caption>{isAdmin ? t('settings.role.admin') : t('settings.role.resident')}</Caption>
      </Card>

      <View style={styles.actions}>
        <ActionRow
          icon="document-text-outline"
          label={t('houseRules.title')}
          onPress={() => router.push('/(main)/house-rules')}
        />
      </View>

      <Button label={t('settings.logout')} variant="danger" onPress={logout} />
    </PageShell>
  );
}

const styles = StyleSheet.create({
  actions: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
});
