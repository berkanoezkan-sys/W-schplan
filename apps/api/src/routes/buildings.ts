import { Hono } from 'hono';
import { createReservationSchema, normalizeHouseRules } from '@woeschplan/shared';
import { formatInTimeZone } from 'date-fns-tz';
import {
  authMiddleware,
  getResourceBuildingId,
  requireBuildingAccess,
  type AppVariables,
} from '../middleware/auth.js';
import { prisma } from '../db.js';
import {
  cancelReservationSafe,
  createReservationSafe,
  parseBookingRules,
  resolveBookingRulesForResource,
  ReservationConflictError,
  ReservationValidationError,
} from '../services/reservations.js';
import {
  createBuildingForUser,
  deleteBuildingForUser,
  userCanCreateBuilding,
  listBuildingsWithPortfolio,
  getPortfolioStatsForUser,
} from '../services/buildings.js';
import {
  duplicateBuildingForUser,
  getBuildingDuplicatePreview,
} from '../services/building-duplicate.js';
import {
  createLaundryRoom,
  createResource,
  deleteLaundryRoom,
  deleteResource,
  getLaundryRoom,
  updateLaundryRoom,
  updateResource,
} from '../services/laundry-rooms.js';
import { createBuildingSchema, duplicateBuildingSchema, scheduleQuerySchema } from '@woeschplan/shared';
import { getBuildingSchedule } from '../services/schedule.js';

export const buildingRoutes = new Hono<{ Variables: AppVariables }>();
buildingRoutes.use('*', authMiddleware);

const buildingInclude = {
  laundryRooms: {
    include: {
      resources: { orderBy: [{ resourceType: 'asc' as const }, { name: 'asc' as const }] },
    },
    orderBy: { createdAt: 'asc' as const },
  },
};

buildingRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const result = await listBuildingsWithPortfolio(userId);
  return c.json(result);
});

buildingRoutes.get('/portfolio/stats', async (c) => {
  const userId = c.get('userId');
  const portfolio = await getPortfolioStatsForUser(userId);
  return c.json(portfolio);
});

buildingRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  const canCreate = await userCanCreateBuilding(userId);
  if (!canCreate) return c.json({ error: 'Forbidden' }, 403);

  try {
    const body = createBuildingSchema.parse(await c.req.json());
    const building = await createBuildingForUser(userId, body);
    return c.json(building, 201);
  } catch (error) {
    if ((error as Error).message === 'FORBIDDEN') {
      return c.json({ error: 'Forbidden' }, 403);
    }
    throw error;
  }
});

buildingRoutes.get('/:buildingId/duplicate-preview', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');

  try {
    const preview = await getBuildingDuplicatePreview(userId, buildingId);
    return c.json(preview);
  } catch (error) {
    const code = (error as Error).message;
    if (code === 'FORBIDDEN') return c.json({ error: 'Forbidden' }, 403);
    if (code === 'NOT_FOUND') return c.json({ error: 'Not found' }, 404);
    throw error;
  }
});

buildingRoutes.delete('/:buildingId', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');

  try {
    await deleteBuildingForUser(userId, buildingId);
    return c.json({ ok: true });
  } catch (error) {
    const code = (error as Error).message;
    if (code === 'FORBIDDEN') return c.json({ error: 'Forbidden' }, 403);
    if (code === 'NOT_FOUND') return c.json({ error: 'Not found' }, 404);
    if (code === 'HAS_ACTIVE_RESERVATIONS') {
      return c.json({ error: 'Building has active reservations' }, 409);
    }
    throw error;
  }
});

buildingRoutes.post('/:buildingId/duplicate', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');

  try {
    const body = duplicateBuildingSchema.parse(await c.req.json());
    const building = await duplicateBuildingForUser(userId, buildingId, body);
    return c.json(building, 201);
  } catch (error) {
    const code = (error as Error).message;
    if (code === 'FORBIDDEN') return c.json({ error: 'Forbidden' }, 403);
    if (code === 'NOT_FOUND') return c.json({ error: 'Not found' }, 404);
    throw error;
  }
});

buildingRoutes.post('/:buildingId/laundry-rooms', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');
  await requireBuildingAccess(userId, buildingId, true);

  try {
    const room = await createLaundryRoom(buildingId, await c.req.json());
    return c.json(room, 201);
  } catch (error) {
    throw error;
  }
});

buildingRoutes.get('/:buildingId/laundry-rooms/:roomId', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');
  const roomId = c.req.param('roomId');
  await requireBuildingAccess(userId, buildingId);

  try {
    const room = await getLaundryRoom(roomId, buildingId);
    return c.json(room);
  } catch (error) {
    if ((error as Error).message === 'NOT_FOUND') return c.json({ error: 'Not found' }, 404);
    throw error;
  }
});

buildingRoutes.patch('/:buildingId/laundry-rooms/:roomId', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');
  const roomId = c.req.param('roomId');
  await requireBuildingAccess(userId, buildingId, true);

  try {
    const room = await updateLaundryRoom(roomId, buildingId, await c.req.json());
    return c.json(room);
  } catch (error) {
    if ((error as Error).message === 'NOT_FOUND') return c.json({ error: 'Not found' }, 404);
    throw error;
  }
});

