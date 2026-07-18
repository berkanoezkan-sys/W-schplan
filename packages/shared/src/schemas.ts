import { z } from 'zod';
import {
  CHECKLIST_TYPES,
  DEFECT_CATEGORIES,
  MACHINE_TYPES,
  PRIVACY_LABEL_MODES,
  SEVERITIES,
} from './constants.js';

export const bookingRulesSchema = z.object({
  maxActiveReservationsPerResident: z.number().int().min(1).default(2),
  maxBookingDurationMinutes: z.number().int().min(15).default(180),
  earliestBookingMinutesFromNow: z.number().int().min(0).default(0),
  maxDaysInAdvance: z.number().int().min(1).default(14),
  cancellationDeadlineMinutes: z.number().int().min(0).default(60),
  bufferMinutesBetweenReservations: z.number().int().min(0).default(15),
  allowRecurringReservations: z.boolean().default(false),
  noShowGracePeriodMinutes: z.number().int().min(0).default(15),
});

export const createReservationSchema = z.object({
  machineId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  recurrenceRule: z.string().optional(),
});

export const createTimerSchema = z.object({
  machineId: z.string().uuid(),
  reservationId: z.string().uuid().optional(),
  remainingMinutes: z.number().int().min(1).max(300),
  notifyFiveMinutesBefore: z.boolean().default(true),
  notifyOnCompletion: z.boolean().default(true),
  notifyTenMinutesAfterIfChecklistIncomplete: z.boolean().default(true),
});

export const createDefectSchema = z.object({
  machineId: z.string().uuid(),
  category: z.enum(DEFECT_CATEGORIES),
  description: z.string().min(3).max(1000),
  severity: z.enum(SEVERITIES).default('MEDIUM'),
  photoUrl: z.string().url().optional(),
});

export const completeChecklistSchema = z.object({
  machineId: z.string().uuid(),
  reservationId: z.string().uuid().optional(),
  checklistType: z.enum(CHECKLIST_TYPES),
  completedItems: z.array(z.string()).min(1),
});

export const createMachineSchema = z.object({
  laundryRoomId: z.string().uuid(),
  name: z.string().min(1).max(100),
  machineType: z.enum(MACHINE_TYPES),
  model: z.string().optional(),
  estimatedDefaultRuntime: z.number().int().min(15).default(90),
});

export const buildingSettingsSchema = z.object({
  privacyLabelMode: z.enum(PRIVACY_LABEL_MODES).default('FIRST_NAME'),
  bookingRules: bookingRulesSchema,
});

export type BookingRules = z.infer<typeof bookingRulesSchema>;
export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type CreateTimerInput = z.infer<typeof createTimerSchema>;
export type CreateDefectInput = z.infer<typeof createDefectSchema>;
