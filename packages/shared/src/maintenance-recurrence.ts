import { addDays, startOfWeek } from './schedule-calendar.js';
import type { MaintenanceRecurrenceType } from './maintenance.js';

export function parseYmd(date: string): { y: number; m: number; d: number } {
  const [y, m, d] = date.split('-').map(Number);
  return { y, m, d };
}

export function formatYmd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function compareYmd(a: string, b: string): number {
  return a.localeCompare(b);
}

export function addDaysYmd(date: string, days: number): string {
  const { y, m, d } = parseYmd(date);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return formatYmd(dt);
}

export function startOfMonthYmd(date: string): string {
  const { y, m } = parseYmd(date);
  return `${y}-${String(m).padStart(2, '0')}-01`;
}

export function endOfMonthYmd(date: string): string {
  const { y, m } = parseYmd(date);
  const last = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}

export function calendarRangeForView(view: 'month' | 'week' | 'list', anchorDate: string) {
  if (view === 'week') {
    const start = startOfWeek(anchorDate);
    return { startDate: start, endDate: addDays(start, 6) };
  }
  if (view === 'month') {
    return { startDate: startOfMonthYmd(anchorDate), endDate: endOfMonthYmd(anchorDate) };
  }
  const start = anchorDate;
  return { startDate: start, endDate: addDaysYmd(start, 30) };
}

export function generateRecurrenceDates(params: {
  startDate: string;
  recurrenceType: MaintenanceRecurrenceType;
  recurrenceInterval: number;
  recurrenceDays?: number[] | null;
  recurrenceEndDate?: string | null;
  maxOccurrences?: number;
}): string[] {
  const max = params.maxOccurrences ?? 366;
  const hardEnd = params.recurrenceEndDate ?? addDaysYmd(params.startDate, 730);
  const dates: string[] = [];
  const interval = Math.max(1, params.recurrenceInterval);

  if (params.recurrenceType === 'DAILY') {
    let current = params.startDate;
    while (dates.length < max && compareYmd(current, hardEnd) <= 0) {
      dates.push(current);
      current = addDaysYmd(current, interval);
    }
    return dates;
  }

  if (params.recurrenceType === 'WEEKLY') {
    const weekdays = (params.recurrenceDays ?? []).slice().sort();
    if (weekdays.length === 0) return [params.startDate];

    let weekStart = startOfWeek(params.startDate);
    let weekIndex = 0;
    while (dates.length < max) {
      if (weekIndex % interval === 0) {
        for (const weekday of weekdays) {
          const candidate = addDaysYmd(weekStart, weekday === 0 ? 6 : weekday - 1);
          if (compareYmd(candidate, params.startDate) < 0) continue;
          if (compareYmd(candidate, hardEnd) > 0) return dates;
          dates.push(candidate);
          if (dates.length >= max) return dates;
        }
      }
      weekStart = addDaysYmd(weekStart, 7);
      weekIndex += 1;
      if (compareYmd(weekStart, hardEnd) > 0) break;
    }
    return dates;
  }

  if (params.recurrenceType === 'MONTHLY') {
    const { y, m, d } = parseYmd(params.startDate);
    let cursor = new Date(y, m - 1, d);
    let count = 0;
    while (dates.length < max) {
      const current = formatYmd(cursor);
      if (compareYmd(current, hardEnd) > 0) break;
      if (compareYmd(current, params.startDate) >= 0) dates.push(current);
      count += 1;
      cursor = new Date(y, m - 1 + interval * count, d);
    }
    return dates;
  }

  // YEARLY
  const { y, m, d } = parseYmd(params.startDate);
  let yearOffset = 0;
  while (dates.length < max) {
    const cursor = new Date(y + interval * yearOffset, m - 1, d);
    const current = formatYmd(cursor);
    if (compareYmd(current, hardEnd) > 0) break;
    dates.push(current);
    yearOffset += 1;
  }
  return dates;
}