buildingRoutes.delete('/:buildingId/laundry-rooms/:roomId', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');
  const roomId = c.req.param('roomId');
  await requireBuildingAccess(userId, buildingId, true);

  try {
    await deleteLaundryRoom(roomId, buildingId);
    return c.json({ ok: true });
  } catch (error) {
    const code = (error as Error).message;
    if (code === 'NOT_FOUND') return c.json({ error: 'Not found' }, 404);
    if (code === 'HAS_ACTIVE_RESERVATIONS') {
      return c.json({ error: 'Room has active reservations' }, 409);
    }
    throw error;
  }
});

buildingRoutes.post('/:buildingId/laundry-rooms/:roomId/resources', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');
  const roomId = c.req.param('roomId');
  await requireBuildingAccess(userId, buildingId, true);

  try {
    const resource = await createResource(roomId, buildingId, await c.req.json());
    return c.json(resource, 201);
  } catch (error) {
    if ((error as Error).message === 'NOT_FOUND') return c.json({ error: 'Not found' }, 404);
    throw error;
  }
});

buildingRoutes.patch('/:buildingId/laundry-rooms/:roomId/resources/:resourceId', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');
  const roomId = c.req.param('roomId');
  const resourceId = c.req.param('resourceId');
  await requireBuildingAccess(userId, buildingId, true);

  try {
    const resource = await updateResource(resourceId, roomId, buildingId, await c.req.json());
    return c.json(resource);
  } catch (error) {
    if ((error as Error).message === 'NOT_FOUND') return c.json({ error: 'Not found' }, 404);
    throw error;
  }
});

buildingRoutes.delete('/:buildingId/laundry-rooms/:roomId/resources/:resourceId', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');
  const roomId = c.req.param('roomId');
  const resourceId = c.req.param('resourceId');
  await requireBuildingAccess(userId, buildingId, true);

  try {
    await deleteResource(resourceId, roomId, buildingId);
    return c.json({ ok: true });
  } catch (error) {
    const code = (error as Error).message;
    if (code === 'NOT_FOUND') return c.json({ error: 'Not found' }, 404);
    if (code === 'HAS_ACTIVE_RESERVATIONS') {
      return c.json({ error: 'Resource has active reservations' }, 409);
    }
    throw error;
  }
});

buildingRoutes.get('/:buildingId/dashboard', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');
  await requireBuildingAccess(userId, buildingId);

  const building = await prisma.building.findUnique({ where: { id: buildingId } });
  if (!building) return c.json({ error: 'Not found' }, 404);

  const now = new Date();
  const resources = await prisma.resource.findMany({
    where: { laundryRoom: { buildingId }, isActive: true },
    include: { laundryRoom: true },
  });

  const nextReservation = await prisma.reservation.findFirst({
    where: {
      userId,
      status: 'CONFIRMED',
      startTime: { gte: now },
      resource: { laundryRoom: { buildingId } },
    },
    orderBy: { startTime: 'asc' },
    include: { resource: { include: { laundryRoom: true } } },
  });

  const activeTimer = await prisma.timer.findFirst({
    where: { userId, status: 'ACTIVE', resource: { laundryRoom: { buildingId } } },
    include: { resource: true },
  });

  const openChecklist = await prisma.checklistCompletion.findFirst({
    where: {
      userId,
      resource: { laundryRoom: { buildingId }, status: 'CLEANING_REQUIRED' },
    },
    orderBy: { completedAt: 'desc' },
  });

  const defectiveResources = resources.filter((r) =>
    ['DEFECTIVE', 'OUT_OF_SERVICE', 'UNDER_REPAIR', 'ADMINISTRATION_NOTIFIED'].includes(r.status),
  );

  return c.json({
    building,
    nextReservation,
    activeTimer,
    openChecklistNeeded: !openChecklist,
    resourcesAvailable: resources.filter((r) => r.status === 'AVAILABLE').length,
    resourcesInUse: resources.filter((r) => r.status === 'IN_USE').length,
    machinesAvailable: resources.filter((r) => r.status === 'AVAILABLE').length,
    machinesInUse: resources.filter((r) => r.status === 'IN_USE').length,
    defectiveResources,
    defectiveMachines: defectiveResources,
  });
});

buildingRoutes.get('/:buildingId/schedule', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');

  let membership;
  try {
    membership = await requireBuildingAccess(userId, buildingId);
  } catch {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const parsed = scheduleQuerySchema.safeParse({
    view: c.req.query('view') ?? 'day',
    date: c.req.query('date') || undefined,
    resourceId: c.req.query('resourceId') || undefined,
    laundryRoomId: c.req.query('laundryRoomId') || undefined,
    search: c.req.query('search') || undefined,
  });
  if (!parsed.success) {
    return c.json({ error: 'Invalid schedule query', details: parsed.error.flatten() }, 400);
  }
  const query = parsed.data;

  try {
    const schedule = await getBuildingSchedule({
      buildingId,
      userId,
      isAdmin: membership.role === 'ADMINISTRATOR',
      query,
    });
    return c.json(schedule);
  } catch (error) {
    if ((error as Error).message === 'NOT_FOUND') return c.json({ error: 'Not found' }, 404);
    throw error;
  }
});

