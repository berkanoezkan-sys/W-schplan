import { describe, expect, it } from 'vitest';
import {
  formatAdminResidentName,
  reservationStatusesForSchedule,
  scheduleQuerySchema,
} from './reservations.js';

describe('scheduleQuerySchema', () => {
  it('accepts seed-style resource ids', () => {
    const parsed = scheduleQuerySchema.parse({
      view: 'day',
      resourceId: 'seed-drying-room-1',
      laundryRoomId: 'seed-room-1',
    });
    expect(parsed.resourceId).toBe('seed-drying-room-1');
    expect(parsed.laundryRoomId).toBe('seed-room-1');
  });
});

describe('formatAdminResidentName', () => {
  it('includes apartment number when available', () => {
    expect(
      formatAdminResidentName({
        firstName: 'Marco',
        lastName: 'Meier',
        apartmentNumber: '4B',
      }),
    ).toBe('Marco Meier · 4B');
  });
});

describe('reservationStatusesForSchedule', () => {
  it('returns management statuses for administrators', () => {
    expect(reservationStatusesForSchedule(true)).toEqual(['CONFIRMED', 'COMPLETED', 'NO_SHOW']);
  });

  it('returns only confirmed reservations for residents', () => {
    expect(reservationStatusesForSchedule(false)).toEqual(['CONFIRMED']);
  });
});
