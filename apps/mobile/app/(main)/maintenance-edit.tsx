import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  MAINTENANCE_RECURRENCE_TYPES,
  MAINTENANCE_STATUSES,
  MAINTENANCE_TYPES,
  parseTimeToMinutes,
  type CreateMaintenanceEntryInput,
  type MaintenanceRecurrenceType,
  type MaintenanceStatus,
  type MaintenanceType,
} from '@woeschplan/shared';
import { ApiError } from '@/lib/api';
import { useBuilding, getAllResources } from '@/lib/building';
import {
  useMaintenanceEntry,
  useMaintenanceMutations,
  type MaintenanceEntry,
} from '@/lib/hooks/useMaintenanceCalendar';
import {
  Button,
  LoadingState,
  OptionPicker,
  PageShell,
  SectionLabel,
  SegmentedControl,
  TextField,
} from '@/components/ui';
import { IosWheelDateTimePicker, TimeRangePickerSheet } from '@/components/settings';
import { colors, spacing } from '@/lib/theme';
import { t } from '@/lib/i18n';

type FormState = {
  title: string;
  description: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  scheduleMode: 'once' | 'recurring';
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  recurrenceType: MaintenanceRecurrenceType;
  recurrenceInterval: number;
  recurrenceDays: number[];
  recurrenceEndDate: Date | null;
  notifyResidents: boolean;
  location: string;
  affectedAreaIds: string[];
  affectedMachineIds: string[];
};

const WEEKDAY_OPTIONS = [
  { label: 'Mo', value: 1 },
  { label: 'Tu', value: 2 },
  { label: 'We', value: 3 },
  { label: 'Th', value: 4 },
  { label: 'Fr', value: 5 },
  { label: 'Sa', value: 6 },
  { label: 'Su', value: 0 },
];

function formatYmd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function defaultForm(): FormState {
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  return {
    title: '',
    description: '',
    type: 'MAINTENANCE',
    status: 'PLANNED',
    scheduleMode: 'once',
    startDate,
    endDate,
    startTime: '09:00',
    endTime: '10:00',
    recurrenceType: 'WEEKLY',
    recurrenceInterval: 1,
    recurrenceDays: [1],
    recurrenceEndDate: null,
    notifyResidents: false,
    location: '',
    affectedAreaIds: [],
    affectedMachineIds: [],
  };
}

function entryToForm(entry: MaintenanceEntry): FormState {
  const startDate = new Date(`${entry.localDate}T00:00:00`);
  const endDate = new Date(`${entry.localEndDate}T00:00:00`);
  return {
    title: entry.title,
    description: entry.description ?? '',
    type: entry.type as MaintenanceType,
    status: entry.status as MaintenanceStatus,
    scheduleMode: entry.isRecurring ? 'recurring' : 'once',
    startDate,
    endDate,
    startTime: entry.localStart,
    endTime: entry.localEnd,
    recurrenceType: (entry.recurrenceType as MaintenanceRecurrenceType) ?? 'WEEKLY',
    recurrenceInterval: entry.recurrenceInterval ?? 1,
    recurrenceDays: entry.recurrenceDays ?? [1],
    recurrenceEndDate: entry.recurrenceEndDate ? new Date(entry.recurrenceEndDate) : null,
    notifyResidents: entry.notifyResidents,
    location: entry.location ?? '',
    affectedAreaIds: entry.affectedAreaIds,
    affectedMachineIds: entry.affectedMachineIds,
  };
}

