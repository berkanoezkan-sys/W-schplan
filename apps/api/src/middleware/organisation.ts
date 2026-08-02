import { prisma } from '../db.js';

export async function getUserOrganisationId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organisationId: true },
  });
  return user?.organisationId ?? null;
}

export async function requireOrganisationBuildingAccess(
  userId: string,
  buildingId: string,
  adminOnly = false,
) {
  const building = await prisma.building.findUnique({
    where: { id: buildingId },
    select: { organisationId: true },
  });

  if (!building) {
    throw new Error('NOT_FOUND');
  }

  const membership = await prisma.buildingMembership.findUnique({
    where: { userId_buildingId: { userId, buildingId } },
  });

  if (!membership) {
    throw new Error('FORBIDDEN');
  }

  if (adminOnly && membership.role !== 'ADMINISTRATOR') {
    throw new Error('FORBIDDEN');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organisationId: true, platformRole: true },
  });

  if (
    user?.platformRole === 'PROPERTY_ADMIN' &&
    building.organisationId &&
    user.organisationId &&
    building.organisationId !== user.organisationId
  ) {
    throw new Error('FORBIDDEN');
  }

  return membership;
}

export async function assertBuildingBelongsToOrganisation(
  buildingId: string,
  organisationId: string,
) {
  const building = await prisma.building.findUnique({
    where: { id: buildingId },
    select: { organisationId: true },
  });

  if (!building) throw new Error('NOT_FOUND');
  if (building.organisationId !== organisationId) throw new Error('FORBIDDEN');
}
