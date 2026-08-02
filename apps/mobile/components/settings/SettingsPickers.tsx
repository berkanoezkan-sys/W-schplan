import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import {
  formatDuration,
  nearestDurationOption,
  DURATION_OPTIONS_MINUTES,
  MINUTES_POLICY_OPTIONS,
  ADVANCE_DAYS_OPTIONS,
  nearestPolicyMinutes,
  nearestAdvanceDays,
  formatMinutesPolicy,
  formatAdvanceDays,
  ACTIVE_RESERVATION_OPTIONS,
} from '@woeschplan/shared';
import { WheelPicker } from './WheelPicker';
import { IosWheelDateTimePicker } from './IosWheelDateTimePicker';
import { colors, spacing, typography, radius } from '@/lib/theme';
import { wheelPickerColors, wheelPickerStyles } from '@/lib/wheelPickerTheme';
import { t } from '@/lib/i18n';

export function timeToDate(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

export function dateToTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

type TimeRangePickerSheetProps = {
  visible: boolean;
  title: string;
  start: string;
  end: string;
  onClose: () => void;
  onSave: (start: string, end: string) => Promise<void> | void;
  readOnly?: boolean;
};

export function TimeRangePickerSheet({
  visible,
  title,
  start,
  end,
  onClose,
  onSave,
  readOnly = false,
}: TimeRangePickerSheetProps) {
  const [startDate, setStartDate] = useState(timeToDate(start));
  const [endDate, setEndDate] = useState(timeToDate(end));
  const [activeField, setActiveField] = useState<'start' | 'end'>('start');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setStartDate(timeToDate(start));
      setEndDate(timeToDate(end));
      setActiveField('start');
    }
  }, [visible, start, end]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(dateToTime(startDate), dateToTime(endDate));
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const pickerValue = activeField === 'start' ? startDate : endDate;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>

          <View style={styles.summaryRow}>
            <Pressable
              style={[styles.summaryChip, activeField === 'start' && styles.summaryChipActive]}
              onPress={() => !readOnly && setActiveField('start')}
              disabled={readOnly}
            >
              <Text style={styles.summaryLabel}>{t('settings.time.start')}</Text>
              <Text style={styles.summaryValue}>{dateToTime(startDate)}</Text>
            </Pressable>
            <Text style={styles.summaryDivider}>–</Text>
            <Pressable
              style={[styles.summaryChip, activeField === 'end' && styles.summaryChipActive]}
              onPress={() => !readOnly && setActiveField('end')}
              disabled={readOnly}
            >
              <Text style={styles.summaryLabel}>{t('settings.time.end')}</Text>
              <Text style={styles.summaryValue}>{dateToTime(endDate)}</Text>
            </Pressable>
          </View>

          {!readOnly ? (
            <View style={styles.wheelWrap}>
              <IosWheelDateTimePicker
                value={pickerValue}
                mode="time"
                onChange={(_, date) => {
                  if (!date) return;
                  if (activeField === 'start') setStartDate(date);
                  else setEndDate(date);
                }}
              />
            </View>
          ) : null}

          <View style={styles.actions}>
            <Pressable style={styles.secondaryBtn} onPress={onClose}>
              <Text style={styles.secondaryBtnText}>
                {readOnly ? t('common.back') : t('common.cancel')}
              </Text>
            </Pressable>
            {!readOnly ? (
              <Pressable
                style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.primaryBtnText}>
                  {saving ? t('common.loading') : t('settings.save')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

type DurationPickerSheetProps = {
  visible: boolean;
  title?: string;
  minutes: number;
  onClose: () => void;
  onSave: (minutes: number) => Promise<void> | void;
  readOnly?: boolean;
};

export function DurationPickerSheet({
  visible,
  title = t('settings.maxBooking'),
  minutes,
  onClose,
  onSave,
  readOnly = false,
}: DurationPickerSheetProps) {
  const options = DURATION_OPTIONS_MINUTES;
  const [selected, setSelected] = useState(nearestDurationOption(minutes));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setSelected(nearestDurationOption(minutes));
  }, [visible, minutes]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(selected);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>

          {!readOnly ? (
            <View style={styles.wheelWrap}>
              <WheelPicker
                options={options.map((opt) => ({
                  value: opt,
                  label: formatDuration(opt),
                }))}
                value={selected}
                onChange={setSelected}
              />
            </View>
          ) : (
            <Text style={wheelPickerStyles.readOnlyValue}>{formatDuration(minutes)}</Text>
          )}

          <View style={styles.actions}>
            <Pressable style={styles.secondaryBtn} onPress={onClose}>
              <Text style={styles.secondaryBtnText}>
                {readOnly ? t('common.back') : t('common.cancel')}
              </Text>
            </Pressable>
            {!readOnly ? (
              <Pressable
                style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.primaryBtnText}>
                  {saving ? t('common.loading') : t('settings.save')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

type WheelPickerSheetProps<T extends number> = {
  visible: boolean;
  title: string;
  value: number;
  options: readonly T[];
  formatOption: (value: T) => string;
  nearest: (value: number) => T;
  onClose: () => void;
  onSave: (value: T) => Promise<void> | void;
  readOnly?: boolean;
};

function WheelPickerSheet<T extends number>({
  visible,
  title,
  value,
  options,
  formatOption,
  nearest,
  onClose,
  onSave,
  readOnly = false,
}: WheelPickerSheetProps<T>) {
  const [selected, setSelected] = useState(nearest(value));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setSelected(nearest(value));
  }, [visible, value, nearest]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(selected);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>

          {!readOnly ? (
            <View style={styles.wheelWrap}>
              <WheelPicker
                options={options.map((opt) => ({
                  value: opt,
                  label: formatOption(opt),
                }))}
                value={selected}
                onChange={setSelected}
              />
            </View>
          ) : (
            <Text style={wheelPickerStyles.readOnlyValue}>{formatOption(nearest(value))}</Text>
          )}

          <View style={styles.actions}>
            <Pressable style={styles.secondaryBtn} onPress={onClose}>
              <Text style={styles.secondaryBtnText}>
                {readOnly ? t('common.back') : t('common.cancel')}
              </Text>
            </Pressable>
            {!readOnly ? (
              <Pressable
                style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.primaryBtnText}>
                  {saving ? t('common.loading') : t('settings.save')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function MinutesPolicyPickerSheet(props: Omit<WheelPickerSheetProps<number>, 'options' | 'formatOption' | 'nearest'>) {
  return (
    <WheelPickerSheet
      {...props}
      options={MINUTES_POLICY_OPTIONS}
      formatOption={formatMinutesPolicy}
      nearest={nearestPolicyMinutes}
    />
  );
}

export function AdvanceDaysPickerSheet(props: Omit<WheelPickerSheetProps<number>, 'options' | 'formatOption' | 'nearest'>) {
  return (
    <WheelPickerSheet
      {...props}
      options={ADVANCE_DAYS_OPTIONS}
      formatOption={formatAdvanceDays}
      nearest={nearestAdvanceDays}
    />
  );
}

export function ActiveReservationsPickerSheet(props: Omit<WheelPickerSheetProps<number>, 'options' | 'formatOption' | 'nearest'>) {
  return (
    <WheelPickerSheet
      {...props}
      options={ACTIVE_RESERVATION_OPTIONS}
      formatOption={(n) => String(n)}
      nearest={(n) => ACTIVE_RESERVATION_OPTIONS.includes(n as 1 | 2 | 3 | 4 | 5) ? (n as 1 | 2 | 3 | 4 | 5) : 2}
    />
  );
}

export function QuietHoursInfoSheet({
  visible,
  quietHours,
  washingHours,
  onClose,
}: {
  visible: boolean;
  quietHours: { start: string; end: string };
  washingHours: { start: string; end: string };
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{t('settings.quietHours')}</Text>
          <Text style={styles.infoText}>{t('settings.quietHours.autoDescription')}</Text>
          <View style={styles.derivedBox}>
            <Text style={styles.derivedLabel}>{t('settings.washingHours')}</Text>
            <Text style={styles.derivedValue}>
              {washingHours.start} – {washingHours.end}
            </Text>
            <Text style={[styles.derivedLabel, { marginTop: spacing.md }]}>
              {t('settings.quietHours')}
            </Text>
            <Text style={styles.derivedValue}>
              {quietHours.start} – {quietHours.end}
            </Text>
          </View>
          <Pressable style={styles.primaryBtn} onPress={onClose}>
            <Text style={styles.primaryBtnText}>{t('common.back')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function SuccessBanner({ message, visible }: { message: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={styles.successBanner}>
      <Text style={styles.successText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  dismissArea: { flex: 1 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.heading,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  summaryChip: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSurface,
  },
  summaryLabel: { ...typography.caption, marginBottom: 4 },
  summaryValue: {
    ...typography.heading,
    fontSize: 22,
    color: wheelPickerColors.selected,
    fontWeight: '700',
  },
  summaryDivider: { ...typography.body, color: colors.textMuted },
  wheelWrap: { marginVertical: spacing.sm },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { ...typography.body, fontWeight: '600', color: colors.primary },
  primaryBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { ...typography.body, fontWeight: '600', color: '#fff' },
  infoText: {
    ...typography.body,
    textAlign: 'center',
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  derivedBox: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  derivedLabel: { ...typography.caption, fontWeight: '600' },
  derivedValue: {
    ...typography.heading,
    fontSize: 20,
    color: wheelPickerColors.selected,
    marginTop: 4,
  },
  successBanner: {
    backgroundColor: colors.accentSurface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent,
    marginBottom: spacing.md,
  },
  successText: { ...typography.body, color: colors.primary, textAlign: 'center', fontWeight: '600' },
});
