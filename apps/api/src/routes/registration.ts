import { Hono } from 'hono';
import {
  registerWithTokenSchema,
  updateBuildingRegistrationSchema,
  validateRegistrationTokenSchema,
} from '@woeschplan/shared';
import { authMiddleware, requireBuildingAccess, type AppVariables } from '../middleware/auth.js';
import {
  getBuildingRegistrationAdmin,
  regenerateBuildingRegistrationToken,
  registerResidentWithToken,
  updateBuildingRegistrationSettings,
  validateRegistrationToken,
  createBuildingRegistration,
} from '../services/registration.js';

export const registrationRoutes = new Hono<{ Variables: AppVariables }>();

registrationRoutes.get('/validate/:token', async (c) => {
  const token = validateRegistrationTokenSchema.shape.token.parse(c.req.param('token'));
  const result = await validateRegistrationToken(token);
  if (!result.valid) {
    return c.json({ valid: false, reason: result.reason });
  }
  return c.json({ valid: true, building: result.building });
});

registrationRoutes.post('/register', async (c) => {
  const body = registerWithTokenSchema.parse(await c.req.json());
  try {
    const result = await registerResidentWithToken(body);
    return c.json(result, 201);
  } catch (error) {
    const code = (error as Error).message;
    const status =
      code === 'INVALID_TOKEN' || code === 'REGISTRATION_DISABLED'
        ? 400
        : code === 'ALREADY_REGISTERED' || code === 'OTHER_BUILDING' || code === 'ADMIN_ACCOUNT'
          ? 409
          : 500;
    return c.json({ error: code }, status);
  }
});

export const buildingRegistrationRoutes = new Hono<{ Variables: AppVariables }>();
buildingRegistrationRoutes.use('*', authMiddleware);

buildingRegistrationRoutes.get('/buildings/:buildingId/registration', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');
  try {
    await requireBuildingAccess(userId, buildingId, true);
  } catch {
    return c.json({ error: 'Forbidden' }, 403);
  }

  let data = await getBuildingRegistrationAdmin(buildingId);
  if (!data) {
    await createBuildingRegistration(buildingId, userId);
    data = await getBuildingRegistrationAdmin(buildingId);
  }
  if (!data) return c.json({ error: 'Not found' }, 404);
  return c.json(data);
});

buildingRegistrationRoutes.post('/buildings/:buildingId/registration/regenerate', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');
  try {
    await requireBuildingAccess(userId, buildingId, true);
  } catch {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const { plainToken, urls, registration } = await regenerateBuildingRegistrationToken(
    buildingId,
    userId,
  );

  return c.json({
    token: plainToken,
    shareUrl: urls.shareUrl,
    appDeepLink: urls.appDeepLink,
    lastRegeneratedAt: registration.lastRegeneratedAt,
  });
});

buildingRegistrationRoutes.patch('/buildings/:buildingId/registration', async (c) => {
  const userId = c.get('userId');
  const buildingId = c.req.param('buildingId');
  try {
    await requireBuildingAccess(userId, buildingId, true);
  } catch {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const body = updateBuildingRegistrationSchema.parse(await c.req.json());
  const updated = await updateBuildingRegistrationSettings(
    buildingId,
    body.selfRegistrationEnabled,
  );
  return c.json({
    selfRegistrationEnabled: updated.selfRegistrationEnabled,
  });
});
