export const DEFAULT_TIMEZONE = 'Europe/Zurich';
export const DEFAULT_LANGUAGE = 'de';

export const MACHINE_STATUSES = [
  'AVAILABLE',
  'RESERVED',
  'IN_USE',
  'CLEANING_REQUIRED',
  'DEFECTIVE',
  'ADMINISTRATION_NOTIFIED',
  'UNDER_REPAIR',
  'OUT_OF_SERVICE',
] as const;

export type MachineStatus = (typeof MACHINE_STATUSES)[number];

export const RESOURCE_TYPES = ['WASHING_MACHINE', 'TUMBLE_DRYER', 'DRYING_ROOM'] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

/** @deprecated Use RESOURCE_TYPES */
export const MACHINE_TYPES = RESOURCE_TYPES.filter(
  (t): t is 'WASHING_MACHINE' | 'TUMBLE_DRYER' => t !== 'DRYING_ROOM',
);
/** @deprecated Use ResourceType */
export type MachineType = 'WASHING_MACHINE' | 'TUMBLE_DRYER';

export const RESERVATION_STATUSES = [
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
  'NO_SHOW',
] as const;

export const DEFECT_STATUSES = [
  'REPORTED',
  'ADMINISTRATION_NOTIFIED',
  'UNDER_REVIEW',
  'REPAIR_SCHEDULED',
  'RESOLVED',
] as const;

export const DEFECT_CATEGORIES = [
  'MACHINE_DOES_NOT_START',
  'MACHINE_DOES_NOT_DRAIN',
  'DOOR_CANNOT_BE_OPENED',
  'WATER_LEAKAGE',
  'UNUSUAL_NOISE',
  'DRYER_DOES_NOT_HEAT',
  'DISPLAY_ERROR',
  'PAYMENT_SYSTEM_ISSUE',
  'MACHINE_IS_DIRTY',
  'OTHER',
] as const;

export const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export const USER_ROLES = ['RESIDENT', 'ADMINISTRATOR'] as const;

export const PRIVACY_LABEL_MODES = [
  'FIRST_NAME',
  'APARTMENT_NUMBER',
  'INITIALS',
  'RESERVED',
] as const;

export const TIMER_STATUSES = ['ACTIVE', 'COMPLETED', 'CANCELLED'] as const;

export const CHECKLIST_TYPES = ['WASHING_MACHINE', 'TUMBLE_DRYER'] as const;

export const SERIOUS_DEFECT_CATEGORIES = [
  'WATER_LEAKAGE',
  'DISPLAY_ERROR',
] as const;

export const NOTICE_CATEGORIES = [
  'MAINTENANCE',
  'WATER_SHUTOFF',
  'CONSTRUCTION',
  'GENERAL_INFO',
  'ELEVATOR',
  'HEATING',
] as const;

export type NoticeCategory = (typeof NOTICE_CATEGORIES)[number];
