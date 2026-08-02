import type { TimeRange } from './building-settings.js';

function addDaysLocal(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export function parseHHMM(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function formatHHMM(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function quietHoursCrossMidnight(quiet: TimeRange): boolean {
  return parseHHMM(quiet.start) > parseHHMM(quiet.end);
}

export function isMinuteInQuietHours(minute: number, quiet: TimeRange): boolean {
  const start = parseHHMM(quiet.start);
  const end = parseHHMM(quiet.end);
  const m = ((minute % 1440) + 1440) % 1440;
  if (start > end) return m >= start || m < end;
  return m >= start && m < end;
}

/** Quiet-hour blocks within a single calendar day (minutes 0–1440). */
export function getQuietBlocksForDay(quiet: TimeRange): Array<{ startMin: number; endMin: number }> {
  const start = parseHHMM(quiet.start);
  const end = parseHHMM(quiet.end);
  if (start > end) {
    return [
      { startMin: 0, endMin: end },
      { startMin: start, endMin: 1440 },
    ];
  }
  return [{ startMin: start, endMin: end }];
}

export function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export type LocalDateTimeParts = {
  date: string;
  minutes: number;
};

/** Split an interval into per-day minute ranges (local calendar days). */
export function splitIntervalByLocalDays(
  start: Date,
  end: Date,
  toLocalParts: (d: Date) => LocalDateTimeParts,
): Array<{ date: string; startMin: number; endMin: number }> {
  if (end <= start) return [];

  const startParts = toLocalParts(start);
  const endParts = toLocalParts(end);
  const segments: Array<{ date: string; startMin: number; endMin: number }> = [];

  let currentDate = startParts.date;
  let currentStartMin = startParts.minutes;

  while (currentDate <= endParts.date) {
    if (currentDate === endParts.date) {
      segments.push({ date: currentDate, startMin: currentStartMin, endMin: endParts.minutes });
      break;
    }
    segments.push({ date: currentDate, startMin: currentStartMin, endMin: 1440 });
    currentDate = addDaysLocal(currentDate, 1);
    currentStartMin = 0;
  }

  return segments;
}

export function reservationOverlapsQuietHours(params: {
  startTime: Date;
  endTime: Date;
  quietHours: TimeRange;
  bufferMinutes?: number;
  toLocalParts: (d: Date) => LocalDateTimeParts;
}): boolean {
  const { startTime, endTime, quietHours, bufferMinutes = 0, toLocalParts } = params;
  const bufferedStart = new Date(startTime.getTime() - bufferMinutes * 60000);
  const bufferedEnd = new Date(endTime.getTime() + bufferMinutes * 60000);
  const quietBlocks = getQuietBlocksForDay(quietHours);

  const segments = splitIntervalByLocalDays(bufferedStart, bufferedEnd, toLocalParts);
  for (const segment of segments) {
    for (const quiet of quietBlocks) {
      if (intervalsOverlap(segment.startMin, segment.endMin, quiet.startMin, quiet.endMin)) {
        return true;
      }
    }
  }
  return false;
}

export type QuietHoursConflict = {
  reservationId: string;
  localDate: string;
  localStart: string;
  localEnd: string;
  resourceName: string;
  residentLabel: string;
};

/** Find confirmed reservations that would overlap newly derived quiet hours. */
export function findQuietHoursConflicts(params: {
  quietHours: TimeRange;
  bufferMinutes: number;
  reservations: Array<{
    id: string;
    startTime: Date;
    endTime: Date;
    localDate: string;
    localStart: string;
    localEnd: string;
    resourceName: string;
    residentLabel: string;
  }>;
  toLocalParts: (d: Date) => LocalDateTimeParts;
}): QuietHoursConflict[] {
  const conflicts: QuietHoursConflict[] = [];
  for (const r of params.reservations) {
    if (
      reservationOverlapsQuietHours({
        startTime: r.startTime,
        endTime: r.endTime,
        quietHours: params.quietHours,
        bufferMinutes: params.bufferMinutes,
        toLocalParts: params.toLocalParts,
      })
    ) {
      conflicts.push({
        reservationId: r.id,
        localDate: r.localDate,
        localStart: r.localStart,
        localEnd: r.localEnd,
        resourceName: r.resourceName,
        residentLabel: r.residentLabel,
      });
    }
  }
  return conflicts;
}
