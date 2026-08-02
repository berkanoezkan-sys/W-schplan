import { createHash, randomBytes } from 'node:crypto';
import type { RegisterWithTokenInput } from '@woeschplan/shared';
import { buildRegistrationPaths } from '@woeschplan/shared';
import { hashPassword, signToken } from '../auth.js';
import { prisma } from '../db.js';

export function generateRegistrationToken(): string {
  return randomBytes(24).toString('base64url');
}

export function hashRegistrationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function buildRegistrationUrls(token: string) {
  const baseUrl = process.env.REGISTRATION_BASE_URL ?? 'https://woeschplan.ch';
  const paths = buildRegistrationPaths(token);
  return {
    ...paths,
    shareUrl: `${baseUrl.replace(/\/$/, '')}${paths.webPath}`,
  };
}

export async function createBuildingRegistration(buildingId: string, createdById: string) {
  const plainToken = generateRegistrationToken();
  const tokenHash = hashRegistrationToken(plainToken);

  const registration = await prisma.buildingRegistration.upsert({
    where: { buildingId },
    create: {
      buildingId,
      tokenHash,
      createdById,
      selfRegistrationEnabled: true,
    },
    update: {
      tokenHash,
      lastRegeneratedAt: new Date(),
      selfRegistrationEnabled: true,
    },
  });

  const urls = buildRegistrationUrls(plainToken);
  return { registration, plainToken, urls };
}

export async function findRegistrationByToken(plainToken: string) {
  const tokenHash = hashRegistrationToken(plainToken);
  return prisma.buildingRegistration.findFirst({
    where: { tokenHash },
    include: { building: true },
  });
}

export async function validateRegistrationToken(plainToken: string) {
  const record = await findRegistrationByToken(plainToken);
  if (!record) return { valid: false as const, reason: 'INVALID' as const };
  if (!record.selfRegistrationEnabled) {
    return { valid: false as const, reason: 'DISABLED' as const };
  }
  return {
    valid: true as const,
    building: {
      id: record.building.id,
      name: record.building.name,
      address: record.building.address,
      language: record.building.language,
    },
  };
}

export async function getBuildingRegistrationAdmin(buildingId: string) {
  const registration = await prisma.buildingRegistration.findUnique({
    where: { buildingId },
    include: {
      events: {
        orderBy: { registeredAt: 'desc' },
        take: 50,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              apartmentNumber: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (!registration) return null;

  const baseUrl = (process.env.REGISTRATION_BASE_URL ?? 'https://woeschplan.ch').replace(/\/$/, '');

  return {
    buildingId,
    selfRegistrationEnabled: registration.selfRegistrationEnabled,
    totalRegistrations: registration.totalRegistrations,
    lastRegeneratedAt: registration.lastRegeneratedAt,
    createdAt: registration.createdAt,
    shareUrlPattern: `${baseUrl}/join/{token}`,
    appDeepLinkPattern: 'woeschplan://join/{token}',
    recentRegistrations: registration.events.map((event) => ({
      id: event.id,
      registeredAt: event.registeredAt,
      user: event.user,
    })),
  };
}

export async function regenerateBuildingRegistrationToken(
  buildingId: string,
  adminUserId: string,
) {
  return createBuildingRegistration(buildingId, adminUserId);
}

export async function updateBuildingRegistrationSettings(
  buildingId: string,
  selfRegistrationEnabled: boolean,
) {
  return prisma.buildingRegistration.update({
    where: { buildingId },
    data: { selfRegistrationEnabled },
  });
}

export async function registerResidentWithToken(input: RegisterWithTokenInput) {
  const record = await findRegistrationByToken(input.token);
  if (!record) throw new Error('INVALID_TOKEN');
  if (!record.selfRegistrationEnabled) throw new Error('REGISTRATION_DISABLED');

  const buildingId = record.buildingId;
  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });

  if (existingUser) {
    const memberships = await prisma.buildingMembership.findMany({
      where: { userId: existingUser.id },
    });
    const sameBuilding = memberships.find((m) => m.buildingId === buildingId);
    if (sameBuilding) throw new Error('ALREADY_REGISTERED');
    if (memberships.some((m) => m.role === 'RESIDENT' && m.buildingId !== buildingId)) {
      throw new Error('OTHER_BUILDING');
    }
    if (memberships.some((m) => m.role === 'ADMINISTRATOR')) {
      throw new Error('ADMIN_ACCOUNT');
    }

    const user = await prisma.$transaction(async (tx) => {
      await tx.buildingMembership.create({
        data: {
          userId: existingUser.id,
          buildingId,
          role: 'RESIDENT',
        },
      });
      await tx.user.update({
        where: { id: existingUser.id },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          apartmentNumber: input.apartmentNumber,
          preferredBuildingId: buildingId,
        },
      });
      await tx.residentRegistration.create({
        data: {
          buildingId,
          userId: existingUser.id,
          registrationId: record.id,
        },
      });
      await tx.buildingRegistration.update({
        where: { id: record.id },
        data: { totalRegistrations: { increment: 1 } },
      });
      return existingUser;
    });

    const token = signToken({ userId: user.id, email: user.email });
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: input.firstName,
        lastName: input.lastName,
      },
      buildingId,
    };
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        apartmentNumber: input.apartmentNumber,
        preferredBuildingId: buildingId,
        notificationPrefs: { create: {} },
      },
    });
    await tx.buildingMembership.create({
      data: {
        userId: created.id,
        buildingId,
        role: 'RESIDENT',
      },
    });
    await tx.residentRegistration.create({
      data: {
        buildingId,
        userId: created.id,
        registrationId: record.id,
      },
    });
    await tx.buildingRegistration.update({
      where: { id: record.id },
      data: { totalRegistrations: { increment: 1 } },
    });
    return created;
  });

  const token = signToken({ userId: user.id, email: user.email });
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    buildingId,
  };
}
