import { describe, expect, it } from 'vitest';
import {
  findQuietHoursConflicts,
  getQuietBlocksForDay,
  isMinuteInQuietHours,
  reservationOverlapsQuietHours,
} from './quiet-hours.js';

const quiet = { start: '22:00', end: '06:00' };

const toLocalParts = (d: Date) => ({
  date: d.toISOString().slice(0, 10),
  minutes: d.getUTCHours() * 60 + d.getUTCMinutes(),
});

describe('quiet hours', () => {
  it('detects overnight quiet blocks', () => {
    expect(getQuietBlocksForDay(quiet)).toEqual([
      { startMin: 0, endMin: 360 },
      { startMin: 1320, endMin: 1440 },
    ]);
  });

  it('marks minutes inside quiet hours', () => {
    expect(isMinuteInQuietHours(23 * 60, quiet)).toBe(true);
    expect(isMinuteInQuietHours(3 * 60, quiet)).toBe(true);
    expect(isMinuteInQuietHours(12 * 60, quiet)).toBe(false);
  });

  it('rejects reservations overlapping quiet hours', () => {
    const start = new Date('2025-07-19T21:30:00Z');
    const end = new Date('2025-07-19T22:30:00Z');
    expect(
      reservationOverlapsQuietHours({
        startTime: start,
        endTime: end,
        quietHours: quiet,
        toLocalParts,
      }),
    ).toBe(true);
  });

  it('allows reservations within washing window', () => {
    const start = new Date('2025-07-19T08:00:00Z');
    const end = new Date('2025-07-19T10:00:00Z');
    expect(
      reservationOverlapsQuietHours({
        startTime: start,
        endTime: end,
        quietHours: quiet,
        toLocalParts,
      }),
    ).toBe(false);
  });

  it('finds conflicts when quiet hours change', () => {
    const conflicts = findQuietHoursConflicts({
      quietHours: quiet,
      bufferMinutes: 0,
      toLocalParts,
      reservations: [
        {
          id: 'r1',
          startTime: new Date('2025-07-19T08:00:00Z'),
          endTime: new Date('2025-07-19T10:00:00Z'),
          localDate: '2025-07-19',
          localStart: '08:00',
          localEnd: '10:00',
          resourceName: 'Washer 1',
          residentLabel: 'Anna',
        },
        {
          id: 'r2',
          startTime: new Date('2025-07-19T21:00:00Z'),
          endTime: new Date('2025-07-19T22:30:00Z'),
          localDate: '2025-07-19',
          localStart: '21:00',
          localEnd: '22:30',
          resourceName: 'Washer 2',
          residentLabel: 'Ben',
        },
      ],
    });
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].reservationId).toBe('r2');
  });
});
