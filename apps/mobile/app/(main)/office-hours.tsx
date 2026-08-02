import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { OfficeHours, WeekdayKey } from '@woeschplan/shared';
import {
  WEEKDAY_KEYS,
  createOfficePeriod,
  formatTimeRange,
} from '@woeschplan/shared';
import { useBuilding } from '@/lib/building';
import { useAdministratorSettings } from '@/lib/hooks/useAdministratorSettings';
import { SwipeableRow } from '@/components/SwipeableRow';
import {
  Caption,
  LoadingState,
  PageShell,
} from '@/components/ui';
import { TimeRangePickerSheet } from '@/components/WheelPickers';
import {
  SavedIndicator,
  configureLayoutAnimation,
  triggerSaveHaptic,
  useEditableHeader,
} from '@/lib/useEditableHeader';
import { colors, spacing, typography, radius } from '@/lib/theme';
import { t } from '@/lib/i18n';

type EditingPeriod = {
  day: WeekdayKey;
  periodId: string;
  start: string;
  end: string;
};

function cloneOfficeHours(hours: OfficeHours): OfficeHours {
  return JSON.parse(JSON.stringify(hours)) as OfficeHours;
}

export default function OfficeHoursScreen() {
  const { isAdmin } = useBuilding();
  const { settings, isLoading, patchSettings } = useAdministratorSettings();
  const [draft, setDraft] = useState<OfficeHours | null>(null);
  const [baseline, setBaseline] = useState<OfficeHours | null>(null);
  const [savedVisible, setSavedVisible] = useState(false);
  const [editing, setEditing] = useState<EditingPeriod | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      const copy = cloneOfficeHours(settings.officeHours);
      setDraft(copy);
      setBaseline(copy);
    }
  }, [settings]);

  const isDirty = useMemo(() => {
    if (!draft || !baseline) return false;
    return JSON.stringify(draft) !== JSON.stringify(baseline);
  }, [draft, baseline]);

  const handleSave = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await patchSettings({ officeHours: draft });
      setBaseline(cloneOfficeHours(draft));
      await triggerSaveHaptic();
      setSavedVisible(true);
      setTimeout(() => setSavedVisible(false), 1800);
    } finally {
      setSaving(false);
    }
  }, [draft, patchSettings]);

  const handleCancel = useCallback(() => {
    if (baseline) {
      configureLayoutAnimation();
      setDraft(cloneOfficeHours(baseline));
    }
  }, [baseline]);

  useEditableHeader({
    isDirty,
    isSaving: saving,
    onSave: handleSave,
    onCancel: handleCancel,
  });

  if (isLoading || !settings || !draft) return <LoadingState />;

  const readOnly = !isAdmin;

  function updateDay(day: WeekdayKey, patch: Partial<OfficeHours[WeekdayKey]>) {
    configureLayoutAnimation();
    setDraft((prev) => (prev ? { ...prev, [day]: { ...prev[day], ...patch } } : prev));
  }

  function toggleDay(day: WeekdayKey, enabled: boolean) {
    configureLayoutAnimation();
    updateDay(day, { enabled });
  }

  function addPeriod(day: WeekdayKey) {
    const period = createOfficePeriod('09:00', '12:00');
    configureLayoutAnimation();
    updateDay(day, { periods: [...draft![day].periods, period] });
    setEditing({ day, periodId: period.id, start: period.start, end: period.end });
  }

  function removePeriod(day: WeekdayKey, periodId: string) {
    configureLayoutAnimation();
    updateDay(day, { periods: draft![day].periods.filter((p) => p.id !== periodId) });
  }

  function savePeriod(start: string, end: string) {
    if (!editing) return;
    const { day, periodId } = editing;
    updateDay(day, {
      periods: draft![day].periods.map((p) => (p.id === periodId ? { ...p, start, end } : p)),
    });
    setEditing(null);
  }

  return (
    <PageShell>
      <SavedIndicator visible={savedVisible} />
      <Text style={styles.intro}>{t('settings.officeHours.description')}</Text>

      {WEEKDAY_KEYS.map((day) => {
        const dayData = draft[day];
        const isClosed = !dayData.enabled;

        return (
          <View
            key={day}
            style={[styles.dayCard, isClosed && styles.dayCardClosed]}
          >
            <View style={styles.dayHeader}>
              <Text style={[styles.dayTitle, isClosed && styles.dayTitleClosed]}>
                {t(`settings.officeHours.${day}`)}
              </Text>
              {!readOnly ? (
                <Switch
                  value={dayData.enabled}
                  onValueChange={(enabled) => toggleDay(day, enabled)}
                  trackColor={{ true: colors.accent, false: colors.border }}
                />
              ) : (
                <Text style={styles.closedBadge}>
                  {dayData.enabled ? t('settings.officeHours.open') : t('settings.officeHours.closed')}
                </Text>
              )}
            </View>

            {dayData.enabled ? (
              <View style={styles.periodsWrap}>
                {dayData.periods.map((period) => (
                  <SwipeableRow
                    key={period.id}
                    enabled={!readOnly}
                    onDelete={() => removePeriod(day, period.id)}
                  >
                    <Pressable
                      style={styles.periodRow}
                      onPress={() =>
                        setEditing({
                          day,
                          periodId: period.id,
                          start: period.start,
                          end: period.end,
                        })
                      }
                      disabled={readOnly}
                    >
                      <Ionicons name="time-outline" size={16} color={colors.primary} />
                      <Text style={styles.periodText}>{formatTimeRange(period)}</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </Pressable>
                  </SwipeableRow>
                ))}
                {!readOnly ? (
                  <Pressable style={styles.addPeriodBtn} onPress={() => addPeriod(day)}>
                    <Ionicons name="add" size={18} color={colors.accent} />
                    <Text style={styles.addPeriodText}>{t('settings.officeHours.addPeriod')}</Text>
                  </Pressable>
                ) : null}
                {dayData.periods.length === 0 ? (
                  <Caption>{t('settings.officeHours.noPeriods')}</Caption>
                ) : null}
              </View>
            ) : (
              <Text style={styles.closedLabel}>{t('settings.officeHours.closed')}</Text>
            )}
          </View>
        );
      })}

      <TimeRangePickerSheet
        visible={!!editing}
        title={t('settings.officeHours.editPeriod')}
        start={editing?.start ?? '08:00'}
        end={editing?.end ?? '17:00'}
        readOnly={readOnly}
        onClose={() => setEditing(null)}
        onSave={async (start, end) => savePeriod(start, end)}
      />
    </PageShell>
  );
}

const styles = StyleSheet.create({
  intro: { ...typography.caption, marginBottom: spacing.sm, color: colors.textMuted },
  dayCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  dayCardClosed: {
    backgroundColor: colors.background,
    opacity: 0.85,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
  },
  dayTitle: { ...typography.body, fontWeight: '600' },
  dayTitleClosed: { color: colors.textMuted },
  closedBadge: { ...typography.caption, color: colors.textMuted },
  closedLabel: { ...typography.caption, color: colors.textMuted, paddingBottom: spacing.xs },
  periodsWrap: { marginTop: spacing.xs, gap: 2 },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 40,
    paddingVertical: 4,
    paddingHorizontal: spacing.xs,
  },
  periodText: { ...typography.body, flex: 1, color: colors.primary, fontWeight: '500' },
  addPeriodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 36,
    paddingVertical: 4,
  },
  addPeriodText: { ...typography.caption, color: colors.accent, fontWeight: '600' },
});
