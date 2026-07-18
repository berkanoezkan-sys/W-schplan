import {
  bookingRulesSchema,
  type BookingRules,
  SERIOUS_DEFECT_CATEGORIES,
} from '@woeschplan/shared';
import { Prisma, ReservationStatus } from '@prisma/client';
import { prisma } from '../db.js';

const DEFAULT_BOOKING_RULES: BookingRules = bookingRulesSchema.parse({});

export function parseBookingRules(raw: unknown): BookingRules {
  return bookingRulesSchema.parse(raw ?? DEFAULT_BOOKING_RULES);
}

export class ReservationConflictError extends Error {
  constructor(message = 'Reservation overlaps with an existing booking') {
    super(message);
    this.name = 'ReservationConflictError';
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
  machineId: string;
  startTime: Date;
  endTime: Date;
  buildingId: string;
  bookingRules: BookingRules;
  excludeReservationId?: string;
}) {
  const { userId, machineId, startTime, endTime, bookingRules, excludeReservationId } = params;

  if (endTime <= startTime) {
    throw new ReservationValidationError('End time must be after start time');
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

  const machine = await prisma.machine.findUnique({
    where: { id: machineId },
    include: { laundryRoom: true },
  });

  if (!machine || !machine.isActive || !machine.laundryRoom.isActive) {
    throw new ReservationValidationError('Machine is not available for booking');
  }

  if (['DEFECTIVE', 'OUT_OF_SERVICE', 'UNDER_REPAIR', 'ADMINISTRATION_NOTIFIED'].includes(machine.status)) {
    throw new ReservationValidationError('Machine is currently unavailable');
  }

  const activeCount = await prisma.reservation.count({
    where: {
      userId,
      status: ReservationStatus.CONFIRMED,
      machine: { laundryRoom: { buildingId: params.buildingId } },
      ...(excludeReservationId ? { NOT: { id: excludeReservationId } } : {}),
    },
  });

  if (activeCount >= bookingRules.maxActiveReservationsPerResident) {
    throw new ReservationValidationError('Maximum active reservations reached');
  }
}

export async function assertNoOverlap(params: {
  machineId: string;
  startTime: Date;
  endTime: Date;
  bufferMinutes: number;
  excludeReservationId?: string;
}) {
  const { machineId, startTime, endTime, bufferMinutes, excludeReservationId } = params;
  const bufferedStart = new Date(startTime.getTime() - bufferMinutes * 60000);
  const bufferedEnd = new Date(endTime.getTime() + bufferMinutes * 60000);

  const overlap = await prisma.reservation.findFirst({
    where: {
      machineId,
      status: ReservationStatus.CONFIRMED,
      ...(excludeReservationId ? { NOT: { id: excludeReservationId } } : {}),
      AND: [
        { startTime: { lt: bufferedEnd } },
        { endTime: { gt: bufferedStart } },
      ],
    },
  });

  if (overlap) {
    throw new ReservationConflictError();
  }
}

export async function createReservationSafe(params: {
  userId: string;
  machineId: string;
  startTime: Date;
  endTime: Date;
  buildingId: string;
  bookingRules: BookingRules;
  recurrenceRule?: string;
}) {
  await validateReservationInput(params);
  await assertNoOverlap({
    machineId: params.machineId,
    startTime: params.startTime,
    endTime: params.endTime,
    bufferMinutes: params.bookingRules.bufferMinutesBetweenReservations,
  });

  try {
    return await prisma.reservation.create({
      data: {
        userId: params.userId,
        machineId: params.machineId,
        startTime: params.startTime,
        endTime: params.endTime,
        recurrenceRule: params.recurrenceRule,
      },
      include: {
        machine: { include: { laundryRoom: true } },
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
  bookingRules: BookingRules;
  isAdmin: boolean;
}) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: params.reservationId },
    include: { machine: { include: { laundryRoom: { include: { building: true } } } } },
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
