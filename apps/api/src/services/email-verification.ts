import { createHash, randomBytes } from 'node:crypto';
import { signToken } from '../auth.js';
import { prisma } from '../db.js';
import { hashSecureToken } from './admin-registration.js';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export async function createEmailVerificationToken(userId: string) {
  const plainToken = randomBytes(24).toString('base64url');
  const tokenHash = hashSecureToken(plainToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.emailVerificationToken.deleteMany({ where: { userId, usedAt: null } });
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { plainToken, expiresAt };
}

export async function verifyEmailWithToken(plainToken: string) {
  const tokenHash = hashSecureToken(plainToken);
  const record = await prisma.emailVerificationToken.findFirst({
    where: { tokenHash },
    include: {
      user: {
        include: {
          organisation: true,
        },
      },
    },
  });

  if (!record) throw new Error('INVALID_TOKEN');
  if (record.usedAt) throw new Error('INVALID_TOKEN');
  if (record.expiresAt.getTime() < Date.now()) throw new Error('EXPIRED_TOKEN');

  const user = await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    const updated = await tx.user.update({
      where: { id: record.userId },
      data: {
        emailVerifiedAt: new Date(),
        status: 'ACTIVE',
      },
      include: { organisation: true },
    });

    if (updated.organisationId) {
      await tx.organisation.update({
        where: { id: updated.organisationId },
        data: {
          status: 'ACTIVE',
          onboardingStatus: 'COMPANY_PROFILE',
        },
      });
    }

    return updated;
  });

  const token = signToken({ userId: user.id, email: user.email });
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerifiedAt: user.emailVerifiedAt,
      platformRole: user.platformRole,
      organisationId: user.organisationId,
      onboardingStatus: user.organisation?.onboardingStatus ?? 'COMPANY_PROFILE',
    },
  };
}

export async function resendVerificationEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { organisation: true },
  });

  if (!user) {
    return { ok: true };
  }

  if (user.emailVerifiedAt) {
    throw new Error('ALREADY_VERIFIED');
  }

  const { plainToken } = await createEmailVerificationToken(user.id);
  const baseUrl = (process.env.APP_BASE_URL ?? 'https://woeschplan.ch').replace(/\/$/, '');
  const verifyUrl = `${baseUrl}/verify/${plainToken}`;

  const { buildVerificationEmail, sendEmail } = await import('./email.js');
  const emailContent = buildVerificationEmail({
    firstName: user.firstName,
    verifyUrl,
  });

  await sendEmail({
    to: user.email,
    ...emailContent,
  });

  return {
    ok: true,
    verifyUrl: process.env.NODE_ENV === 'development' ? verifyUrl : undefined,
  };
}
