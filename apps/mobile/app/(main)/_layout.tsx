import { Redirect, Stack } from 'expo-router';
import { useAuthGate } from '@/lib/auth';
import { BuildingProvider } from '@/lib/building';
import { LoadingState } from '@/components/ui';
import { detailScreenOptions, stackScreenOptions } from '@/lib/navigation/stackOptions';
import { t } from '@/lib/i18n';
import { useLocale } from '@/lib/locale';

export default function MainLayout() {
  const gate = useAuthGate();
  const { locale } = useLocale();

  if (gate.status === 'loading') return <LoadingState />;
  if (gate.status === 'unauthenticated') return <Redirect href="/" />;
  if (gate.status === 'verify-email') {
    return <Redirect href={{ pathname: '/verify-email', params: { email: gate.email } }} />;
  }
  if (gate.status === 'onboarding') return <Redirect href="/onboarding" />;

  return (
    <BuildingProvider>
      <Stack key={locale} screenOptions={stackScreenOptions}>
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false, title: t('dashboard.title') }}
        />
        <Stack.Screen name="machine/[id]" options={detailScreenOptions(t('machine.title'))} />
        <Stack.Screen name="reserve" options={detailScreenOptions(t('reserve.title'))} />
        <Stack.Screen name="timer" options={detailScreenOptions(t('timer.title'))} />
        <Stack.Screen name="checklist" options={detailScreenOptions(t('checklist.title'))} />
        <Stack.Screen name="defect" options={detailScreenOptions(t('defect.title'))} />
        <Stack.Screen name="defects" options={detailScreenOptions(t('defect.listTitle'))} />
        <Stack.Screen name="house-rules" options={detailScreenOptions(t('houseRules.title'))} />
        <Stack.Screen name="contact-settings" options={detailScreenOptions(t('settings.contact'))} />
        <Stack.Screen name="company-settings" options={detailScreenOptions(t('settings.propertyManagement.company'))} />
        <Stack.Screen
          name="building-contact-settings"
          options={detailScreenOptions(t('dashboard.buildingContact'))}
        />
        <Stack.Screen
          name="building-laundry-rooms"
          options={detailScreenOptions(t('dashboard.laundryRooms'), t('buildingDetails.title'))}
        />
        <Stack.Screen name="laundry-room/[id]" options={detailScreenOptions(t('laundryRooms.detailTitle'))} />
        <Stack.Screen name="resource-edit" options={detailScreenOptions(t('resource.editTitle'))} />
        <Stack.Screen
          name="building-booking-rules"
          options={detailScreenOptions(t('dashboard.bookingRules'))}
        />
        <Stack.Screen
          name="building-registration"
          options={detailScreenOptions(t('registration.adminTitle'))}
        />
        <Stack.Screen name="building-qr-codes" options={detailScreenOptions(t('dashboard.qrCodes'))} />
        <Stack.Screen name="office-hours" options={detailScreenOptions(t('settings.officeHours'))} />
        <Stack.Screen name="emergency-contacts" options={detailScreenOptions(t('settings.emergency'))} />
        <Stack.Screen name="cleaning-rules" options={detailScreenOptions(t('settings.cleaningRules'))} />
        <Stack.Screen
          name="cleaning-rules-editor"
          options={detailScreenOptions(t('settings.cleaningRules'))}
        />
        <Stack.Screen name="scan" options={detailScreenOptions(t('scan.title'))} />
        <Stack.Screen
          name="create-building"
          options={detailScreenOptions(t('dashboard.addBuilding.title'))}
        />
        <Stack.Screen
          name="building-details"
          options={detailScreenOptions(t('buildingDetails.title'), t('dashboard.title'))}
        />
        <Stack.Screen
          name="building-notices"
          options={detailScreenOptions(t('notices.adminTitle'))}
        />
        <Stack.Screen
          name="building-notice-edit"
          options={detailScreenOptions(t('notices.editTitle'))}
        />
        <Stack.Screen
          name="maintenance-edit"
          options={detailScreenOptions(t('maintenance.edit'))}
        />
        <Stack.Screen name="notices" options={detailScreenOptions(t('notices.sectionTitle'))} />
      </Stack>
    </BuildingProvider>
  );
}
