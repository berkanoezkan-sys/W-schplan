import type { BookingRules, ResolvedBookingRules } from '@woeschplan/shared';
import type { ResourceType } from '@woeschplan/shared';
import type { TimeRange } from '@woeschplan/shared';
import {
  normalizeBookingRules,
  reservationOverlapsQuietHours,
  resolveBookingRulesForResource,
  SERIOUS_DEFECT_CATEGORIES,
} from '@woeschplan/shared';
import { Prisma, ReservationStatus } from '@prisma/client';
import { prisma } from '../db.js';

export function parseBookingRules(raw: unknown): BookingRules {
  return normalizeBookingRules(raw);
}

export { resolveBookingRulesForResource, resolveBookingRulesForResource as resolveBookingRulesForMachine };
export type { ResolvedBookingRules, ResourceType as MachineTypeKey };

export class ReservationConflictError extends Error {
  code: 'OVERLAP' | 'BUFFER' = 'OVERLAP';

  constructor(message = 'Reservation overlaps with an existing booking', code: 'OVERLAP' | 'BUFFER' = 'OVERLAP') {
    super(message);
    this.name = 'ReservationConflictError';
    this.code = code;
  }
}

export class ReservationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReservationValidationError';
  }
}

export async function validateReservationInput(params: {
  userId: string;
  resourceId: string;
  startTime: Date;
  endTime: Date;
  buildingId: string;
  bookingRules: ResolvedBookingRules;
  quietHours: TimeRange;
  timezone: string;
  excludeReservationId?: string;
  toLocalParts?: (d: Date) => { date: string; minutes: number };
}) {
  const {
    userId,
    resourceId,
    startTime,
    endTime,
    bookingRules,
    quietHours,
    excludeReservationId,
    toLocalParts,
  } = params;

  if (endTime <= startTime) {
    throw new ReservationValidationError('End time must be after start time');
  }

  const localParts =
    toLocalParts ??
    ((d: Date) => ({
      date: d.toISOString().slice(0, 10),
      minutes: d.getHours() * 60 + d.getMinutes(),
    }));

  if (
    reservationOverlapsQuietHours({
      startTime,
      endTime,
      quietHours,
      bufferMinutes: bookingRules.bufferMinutesBetweenReservations,
      toLocalParts: localParts,
    })
  ) {
    throw new ReservationValidationError('QUIET_HOURS_CONFLICT');
  }

  const durationMinutes = (endTime.getTime() - startTime.getTime()) / 60000;
  if (durationMinutes > bookingRules.maxBookingDurationMinutes) {
    throw new ReservationValidationError('Booking duration exceeds maximum allowed');
  }

  const now = new Date();
  const earliest = new Date(now.getTime() + bookingRules.earliestBookingMinutesFromNow * 60000);
  if (startTime < earliest) {
    throw new ReservationValidationError('Booking starts too soon');
  }

  const maxAdvance = new Date(now.getTime() + bookingRules.maxDaysInAdvance * 86400000);
  if (startTime > maxAdvance) {
    throw new ReservationValidationError('Booking too far in advance');
  }

  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: { laundryRoom: true },
  });

  if (!resource || !resource.isActive || !resource.laundryRoom.isActive) {
    throw new ReservationValidationError('Resource is not available for booking');
  }

  if (['DEFECTIVE', 'OUT_OF_SERVICE', 'UNDER_REPAIR', 'ADMINISTRATION_NOTIFIED'].includes(resource.status)) {
    throw new ReservationValidationError('Resource is currently unavailable');
  }

  const activeCount = await prisma.reservation.count({
    where: {
      userId,
      status: ReservationStatus.CONFIRMED,
      resource: { laundryRoom: { buildingId: params.buildingId } },
      ...(excludeReservationId ? { NOT: { id: excludeReservationId } } : {}),
    },
  });

  if (activeCount >= bookingRules.maxActiveReservationsPerResident) {
    throw new ReservationValidationError('Maximum active reservations reached');
  }
}

export async function assertNoOverlap(params: {
  resourceId: string;
  startTime: Date;
  endTime: Date;
  bufferMinutes: number;
  excludeReservationId?: string;
}) {
  const { resourceId, startTime, endTime, bufferMinutes, excludeReservationId } = params;
  const bufferedStart = new Date(startTime.getTime() - bufferMinutes * 60000);
  const bufferedEnd = new Date(endTime.getTime() + bufferMinutes * 60000);

  const overlap = await prisma.reservation.findFirst({
    where: {
      resourceId,
      status: ReservationStatus.CONFIRMED,
      ...(excludeReservationId ? { NOT: { id: excludeReservationId } } : {}),
      AND: [
        { startTime: { lt: bufferedEnd } },
        { endTime: { gt: bufferedStart } },
      ],
    },
  });

  if (overlap) {
    throw new ReservationConflictError('Reservation overlaps with an existing booking', 'OVERLAP');
  }
}

export async function createReservationSafe(params: {
  userId: string;
  resourceId: string;
  startTime: Date;
  endTime: Date;
  buildingId: string;
  bookingRules: ResolvedBookingRules;
  quietHours: TimeRange;
  timezone: string;
  toLocalParts?: (d: Date) => { date: string; minutes: number };
  recurrenceRule?: string;
}) {
  await validateReservationInput(params);
  await assertNoOverlap({
    resourceId: params.resourceId,
    startTime: params.startTime,
    endTime: params.endTime,
    bufferMinutes: params.bookingRules.bufferMinutesBetweenReservations,
  });

  try {
    return await prisma.reservation.create({
      data: {
        userId: params.userId,
        resourceId: params.resourceId,
        startTime: params.startTime,
        endTime: params.endTime,
        recurrenceRule: params.recurrenceRule,
      },
      include: {
        resource: { include: { laundryRoom: true } },
        user: true,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ReservationConflictError();
    }
    throw error;
  }
}

export async function cancelReservationSafe(params: {
  reservationId: string;
  userId: string;
  bookingRules: ResolvedBookingRules;
  isAdmin: boolean;
}) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: params.reservationId },
    include: { resource: { include: { laundryRoom: { include: { building: true } } } } },
  });

  if (!reservation) {
    throw new Error('NOT_FOUND');
  }

  if (!params.isAdmin && reservation.userId !== params.userId) {
    throw new Error('FORBIDDEN');
  }

  if (reservation.status !== ReservationStatus.CONFIRMED) {
    throw new ReservationValidationError('Reservation cannot be cancelled');
  }

  const deadline = new Date(
    reservation.startTime.getTime() - params.bookingRules.cancellationDeadlineMinutes * 60000,
  );
  if (!params.isAdmin && new Date() > deadline) {
    throw new ReservationValidationError('Cancellation deadline has passed');
  }

  return prisma.reservation.update({
    where: { id: params.reservationId },
    data: { status: ReservationStatus.CANCELLED },
  });
}

export function isSeriousDefect(category: string): boolean {
  return SERIOUS_DEFECT_CATEGORIES.includes(category as (typeof SERIOUS_DEFECT_CATEGORIES)[number]);
}
