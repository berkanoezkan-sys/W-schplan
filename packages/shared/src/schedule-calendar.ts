import type { TimeRange } from './building-settings.js';
import type { ScheduleView } from './reservations.js';
import { getQuietBlocksForDay, intervalsOverlap, parseHHMM } from './quiet-hours.js';

export type { ScheduleView };

export type CapacityLevel = 'high' | 'medium' | 'low';

export type BufferBlock = {
  resourceId: string;
  reservationId: string;
  startTime: string;
  endTime: string;
  localStart: string;
  localEnd: string;
  localDate: string;
};

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return formatDateYMD(dt);
}

export function formatDateYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function startOfWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  return formatDateYMD(dt);
}

export function getViewDateRange(view: ScheduleView, anchorDate: string): { start: string; end: string } {
  if (view === 'day') {
    return { start: anchorDate, end: addDays(anchorDate, 1) };
  }
  if (view === 'week') {
    const start = startOfWeek(anchorDate);
    return { start, end: addDays(start, 7) };
  }
  const [y, m] = anchorDate.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  return { start: formatDateYMD(first), end: addDays(formatDateYMD(last), 1) };
}

export function getMonthGridDays(anchorDate: string): string[] {
  const [y, m] = anchorDate.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  const gridStart = new Date(first);
  const dow = gridStart.getDay();
  gridStart.setDate(gridStart.getDate() - (dow === 0 ? 6 : dow - 1));

  const days: string[] = [];
  const cursor = new Date(gridStart);
  while (cursor <= last || days.length % 7 !== 0) {
    days.push(formatDateYMD(cursor));
    cursor.setDate(cursor.getDate() + 1);
    if (days.length >= 42) break;
  }
  return days;
}

export function computeBufferBlock(
  reservationEnd: Date,
  bufferMinutes: number,
): { start: Date; end: Date } | null {
  if (bufferMinutes <= 0) return null;
  return {
    start: reservationEnd,
    end: new Date(reservationEnd.getTime() + bufferMinutes * 60000),
  };
}

export function computeCapacityLevel(freeRatio: number): CapacityLevel {
  if (freeRatio >= 0.5) return 'high';
  if (freeRatio >= 0.2) return 'medium';
  return 'low';
}

export function capacityColor(level: CapacityLevel): string {
  switch (level) {
    case 'high':
      return '#6BC04A';
    case 'medium':
      return '#E6A817';
    case 'low':
      return '#D64545';
  }
}

/** Bookable minutes per day = washing hours minus quiet overlap (usually identical to washing window). */
export function bookableMinutesPerDay(washingHours: TimeRange): number {
  const start = parseHHMM(washingHours.start);
  const end = parseHHMM(washingHours.end);
  if (end > start) return end - start;
  return 1440 - start + end;
}

export function computeDayCapacity(params: {
  date: string;
  washingHours: TimeRange;
  quietHours: TimeRange;
  machineCount: number;
  reservations: Array<{ localDate: string; startTime: string; endTime: string }>;
}): { freeRatio: number; level: CapacityLevel } {
  const { date, washingHours, machineCount, reservations } = params;
  if (machineCount === 0) return { freeRatio: 0, level: 'low' };

  const bookable = bookableMinutesPerDay(washingHours) * machineCount;
  if (bookable <= 0) return { freeRatio: 0, level: 'low' };

  const washStart = parseHHMM(washingHours.start);
  const washEnd = parseHHMM(washingHours.end);

  let booked = 0;
  for (const r of reservations) {
    if (r.localDate !== date) continue;
    const [sh, sm] = r.startTime.split(':').map(Number);
    const [eh, em] = r.endTime.split(':').map(Number);
    let startMin = sh * 60 + sm;
    let endMin = eh * 60 + em;
    if (endMin <= startMin) endMin += 1440;
    startMin = Math.max(startMin, washStart);
    endMin = Math.min(endMin, washEnd > washStart ? washEnd : 1440);
    if (endMin > startMin) booked += endMin - startMin;
  }

  const freeRatio = Math.max(0, Math.min(1, 1 - booked / bookable));
  return { freeRatio, level: computeCapacityLevel(freeRatio) };
}

export function reservationColor(isOwn: boolean, status: string): string {
  if (status === 'COMPLETED') return '#6BC04A';
  if (isOwn) return '#1E4470';
  return '#5B8FC6';
}

export function isWithinWashingHours(
  startMin: number,
  endMin: number,
  washingHours: TimeRange,
): boolean {
  const washStart = parseHHMM(washingHours.start);
  const washEnd = parseHHMM(washingHours.end);
  if (washEnd > washStart) {
    return startMin >= washStart && endMin <= washEnd;
  }
  return (startMin >= washStart || startMin < washEnd) && (endMin <= washEnd || endMin > washStart);
}

export function overlapsQuietBlocks(
  startMin: number,
  endMin: number,
  quietHours: TimeRange,
): boolean {
  for (const block of getQuietBlocksForDay(quietHours)) {
    if (intervalsOverlap(startMin, endMin, block.startMin, block.endMin)) return true;
  }
  return false;
}
