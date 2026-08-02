import { Hono } from 'hono';
import { z } from 'zod';
import { normalizeEmail } from '@woeschplan/shared';
import { hashPassword, signToken, verifyPassword } from '../auth.js';
import { prisma } from '../db.js';
import { authMiddleware, type AppVariables } from '../middleware/auth.js';
import { checkRateLimit, rateLimitKey } from '../middleware/rate-limit.js';

export const authRoutes = new Hono<{ Variables: AppVariables }>();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  apartmentNumber: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email().transform(normalizeEmail),
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
      emailVerifiedAt: new Date(),
      status: 'ACTIVE',
      notificationPrefs: { create: {} },
    },
  });

  const token = signToken({ userId: user.id, email: user.email });
  return c.json({ token, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
});

authRoutes.post('/login', async (c) => {
  const ip = c.req.header('x-forwarded-for') ?? 'unknown';
  if (!checkRateLimit(rateLimitKey('login', ip), 20, 15 * 60 * 1000)) {
    return c.json({ error: 'Too many login attempts. Please try again later.' }, 429);
  }

  const body = loginSchema.parse(await c.req.json());
  const user = await prisma.user.findUnique({
    where: { email: body.email },
    include: { organisation: true },
  });

  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  if (user.platformRole === 'PROPERTY_ADMIN' && !user.emailVerifiedAt) {
    return c.json(
      {
        error: 'EMAIL_NOT_VERIFIED',
        email: user.email,
        requiresEmailVerification: true,
      },
      403,
    );
  }

  const token = signToken({ userId: user.id, email: user.email });
  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      platformRole: user.platformRole,
      emailVerifiedAt: user.emailVerifiedAt,
      organisationId: user.organisationId,
      onboardingStatus: user.organisation?.onboardingStatus ?? null,
    },
  });
});

authRoutes.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: { include: { building: true } },
      notificationPrefs: true,
      organisation: true,
    },
  });
  if (!user) return c.json({ error: 'Not found' }, 404);

  const { passwordHash: _, ...safeUser } = user;
  return c.json({
    ...safeUser,
    onboardingStatus: user.organisation?.onboardingStatus ?? null,
    requiresOnboarding:
      user.platformRole === 'PROPERTY_ADMIN' &&
      user.organisation?.onboardingStatus !== 'COMPLETED' &&
      user.organisation?.onboardingStatus !== 'PENDING_EMAIL_VERIFICATION',
    requiresEmailVerification:
      user.platformRole === 'PROPERTY_ADMIN' && !user.emailVerifiedAt,
  });
});
