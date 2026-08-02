import { z } from 'zod';

export const MAINTENANCE_TYPES = [
  'MAINTENANCE',
  'REPAIR',
  'INSPECTION',
  'SERVICE',
  'CLEANING',
  'OTHER',
] as const;

export const MAINTENANCE_STATUSES = [
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;

export const MAINTENANCE_RECURRENCE_TYPES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;

export const MAINTENANCE_SERIES_SCOPES = [
  'THIS_OCCURRENCE',
  'THIS_AND_FUTURE',
  'ENTIRE_SERIES',
] as const;

export const MAINTENANCE_CALENDAR_VIEWS = ['month', 'week', 'list'] as const;

export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number];
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];
export type MaintenanceRecurrenceType = (typeof MAINTENANCE_RECURRENCE_TYPES)[number];
export type MaintenanceSeriesScope = (typeof MAINTENANCE_SERIES_SCOPES)[number];
export type MaintenanceCalendarView = (typeof MAINTENANCE_CALENDAR_VIEWS)[number];

export const MAINTENANCE_TYPE_I18N_KEYS: Record<MaintenanceType, string> = {
  MAINTENANCE: 'maintenance.type.maintenance',
  REPAIR: 'maintenance.type.repair',
  INSPECTION: 'maintenance.type.inspection',
  SERVICE: 'maintenance.type.service',
  CLEANING: 'maintenance.type.cleaning',
  OTHER: 'maintenance.type.other',
};

export const MAINTENANCE_STATUS_I18N_KEYS: Record<MaintenanceStatus, string> = {
  PLANNED: 'maintenance.status.planned',
  IN_PROGRESS: 'maintenance.status.inProgress',
  COMPLETED: 'maintenance.status.completed',
  CANCELLED: 'maintenance.status.cancelled',
};

export const MAINTENANCE_TYPE_COLORS: Record<MaintenanceType, string> = {
  MAINTENANCE: '#1E4470',
  REPAIR: '#D64545',
  INSPECTION: '#5B8FC6',
  SERVICE: '#6BC04A',
  CLEANING: '#5BB8E8',
  OTHER: '#5A6B73',
};

export const MAINTENANCE_STATUS_COLORS: Record<MaintenanceStatus, string> = {
  PLANNED: '#5B8FC6',
  IN_PROGRESS: '#E6A817',
  COMPLETED: '#6BC04A',
  CANCELLED: '#5A6B73',
};

const dateYmd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeMinutes = z.number().int().min(0).max(24 * 60 - 1);

export const maintenanceQuerySchema = z.object({
  view: z.enum(MAINTENANCE_CALENDAR_VIEWS).default('list'),
  date: dateYmd.optional(),
  type: z.enum(MAINTENANCE_TYPES).optional(),
  status: z.enum(MAINTENANCE_STATUSES).optional(),
});

const maintenanceEntryFieldsSchema = z.object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(4000).optional().nullable(),
    type: z.enum(MAINTENANCE_TYPES),
    status: z.enum(MAINTENANCE_STATUSES).default('PLANNED'),
    isRecurring: z.boolean().default(false),
    startDate: dateYmd,
    endDate: dateYmd.optional().nullable(),
    startTimeMinutes: timeMinutes,
    endTimeMinutes: timeMinutes,
    recurrenceType: z.enum(MAINTENANCE_RECURRENCE_TYPES).optional().nullable(),
    recurrenceInterval: z.number().int().min(1).max(365).optional().nullable(),
    recurrenceDays: z.array(z.number().int().min(0).max(6)).optional().nullable(),
    recurrenceEndDate: dateYmd.optional().nullable(),
    notifyResidents: z.boolean().default(false),
    location: z.string().trim().max(300).optional().nullable(),
    affectedAreaIds: z.array(z.string().uuid()).default([]),
    affectedMachineIds: z.array(z.string().uuid()).default([]),
  });

export const createMaintenanceEntrySchema = maintenanceEntryFieldsSchema.superRefine((value, ctx) => {
    if (value.endTimeMinutes <= value.startTimeMinutes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'INVALID_TIME_RANGE',
        path: ['endTimeMinutes'],
      });
    }
    const endDate = value.endDate ?? value.startDate;
    if (endDate < value.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'INVALID_DATE_RANGE',
        path: ['endDate'],
      });
    }
    if (value.isRecurring) {
      if (!value.recurrenceType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'RECURRENCE_TYPE_REQUIRED',
          path: ['recurrenceType'],
        });
      }
      if (!value.recurrenceInterval || value.recurrenceInterval < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'RECURRENCE_INTERVAL_REQUIRED',
          path: ['recurrenceInterval'],
        });
      }
      if (
        value.recurrenceType === 'WEEKLY' &&
        (!value.recurrenceDays || value.recurrenceDays.length === 0)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'RECURRENCE_DAYS_REQUIRED',
          path: ['recurrenceDays'],
        });
      }
    }
  });

export const updateMaintenanceEntrySchema = maintenanceEntryFieldsSchema.partial().extend({
  scope: z.enum(MAINTENANCE_SERIES_SCOPES).optional(),
});

export const deleteMaintenanceEntrySchema = z.object({
  scope: z.enum(MAINTENANCE_SERIES_SCOPES).optional(),
});

export type CreateMaintenanceEntryInput = z.infer<typeof createMaintenanceEntrySchema>;
export type UpdateMaintenanceEntryInput = z.infer<typeof updateMaintenanceEntrySchema>;

export function formatMinutesAsTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function parseTimeToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

export function maintenanceTypeIcon(type: MaintenanceType): string {
  switch (type) {
    case 'MAINTENANCE':
      return 'construct-outline';
    case 'REPAIR':
      return 'hammer-outline';
    case 'INSPECTION':
      return 'search-outline';
    case 'SERVICE':
      return 'settings-outline';
    case 'CLEANING':
      return 'sparkles-outline';
    default:
      return 'ellipsis-horizontal-outline';
  }
}

export function maintenanceRecurrenceLabelKey(type: MaintenanceRecurrenceType): string {
  return `maintenance.recurrence.${type.toLowerCase()}`;
}

export type MaintenanceFilterValue =
  | 'all'
  | MaintenanceType
  | MaintenanceStatus;

export const MAINTENANCE_FILTER_OPTIONS: MaintenanceFilterValue[] = [
  'all',
  'MAINTENANCE',
  'REPAIR',
  'INSPECTION',
  'SERVICE',
  'CLEANING',
  'OTHER',
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
];

export function maintenanceFilterI18nKey(filter: MaintenanceFilterValue): string {
  if (filter === 'all') return 'maintenance.filter.all';
  if (filter in MAINTENANCE_TYPE_I18N_KEYS) {
    return MAINTENANCE_TYPE_I18N_KEYS[filter as MaintenanceType];
  }
  return MAINTENANCE_STATUS_I18N_KEYS[filter as MaintenanceStatus];
}
