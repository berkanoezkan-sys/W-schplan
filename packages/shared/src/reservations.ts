import { z } from 'zod';
import { RESERVATION_STATUSES } from './constants.js';

export const scheduleViewSchema = z.enum(['day', 'week', 'month']);

const scheduleIdSchema = z.string().trim().min(1).max(128);

export const scheduleQuerySchema = z.object({
  view: scheduleViewSchema.default('day'),
  date: z.string().optional(),
  resourceId: scheduleIdSchema.optional(),
  laundryRoomId: scheduleIdSchema.optional(),
  search: z.string().trim().max(100).optional(),
});

export type ScheduleView = z.infer<typeof scheduleViewSchema>;
export type ScheduleQuery = z.infer<typeof scheduleQuerySchema>;

export type ReservationStatusValue = (typeof RESERVATION_STATUSES)[number];

export function formatAdminResidentName(user: {
  firstName?: string | null;
  lastName?: string | null;
  apartmentNumber?: string | null;
}): string {
  const name = [user.firstName?.trim(), user.lastName?.trim()].filter(Boolean).join(' ');
  if (name && user.apartmentNumber?.trim()) {
    return `${name} · ${user.apartmentNumber.trim()}`;
  }
  return name || user.apartmentNumber?.trim() || '—';
}

export const RESERVATION_STATUS_I18N_KEYS: Record<ReservationStatusValue, string> = {
  CONFIRMED: 'reservation.status.confirmed',
  CANCELLED: 'reservation.status.cancelled',
  COMPLETED: 'reservation.status.completed',
  NO_SHOW: 'reservation.status.noShow',
};

export const RESERVATION_STATUS_COLORS: Record<ReservationStatusValue, string> = {
  CONFIRMED: '#5B8FC6',
  COMPLETED: '#6BC04A',
  CANCELLED: '#5A6B73',
  NO_SHOW: '#D64545',
};

export function reservationStatusesForSchedule(isAdmin: boolean): ReservationStatusValue[] {
  return isAdmin ? ['CONFIRMED', 'COMPLETED', 'NO_SHOW'] : ['CONFIRMED'];
}
