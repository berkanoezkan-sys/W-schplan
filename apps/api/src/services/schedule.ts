import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import type { ScheduleQuery } from '@woeschplan/shared';
import {
  computeBufferBlock,
  computeDayCapacity,
  findQuietHoursConflicts,
  formatAdminResidentName,
  formatPrivacyLabel,
  getMonthGridDays,
  getViewDateRange,
  normalizeHouseRules,
  reservationStatusesForSchedule,
} from '@woeschplan/shared';
import { prisma } from '../db.js';
import { parseBookingRules, resolveBookingRulesForResource } from './reservations.js';
import { getActiveNoticesForSchedule } from './building-notices.js';

function toLocalParts(timezone: string) {
  return (d: Date) => ({
    date: formatInTimeZone(d, timezone, 'yyyy-MM-dd'),
    minutes:
      Number(formatInTimeZone(d, timezone, 'H')) * 60 +
      Number(formatInTimeZone(d, timezone, 'm')),
  });
}

export async function getBuildingSchedule(params: {
  buildingId: string;
  userId: string;
  isAdmin: boolean;
  query: ScheduleQuery;
}) {
  const { buildingId, userId, isAdmin, query } = params;
  const building = await prisma.building.findUnique({ where: { id: buildingId } });
  if (!building) throw new Error('NOT_FOUND');

  const houseRules = normalizeHouseRules(building.houseRules);
  const bookingRules = parseBookingRules(building.bookingRules);
  const timezone = building.timezone;
  const localParts = toLocalParts(timezone);

  const anchorDate = query.date
    ? formatInTimeZone(new Date(query.date), timezone, 'yyyy-MM-dd')
    : formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd');

  const range = getViewDateRange(query.view, anchorDate);
  const rangeStart = fromZonedTime(`${range.start}T00:00:00`, timezone);
  const rangeEnd = fromZonedTime(`${range.end}T00:00:00`, timezone);

  const search = query.search?.trim();

  const resources = await prisma.resource.findMany({
    where: {
      laundryRoom: {
        buildingId,
        isActive: true,
        ...(query.laundryRoomId ? { id: query.laundryRoomId } : {}),
      },
      isActive: true,
      ...(query.resourceId ? { id: query.resourceId } : {}),
    },
    include: { laundryRoom: true },
    orderBy: [{ laundryRoom: { name: 'asc' } }, { name: 'asc' }],
  });

  const laundryRooms = await prisma.laundryRoom.findMany({
    where: { buildingId, isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, floor: true },
  });

  const reservations = await prisma.reservation.findMany({
    where: {
      status: { in: reservationStatusesForSchedule(isAdmin) },
      startTime: { lt: rangeEnd },
      endTime: { gt: rangeStart },
      resource: {
        laundryRoom: { buildingId },
        ...(query.resourceId ? { id: query.resourceId } : {}),
        ...(query.laundryRoomId ? { laundryRoomId: query.laundryRoomId } : {}),
      },
      ...(search
        ? {
            OR: [
              { user: { firstName: { contains: search, mode: 'insensitive' } } },
              { user: { lastName: { contains: search, mode: 'insensitive' } } },
              { user: { apartmentNumber: { contains: search, mode: 'insensitive' } } },
              { resource: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    include: {
      resource: { include: { laundryRoom: true } },
      user: true,
      timer: true,
    },
    orderBy: { startTime: 'asc' },
  });

  const activeTimers = await prisma.timer.findMany({
    where: {
      status: 'ACTIVE',
      resource: { laundryRoom: { buildingId } },
    },
    include: { resource: true },
  });

  const timerByResource = new Map(activeTimers.map((t) => [t.resourceId, t]));

  const items = reservations.map((reservation) => {
    const timer = reservation.timer ?? timerByResource.get(reservation.resourceId);
    const now = Date.now();
    const timerRemainingMs =
      timer?.status === 'ACTIVE'
        ? Math.max(0, timer.expectedCompletionTime.getTime() - now)
        : null;

    return {
      id: reservation.id,
      status: reservation.status,
      startTime: reservation.startTime.toISOString(),
      endTime: reservation.endTime.toISOString(),
      localStart: formatInTimeZone(reservation.startTime, timezone, 'HH:mm'),
      localEnd: formatInTimeZone(reservation.endTime, timezone, 'HH:mm'),
      localDate: formatInTimeZone(reservation.startTime, timezone, 'yyyy-MM-dd'),
      localDateLabel: formatInTimeZone(reservation.startTime, timezone, 'EEE, d MMM'),
      privacyLabel: formatPrivacyLabel(building.privacyLabelMode, reservation.user),
      isOwn: reservation.userId === userId,
      resourceId: reservation.resourceId,
      resource: {
        id: reservation.resource.id,
        name: reservation.resource.name,
        resourceType: reservation.resource.resourceType,
        status: reservation.resource.status,
        laundryRoom: { name: reservation.resource.laundryRoom.name },
      },
      machine: {
        id: reservation.resource.id,
        name: reservation.resource.name,
        resourceType: reservation.resource.resourceType,
        status: reservation.resource.status,
        laundryRoom: { name: reservation.resource.laundryRoom.name },
      },
      activeTimer: timerRemainingMs
        ? {
            id: timer!.id,
            expectedCompletionTime: timer!.expectedCompletionTime.toISOString(),
            remainingMs: timerRemainingMs,
          }
        : null,
      ...(isAdmin
        ? {
            resident: {
              id: reservation.user.id,
              name: formatAdminResidentName(reservation.user),
              firstName: reservation.user.firstName,
              lastName: reservation.user.lastName,
              apartmentNumber: reservation.user.apartmentNumber,
              email: reservation.user.email,
            },
          }
        : {}),
    };
  });

  const bufferBlocks = reservations.flatMap((reservation) => {
    const rules = resolveBookingRulesForResource(bookingRules, reservation.resource.resourceType);
    const block = computeBufferBlock(reservation.endTime, rules.bufferMinutesBetweenReservations);
    if (!block) return [];
    return [
      {
        resourceId: reservation.resourceId,
        reservationId: reservation.id,
        startTime: block.start.toISOString(),
        endTime: block.end.toISOString(),
        localStart: formatInTimeZone(block.start, timezone, 'HH:mm'),
        localEnd: formatInTimeZone(block.end, timezone, 'HH:mm'),
        localDate: formatInTimeZone(block.start, timezone, 'yyyy-MM-dd'),
        bufferMinutes: rules.bufferMinutesBetweenReservations,
      },
    ];
  });

  const resourceMeta = resources.map((r) => {
    const rules = resolveBookingRulesForResource(bookingRules, r.resourceType);
    const timer = timerByResource.get(r.id);
    return {
      id: r.id,
      name: r.name,
      resourceType: r.resourceType,
      status: r.status,
      bufferMinutes: rules.bufferMinutesBetweenReservations,
      laundryRoom: { id: r.laundryRoom.id, name: r.laundryRoom.name },
      activeTimer: timer
        ? {
            id: timer.id,
            expectedCompletionTime: timer.expectedCompletionTime.toISOString(),
            remainingMs: Math.max(0, timer.expectedCompletionTime.getTime() - Date.now()),
          }
        : null,
    };
  });

  let monthDays: Array<{ date: string; freeRatio: number; level: string }> | undefined;
  if (query.view === 'month') {
    const gridDays = getMonthGridDays(anchorDate);
    monthDays = gridDays.map((date) => {
      const { freeRatio, level } = computeDayCapacity({
        date,
        washingHours: houseRules.washingHours,
        quietHours: houseRules.quietHours,
        machineCount: resources.length,
        reservations: items.map((r) => ({
          localDate: r.localDate,
          startTime: r.localStart,
          endTime: r.localEnd,
        })),
      });
      return { date, freeRatio, level };
    });
  }

  const notices = await getActiveNoticesForSchedule({
    buildingId,
    userId,
    rangeStart,
    rangeEnd,
  });

  return {
    view: query.view,
    anchorDate,
    timezone,
    washingHours: houseRules.washingHours,
    quietHours: houseRules.quietHours,
    laundryRooms,
    resources: resourceMeta,
    reservations: items,
    bufferBlocks,
    notices,
    monthDays,
  };
}

export async function findBuildingQuietHoursConflicts(buildingId: string, quietHours: {
  start: string;
  end: string;
}) {
  const building = await prisma.building.findUnique({ where: { id: buildingId } });
  if (!building) throw new Error('NOT_FOUND');

  const bookingRules = parseBookingRules(building.bookingRules);
  const timezone = building.timezone;
  const localParts = toLocalParts(timezone);
  const now = new Date();

  const reservations = await prisma.reservation.findMany({
    where: {
      status: 'CONFIRMED',
      endTime: { gt: now },
      resource: { laundryRoom: { buildingId } },
    },
    include: { resource: true, user: true },
  });

  const maxBuffer = Math.max(
    bookingRules.washingMachine.bufferMinutesBetweenReservations,
    bookingRules.tumbleDryer.bufferMinutesBetweenReservations,
    bookingRules.dryingRoom.bufferMinutesBetweenReservations,
  );

  return findQuietHoursConflicts({
    quietHours,
    bufferMinutes: maxBuffer,
    toLocalParts: localParts,
    reservations: reservations.map((r) => ({
      id: r.id,
      startTime: r.startTime,
      endTime: r.endTime,
      localDate: formatInTimeZone(r.startTime, timezone, 'yyyy-MM-dd'),
      localStart: formatInTimeZone(r.startTime, timezone, 'HH:mm'),
      localEnd: formatInTimeZone(r.endTime, timezone, 'HH:mm'),
      resourceName: r.resource.name,
      residentLabel: formatAdminResidentName(r.user),
    })),
  });
}
