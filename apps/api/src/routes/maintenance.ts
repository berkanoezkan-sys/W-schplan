import { Hono } from 'hono';
import {
  authMiddleware,
  requireBuildingAccess,
  type AppVariables,
} from '../middleware/auth.js';
import {
  createMaintenanceEntry,
  deleteMaintenanceEntry,
  getMaintenanceEntry,
  listMaintenanceEntries,
  maintenanceQuerySchema,
  updateMaintenanceEntry,
} from '../services/maintenance.js';

export const maintenanceRoutes = new Hono<{ Variables: AppVariables }>();
maintenanceRoutes.use('*', authMiddleware);

maintenanceRoutes.get('/buildings/:buildingId/maintenance', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');

  try {
    await requireBuildingAccess(userId, buildingId, true);
  } catch {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const parsed = maintenanceQuerySchema.safeParse({
    view: c.req.query('view') ?? 'list',
    date: c.req.query('date') || undefined,
    type: c.req.query('type') || undefined,
    status: c.req.query('status') || undefined,
  });
  if (!parsed.success) {
    return c.json({ error: 'Invalid query', details: parsed.error.flatten() }, 400);
  }

  try {
    const result = await listMaintenanceEntries({
      buildingId,
      userId,
      query: parsed.data,
    });
    return c.json(result);
  } catch (error) {
    if ((error as Error).message === 'NOT_FOUND') return c.json({ error: 'Not found' }, 404);
    throw error;
  }
});

maintenanceRoutes.get('/buildings/:buildingId/maintenance/:entryId', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');
  const entryId = c.req.param('entryId');

  try {
    await requireBuildingAccess(userId, buildingId, true);
  } catch {
    return c.json({ error: 'Forbidden' }, 403);
  }

  try {
    const entry = await getMaintenanceEntry({ buildingId, entryId });
    return c.json(entry);
  } catch (error) {
    if ((error as Error).message === 'NOT_FOUND') return c.json({ error: 'Not found' }, 404);
    throw error;
  }
});

maintenanceRoutes.post('/buildings/:buildingId/maintenance', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');

  try {
    await requireBuildingAccess(userId, buildingId, true);
  } catch {
    return c.json({ error: 'Forbidden' }, 403);
  }

  try {
    const entry = await createMaintenanceEntry({
      buildingId,
      userId,
      raw: await c.req.json(),
    });
    return c.json(entry, 201);
  } catch (error) {
    const code = (error as Error).message;
    if (code === 'NOT_FOUND') return c.json({ error: 'Not found' }, 404);
    if (code === 'INVALID_AREAS' || code === 'INVALID_MACHINES') {
      return c.json({ error: code }, 400);
    }
    throw error;
  }
});

maintenanceRoutes.patch('/buildings/:buildingId/maintenance/:entryId', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');
  const entryId = c.req.param('entryId');

  try {
    await requireBuildingAccess(userId, buildingId, true);
  } catch {
    return c.json({ error: 'Forbidden' }, 403);
  }

  try {
    const entry = await updateMaintenanceEntry({
      buildingId,
      userId,
      entryId,
      raw: await c.req.json(),
    });
    return c.json(entry);
  } catch (error) {
    const code = (error as Error).message;
    if (code === 'NOT_FOUND') return c.json({ error: 'Not found' }, 404);
    if (code === 'INVALID_AREAS' || code === 'INVALID_MACHINES') {
      return c.json({ error: code }, 400);
    }
    throw error;
  }
});

maintenanceRoutes.delete('/buildings/:buildingId/maintenance/:entryId', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');
  const entryId = c.req.param('entryId');

  try {
    await requireBuildingAccess(userId, buildingId, true);
  } catch {
    return c.json({ error: 'Forbidden' }, 403);
  }

  try {
    const body = c.req.header('content-type')?.includes('json')
      ? await c.req.json().catch(() => ({}))
      : {};
    const result = await deleteMaintenanceEntry({ buildingId, entryId, raw: body });
    return c.json(result);
  } catch (error) {
    if ((error as Error).message === 'NOT_FOUND') return c.json({ error: 'Not found' }, 404);
    throw error;
  }
});
