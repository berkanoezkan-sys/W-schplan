import { Hono } from 'hono';
import {
  completeChecklistSchema,
  createDefectSchema,
  createTimerSchema,
} from '@woeschplan/shared';
import {
  authMiddleware,
  getResourceBuildingId,
  requireBuildingAccess,
  type AppVariables,
} from '../middleware/auth.js';
import { prisma } from '../db.js';
import { getChecklistForResource } from '../services/building-settings.js';
import { createDefectReport, markAdministrationNotified, resolveDefect } from '../services/defects.js';
import { completeTimer, createTimer } from '../services/timers.js';

export const featureRoutes = new Hono<{ Variables: AppVariables }>();
featureRoutes.use('*', authMiddleware);

featureRoutes.post('/timers', async (c) => {
  const userId = c.get('userId');
  const body = createTimerSchema.parse(await c.req.json());
  const { buildingId } = await getResourceBuildingId(body.resourceId);
  await requireBuildingAccess(userId, buildingId);

  const timer = await createTimer({
    userId,
    resourceId: body.resourceId,
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
    include: { resource: { include: { laundryRoom: true } } },
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

featureRoutes.get('/resources/:resourceId/checklist', async (c) => {
  const userId = c.get('userId');
  const resourceId = c.req.param('resourceId');
  const { resource, buildingId } = await getResourceBuildingId(resourceId);
  await requireBuildingAccess(userId, buildingId);

  const checklist = await getChecklistForResource(resourceId);
  return c.json({ resourceType: resource.resourceType, machineType: resource.resourceType, ...checklist });
});

/** @deprecated Use /resources/:resourceId/checklist */
featureRoutes.get('/machines/:machineId/checklist', async (c) => {
  const userId = c.get('userId');
  const resourceId = c.req.param('machineId');
  const { resource, buildingId } = await getResourceBuildingId(resourceId);
  await requireBuildingAccess(userId, buildingId);

  const checklist = await getChecklistForResource(resourceId);
  return c.json({ resourceType: resource.resourceType, machineType: resource.resourceType, ...checklist });
});

featureRoutes.post('/checklists/complete', async (c) => {
  const userId = c.get('userId');
  const body = completeChecklistSchema.parse(await c.req.json());
  const { buildingId } = await getResourceBuildingId(body.resourceId);
  await requireBuildingAccess(userId, buildingId);

  const completion = await prisma.$transaction(async (tx) => {
    const record = await tx.checklistCompletion.create({
      data: {
        userId,
        resourceId: body.resourceId,
        reservationId: body.reservationId,
        checklistType: body.checklistType,
        completedItems: body.completedItems,
      },
    });

    await tx.resource.update({
      where: { id: body.resourceId },
      data: { status: 'AVAILABLE' },
    });

    return record;
  });

  return c.json(completion, 201);
});

featureRoutes.post('/defects', async (c) => {
  const userId = c.get('userId');
  const body = createDefectSchema.parse(await c.req.json());
  const { buildingId } = await getResourceBuildingId(body.resourceId);
  await requireBuildingAccess(userId, buildingId);

  const report = await createDefectReport({
    userId,
    resourceId: body.resourceId,
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
    where: { resource: { laundryRoom: { buildingId } } },
    include: { resource: { include: { laundryRoom: true } }, reportedBy: true },
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
    include: { resource: { include: { laundryRoom: true } } },
  });
  if (!defect) return c.json({ error: 'Not found' }, 404);

  await requireBuildingAccess(userId, defect.resource.laundryRoom.buildingId, true);

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

  const { getBuildingSettings } = await import('../services/building-settings.js');
  const settings = await getBuildingSettings(buildingId);
  if (!settings) return c.json({ error: 'Not found' }, 404);
  return c.json(settings.houseRules);
});
