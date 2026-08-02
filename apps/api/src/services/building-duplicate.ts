import type { Prisma } from '@prisma/client';
import type { CreateBuildingInput } from '@woeschplan/shared';
import {
  BUILDING_DUPLICATE_SECTIONS,
  duplicateBuildingSchema,
  normalizeHouseRules,
  type BuildingDuplicatePreview,
  type BuildingDuplicateSectionKey,
} from '@woeschplan/shared';
import { prisma } from '../db.js';
import { createBuildingRegistration } from './registration.js';
import { parseBookingRules } from './reservations.js';
import { userCanCreateBuilding } from './buildings.js';

type CopyContext = {
  tx: Prisma.TransactionClient;
  sourceBuildingId: string;
  targetBuildingId: string;
};

type BuildingCopyHandler = {
  key: BuildingDuplicateSectionKey;
  copy: (ctx: CopyContext) => Promise<void>;
};

/** Modular copy handlers — add new sections here to extend duplication. */
const BUILDING_COPY_HANDLERS: BuildingCopyHandler[] = [
  {
    key: 'checklistTemplates',
    async copy({ tx, sourceBuildingId, targetBuildingId }) {
      const templates = await tx.checklistTemplate.findMany({
        where: { buildingId: sourceBuildingId },
      });
      for (const template of templates) {
        await tx.checklistTemplate.create({
          data: {
            buildingId: targetBuildingId,
            checklistType: template.checklistType,
            items: template.items as Prisma.InputJsonValue,
          },
        });
      }
    },
  },
  {
    key: 'laundryRooms',
    async copy({ tx, sourceBuildingId, targetBuildingId }) {
      const rooms = await tx.laundryRoom.findMany({
        where: { buildingId: sourceBuildingId },
        include: { resources: true },
        orderBy: { createdAt: 'asc' },
      });

      for (const room of rooms) {
        const newRoom = await tx.laundryRoom.create({
          data: {
            buildingId: targetBuildingId,
            name: room.name,
            floor: room.floor,
            instructions: room.instructions,
            isActive: room.isActive,
          },
        });

        for (const resource of room.resources) {
          await tx.resource.create({
            data: {
              laundryRoomId: newRoom.id,
              name: resource.name,
              resourceType: resource.resourceType,
              model: resource.model,
              estimatedDefaultRuntime: resource.estimatedDefaultRuntime,
              cleaningChecklistConfiguration:
                resource.cleaningChecklistConfiguration === null
                  ? undefined
                  : (resource.cleaningChecklistConfiguration as Prisma.InputJsonValue),
              status: 'AVAILABLE',
              isActive: resource.isActive,
            },
          });
        }
      }
    },
  },
];

async function runBuildingCopySections(
  ctx: CopyContext,
  sectionKeys: BuildingDuplicateSectionKey[],
) {
  for (const handler of BUILDING_COPY_HANDLERS) {
    if (sectionKeys.includes(handler.key)) {
      await handler.copy(ctx);
    }
  }
}

export async function getBuildingDuplicatePreview(
  userId: string,
  sourceBuildingId: string,
): Promise<BuildingDuplicatePreview> {
  await assertCanDuplicateSource(userId, sourceBuildingId);

  const source = await prisma.building.findUnique({
    where: { id: sourceBuildingId },
    include: {
      laundryRooms: { include: { resources: true } },
      checklistTemplates: true,
    },
  });
  if (!source) throw new Error('NOT_FOUND');

  const resourceCount = source.laundryRooms.reduce((n, r) => n + r.resources.length, 0);

  return {
    sourceBuildingId: source.id,
    sourceName: source.name,
    sourceAddress: source.address,
    sections: BUILDING_DUPLICATE_SECTIONS.map((section) => ({
      key: section.key,
      labelKey: section.labelKey,
      count:
        section.key === 'laundryRooms'
          ? resourceCount || source.laundryRooms.length
          : section.key === 'checklistTemplates'
            ? source.checklistTemplates.length
            : undefined,
    })),
    excluded: [
      { key: 'residents', labelKey: 'duplicate.excluded.residents' },
      { key: 'reservations', labelKey: 'duplicate.excluded.reservations' },
      { key: 'defectReports', labelKey: 'duplicate.excluded.defectReports' },
      { key: 'registrationTokens', labelKey: 'duplicate.excluded.registrationTokens' },
    ],
  };
}

async function assertCanDuplicateSource(userId: string, sourceBuildingId: string) {
  const canCreate = await userCanCreateBuilding(userId);
  if (!canCreate) throw new Error('FORBIDDEN');

  const membership = await prisma.buildingMembership.findUnique({
    where: { userId_buildingId: { userId, buildingId: sourceBuildingId } },
  });
  if (!membership || membership.role !== 'ADMINISTRATOR') {
    throw new Error('FORBIDDEN');
  }
}

export async function duplicateBuildingForUser(
  userId: string,
  sourceBuildingId: string,
  raw: CreateBuildingInput,
) {
  const input = duplicateBuildingSchema.parse(raw);
  await assertCanDuplicateSource(userId, sourceBuildingId);

  const source = await prisma.building.findUnique({
    where: { id: sourceBuildingId },
  });
  if (!source) throw new Error('NOT_FOUND');

  const houseRules = normalizeHouseRules(source.houseRules);
  const bookingRules = parseBookingRules(source.bookingRules);

  const building = await prisma.$transaction(async (tx) => {
    const created = await tx.building.create({
      data: {
        name: input.name,
        address: input.address,
        timezone: input.timezone,
        language: input.language,
        privacyLabelMode: source.privacyLabelMode,
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

    await runBuildingCopySections(
      { tx, sourceBuildingId, targetBuildingId: created.id },
      ['checklistTemplates', 'laundryRooms'],
    );

    return created;
  });

  const { plainToken, urls } = await createBuildingRegistration(building.id, userId);

  const full = await prisma.building.findUnique({
    where: { id: building.id },
    include: { laundryRooms: { include: { resources: true } } },
  });

  return {
    ...full!,
    role: 'ADMINISTRATOR' as const,
    registration: {
      token: plainToken,
      shareUrl: urls.shareUrl,
      appDeepLink: urls.appDeepLink,
    },
  };
}
