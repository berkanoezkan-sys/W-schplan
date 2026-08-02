import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { formatOfficeHoursSummary } from '@woeschplan/shared';
import { useAuth } from '@/lib/auth';
import { useBuilding } from '@/lib/building';
import { useAdministratorSettings } from '@/lib/hooks/useAdministratorSettings';
import {
  Caption,
  Card,
  LoadingState,
  PageShell,
} from '@/components/ui';
import { SettingsGroup, SettingsRow } from '@/components/settings/SettingsGroup';
import { LanguagePickerSheet } from '@/components/LocaleSwitcher';
import { localeLabel, useLocale, useTranslation } from '@/lib/locale';
import { spacing } from '@/lib/theme';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { isAdmin } = useBuilding();
  const { locale } = useLocale();
  const { settings: adminSettings, isLoading } = useAdministratorSettings();
  const [languageOpen, setLanguageOpen] = useState(false);

  if (isLoading) return <LoadingState />;

  return (
    <PageShell>
      <SettingsGroup title={t('settings.profile')}>
        <SettingsRow
          icon="person-outline"
          label={t('settings.profileName')}
          value={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()}
        />
        <SettingsRow icon="mail-outline" label={t('settings.profileEmail')} value={user?.email ?? ''} />
        <SettingsRow
          icon="lock-closed-outline"
          label={t('settings.profilePassword')}
          value={t('settings.profilePasswordHint')}
          onPress={() => {}}
        />
        <SettingsRow
          icon="language-outline"
          label={t('settings.profileLanguage')}
          value={localeLabel(locale)}
          onPress={() => setLanguageOpen(true)}
        />
        <SettingsRow
          icon="notifications-outline"
          label={t('settings.profileNotifications')}
          value={t('settings.profileNotificationsHint')}
          last
        />
      </SettingsGroup>

      {isAdmin ? (
        <SettingsGroup
          title={t('settings.propertyManagement.section')}
          footer={t('settings.propertyManagement.hint')}
        >
          <SettingsRow
            icon="business-outline"
            label={t('settings.officeHours')}
            value={
              adminSettings
                ? formatOfficeHoursSummary(adminSettings.officeHours)
                : t('settings.contact.configure')
            }
            onPress={() => router.push('/(main)/office-hours')}
          />
          <SettingsRow
            icon="call-outline"
            label={t('settings.propertyManagement.contact')}
            value={adminSettings?.companyContact.contactPerson || t('settings.contact.configure')}
            onPress={() => router.push('/(main)/company-settings')}
          />
          <SettingsRow
            icon="briefcase-outline"
            label={t('settings.propertyManagement.company')}
            value={adminSettings?.companyContact.companyName || t('settings.contact.configure')}
            onPress={() => router.push('/(main)/company-settings')}
            last
          />
        </SettingsGroup>
      ) : null}

      <SettingsGroup title={t('settings.account.section')}>
        <SettingsRow
          icon="log-out-outline"
          label={t('settings.logout')}
          onPress={logout}
          showChevron={false}
          destructive
          last
        />
      </SettingsGroup>

      {!isAdmin ? (
        <>
          <SettingsGroup title={t('notices.sectionTitle')}>
            <SettingsRow
              icon="megaphone-outline"
              label={t('notices.sectionTitle')}
              value={t('notices.sectionHint')}
              onPress={() => router.push('/(main)/notices')}
              last
            />
          </SettingsGroup>
          <Card style={styles.residentHint}>
            <Caption>{t('settings.residentHint')}</Caption>
          </Card>
        </>
      ) : null}

      <LanguagePickerSheet visible={languageOpen} onClose={() => setLanguageOpen(false)} />
    </PageShell>
  );
}

const styles = StyleSheet.create({
  residentHint: { marginTop: spacing.sm },
});