export default function MaintenanceEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { isAdmin, building } = useBuilding();
  const { data: existing, isLoading } = useMaintenanceEntry(id);
  const { create, update } = useMaintenanceMutations();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [timeSheetOpen, setTimeSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) setForm(entryToForm(existing));
  }, [existing]);

  const roomOptions = useMemo(
    () =>
      (building?.laundryRooms ?? []).map((room) => ({
        label: room.name,
        value: room.id,
      })),
    [building?.laundryRooms],
  );

  const machineOptions = useMemo(
    () =>
      getAllResources(building).map((resource) => ({
        label: resource.name,
        value: resource.id,
      })),
    [building],
  );

  const buildPayload = useCallback((): CreateMaintenanceEntryInput => {
    return {
      title: form.title.trim(),
      description: form.description.trim() || null,
      type: form.type,
      status: form.status,
      isRecurring: form.scheduleMode === 'recurring',
      startDate: formatYmd(form.startDate),
      endDate: formatYmd(form.endDate),
      startTimeMinutes: parseTimeToMinutes(form.startTime),
      endTimeMinutes: parseTimeToMinutes(form.endTime),
      recurrenceType: form.scheduleMode === 'recurring' ? form.recurrenceType : null,
      recurrenceInterval: form.scheduleMode === 'recurring' ? form.recurrenceInterval : null,
      recurrenceDays: form.scheduleMode === 'recurring' ? form.recurrenceDays : null,
      recurrenceEndDate:
        form.scheduleMode === 'recurring' && form.recurrenceEndDate
          ? formatYmd(form.recurrenceEndDate)
          : null,
      notifyResidents: form.notifyResidents,
      location: form.location.trim() || null,
      affectedAreaIds: form.affectedAreaIds,
      affectedMachineIds: form.affectedMachineIds,
    };
  }, [form]);

  async function handleSave() {
    if (!form.title.trim()) {
      Alert.alert(t('maintenance.validation.title'));
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const payload = buildPayload();
      if (id) {
        await update.mutateAsync({ entryId: id, input: payload });
        Alert.alert(t('maintenance.save.success'));
      } else {
        await create.mutateAsync(payload);
        Alert.alert(t('maintenance.save.success'));
      }
      router.back();
    } catch (error) {
      Alert.alert(
        error instanceof ApiError ? error.message : t('maintenance.save.error'),
      );
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return (
      <PageShell>
        <Text>{t('maintenance.adminOnly')}</Text>
      </PageShell>
    );
  }

  if (isLoading && id) return <LoadingState />;

  return (
    <PageShell>
      <TextField
        label={t('maintenance.field.title')}
        value={form.title}
        onChangeText={(title) => setForm((prev) => ({ ...prev, title }))}
      />
      <TextField
        label={t('maintenance.field.description')}
        value={form.description}
        onChangeText={(description) => setForm((prev) => ({ ...prev, description }))}
        multiline
      />
      <SectionLabel>{t('maintenance.field.type')}</SectionLabel>
      <OptionPicker
        options={MAINTENANCE_TYPES.map((type) => ({
          label: t(`maintenance.type.${type.toLowerCase()}`),
          value: type,
        }))}
        value={form.type}
        onChange={(type) => setForm((prev) => ({ ...prev, type }))}
      />
      <SectionLabel>{t('maintenance.field.status')}</SectionLabel>
      <OptionPicker
        options={MAINTENANCE_STATUSES.map((status) => ({
          label: t(`maintenance.status.${status === 'IN_PROGRESS' ? 'inProgress' : status.toLowerCase()}`),
          value: status,
        }))}
        value={form.status}
        onChange={(status) => setForm((prev) => ({ ...prev, status }))}
      />
      <SegmentedControl
        value={form.scheduleMode}
        onChange={(scheduleMode) => setForm((prev) => ({ ...prev, scheduleMode }))}
        options={[
          { label: t('maintenance.schedule.once'), value: 'once' },
          { label: t('maintenance.schedule.recurring'), value: 'recurring' },
        ]}
      />
      <SectionLabel>{t('maintenance.field.startDate')}</SectionLabel>
      <IosWheelDateTimePicker
        mode="date"
        value={form.startDate}
        onChange={(startDate) => setForm((prev) => ({ ...prev, startDate }))}
      />
      {form.scheduleMode === 'once' ? (
        <>
          <SectionLabel>{t('maintenance.field.endDate')}</SectionLabel>
          <IosWheelDateTimePicker
            mode="date"
            value={form.endDate}
            onChange={(endDate) => setForm((prev) => ({ ...prev, endDate }))}
          />
        </>
      ) : (
        <>
          <SectionLabel>{t('maintenance.field.recurrenceType')}</SectionLabel>
          <OptionPicker
            options={MAINTENANCE_RECURRENCE_TYPES.map((type) => ({
              label: t(`maintenance.recurrence.${type.toLowerCase()}`),
              value: type,
            }))}
            value={form.recurrenceType}
            onChange={(recurrenceType) => setForm((prev) => ({ ...prev, recurrenceType }))}
          />
          <TextField
            label={t('maintenance.field.recurrenceInterval')}
            value={String(form.recurrenceInterval)}
            keyboardType="number-pad"
            onChangeText={(value) =>
              setForm((prev) => ({
                ...prev,
                recurrenceInterval: Math.max(1, Number(value) || 1),
              }))
            }
          />
          {form.recurrenceType === 'WEEKLY' ? (
            <>
              <SectionLabel>{t('maintenance.field.recurrenceDays')}</SectionLabel>
              <OptionPicker
                options={WEEKDAY_OPTIONS}
                value={String(form.recurrenceDays[0] ?? 1)}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, recurrenceDays: [Number(value)] }))
                }
              />
            </>
          ) : null}
          <SectionLabel>{t('maintenance.field.recurrenceEndDate')}</SectionLabel>
          <IosWheelDateTimePicker
            mode="date"
            value={form.recurrenceEndDate ?? form.startDate}
            onChange={(recurrenceEndDate) => setForm((prev) => ({ ...prev, recurrenceEndDate }))}
          />
        </>
      )}
      <SectionLabel>{t('maintenance.field.time')}</SectionLabel>
      <Button
        label={`${form.startTime} – ${form.endTime}`}
        variant="secondary"
        onPress={() => setTimeSheetOpen(true)}
      />
      <TextField
        label={t('maintenance.field.location')}
        value={form.location}
        onChangeText={(location) => setForm((prev) => ({ ...prev, location }))}
      />
      {roomOptions.length ? (
        <>
          <SectionLabel>{t('maintenance.field.areas')}</SectionLabel>
          <OptionPicker
            options={[{ label: t('maintenance.field.none'), value: 'none' }, ...roomOptions]}
            value={form.affectedAreaIds[0] ?? 'none'}
            onChange={(value) =>
              setForm((prev) => ({
                ...prev,
                affectedAreaIds: value === 'none' ? [] : [value],
              }))
            }
          />
        </>
      ) : null}
      {machineOptions.length ? (
        <>
          <SectionLabel>{t('maintenance.field.machines')}</SectionLabel>
          <OptionPicker
            options={[{ label: t('maintenance.field.none'), value: 'none' }, ...machineOptions]}
            value={form.affectedMachineIds[0] ?? 'none'}
            onChange={(value) =>
              setForm((prev) => ({
                ...prev,
                affectedMachineIds: value === 'none' ? [] : [value],
              }))
            }
          />
        </>
      ) : null}
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>{t('maintenance.notifyResidents')}</Text>
        <Switch
          value={form.notifyResidents}
          onValueChange={(notifyResidents) => setForm((prev) => ({ ...prev, notifyResidents }))}
          trackColor={{ true: colors.accent, false: colors.border }}
          accessibilityLabel={t('maintenance.notifyResidents')}
          accessibilityState={{ checked: form.notifyResidents }}
        />
      </View>
      <Button
        label={id ? t('maintenance.save') : t('maintenance.add')}
        onPress={() => void handleSave()}
        loading={saving}
      />
      <TimeRangePickerSheet
        visible={timeSheetOpen}
        title={t('maintenance.field.time')}
        start={form.startTime}
        end={form.endTime}
        onClose={() => setTimeSheetOpen(false)}
        onSave={(start, end) => {
          setForm((prev) => ({ ...prev, startTime: start, endTime: end }));
        }}
      />
    </PageShell>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  toggleLabel: { flex: 1, marginRight: spacing.md },
});
