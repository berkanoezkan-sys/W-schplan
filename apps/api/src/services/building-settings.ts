import {
  checklistTemplateSchema,
  createDefaultChecklistTemplate,
  createDefaultHouseRules,
  deriveQuietHours,
  houseRulesSchema,
  normalizeHouseRules,
  type ChecklistTemplate,
  type HouseRules,
  type QuietHoursConflict,
} from '@woeschplan/shared';
import { bookingRulesPatchSchema, mergeBookingRules, normalizeBookingRules } from '@woeschplan/shared';
import type { ChecklistType } from '@prisma/client';
import { prisma } from '../db.js';
import { parseBookingRules } from './reservations.js';
import { findBuildingQuietHoursConflicts } from './schedule.js';

export async function getBuildingSettings(buildingId: string) {
  const building = await prisma.building.findUnique({ where: { id: buildingId } });
  if (!building) return null;

  const houseRules = normalizeHouseRules(building.houseRules);
  const bookingRules = parseBookingRules(building.bookingRules);

  const templates = await prisma.checklistTemplate.findMany({ where: { buildingId } });

  return {
    buildingId,
    name: building.name,
    address: building.address,
    timezone: building.timezone,
    language: building.language,
    privacyLabelMode: building.privacyLabelMode,
    houseRules,
    bookingRules,
    checklistTemplates: templates.map((t) => ({
      checklistType: t.checklistType,
      items: checklistTemplateSchema.parse({ checklistType: t.checklistType, items: t.items }).items,
      updatedAt: t.updatedAt,
    })),
  };
}

function mergeHouseRules(current: HouseRules, patch: Partial<HouseRules>): HouseRules {
  const washingHours = patch.washingHours
    ? { ...current.washingHours, ...patch.washingHours }
    : current.washingHours;

  const merged: HouseRules = {
    ...current,
    ...patch,
    washingHours,
    quietHours: deriveQuietHours(washingHours),
    contact: patch.contact
      ? { ...current.contact, ...patch.contact }
      : current.contact,
    emergencyContacts: patch.emergencyContacts ?? current.emergencyContacts,
  };

  return houseRulesSchema.parse(merged);
}

export async function updateBuildingSettings(
  buildingId: string,
  patch: { houseRules?: Partial<HouseRules>; bookingRules?: Record<string, unknown> },
): Promise<{ quietHoursConflicts: QuietHoursConflict[] }> {
  const building = await prisma.building.findUnique({ where: { id: buildingId } });
  if (!building) throw new Error('NOT_FOUND');

  const currentHouse = normalizeHouseRules(building.houseRules);
  const currentBooking = parseBookingRules(building.bookingRules);

  const houseRules = patch.houseRules
    ? mergeHouseRules(currentHouse, patch.houseRules)
    : currentHouse;

  const bookingRules = patch.bookingRules
    ? mergeBookingRules(currentBooking, bookingRulesPatchSchema.parse(patch.bookingRules))
    : currentBooking;

  let quietHoursConflicts: QuietHoursConflict[] = [];
  if (patch.houseRules?.washingHours) {
    quietHoursConflicts = await findBuildingQuietHoursConflicts(buildingId, houseRules.quietHours);
  }

  await prisma.building.update({
    where: { id: buildingId },
    data: { houseRules, bookingRules },
  });

  return { quietHoursConflicts };
}

export async function getChecklistTemplateForBuilding(
  buildingId: string,
  checklistType: ChecklistType,
): Promise<ChecklistTemplate> {
  const stored = await prisma.checklistTemplate.findUnique({
    where: { buildingId_checklistType: { buildingId, checklistType } },
  });

  if (stored) {
    try {
      return checklistTemplateSchema.parse({
        checklistType: stored.checklistType,
        items: stored.items,
      });
    } catch {
      const fallback = createDefaultChecklistTemplate(checklistType);
      await upsertChecklistTemplate(buildingId, fallback);
      return fallback;
    }
  }

  const defaultTemplate = createDefaultChecklistTemplate(checklistType);
  await upsertChecklistTemplate(buildingId, defaultTemplate);
  return defaultTemplate;
}

export async function getChecklistForResource(resourceId: string) {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: { laundryRoom: true },
  });
  if (!resource) throw new Error('NOT_FOUND');

  if (resource.resourceType === 'DRYING_ROOM') {
    return {
      resourceType: resource.resourceType,
      items: [],
      maintenance: [],
    };
  }

  const template = await getChecklistTemplateForBuilding(
    resource.laundryRoom.buildingId,
    resource.resourceType,
  );

  const enabledItems = template.items
    .filter((i) => i.enabled)
    .sort((a, b) => a.order - b.order);

  return {
    resourceType: resource.resourceType,
    items: enabledItems.filter((i) => i.category === 'after_cycle'),
    maintenance: enabledItems.filter((i) => i.category === 'maintenance'),
  };
}

/** @deprecated Use getChecklistForResource */
export async function getChecklistForMachine(machineId: string) {
  return getChecklistForResource(machineId);
}

export async function upsertChecklistTemplate(
  buildingId: string,
  template: ChecklistTemplate,
) {
  const parsed = checklistTemplateSchema.parse(template);
  return prisma.checklistTemplate.upsert({
    where: {
      buildingId_checklistType: {
        buildingId,
        checklistType: parsed.checklistType,
      },
    },
    create: {
      buildingId,
      checklistType: parsed.checklistType,
      items: parsed.items,
    },
    update: { items: parsed.items },
  });
}

export async function ensureDefaultChecklistTemplates(buildingId: string) {
  for (const type of ['WASHING_MACHINE', 'TUMBLE_DRYER'] as const) {
    const existing = await prisma.checklistTemplate.findUnique({
      where: { buildingId_checklistType: { buildingId, checklistType: type } },
    });
    if (!existing) {
      await upsertChecklistTemplate(buildingId, createDefaultChecklistTemplate(type));
    }
  }
}

export async function ensureDefaultBookingRules(buildingId: string) {
  const building = await prisma.building.findUnique({ where: { id: buildingId } });
  if (!building) return;

  const normalized = normalizeBookingRules(building.bookingRules);
  const raw = building.bookingRules as Record<string, unknown> | null;
  const needsMigration = !raw?.washingMachine || !raw?.tumbleDryer || !raw?.dryingRoom;

  if (needsMigration) {
    await prisma.building.update({
      where: { id: buildingId },
      data: { bookingRules: normalized },
    });
  }
}

export async function ensureDefaultHouseRules(buildingId: string) {
  const building = await prisma.building.findUnique({ where: { id: buildingId } });
  if (!building) return;

  const normalized = normalizeHouseRules(building.houseRules);
  const raw = building.houseRules as Record<string, unknown> | null;
  const needsMigration =
    !building.houseRules ||
    !raw?.washingHours ||
    !!raw?.openingHours ||
    typeof raw?.openingHours === 'string' ||
    !!raw?.officeHours ||
    (raw?.contact && typeof raw.contact === 'object' && 'caretaker' in (raw.contact as object));

  if (needsMigration) {
    await prisma.building.update({
      where: { id: buildingId },
      data: { houseRules: normalized },
    });
  }
}
