import { Hono } from 'hono';
import { administratorSettingsPatchSchema } from '@woeschplan/shared';
import { z } from 'zod';
import { authMiddleware, type AppVariables } from '../middleware/auth.js';
import {
  getAdministratorSettings,
  updateAdministratorSettings,
  updatePreferredBuilding,
} from '../services/administrator-settings.js';

export const administratorSettingsRoutes = new Hono<{ Variables: AppVariables }>();
administratorSettingsRoutes.use('*', authMiddleware);

administratorSettingsRoutes.get('/me/administrator-settings', async (c) => {
  const userId = c.get('userId');
  const settings = await getAdministratorSettings(userId);
  return c.json(settings);
});

administratorSettingsRoutes.patch('/me/administrator-settings', async (c) => {
  const userId = c.get('userId');
  const body = administratorSettingsPatchSchema.parse(await c.req.json());
  const settings = await updateAdministratorSettings(userId, body);
  return c.json(settings);
});

administratorSettingsRoutes.patch('/me/preferred-building', async (c) => {
  const userId = c.get('userId');
  const { buildingId } = z.object({ buildingId: z.string().uuid() }).parse(await c.req.json());
  try {
    const result = await updatePreferredBuilding(userId, buildingId);
    return c.json(result);
  } catch {
    return c.json({ error: 'Forbidden' }, 403);
  }
});
