import { parseHHMM } from '@woeschplan/shared';
import { spacing } from '@/lib/theme';
import type { ScheduleBufferBlock, ScheduleReservation } from '@/lib/hooks/useResidentSchedule';

/** Tighter hour rows for a denser day/week grid (Apple Calendar–like density). */
export const HOUR_HEIGHT = 44;
export const TIMELINE_HOURS = 24;
export const TIMELINE_HEIGHT = HOUR_HEIGHT * TIMELINE_HOURS;
export const LANE_LABEL_WIDTH = 80;
export const TIME_GUTTER = 40;
/** Wider day columns so week events read as cards, not slivers. */
export const WEEK_COLUMN_WIDTH = 148;

export function minutesToY(minutes: number): number {
  return (minutes / 60) * HOUR_HEIGHT;
}

export function yToMinutes(y: number): number {
  return Math.round((y / HOUR_HEIGHT) * 60);
}

export function blockHeight(startMin: number, endMin: number): number {
  const duration = Math.max(endMin - startMin, 15);
  return minutesToY(duration);
}

export function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

export function reservationProgress(
  startTime: string,
  endTime: string,
  nowMs: number,
  activeTimerExpectedCompletion: string | null,
): number | null {
  if (!activeTimerExpectedCompletion) return null;
  const remaining = new Date(activeTimerExpectedCompletion).getTime() - nowMs;
  if (remaining <= 0) return null;
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  if (nowMs < start || nowMs > end) return null;
  const total = end - start;
  if (total <= 0) return null;
  return Math.min(1, Math.max(0, (nowMs - start) / total));
}

export function clampEndMinutes(startMin: number, endMin: number): number {
  if (endMin <= startMin) return startMin + 30;
  return endMin;
}

export function localMinutesFromHHMM(time: string): number {
  return parseHHMM(time);
}

/** Apple-style event card palette: tinted fill + accent bar, not solid blocks. */
export function reservationCardStyle(isOwn: boolean, status: string) {
  if (status === 'COMPLETED') {
    return {
      fill: 'rgba(107, 192, 74, 0.14)',
      accent: '#6BC04A',
      text: '#1A2B33',
      textMuted: '#5A6B73',
    };
  }
  if (isOwn) {
    return {
      fill: 'rgba(30, 68, 112, 0.12)',
      accent: '#1E4470',
      text: '#1A2B33',
      textMuted: '#5A6B73',
    };
  }
  return {
    fill: 'rgba(91, 143, 198, 0.12)',
    accent: '#5B8FC6',
    text: '#1A2B33',
    textMuted: '#5A6B73',
  };
}

export type ReservationTimerState = {
  remainingMs: number;
  progress: number;
  active: boolean;
};

/** Central timer logic for reservation blocks — keeps UI and tests in sync. */
export function getReservationTimerState(
  reservation: ScheduleReservation,
  nowMs: number,
): ReservationTimerState | null {
  const expected = reservation.activeTimer?.expectedCompletionTime;
  if (!expected) return null;
  const remainingMs = Math.max(0, new Date(expected).getTime() - nowMs);
  const progress = reservationProgress(
    reservation.startTime,
    reservation.endTime,
    nowMs,
    expected,
  );
  if (remainingMs <= 0 || progress == null) return null;
  return { remainingMs, progress, active: true };
}

export type BufferTimerState = {
  remainingMs: number;
  active: boolean;
};

/** Buffer countdown after a reservation ends — machine unavailable until buffer clears. */
export function getBufferTimerState(block: ScheduleBufferBlock, nowMs: number): BufferTimerState {
  const endMs = new Date(block.endTime).getTime();
  const remainingMs = Math.max(0, endMs - nowMs);
  return { remainingMs, active: remainingMs > 0 };
}

export const calendarStyles = {
  hourHeight: HOUR_HEIGHT,
  laneGap: spacing.xs,
  blockRadius: 10,
  eventCardRadius: 8,
  accentBarWidth: 3,
  quietFill: 'rgba(214, 69, 69, 0.05)',
  quietBorder: 'rgba(214, 69, 69, 0.12)',
  bufferFill: 'rgba(230, 168, 23, 0.10)',
  bufferBorder: 'rgba(230, 168, 23, 0.35)',
  gridLine: 'rgba(226, 234, 240, 0.9)',
};
