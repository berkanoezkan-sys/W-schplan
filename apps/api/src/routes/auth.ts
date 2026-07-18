import { Hono } from 'hono';
import { z } from 'zod';
import { hashPassword, signToken, verifyPassword } from '../auth.js';
import { prisma } from '../db.js';
import { authMiddleware, type AppVariables } from '../middleware/auth.js';

export const authRoutes = new Hono<{ Variables: AppVariables }>();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  apartmentNumber: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRoutes.post('/register', async (c) => {
  const body = registerSchema.parse(await c.req.json());
  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) {
    return c.json({ error: 'Email already registered' }, 409);
  }

  const user = await prisma.user.create({
    data: {
      email: body.email,
      passwordHash: await hashPassword(body.password),
      firstName: body.firstName,
      lastName: body.lastName,
      apartmentNumber: body.apartmentNumber,
      notificationPrefs: { create: {} },
    },
  });

  const token = signToken({ userId: user.id, email: user.email });
  return c.json({ token, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
});

authRoutes.post('/login', async (c) => {
  const body = loginSchema.parse(await c.req.json());
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const token = signToken({ userId: user.id, email: user.email });
  return c.json({ token, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
});

authRoutes.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: { include: { building: true } },
      notificationPrefs: true,
    },
  });
  if (!user) return c.json({ error: 'Not found' }, 404);
  const { passwordHash: _, ...safeUser } = user;
  return c.json(safeUser);
});
