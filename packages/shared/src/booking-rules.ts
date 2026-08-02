import { z } from 'zod';
import type { ResourceType } from './constants.js';
import { resourceTypeToBookingRulesKey } from './resources.js';
import {
  bookingRulesSchema,
  machineTypeBookingRulesSchema,
  type BookingRules,
} from './schemas.js';

export const bookingRulesPatchSchema = z.object({
  maxActiveReservationsPerResident: z.number().int().min(1).max(10).optional(),
  allowRecurringReservations: z.boolean().optional(),
  washingMachine: machineTypeBookingRulesSchema.partial().optional(),
  tumbleDryer: machineTypeBookingRulesSchema.partial().optional(),
  dryingRoom: machineTypeBookingRulesSchema.partial().optional(),
});

export type ResourceTypeKey = ResourceType;
/** @deprecated Use ResourceTypeKey */
export type MachineTypeKey = 'WASHING_MACHINE' | 'TUMBLE_DRYER';

export type ResolvedBookingRules = z.infer<typeof machineTypeBookingRulesSchema> & {
  maxActiveReservationsPerResident: number;
  allowRecurringReservations: boolean;
};

export function createDefaultBookingRules(): BookingRules {
  return bookingRulesSchema.parse({
    washingMachine: {},
    tumbleDryer: {},
    dryingRoom: {},
  });
}

/** Migrate legacy flat bookingRules JSON to the nested per-resource-type structure. */
export function normalizeBookingRules(raw: unknown): BookingRules {
  if (!raw || typeof raw !== 'object') return createDefaultBookingRules();

  const r = raw as Record<string, unknown>;

  if (r.washingMachine && r.tumbleDryer) {
    return bookingRulesSchema.parse({
      ...r,
      dryingRoom: r.dryingRoom ?? r.washingMachine,
    });
  }

  const legacyMachine = machineTypeBookingRulesSchema.parse({
    maxBookingDurationMinutes: r.maxBookingDurationMinutes,
    maxDaysInAdvance: r.maxDaysInAdvance,
    earliestBookingMinutesFromNow: r.earliestBookingMinutesFromNow,
    bufferMinutesBetweenReservations: r.bufferMinutesBetweenReservations,
    cancellationDeadlineMinutes: r.cancellationDeadlineMinutes,
    noShowGracePeriodMinutes: r.noShowGracePeriodMinutes,
  });

  return bookingRulesSchema.parse({
    maxActiveReservationsPerResident: r.maxActiveReservationsPerResident,
    allowRecurringReservations: r.allowRecurringReservations,
    washingMachine: legacyMachine,
    tumbleDryer: { ...legacyMachine },
    dryingRoom: { ...legacyMachine },
  });
}

export function resolveBookingRulesForResource(
  bookingRules: BookingRules,
  resourceType: ResourceType,
): ResolvedBookingRules {
  const key = resourceTypeToBookingRulesKey(resourceType);
  const typeRules = bookingRules[key];
  return {
    ...typeRules,
    maxActiveReservationsPerResident: bookingRules.maxActiveReservationsPerResident,
    allowRecurringReservations: bookingRules.allowRecurringReservations,
  };
}

/** @deprecated Use resolveBookingRulesForResource */
export function resolveBookingRulesForMachine(
  bookingRules: BookingRules,
  machineType: 'WASHING_MACHINE' | 'TUMBLE_DRYER',
): ResolvedBookingRules {
  return resolveBookingRulesForResource(bookingRules, machineType);
}

export function mergeBookingRules(
  current: BookingRules,
  patch: z.infer<typeof bookingRulesPatchSchema>,
): BookingRules {
  if (!patch) return current;
  return bookingRulesSchema.parse({
    ...current,
    ...patch,
    washingMachine: patch.washingMachine
      ? { ...current.washingMachine, ...patch.washingMachine }
      : current.washingMachine,
    tumbleDryer: patch.tumbleDryer
      ? { ...current.tumbleDryer, ...patch.tumbleDryer }
      : current.tumbleDryer,
    dryingRoom: patch.dryingRoom
      ? { ...current.dryingRoom, ...patch.dryingRoom }
      : current.dryingRoom,
  });
}

export function formatBookingRulesSummary(rules: BookingRules): string {
  const washer = formatDuration(rules.washingMachine.maxBookingDurationMinutes);
  const dryer = formatDuration(rules.tumbleDryer.maxBookingDurationMinutes);
  const dryingRoom = formatDuration(rules.dryingRoom.maxBookingDurationMinutes);
  const unique = new Set([washer, dryer, dryingRoom]);
  if (unique.size === 1) return washer;
  return `${washer} / ${dryer} / ${dryingRoom}`;
}

/** Booking duration options: 1 h – 12 h in 30-minute steps. */
export const DURATION_OPTIONS_MINUTES = Array.from(
  { length: (720 - 60) / 30 + 1 },
  (_, i) => 60 + i * 30,
) as number[];

export const ADVANCE_DAYS_OPTIONS = Array.from({ length: 30 }, (_, i) => i + 1);

export const MINUTES_POLICY_OPTIONS = [
  0, 5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 360, 720, 1440,
] as const;

export const ACTIVE_RESERVATION_OPTIONS = [1, 2, 3, 4, 5] as const;

export function nearestDurationOption(minutes: number): number {
  if (DURATION_OPTIONS_MINUTES.includes(minutes)) return minutes;
  return DURATION_OPTIONS_MINUTES.reduce((best, opt) =>
    Math.abs(opt - minutes) < Math.abs(best - minutes) ? opt : best,
  );
}

export function nearestPolicyMinutes(minutes: number): number {
  if (MINUTES_POLICY_OPTIONS.includes(minutes as (typeof MINUTES_POLICY_OPTIONS)[number])) {
    return minutes;
  }
  return MINUTES_POLICY_OPTIONS.reduce((best, opt) =>
    Math.abs(opt - minutes) < Math.abs(best - minutes) ? opt : best,
  );
}

export function nearestAdvanceDays(days: number): number {
  if (ADVANCE_DAYS_OPTIONS.includes(days)) return days;
  return ADVANCE_DAYS_OPTIONS.reduce((best, opt) =>
    Math.abs(opt - days) < Math.abs(best - days) ? opt : best,
  );
}

export function formatDuration(minutes: number): string {
  if (minutes % 60 === 0) {
    const h = minutes / 60;
    return h === 1 ? '1 h' : `${h} h`;
  }
  if (minutes > 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}.${m === 30 ? 5 : m} h` : `${h} h`;
  }
  return `${minutes} min`;
}

export function formatMinutesPolicy(minutes: number): string {
  if (minutes === 0) return '0 min';
  return formatDuration(minutes);
}

export function formatAdvanceDays(days: number): string {
  return days === 1 ? '1 day' : `${days} days`;
}
