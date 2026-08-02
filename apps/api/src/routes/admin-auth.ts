import { Hono } from 'hono';
import { z } from 'zod';
import {
  onboardingBuildingSchema,
  onboardingCompanyProfileSchema,
  onboardingLaundryRoomSchema,
  propertyAdminRegistrationSchema,
  resendVerificationSchema,
  verifyEmailTokenSchema,
} from '@woeschplan/shared';
import { authMiddleware, type AppVariables } from '../middleware/auth.js';
import { checkRateLimit, rateLimitKey } from '../middleware/rate-limit.js';
import { registerPropertyAdministrator } from '../services/admin-registration.js';
import {
  resendVerificationEmail,
  verifyEmailWithToken,
} from '../services/email-verification.js';
import {
  completeOnboardingInvitation,
  generateOnboardingRegistrationToken,
  getOnboardingState,
  saveOnboardingBuilding,
  saveOnboardingCompanyProfile,
  saveOnboardingLaundryRoom,
} from '../services/onboarding.js';

export const adminAuthRoutes = new Hono<{ Variables: AppVariables }>();

adminAuthRoutes.post('/register-admin', async (c) => {
  const ip = c.req.header('x-forwarded-for') ?? 'unknown';
  if (!checkRateLimit(rateLimitKey('register-admin', ip), 5, 60 * 60 * 1000)) {
    return c.json({ error: 'RATE_LIMITED' }, 429);
  }

  try {
    const body = propertyAdminRegistrationSchema.parse(await c.req.json());
    if (!checkRateLimit(rateLimitKey('register-admin-email', body.email), 3, 60 * 60 * 1000)) {
      return c.json({ error: 'RATE_LIMITED' }, 429);
    }

    const result = await registerPropertyAdministrator(body);
    return c.json(result, 201);
  } catch (error) {
    const code = (error as Error).message;
    if (code === 'EMAIL_EXISTS') {
      return c.json({ error: 'An account with this email already exists.' }, 409);
    }
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid form fields.' }, 400);
    }
    console.error(error);
    return c.json({ error: 'Registration failed. Please try again.' }, 500);
  }
});

adminAuthRoutes.post('/resend-verification', async (c) => {
  const ip = c.req.header('x-forwarded-for') ?? 'unknown';
  if (!checkRateLimit(rateLimitKey('resend-verification', ip), 5, 60 * 60 * 1000)) {
    return c.json({ error: 'RATE_LIMITED' }, 429);
  }

  try {
    const body = resendVerificationSchema.parse(await c.req.json());
    if (!checkRateLimit(rateLimitKey('resend-verification-email', body.email), 3, 60 * 60 * 1000)) {
      return c.json({ error: 'RATE_LIMITED' }, 429);
    }

    const result = await resendVerificationEmail(body.email);
    return c.json(result);
  } catch (error) {
    const code = (error as Error).message;
    if (code === 'ALREADY_VERIFIED') {
      return c.json({ error: 'Email is already verified.' }, 400);
    }
    return c.json({ error: 'Unable to resend verification email.' }, 500);
  }
});

adminAuthRoutes.get('/verify-email/:token', async (c) => {
  try {
    const token = verifyEmailTokenSchema.shape.token.parse(c.req.param('token'));
    const result = await verifyEmailWithToken(token);
    return c.json(result);
  } catch (error) {
    const code = (error as Error).message;
    if (code === 'EXPIRED_TOKEN') {
      return c.json({ error: 'Verification link has expired.' }, 410);
    }
    return c.json({ error: 'Invalid verification link.' }, 400);
  }
});

export const onboardingRoutes = new Hono<{ Variables: AppVariables }>();
onboardingRoutes.use('*', authMiddleware);

onboardingRoutes.get('/state', async (c) => {
  try {
    const state = await getOnboardingState(c.get('userId'));
    return c.json(state);
  } catch (error) {
    const code = (error as Error).message;
    if (code === 'FORBIDDEN') return c.json({ error: 'Forbidden' }, 403);
    if (code === 'EMAIL_NOT_VERIFIED') return c.json({ error: 'EMAIL_NOT_VERIFIED' }, 403);
    throw error;
  }
});

onboardingRoutes.put('/company-profile', async (c) => {
  try {
    const body = onboardingCompanyProfileSchema.parse(await c.req.json());
    const state = await saveOnboardingCompanyProfile(c.get('userId'), body);
    return c.json(state);
  } catch (error) {
    const code = (error as Error).message;
    if (code === 'FORBIDDEN') return c.json({ error: 'Forbidden' }, 403);
    throw error;
  }
});

onboardingRoutes.put('/building', async (c) => {
  try {
    const body = onboardingBuildingSchema.parse(await c.req.json());
    const state = await saveOnboardingBuilding(c.get('userId'), body);
    return c.json(state);
  } catch (error) {
    const code = (error as Error).message;
    if (code === 'FORBIDDEN') return c.json({ error: 'Forbidden' }, 403);
    throw error;
  }
});

onboardingRoutes.put('/laundry-room', async (c) => {
  try {
    const body = onboardingLaundryRoomSchema.parse(await c.req.json());
    const state = await saveOnboardingLaundryRoom(c.get('userId'), body);
    return c.json(state);
  } catch (error) {
    const code = (error as Error).message;
    if (code === 'FORBIDDEN') return c.json({ error: 'Forbidden' }, 403);
    if (code === 'BUILDING_REQUIRED') return c.json({ error: 'Create a building first.' }, 400);
    throw error;
  }
});

onboardingRoutes.post('/registration-token', async (c) => {
  try {
    const result = await generateOnboardingRegistrationToken(c.get('userId'));
    return c.json(result);
  } catch (error) {
    const code = (error as Error).message;
    if (code === 'FORBIDDEN') return c.json({ error: 'Forbidden' }, 403);
    if (code === 'BUILDING_REQUIRED') return c.json({ error: 'Create a building first.' }, 400);
    throw error;
  }
});

onboardingRoutes.post('/complete', async (c) => {
  try {
    const state = await completeOnboardingInvitation(c.get('userId'));
    return c.json(state);
  } catch (error) {
    const code = (error as Error).message;
    if (code === 'FORBIDDEN') return c.json({ error: 'Forbidden' }, 403);
    if (code === 'BUILDING_REQUIRED') return c.json({ error: 'Create a building first.' }, 400);
    throw error;
  }
});
