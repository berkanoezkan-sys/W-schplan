import { Hono } from 'hono';
import { formatInTimeZone } from 'date-fns-tz';
import { formatPrivacyLabel } from '@woeschplan/shared';
import { createReservationSchema } from '@woeschplan/shared';
import {
  authMiddleware,
  getMachineBuildingId,
  requireBuildingAccess,
  type AppVariables,
} from '../middleware/auth.js';
import { prisma } from '../db.js';
import {
  cancelReservationSafe,
  createReservationSafe,
  parseBookingRules,
  ReservationConflictError,
  ReservationValidationError,
} from '../services/reservations.js';

export const buildingRoutes = new Hono<{ Variables: AppVariables }>();
buildingRoutes.use('*', authMiddleware);

buildingRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const buildings = await prisma.buildingMembership.findMany({
    where: { userId },
    include: { building: { include: { laundryRooms: { include: { machines: true } } } } },
  });
  return c.json(buildings.map((m) => ({ ...m.building, role: m.role })));
});

buildingRoutes.get('/:buildingId/dashboard', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');
  await requireBuildingAccess(userId, buildingId);

  const building = await prisma.building.findUnique({ where: { id: buildingId } });
  if (!building) return c.json({ error: 'Not found' }, 404);

  const now = new Date();
  const machines = await prisma.machine.findMany({
    where: { laundryRoom: { buildingId }, isActive: true },
    include: { laundryRoom: true },
  });

  const nextReservation = await prisma.reservation.findFirst({
    where: { userId, status: 'CONFIRMED', startTime: { gte: now }, machine: { laundryRoom: { buildingId } } },
    orderBy: { startTime: 'asc' },
    include: { machine: { include: { laundryRoom: true } } },
  });

  const activeTimer = await prisma.timer.findFirst({
    where: { userId, status: 'ACTIVE', machine: { laundryRoom: { buildingId } } },
    include: { machine: true },
  });

  const openChecklist = await prisma.checklistCompletion.findFirst({
    where: {
      userId,
      machine: { laundryRoom: { buildingId }, status: 'CLEANING_REQUIRED' },
    },
    orderBy: { completedAt: 'desc' },
  });

  const defectiveMachines = machines.filter((m) =>
    ['DEFECTIVE', 'OUT_OF_SERVICE', 'UNDER_REPAIR', 'ADMINISTRATION_NOTIFIED'].includes(m.status),
  );

  return c.json({
    building,
    nextReservation,
    activeTimer,
    openChecklistNeeded: !openChecklist,
    machinesAvailable: machines.filter((m) => m.status === 'AVAILABLE').length,
    machinesInUse: machines.filter((m) => m.status === 'IN_USE').length,
    defectiveMachines,
  });
});

buildingRoutes.get('/:buildingId/schedule', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');
  const view = c.req.query('view') ?? 'day';
  const date = c.req.query('date') ?? new Date().toISOString();

  await requireBuildingAccess(userId, buildingId);
  const building = await prisma.building.findUnique({ where: { id: buildingId } });
  if (!building) return c.json({ error: 'Not found' }, 404);

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + (view === 'week' ? 7 : 1));

  const reservations = await prisma.reservation.findMany({
    where: {
      status: 'CONFIRMED',
      startTime: { lt: end },
      endTime: { gt: start },
      machine: { laundryRoom: { buildingId } },
    },
    include: { machine: { include: { laundryRoom: true } }, user: true },
    orderBy: { startTime: 'asc' },
  });

  const items = reservations.map((r) => ({
    ...r,
    privacyLabel: formatPrivacyLabel(building.privacyLabelMode, r.user),
    localStart: formatInTimeZone(r.startTime, building.timezone, 'HH:mm'),
    localEnd: formatInTimeZone(r.endTime, building.timezone, 'HH:mm'),
    user: undefined,
  }));

  return c.json({ view, timezone: building.timezone, reservations: items });
});

buildingRoutes.post('/:buildingId/reservations', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');
  await requireBuildingAccess(userId, buildingId);

  const building = await prisma.building.findUnique({ where: { id: buildingId } });
  if (!building) return c.json({ error: 'Not found' }, 404);

  const body = createReservationSchema.parse(await c.req.json());
  const bookingRules = parseBookingRules(building.bookingRules);

  try {
    const reservation = await createReservationSafe({
      userId,
      machineId: body.machineId,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      buildingId,
      bookingRules,
      recurrenceRule: body.recurrenceRule,
    });

    await prisma.machine.update({
      where: { id: body.machineId },
      data: { status: 'RESERVED' },
    });

    return c.json(reservation, 201);
  } catch (error) {
    if (error instanceof ReservationConflictError) {
      return c.json({ error: error.message }, 409);
    }
    if (error instanceof ReservationValidationError) {
      return c.json({ error: error.message }, 400);
    }
    throw error;
  }
});

buildingRoutes.delete('/reservations/:reservationId', async (c) => {
  const userId = c.get('userId');
  const reservationId = c.req.param('reservationId');

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { machine: { include: { laundryRoom: { include: { building: true } } } } },
  });
  if (!reservation) return c.json({ error: 'Not found' }, 404);

  const buildingId = reservation.machine.laundryRoom.buildingId;
  const membership = await requireBuildingAccess(userId, buildingId);
  const bookingRules = parseBookingRules(reservation.machine.laundryRoom.building.bookingRules);

  try {
    const cancelled = await cancelReservationSafe({
      reservationId,
      userId,
      bookingRules,
      isAdmin: membership.role === 'ADMINISTRATOR',
    });

    await prisma.machine.update({
      where: { id: reservation.machineId },
      data: { status: 'AVAILABLE' },
    });

    return c.json(cancelled);
  } catch (error) {
    if (error instanceof ReservationValidationError) {
      return c.json({ error: error.message }, 400);
    }
    if ((error as Error).message === 'FORBIDDEN') {
      return c.json({ error: 'Forbidden' }, 403);
    }
    throw error;
  }
});

buildingRoutes.get('/machines/:machineId', async (c) => {
  const userId = c.get('userId');
  const machineId = c.req.param('machineId');

  const { machine, buildingId } = await getMachineBuildingId(machineId);
  await requireBuildingAccess(userId, buildingId);

  const reservations = await prisma.reservation.findMany({
    where: { machineId, status: 'CONFIRMED', endTime: { gte: new Date() } },
    orderBy: { startTime: 'asc' },
    take: 10,
  });

  const defects = await prisma.defectReport.findMany({
    where: { machineId, status: { not: 'RESOLVED' } },
    orderBy: { createdAt: 'desc' },
  });

  return c.json({ machine, reservations, defects });
});

buildingRoutes.get('/qr/:qrCodeIdentifier', async (c) => {
  const userId = c.get('userId');
  const qrCodeIdentifier = c.req.param('qrCodeIdentifier');

  const machine = await prisma.machine.findUnique({
    where: { qrCodeIdentifier },
    include: { laundryRoom: { include: { building: true } } },
  });
  if (!machine) return c.json({ error: 'Not found' }, 404);

  await requireBuildingAccess(userId, machine.laundryRoom.buildingId);
  return c.json({ machine });
});
