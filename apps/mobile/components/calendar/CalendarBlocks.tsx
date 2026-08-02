import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDays } from '@woeschplan/shared';
import type { ScheduleBufferBlock, ScheduleReservation } from '@/lib/hooks/useResidentSchedule';
import {
  blockHeight,
  calendarStyles,
  formatCountdown,
  getBufferTimerState,
  getReservationTimerState,
  localMinutesFromHHMM,
  minutesToY,
  reservationCardStyle,
} from './calendarLayout';
import { colors, typography, spacing } from '@/lib/theme';
import { t } from '@/lib/i18n';

export function QuietHoursBlock({ startMin, endMin }: { startMin: number; endMin: number }) {
  const top = minutesToY(startMin);
  const height = blockHeight(startMin, endMin);

  return (
    <View
      style={[styles.quietBlock, { top, height }]}
      accessibilityLabel={t('schedule.quietHours')}
      pointerEvents="none"
    />
  );
}

export function HourGridLines({ hours = 24 }: { hours?: number }) {
  return (
    <>
      {Array.from({ length: hours }, (_, h) => (
        <View
          key={h}
          style={[styles.gridLine, { top: h * calendarStyles.hourHeight }]}
          pointerEvents="none"
        />
      ))}
    </>
  );
}

export function BufferTimeBlock({
  block,
  nowMs,
  onPress,
}: {
  block: ScheduleBufferBlock;
  nowMs: number;
  onPress?: () => void;
}) {
  const startMin = localMinutesFromHHMM(block.localStart);
  const endMin = localMinutesFromHHMM(block.localEnd);
  const top = minutesToY(startMin);
  const height = blockHeight(startMin, endMin);
  const { remainingMs, active } = getBufferTimerState(block, nowMs);

  return (
    <Pressable
      style={[styles.bufferBlock, { top, height }]}
      onPress={onPress}
      accessibilityLabel={t('schedule.bufferUntil').replace('{time}', block.localEnd)}
    >
      <View style={styles.bufferAccent} />
      <View style={styles.bufferContent}>
        <Text style={styles.bufferLabel} numberOfLines={1}>
          {t('schedule.bufferDone')}
        </Text>
        {active ? (
          <Text style={styles.bufferCountdown} numberOfLines={1}>
            {formatCountdown(remainingMs)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

type ReservationVariant = 'day' | 'week';

export function ReservationBlock({
  reservation,
  nowMs,
  onPress,
  variant = 'day',
  compact,
}: {
  reservation: ScheduleReservation;
  nowMs: number;
  onPress: () => void;
  variant?: ReservationVariant;
  /** Maps to variant="week" for backward compatibility */
  compact?: boolean;
}) {
  const resolvedVariant: ReservationVariant = compact ? 'week' : variant;
  const startMin = localMinutesFromHHMM(reservation.localStart);
  const endMin = localMinutesFromHHMM(reservation.localEnd);
  const top = minutesToY(startMin);
  const height = blockHeight(startMin, endMin);
  const card = reservationCardStyle(reservation.isOwn, reservation.status);
  const timer = getReservationTimerState(reservation, nowMs);
  const isWeek = resolvedVariant === 'week';
  const showDetails = height >= 36 || isWeek;

  const statusLabel = timer?.active
    ? t('schedule.status.inProgress')
    : reservation.isOwn
      ? t('schedule.status.yours')
      : t('schedule.status.reserved');

  return (
    <Pressable
      style={[
        styles.eventCard,
        {
          top,
          height,
          backgroundColor: card.fill,
          borderColor: `${card.accent}33`,
        },
      ]}
      onPress={onPress}
      accessibilityLabel={`${reservation.resource.name}, ${reservation.localStart}–${reservation.localEnd}, ${reservation.privacyLabel}`}
    >
      <View style={[styles.eventAccent, { backgroundColor: card.accent }]} />
      {timer?.active ? (
        <View
          style={[
            styles.timerProgress,
            { width: `${timer.progress * 100}%`, backgroundColor: `${card.accent}22` },
          ]}
        />
      ) : null}
      <View style={styles.eventContent}>
        {showDetails ? (
          <Text style={[styles.eventTitle, { color: card.text }]} numberOfLines={isWeek ? 2 : 1}>
            {reservation.resource.name}
          </Text>
        ) : null}
        <Text style={[styles.eventTime, { color: card.textMuted }]} numberOfLines={1}>
          {reservation.localStart}–{reservation.localEnd}
        </Text>
        {showDetails && !isWeek ? (
          <Text style={[styles.eventMeta, { color: card.textMuted }]} numberOfLines={1}>
            {reservation.privacyLabel}
          </Text>
        ) : null}
        {timer?.active ? (
          <View style={styles.timerRow}>
            <View style={[styles.liveDot, { backgroundColor: card.accent }]} />
            <Text style={[styles.timerText, { color: card.accent }]}>
              {formatCountdown(timer.remainingMs)}
            </Text>
            {!isWeek ? (
              <Text style={[styles.timerMeta, { color: card.textMuted }]}>{statusLabel}</Text>
            ) : null}
          </View>
        ) : isWeek && showDetails ? (
          <Text style={[styles.eventMeta, { color: card.textMuted }]} numberOfLines={1}>
            {statusLabel}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function NowIndicator({ nowMs, timezone }: { nowMs: number; timezone: string }) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(nowMs));
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  const top = minutesToY(hour * 60 + minute);

  return (
    <View style={[styles.nowLine, { top }]} pointerEvents="none">
      <View style={styles.nowDot} />
      <View style={styles.nowBar} />
    </View>
  );
}

export function CapacityDot({ level }: { level: 'high' | 'medium' | 'low' }) {
  const color =
    level === 'high' ? colors.success : level === 'medium' ? colors.warning : colors.danger;
  return <View style={[styles.capacityDot, { backgroundColor: color }]} />;
}

export function navigateAnchorDate(view: 'day' | 'week' | 'month', anchorDate: string, delta: number): string {
  if (view === 'day') return addDays(anchorDate, delta);
  if (view === 'week') return addDays(anchorDate, delta * 7);
  const [y, m] = anchorDate.split('-').map(Number);
  const dt = new Date(y, m - 1 + delta, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-01`;
}

const styles = StyleSheet.create({
  quietBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: calendarStyles.quietFill,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: calendarStyles.gridLine,
  },
  bufferBlock: {
    position: 'absolute',
    left: 3,
    right: 3,
    flexDirection: 'row',
    backgroundColor: calendarStyles.bufferFill,
    borderRadius: calendarStyles.eventCardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: calendarStyles.bufferBorder,
    overflow: 'hidden',
  },
  bufferAccent: {
    width: calendarStyles.accentBarWidth,
    backgroundColor: colors.warning,
  },
  bufferContent: {
    flex: 1,
    paddingHorizontal: spacing.xs,
    justifyContent: 'center',
  },
  bufferLabel: {
    ...typography.caption,
    fontSize: 10,
    color: colors.warning,
    fontWeight: '600',
  },
  bufferCountdown: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.warning,
    fontVariant: ['tabular-nums'],
  },
  eventCard: {
    position: 'absolute',
    left: 3,
    right: 3,
    borderRadius: calendarStyles.eventCardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    minHeight: 24,
  },
  eventAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: calendarStyles.accentBarWidth,
  },
  timerProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  eventContent: {
    flex: 1,
    paddingLeft: calendarStyles.accentBarWidth + spacing.xs,
    paddingRight: spacing.xs,
    paddingVertical: 3,
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 15,
  },
  eventTime: {
    fontSize: 11,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  eventMeta: {
    fontSize: 10,
    marginTop: 1,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  timerText: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timerMeta: {
    fontSize: 10,
    flex: 1,
  },
  nowLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  nowDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.danger,
    marginLeft: -3,
  },
  nowBar: {
    flex: 1,
    height: 1.5,
    backgroundColor: colors.danger,
  },
  capacityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
});
