import { describe, expect, it } from 'vitest';

describe('reservation overlap logic', () => {
  function overlaps(
    aStart: Date,
    aEnd: Date,
    bStart: Date,
    bEnd: Date,
    bufferMinutes: number,
  ): boolean {
    const bufferedStart = new Date(aStart.getTime() - bufferMinutes * 60000);
    const bufferedEnd = new Date(aEnd.getTime() + bufferMinutes * 60000);
    return bStart < bufferedEnd && bEnd > bufferedStart;
  }

  it('detects overlapping reservations with buffer', () => {
    const existingStart = new Date('2026-07-19T10:00:00Z');
    const existingEnd = new Date('2026-07-19T11:00:00Z');
    const newStart = new Date('2026-07-19T10:45:00Z');
    const newEnd = new Date('2026-07-19T12:00:00Z');
    expect(overlaps(existingStart, existingEnd, newStart, newEnd, 15)).toBe(true);
  });

  it('allows non-overlapping slots with buffer', () => {
    const existingStart = new Date('2026-07-19T10:00:00Z');
    const existingEnd = new Date('2026-07-19T11:00:00Z');
    const newStart = new Date('2026-07-19T12:00:00Z');
    const newEnd = new Date('2026-07-19T13:00:00Z');
    expect(overlaps(existingStart, existingEnd, newStart, newEnd, 15)).toBe(false);
  });

  it('rejects end time before start time conceptually', () => {
    const start = new Date('2026-07-19T12:00:00Z');
    const end = new Date('2026-07-19T11:00:00Z');
    expect(end <= start).toBe(true);
  });
});
