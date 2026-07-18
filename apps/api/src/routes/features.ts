import { Hono } from 'hono';
import {
  completeChecklistSchema,
  createDefectSchema,
  createTimerSchema,
  getChecklistForMachineType,
} from '@woeschplan/shared';
import {
  authMiddleware,
  getMachineBuildingId,
  requireBuildingAccess,
  type AppVariables,
} from '../middleware/auth.js';
import { prisma } from '../db.js';
import { createDefectReport, markAdministrationNotified, resolveDefect } from '../services/defects.js';
import { completeTimer, createTimer } from '../services/timers.js';

export const featureRoutes = new Hono<{ Variables: AppVariables }>();
featureRoutes.use('*', authMiddleware);

featureRoutes.post('/timers', async (c) => {
  const userId = c.get('userId');
  const body = createTimerSchema.parse(await c.req.json());
  const { buildingId } = await getMachineBuildingId(body.machineId);
  await requireBuildingAccess(userId, buildingId);

  const timer = await createTimer({
    userId,
    machineId: body.machineId,
    reservationId: body.reservationId,
    remainingMinutes: body.remainingMinutes,
    notificationSettings: {
      notifyFiveMinutesBefore: body.notifyFiveMinutesBefore,
      notifyOnCompletion: body.notifyOnCompletion,
      notifyTenMinutesAfterIfChecklistIncomplete: body.notifyTenMinutesAfterIfChecklistIncomplete,
    },
  });

  return c.json(timer, 201);
});

featureRoutes.get('/timers/active', async (c) => {
  const userId = c.get('userId');
  const timer = await prisma.timer.findFirst({
    where: { userId, status: 'ACTIVE' },
    include: { machine: { include: { laundryRoom: true } } },
  });
  return c.json(timer);
});

featureRoutes.post('/timers/:timerId/complete', async (c) => {
  const userId = c.get('userId');
  const timerId = c.req.param('timerId');
  try {
    const timer = await completeTimer(timerId, userId);
    return c.json(timer);
  } catch {
    return c.json({ error: 'Not found' }, 404);
  }
});

featureRoutes.get('/machines/:machineId/checklist', async (c) => {
  const userId = c.get('userId');
  const machineId = c.req.param('machineId');
  const { machine, buildingId } = await getMachineBuildingId(machineId);
  await requireBuildingAccess(userId, buildingId);

  const checklist = getChecklistForMachineType(machine.machineType);
  return c.json({ machineType: machine.machineType, ...checklist });
});

featureRoutes.post('/checklists/complete', async (c) => {
  const userId = c.get('userId');
  const body = completeChecklistSchema.parse(await c.req.json());
  const { buildingId } = await getMachineBuildingId(body.machineId);
  await requireBuildingAccess(userId, buildingId);

  const completion = await prisma.$transaction(async (tx) => {
    const record = await tx.checklistCompletion.create({
      data: {
        userId,
        machineId: body.machineId,
        reservationId: body.reservationId,
        checklistType: body.checklistType,
        completedItems: body.completedItems,
      },
    });

    await tx.machine.update({
      where: { id: body.machineId },
      data: { status: 'AVAILABLE' },
    });

    return record;
  });

  return c.json(completion, 201);
});

featureRoutes.post('/defects', async (c) => {
  const userId = c.get('userId');
  const body = createDefectSchema.parse(await c.req.json());
  const { buildingId } = await getMachineBuildingId(body.machineId);
  await requireBuildingAccess(userId, buildingId);

  const report = await createDefectReport({
    userId,
    machineId: body.machineId,
    category: body.category,
    description: body.description,
    severity: body.severity,
    photoUrl: body.photoUrl,
  });

  return c.json(report, 201);
});

featureRoutes.get('/buildings/:buildingId/defects', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');
  await requireBuildingAccess(userId, buildingId);

  const defects = await prisma.defectReport.findMany({
    where: { machine: { laundryRoom: { buildingId } } },
    include: { machine: { include: { laundryRoom: true } }, reportedBy: true },
    orderBy: { createdAt: 'desc' },
  });

  return c.json(defects);
});

featureRoutes.post('/defects/:defectId/notify-administration', async (c) => {
  const userId = c.get('userId');
  const defectId = c.req.param('defectId');
  try {
    const updated = await markAdministrationNotified(defectId, userId);
    return c.json(updated);
  } catch {
    return c.json({ error: 'Not found' }, 404);
  }
});

featureRoutes.post('/defects/:defectId/resolve', async (c) => {
  const userId = c.get('userId');
  const defectId = c.req.param('defectId');

  const defect = await prisma.defectReport.findUnique({
    where: { id: defectId },
    include: { machine: { include: { laundryRoom: true } } },
  });
  if (!defect) return c.json({ error: 'Not found' }, 404);

  await requireBuildingAccess(userId, defect.machine.laundryRoom.buildingId, true);

  const updated = await resolveDefect(defectId, userId);
  return c.json(updated);
});

featureRoutes.get('/notifications', async (c) => {
  const userId = c.get('userId');
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return c.json(notifications);
});

featureRoutes.patch('/notifications/:id/read', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const notification = await prisma.notification.updateMany({
    where: { id, userId },
    data: { read: true },
  });
  if (!notification.count) return c.json({ error: 'Not found' }, 404);
  return c.json({ ok: true });
});

featureRoutes.get('/buildings/:buildingId/house-rules', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');
  await requireBuildingAccess(userId, buildingId);

  const building = await prisma.building.findUnique({ where: { id: buildingId } });
  if (!building) return c.json({ error: 'Not found' }, 404);
  return c.json(building.houseRules ?? {});
});
