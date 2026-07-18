import type { Context, Next } from 'hono';
import { verifyToken } from '../auth.js';
import { prisma } from '../db.js';

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
  const membership = await prisma.buildingMembership.findUnique({
    where: { userId_buildingId: { userId, buildingId } },
  });

  if (!membership) {
    throw new Error('FORBIDDEN');
  }

  if (adminOnly && membership.role !== 'ADMINISTRATOR') {
    throw new Error('FORBIDDEN');
  }

  return membership;
}

export async function getMachineBuildingId(machineId: string) {
  const machine = await prisma.machine.findUnique({
    where: { id: machineId },
    include: { laundryRoom: true },
  });

  if (!machine) {
    throw new Error('NOT_FOUND');
  }

  return { machine, buildingId: machine.laundryRoom.buildingId };
}