buildingRoutes.post('/:buildingId/reservations', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');
  await requireBuildingAccess(userId, buildingId);

  const building = await prisma.building.findUnique({ where: { id: buildingId } });
  if (!building) return c.json({ error: 'Not found' }, 404);

  const body = createReservationSchema.parse(await c.req.json());
  const buildingRules = parseBookingRules(building.bookingRules);

  const resource = await prisma.resource.findUnique({
    where: { id: body.resourceId },
    include: { laundryRoom: true },
  });
  if (!resource || resource.laundryRoom.buildingId !== buildingId) {
    return c.json({ error: 'Resource not found in this building' }, 404);
  }

  const bookingRules = resolveBookingRulesForResource(buildingRules, resource.resourceType);
  const houseRules = normalizeHouseRules(building.houseRules);
  const toLocalParts = (d: Date) => ({
    date: formatInTimeZone(d, building.timezone, 'yyyy-MM-dd'),
    minutes:
      Number(formatInTimeZone(d, building.timezone, 'H')) * 60 +
      Number(formatInTimeZone(d, building.timezone, 'm')),
  });

  try {
    const reservation = await createReservationSafe({
      userId,
      resourceId: body.resourceId,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      buildingId,
      bookingRules,
      quietHours: houseRules.quietHours,
      timezone: building.timezone,
      toLocalParts,
      recurrenceRule: body.recurrenceRule,
    });

    await prisma.resource.update({
      where: { id: body.resourceId },
      data: { status: 'RESERVED' },
    });

    return c.json(reservation, 201);
  } catch (error) {
    if (error instanceof ReservationConflictError) {
      return c.json({ error: error.message, code: error.code }, 409);
    }
    if (error instanceof ReservationValidationError) {
      return c.json({ error: error.message, code: error.message }, 400);
    }
    throw error;
  }
});

buildingRoutes.delete('/reservations/:reservationId', async (c) => {
  const userId = c.get('userId');
  const reservationId = c.req.param('reservationId');

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { resource: { include: { laundryRoom: { include: { building: true } } } } },
  });
  if (!reservation) return c.json({ error: 'Not found' }, 404);

  const buildingId = reservation.resource.laundryRoom.buildingId;
  const membership = await requireBuildingAccess(userId, buildingId);
  const buildingRules = parseBookingRules(reservation.resource.laundryRoom.building.bookingRules);
  const bookingRules = resolveBookingRulesForResource(
    buildingRules,
    reservation.resource.resourceType,
  );

  try {
    const cancelled = await cancelReservationSafe({
      reservationId,
      userId,
      bookingRules,
      isAdmin: membership.role === 'ADMINISTRATOR',
    });

    await prisma.resource.update({
      where: { id: reservation.resourceId },
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

buildingRoutes.get('/resources/:resourceId', async (c) => {
  const userId = c.get('userId');
  const resourceId = c.req.param('resourceId');

  const { resource, buildingId } = await getResourceBuildingId(resourceId);
  await requireBuildingAccess(userId, buildingId);

  const reservations = await prisma.reservation.findMany({
    where: { resourceId, status: 'CONFIRMED', endTime: { gte: new Date() } },
    orderBy: { startTime: 'asc' },
    take: 10,
  });

  const defects = await prisma.defectReport.findMany({
    where: { resourceId, status: { not: 'RESOLVED' } },
    orderBy: { createdAt: 'desc' },
  });

  return c.json({ resource, machine: resource, reservations, defects });
});

/** @deprecated Use /resources/:resourceId */
buildingRoutes.get('/machines/:machineId', async (c) => {
  const userId = c.get('userId');
  const resourceId = c.req.param('machineId');

  const { resource, buildingId } = await getResourceBuildingId(resourceId);
  await requireBuildingAccess(userId, buildingId);

  const reservations = await prisma.reservation.findMany({
    where: { resourceId, status: 'CONFIRMED', endTime: { gte: new Date() } },
    orderBy: { startTime: 'asc' },
    take: 10,
  });

  const defects = await prisma.defectReport.findMany({
    where: { resourceId, status: { not: 'RESOLVED' } },
    orderBy: { createdAt: 'desc' },
  });

  return c.json({ resource, machine: resource, reservations, defects });
});

buildingRoutes.get('/qr/:qrCodeIdentifier', async (c) => {
  const userId = c.get('userId');
  const qrCodeIdentifier = c.req.param('qrCodeIdentifier');

  const resource = await prisma.resource.findUnique({
    where: { qrCodeIdentifier },
    include: { laundryRoom: { include: { building: true } } },
  });
  if (!resource) return c.json({ error: 'Not found' }, 404);

  await requireBuildingAccess(userId, resource.laundryRoom.buildingId);
  return c.json({ resource, machine: resource });
});
