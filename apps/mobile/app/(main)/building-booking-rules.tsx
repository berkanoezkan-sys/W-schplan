import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import type { MachineTypeBookingRules } from '@woeschplan/shared';
import {
  formatAdvanceDays,
  formatDuration,
  formatMinutesPolicy,
} from '@woeschplan/shared';
import { useBuilding } from '@/lib/building';
import { useBuildingSettings } from '@/lib/hooks/useBuildingSettings';
import { Caption, LoadingState, PageShell, SectionLabel } from '@/components/ui';
import { SettingsGroup, SettingsRow } from '@/components/settings/SettingsGroup';
import {
  ActiveReservationsPickerSheet,
  AdvanceDaysPickerSheet,
  DurationPickerSheet,
  MinutesPolicyPickerSheet,
} from '@/components/WheelPickers';
import { spacing, typography } from '@/lib/theme';
import { t } from '@/lib/i18n';

type MachineTypeKey = 'washingMachine' | 'tumbleDryer';

type PickerTarget =
  | { scope: 'shared'; field: 'maxActiveReservationsPerResident' }
  | { scope: MachineTypeKey; field: keyof MachineTypeBookingRules };

export default function BuildingBookingRulesScreen() {
  const { building, isAdmin } = useBuilding();
  const { settings, isLoading, patchSettings } = useBuildingSettings();
  const [picker, setPicker] = useState<PickerTarget | null>(null);

  if (isLoading || !settings) return <LoadingState />;

  const { bookingRules } = settings;
  const readOnly = !isAdmin;

  async function patchMachineType(
    key: MachineTypeKey,
    patch: Partial<MachineTypeBookingRules>,
  ) {
    await patchSettings({ bookingRules: { [key]: patch } });
  }

  function renderMachineSection(key: MachineTypeKey, title: string, icon: 'shirt-outline' | 'flame-outline') {
    const rules = bookingRules[key];

    return (
      <>
        <SectionLabel>{title}</SectionLabel>
        <SettingsGroup footer={t('bookingRules.machineSectionHint')}>
          <SettingsRow
            icon="hourglass-outline"
            label={t('bookingRules.maxDuration')}
            value={formatDuration(rules.maxBookingDurationMinutes)}
            onPress={
              readOnly
                ? undefined
                : () => setPicker({ scope: key, field: 'maxBookingDurationMinutes' })
            }
          />
          <SettingsRow
            icon="calendar-outline"
            label={t('bookingRules.advanceWindow')}
            value={formatAdvanceDays(rules.maxDaysInAdvance)}
            onPress={
              readOnly ? undefined : () => setPicker({ scope: key, field: 'maxDaysInAdvance' })
            }
          />
          <SettingsRow
            icon="time-outline"
            label={t('bookingRules.earliestBooking')}
            value={formatMinutesPolicy(rules.earliestBookingMinutesFromNow)}
            onPress={
              readOnly
                ? undefined
                : () => setPicker({ scope: key, field: 'earliestBookingMinutesFromNow' })
            }
          />
          <SettingsRow
            icon="swap-horizontal-outline"
            label={t('bookingRules.bufferTime')}
            value={formatMinutesPolicy(rules.bufferMinutesBetweenReservations)}
            onPress={
              readOnly
                ? undefined
                : () => setPicker({ scope: key, field: 'bufferMinutesBetweenReservations' })
            }
          />
          <SettingsRow
            icon="close-circle-outline"
            label={t('bookingRules.cancellationPolicy')}
            value={formatMinutesPolicy(rules.cancellationDeadlineMinutes)}
            onPress={
              readOnly
                ? undefined
                : () => setPicker({ scope: key, field: 'cancellationDeadlineMinutes' })
            }
          />
          <SettingsRow
            icon="alert-circle-outline"
            label={t('bookingRules.noShowPolicy')}
            value={formatMinutesPolicy(rules.noShowGracePeriodMinutes)}
            onPress={
              readOnly
                ? undefined
                : () => setPicker({ scope: key, field: 'noShowGracePeriodMinutes' })
            }
            last
          />
        </SettingsGroup>
      </>
    );
  }

  const activePickerRules =
    picker && picker.scope !== 'shared' ? bookingRules[picker.scope] : null;

  return (
    <PageShell>
      <Text style={styles.buildingName}>{building?.name}</Text>
      <Caption>{t('bookingRules.buildingHint')}</Caption>

      <SectionLabel>{t('bookingRules.shared')}</SectionLabel>
      <SettingsGroup footer={t('bookingRules.sharedHint')}>
        <SettingsRow
          icon="layers-outline"
          label={t('bookingRules.maxActiveReservations')}
          value={String(bookingRules.maxActiveReservationsPerResident)}
          onPress={
            readOnly
              ? undefined
              : () => setPicker({ scope: 'shared', field: 'maxActiveReservationsPerResident' })
          }
          last
        />
      </SettingsGroup>

      {renderMachineSection('washingMachine', t('bookingRules.washingMachines'), 'shirt-outline')}
      {renderMachineSection('tumbleDryer', t('bookingRules.tumbleDryers'), 'flame-outline')}

      <Caption style={styles.future}>{t('bookingRules.futureRules')}</Caption>

      <ActiveReservationsPickerSheet
        visible={picker?.scope === 'shared'}
        title={t('bookingRules.maxActiveReservations')}
        value={bookingRules.maxActiveReservationsPerResident}
        readOnly={readOnly}
        onClose={() => setPicker(null)}
        onSave={async (maxActiveReservationsPerResident) => {
          await patchSettings({ bookingRules: { maxActiveReservationsPerResident } });
        }}
      />

      {picker && activePickerRules ? (
        <>
          <DurationPickerSheet
            visible={picker.field === 'maxBookingDurationMinutes'}
            title={t('bookingRules.maxDuration')}
            minutes={activePickerRules.maxBookingDurationMinutes}
            readOnly={readOnly}
            onClose={() => setPicker(null)}
            onSave={async (maxBookingDurationMinutes) => {
              await patchMachineType(picker.scope as MachineTypeKey, { maxBookingDurationMinutes });
            }}
          />
          <AdvanceDaysPickerSheet
            visible={picker.field === 'maxDaysInAdvance'}
            title={t('bookingRules.advanceWindow')}
            value={activePickerRules.maxDaysInAdvance}
            readOnly={readOnly}
            onClose={() => setPicker(null)}
            onSave={async (maxDaysInAdvance) => {
              await patchMachineType(picker.scope as MachineTypeKey, { maxDaysInAdvance });
            }}
          />
          <MinutesPolicyPickerSheet
            visible={
              picker.field === 'earliestBookingMinutesFromNow' ||
              picker.field === 'bufferMinutesBetweenReservations' ||
              picker.field === 'cancellationDeadlineMinutes' ||
              picker.field === 'noShowGracePeriodMinutes'
            }
            title={
              picker.field === 'earliestBookingMinutesFromNow'
                ? t('bookingRules.earliestBooking')
                : picker.field === 'bufferMinutesBetweenReservations'
                  ? t('bookingRules.bufferTime')
                  : picker.field === 'cancellationDeadlineMinutes'
                    ? t('bookingRules.cancellationPolicy')
                    : t('bookingRules.noShowPolicy')
            }
            value={
              picker.field === 'earliestBookingMinutesFromNow'
                ? activePickerRules.earliestBookingMinutesFromNow
                : picker.field === 'bufferMinutesBetweenReservations'
                  ? activePickerRules.bufferMinutesBetweenReservations
                  : picker.field === 'cancellationDeadlineMinutes'
                    ? activePickerRules.cancellationDeadlineMinutes
                    : activePickerRules.noShowGracePeriodMinutes
            }
            readOnly={readOnly}
            onClose={() => setPicker(null)}
            onSave={async (minutes) => {
              await patchMachineType(picker.scope as MachineTypeKey, { [picker.field]: minutes });
            }}
          />
        </>
      ) : null}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  buildingName: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  future: {
    marginTop: spacing.md,
    textAlign: 'center',
    lineHeight: 20,
  },
});
