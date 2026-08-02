import { describe, expect, it } from 'vitest';
import { generateRecurrenceDates } from '../src/maintenance-recurrence.js';

describe('generateRecurrenceDates', () => {
  it('generates daily occurrences', () => {
    const dates = generateRecurrenceDates({
      startDate: '2026-07-01',
      recurrenceType: 'DAILY',
      recurrenceInterval: 1,
      recurrenceEndDate: '2026-07-03',
    });
    expect(dates).toEqual(['2026-07-01', '2026-07-02', '2026-07-03']);
  });

  it('generates weekly occurrences on selected weekday', () => {
    const dates = generateRecurrenceDates({
      startDate: '2026-07-06',
      recurrenceType: 'WEEKLY',
      recurrenceInterval: 1,
      recurrenceDays: [1],
      recurrenceEndDate: '2026-07-20',
    });
    expect(dates).toContain('2026-07-06');
    expect(dates).toContain('2026-07-13');
  });
});
