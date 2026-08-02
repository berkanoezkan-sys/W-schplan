import { z } from 'zod';
import {
  CHECKLIST_TYPES,
  DEFECT_CATEGORIES,
  MACHINE_STATUSES,
  PRIVACY_LABEL_MODES,
  RESOURCE_TYPES,
  SEVERITIES,
} from './constants.js';

export const machineTypeBookingRulesSchema = z.object({
  maxBookingDurationMinutes: z.number().int().min(60).max(720).default(180),
  maxDaysInAdvance: z.number().int().min(1).max(90).default(14),
  earliestBookingMinutesFromNow: z.number().int().min(0).max(1440).default(0),
  bufferMinutesBetweenReservations: z.number().int().min(0).max(240).default(15),
  cancellationDeadlineMinutes: z.number().int().min(0).max(1440).default(60),
  noShowGracePeriodMinutes: z.number().int().min(0).max(120).default(15),
});

export const bookingRulesSchema = z.object({
  maxActiveReservationsPerResident: z.number().int().min(1).max(10).default(2),
  allowRecurringReservations: z.boolean().default(false),
  washingMachine: machineTypeBookingRulesSchema,
  tumbleDryer: machineTypeBookingRulesSchema,
  dryingRoom: machineTypeBookingRulesSchema,
});

export type MachineTypeBookingRules = z.infer<typeof machineTypeBookingRulesSchema>;

export const createReservationSchema = z.object({
  resourceId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  recurrenceRule: z.string().optional(),
});

export const createTimerSchema = z.object({
  resourceId: z.string().uuid(),
  reservationId: z.string().uuid().optional(),
  remainingMinutes: z.number().int().min(1).max(300),
  notifyFiveMinutesBefore: z.boolean().default(true),
  notifyOnCompletion: z.boolean().default(true),
  notifyTenMinutesAfterIfChecklistIncomplete: z.boolean().default(true),
});

export const createDefectSchema = z.object({
  resourceId: z.string().uuid(),
  category: z.enum(DEFECT_CATEGORIES),
  description: z.string().min(3).max(1000),
  severity: z.enum(SEVERITIES).default('MEDIUM'),
  photoUrl: z.string().url().optional(),
});

export const completeChecklistSchema = z.object({
  resourceId: z.string().uuid(),
  reservationId: z.string().uuid().optional(),
  checklistType: z.enum(CHECKLIST_TYPES),
  completedItems: z.array(z.string()).min(1),
});

export const createLaundryRoomSchema = z.object({
  name: z.string().trim().min(1).max(100),
  floor: z.string().trim().max(50).optional(),
  instructions: z.string().trim().max(500).optional(),
});

export const updateLaundryRoomSchema = createLaundryRoomSchema.partial().extend({
  isActive: z.boolean().optional(),
  blockReason: z.string().trim().max(200).nullable().optional(),
});

export const createResourceSchema = z.object({
  name: z.string().trim().min(1).max(100),
  resourceType: z.enum(RESOURCE_TYPES),
  model: z.string().trim().max(100).optional(),
  estimatedDefaultRuntime: z.number().int().min(15).max(300).default(90),
});

export const updateResourceSchema = createResourceSchema.partial().extend({
  isActive: z.boolean().optional(),
  status: z.enum(MACHINE_STATUSES).optional(),
});

/** @deprecated Use createResourceSchema */
export const createMachineSchema = createResourceSchema.extend({
  laundryRoomId: z.string().uuid(),
  machineType: z.enum(['WASHING_MACHINE', 'TUMBLE_DRYER'] as const),
});

export const buildingSettingsSchema = z.object({
  privacyLabelMode: z.enum(PRIVACY_LABEL_MODES).default('FIRST_NAME'),
  bookingRules: bookingRulesSchema,
});

export const createBuildingSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    address: z.string().trim().min(1).max(200).optional(),
    street: z.string().trim().min(1).max(120).optional(),
    postalCode: z.string().trim().min(1).max(20).optional(),
    city: z.string().trim().min(1).max(100).optional(),
    country: z.string().trim().length(2).default('CH'),
    timezone: z.string().min(1).default('Europe/Zurich'),
    language: z.enum(['de', 'en', 'fr', 'it']).default('de'),
  })
  .refine((data) => !!data.address || (!!data.street && !!data.postalCode && !!data.city), {
    message: 'ADDRESS_REQUIRED',
  });

export type BookingRules = z.infer<typeof bookingRulesSchema>;
export type CreateBuildingInput = z.infer<typeof createBuildingSchema>;
export type CreateLaundryRoomInput = z.infer<typeof createLaundryRoomSchema>;
export type UpdateLaundryRoomInput = z.infer<typeof updateLaundryRoomSchema>;
export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type CreateTimerInput = z.infer<typeof createTimerSchema>;
export type CreateDefectInput = z.infer<typeof createDefectSchema>;
