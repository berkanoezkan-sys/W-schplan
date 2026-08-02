import type { Context, Next } from 'hono';
import { verifyToken } from '../auth.js';
import { prisma } from '../db.js';
import { requireOrganisationBuildingAccess } from './organisation.js';

export type AppVariables = {
  userId: string;
  email: string;
};

export async function authMiddleware(c: Context<{ Variables: AppVariables }>, next: Next) {
  const header = c.req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const payload = verifyToken(header.slice(7));
    c.set('userId', payload.userId);
    c.set('email', payload.email);
    await next();
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
}

export async function requireBuildingAccess(
  userId: string,
  buildingId: string,
  adminOnly = false,
) {
  return requireOrganisationBuildingAccess(userId, buildingId, adminOnly);
}

export async function getResourceBuildingId(resourceId: string) {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: { laundryRoom: true },
  });

  if (!resource) {
    throw new Error('NOT_FOUND');
  }

  return { resource, buildingId: resource.laundryRoom.buildingId };
}

/** @deprecated Use getResourceBuildingId */
export async function getMachineBuildingId(machineId: string) {
  return getResourceBuildingId(machineId);
}

export async function getLaundryRoomBuildingId(laundryRoomId: string) {
  const room = await prisma.laundryRoom.findUnique({ where: { id: laundryRoomId } });
  if (!room) throw new Error('NOT_FOUND');
  return { room, buildingId: room.buildingId };
}
