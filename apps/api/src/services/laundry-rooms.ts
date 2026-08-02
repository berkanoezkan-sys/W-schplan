import {
  createLaundryRoomSchema,
  createResourceSchema,
  defaultRuntimeForResourceType,
  updateLaundryRoomSchema,
  updateResourceSchema,
} from '@woeschplan/shared';
import { prisma } from '../db.js';

export async function createLaundryRoom(buildingId: string, raw: unknown) {
  const input = createLaundryRoomSchema.parse(raw);
  return prisma.laundryRoom.create({
    data: {
      buildingId,
      name: input.name,
      floor: input.floor,
      instructions: input.instructions,
    },
    include: { resources: true },
  });
}

export async function updateLaundryRoom(laundryRoomId: string, buildingId: string, raw: unknown) {
  const input = updateLaundryRoomSchema.parse(raw);
  const room = await prisma.laundryRoom.findFirst({
    where: { id: laundryRoomId, buildingId },
  });
  if (!room) throw new Error('NOT_FOUND');

  return prisma.laundryRoom.update({
    where: { id: laundryRoomId },
    data: input,
    include: { resources: true },
  });
}

export async function deleteLaundryRoom(laundryRoomId: string, buildingId: string) {
  const room = await prisma.laundryRoom.findFirst({
    where: { id: laundryRoomId, buildingId },
    include: { resources: { include: { reservations: { where: { status: 'CONFIRMED' } } } } },
  });
  if (!room) throw new Error('NOT_FOUND');

  const hasActiveReservations = room.resources.some((r) => r.reservations.length > 0);
  if (hasActiveReservations) {
    throw new Error('HAS_ACTIVE_RESERVATIONS');
  }

  await prisma.laundryRoom.delete({ where: { id: laundryRoomId } });
}

export async function createResource(laundryRoomId: string, buildingId: string, raw: unknown) {
  const input = createResourceSchema.parse(raw);
  const room = await prisma.laundryRoom.findFirst({
    where: { id: laundryRoomId, buildingId },
  });
  if (!room) throw new Error('NOT_FOUND');

  return prisma.resource.create({
    data: {
      laundryRoomId,
      name: input.name,
      resourceType: input.resourceType,
      model: input.model,
      estimatedDefaultRuntime:
        input.estimatedDefaultRuntime ?? defaultRuntimeForResourceType(input.resourceType),
    },
  });
}

export async function updateResource(
  resourceId: string,
  laundryRoomId: string,
  buildingId: string,
  raw: unknown,
) {
  const input = updateResourceSchema.parse(raw);
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, laundryRoomId, laundryRoom: { buildingId } },
  });
  if (!resource) throw new Error('NOT_FOUND');

  return prisma.resource.update({
    where: { id: resourceId },
    data: input,
  });
}

export async function deleteResource(resourceId: string, laundryRoomId: string, buildingId: string) {
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, laundryRoomId, laundryRoom: { buildingId } },
    include: { reservations: { where: { status: 'CONFIRMED' } } },
  });
  if (!resource) throw new Error('NOT_FOUND');
  if (resource.reservations.length > 0) throw new Error('HAS_ACTIVE_RESERVATIONS');

  await prisma.resource.delete({ where: { id: resourceId } });
}

export async function getLaundryRoom(laundryRoomId: string, buildingId: string) {
  const room = await prisma.laundryRoom.findFirst({
    where: { id: laundryRoomId, buildingId },
    include: { resources: { orderBy: [{ resourceType: 'asc' }, { name: 'asc' }] } },
  });
  if (!room) throw new Error('NOT_FOUND');
  return room;
}
