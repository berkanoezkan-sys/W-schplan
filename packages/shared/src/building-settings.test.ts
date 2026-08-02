import { describe, expect, it } from 'vitest';
import {
  createDefaultHouseRules,
  deriveQuietHours,
  formatDuration,
  formatTimeRange,
  nearestDurationOption,
  normalizeHouseRules,
} from '@woeschplan/shared';

describe('building settings shared helpers', () => {
  it('creates structured default house rules', () => {
    const rules = createDefaultHouseRules();
    expect(rules.washingHours.start).toBe('06:00');
    expect(rules.quietHours).toEqual({ start: '22:00', end: '06:00' });
    expect(rules.contact.name).toBeTruthy();
    expect(rules.emergencyContacts.length).toBeGreaterThan(4);
  });

  it('derives quiet hours from washing hours', () => {
    expect(deriveQuietHours({ start: '07:00', end: '22:30' })).toEqual({
      start: '22:30',
      end: '07:00',
    });
    expect(deriveQuietHours({ start: '06:00', end: '22:00' })).toEqual({
      start: '22:00',
      end: '06:00',
    });
  });

  it('migrates legacy flat house rules and openingHours key', () => {
    const migrated = normalizeHouseRules({
      openingHours: '6:00 – 22:00',
      quietHours: '22:00 – 6:00',
    });
    expect(migrated.washingHours).toEqual({ start: '06:00', end: '22:00' });
    expect(migrated.quietHours).toEqual({ start: '22:00', end: '06:00' });
  });

  it('formats duration labels', () => {
    expect(formatDuration(60)).toBe('1 h');
    expect(formatDuration(90)).toBe('1.5 h');
    expect(formatDuration(120)).toBe('2 h');
    expect(formatDuration(720)).toBe('12 h');
  });

  it('snaps to nearest duration option', () => {
    expect(nearestDurationOption(180)).toBe(180);
    expect(nearestDurationOption(200)).toBe(210);
  });

  it('formats time ranges', () => {
    expect(formatTimeRange({ start: '06:00', end: '22:00' })).toBe('06:00 – 22:00');
  });
});
