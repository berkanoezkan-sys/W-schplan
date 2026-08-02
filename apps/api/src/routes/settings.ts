import { Hono } from 'hono';
import {
  buildingSettingsPatchSchema,
  checklistTemplatePatchSchema,
  CHECKLIST_TYPES,
} from '@woeschplan/shared';
import {
  authMiddleware,
  requireBuildingAccess,
  type AppVariables,
} from '../middleware/auth.js';
import {
  ensureDefaultBookingRules,
  ensureDefaultChecklistTemplates,
  ensureDefaultHouseRules,
  getBuildingSettings,
  getChecklistTemplateForBuilding,
  updateBuildingSettings,
  upsertChecklistTemplate,
} from '../services/building-settings.js';

export const settingsRoutes = new Hono<{ Variables: AppVariables }>();
settingsRoutes.use('*', authMiddleware);

settingsRoutes.get('/buildings/:buildingId/settings', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');
  await requireBuildingAccess(userId, buildingId);

  await ensureDefaultHouseRules(buildingId);
  await ensureDefaultBookingRules(buildingId);
  await ensureDefaultChecklistTemplates(buildingId);

  const settings = await getBuildingSettings(buildingId);
  if (!settings) return c.json({ error: 'Not found' }, 404);
  return c.json(settings);
});

settingsRoutes.patch('/buildings/:buildingId/settings', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');
  await requireBuildingAccess(userId, buildingId, true);

  const body = buildingSettingsPatchSchema.parse(await c.req.json());
  const { quietHoursConflicts } = await updateBuildingSettings(buildingId, body);
  const settings = await getBuildingSettings(buildingId);
  return c.json({ ...settings, quietHoursConflicts });
});

settingsRoutes.get('/buildings/:buildingId/checklist-templates/:type', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');
  const type = c.req.param('type') as (typeof CHECKLIST_TYPES)[number];
  if (!CHECKLIST_TYPES.includes(type)) return c.json({ error: 'Invalid type' }, 400);

  try {
    await requireBuildingAccess(userId, buildingId);
    const template = await getChecklistTemplateForBuilding(buildingId, type);
    return c.json(template);
  } catch (err) {
    console.error('Failed to load checklist template', err);
    return c.json({ error: 'Failed to load checklist template' }, 500);
  }
});

settingsRoutes.put('/buildings/:buildingId/checklist-templates/:type', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');
  const type = c.req.param('type') as (typeof CHECKLIST_TYPES)[number];
  if (!CHECKLIST_TYPES.includes(type)) return c.json({ error: 'Invalid type' }, 400);

  await requireBuildingAccess(userId, buildingId, true);

  const body = checklistTemplatePatchSchema.parse(await c.req.json());
  if (body.checklistType !== type) {
    return c.json({ error: 'Type mismatch' }, 400);
  }

  await upsertChecklistTemplate(buildingId, body);
  return c.json(body);
});
