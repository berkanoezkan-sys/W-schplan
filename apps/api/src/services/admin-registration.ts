import { createHash, randomBytes } from 'node:crypto';
import type { PropertyAdminRegistrationInput } from '@woeschplan/shared';
import { createDefaultAdministratorSettings } from '@woeschplan/shared';
import { hashPassword } from '../auth.js';
import { prisma } from '../db.js';
import { buildVerificationEmail, sendEmail } from './email.js';
import { createEmailVerificationToken } from './email-verification.js';

export function hashSecureToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function registerPropertyAdministrator(input: PropertyAdminRegistrationInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new Error('EMAIL_EXISTS');
  }

  const passwordHash = await hashPassword(input.password);
  const adminSettings = createDefaultAdministratorSettings();
  adminSettings.companyContact = {
    companyName: input.companyName,
    contactPerson: `${input.firstName} ${input.lastName}`,
    phone: input.phone,
    email: input.email,
    website: input.website,
  };

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        platformRole: 'PROPERTY_ADMIN',
        status: 'PENDING_VERIFICATION',
        administratorSettings: adminSettings,
        notificationPrefs: { create: {} },
      },
    });

    const organisation = await tx.organisation.create({
      data: {
        name: input.companyName,
        email: input.email,
        phone: input.phone,
        website: input.website,
        status: 'PENDING',
        onboardingStatus: 'PENDING_EMAIL_VERIFICATION',
        ownerId: createdUser.id,
      },
    });

    await tx.user.update({
      where: { id: createdUser.id },
      data: { organisationId: organisation.id },
    });

    await tx.organisationMembership.create({
      data: {
        organisationId: organisation.id,
        userId: createdUser.id,
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: new Date(),
      },
    });

    return { ...createdUser, organisationId: organisation.id, organisation };
  });

  const { plainToken } = await createEmailVerificationToken(user.id);
  const baseUrl = (process.env.APP_BASE_URL ?? 'https://woeschplan.ch').replace(/\/$/, '');
  const verifyUrl = `${baseUrl}/verify/${plainToken}`;
  const emailContent = buildVerificationEmail({
    firstName: user.firstName,
    verifyUrl,
  });

  await sendEmail({
    to: user.email,
    ...emailContent,
  });

  return {
    email: user.email,
    requiresEmailVerification: true,
    verifyUrl: process.env.NODE_ENV === 'development' ? verifyUrl : undefined,
  };
}

export function generateInvitationToken(): string {
  return randomBytes(24).toString('base64url');
}
