import {
  createBuildingSchema,
  createDefaultBookingRules,
  createDefaultHouseRules,
  type CreateBuildingInput,
} from '@woeschplan/shared';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { ensureDefaultChecklistTemplates } from './building-settings.js';
import { createBuildingRegistration } from './registration.js';

const buildingInclude = {
  laundryRooms: {
    include: {
      resources: { orderBy: [{ resourceType: 'asc' as const }, { name: 'asc' as const }] },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.BuildingInclude;

function membershipScopeForUser(user: {
  platformRole: string | null;
  organisationId: string | null;
} | null): Prisma.BuildingMembershipWhereInput {
  if (user?.platformRole === 'PROPERTY_ADMIN' && user.organisationId) {
    return { building: { organisationId: user.organisationId } };
  }
  return {};
}

export async function listBuildingMembershipsForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organisationId: true, platformRole: true },
  });

  const memberships = await prisma.buildingMembership.findMany({
    where: {
      userId,
      ...membershipScopeForUser(user),
    },
    include: { building: { include: buildingInclude } },
    orderBy: { building: { name: 'asc' } },
  });

  return { user, memberships };
}

export async function getPortfolioStatsForUser(userId: string) {
  const { portfolio } = await listBuildingsWithPortfolio(userId);
  return portfolio;
}

export function computePortfolioStats(
  memberships: Array<{ role: string; buildingId: string }>,
) {
  const adminBuildingIds = memberships
    .filter((membership) => membership.role === 'ADMINISTRATOR')
    .map((membership) => membership.buildingId);

  return {
    adminBuildingIds,
    buildingCount: adminBuildingIds.length,
  };
}

export async function listBuildingsWithPortfolio(userId: string) {
  const { memberships } = await listBuildingMembershipsForUser(userId);
  const { adminBuildingIds, buildingCount } = computePortfolioStats(memberships);

  const activeResidentCount = adminBuildingIds.length
    ? await prisma.buildingMembership.count({
        where: {
          buildingId: { in: adminBuildingIds },
          role: 'RESIDENT',
        },
      })
    : 0;

  return {
    buildings: memberships.map((membership) => ({
      ...membership.building,
      role: membership.role,
    })),
    portfolio: {
      buildingCount,
      activeResidentCount,
    },
  };
}

export async function userCanCreateBuilding(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { platformRole: true, organisationId: true },
  });

  if (user?.platformRole === 'PROPERTY_ADMIN' && user.organisationId) {
    return true;
  }

  const adminMembership = await prisma.buildingMembership.findFirst({
    where: { userId, role: 'ADMINISTRATOR' },
  });
  if (adminMembership) return true;

  const membershipCount = await prisma.buildingMembership.count({ where: { userId } });
  return membershipCount === 0;
}

export async function deleteBuildingForUser(userId: string, buildingId: string) {
  const membership = await prisma.buildingMembership.findUnique({
    where: { userId_buildingId: { userId, buildingId } },
  });
  if (!membership || membership.role !== 'ADMINISTRATOR') {
    throw new Error('FORBIDDEN');
  }

  const building = await prisma.building.findUnique({ where: { id: buildingId } });
  if (!building) throw new Error('NOT_FOUND');

  const activeReservations = await prisma.reservation.count({
    where: {
      status: 'CONFIRMED',
      endTime: { gte: new Date() },
      resource: { laundryRoom: { buildingId } },
    },
  });
  if (activeReservations > 0) {
    throw new Error('HAS_ACTIVE_RESERVATIONS');
  }

  await prisma.building.delete({ where: { id: buildingId } });
}

export async function createBuildingForUser(userId: string, raw: CreateBuildingInput) {
  const input = createBuildingSchema.parse(raw);

  const allowed = await userCanCreateBuilding(userId);
  if (!allowed) throw new Error('FORBIDDEN');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organisationId: true },
  });

  const houseRules = createDefaultHouseRules();
  const bookingRules = createDefaultBookingRules();
  const address =
    input.address ??
    (input.street && input.postalCode && input.city
      ? `${input.street}, ${input.postalCode} ${input.city}, ${input.country ?? 'CH'}`
      : undefined);

  if (!address) throw new Error('INVALID_ADDRESS');

  const building = await prisma.$transaction(async (tx) => {
    const created = await tx.building.create({
      data: {
        organisationId: user?.organisationId ?? undefined,
        name: input.name,
        address,
        street: input.street,
        postalCode: input.postalCode,
        city: input.city,
        country: input.country ?? 'CH',
        timezone: input.timezone,
        language: input.language,
        houseRules,
        bookingRules,
      },
    });

    await tx.buildingMembership.create({
      data: {
        userId,
        buildingId: created.id,
        role: 'ADMINISTRATOR',
      },
    });

    return created;
  });

  await ensureDefaultChecklistTemplates(building.id);
  const { plainToken, urls } = await createBuildingRegistration(building.id, userId);

  return {
    ...building,
    role: 'ADMINISTRATOR' as const,
    laundryRooms: [],
    registration: {
      token: plainToken,
      shareUrl: urls.shareUrl,
      appDeepLink: urls.appDeepLink,
    },
  };
}
