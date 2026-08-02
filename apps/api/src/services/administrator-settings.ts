import {
  administratorSettingsFromLegacyHouseRules,
  administratorSettingsPatchSchema,
  administratorSettingsSchema,
  createDefaultAdministratorSettings,
  normalizeAdministratorSettings,
  type AdministratorSettings,
  type OfficeHours,
  type WeekdayKey,
} from '@woeschplan/shared';
import { prisma } from '../db.js';

export async function getAdministratorSettings(userId: string): Promise<AdministratorSettings> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('NOT_FOUND');

  if (user.administratorSettings) {
    return normalizeAdministratorSettings(user.administratorSettings);
  }

  const migrated = await migrateAdministratorSettingsFromBuildings(userId);
  if (migrated) return migrated;

  const defaults = createDefaultAdministratorSettings();
  await prisma.user.update({
    where: { id: userId },
    data: { administratorSettings: defaults },
  });
  return defaults;
}

async function migrateAdministratorSettingsFromBuildings(
  userId: string,
): Promise<AdministratorSettings | null> {
  const adminMembership = await prisma.buildingMembership.findFirst({
    where: { userId, role: 'ADMINISTRATOR' },
    include: { building: true },
  });
  if (!adminMembership?.building.houseRules) return null;

  const legacyRules = adminMembership.building.houseRules as Record<string, unknown>;
  const legacyContact = legacyRules.contact as
    | { propertyManagement?: AdministratorSettings['companyContact'] }
    | undefined;

  const hasLegacy =
    !!legacyRules.officeHours ||
    !!(legacyContact && typeof legacyContact === 'object' && legacyContact.propertyManagement);

  if (!hasLegacy) return null;

  const settings = administratorSettingsFromLegacyHouseRules({
    officeHours: legacyRules.officeHours as OfficeHours | undefined,
    contact: legacyContact,
  });

  await prisma.user.update({
    where: { id: userId },
    data: { administratorSettings: settings },
  });
  return settings;
}

function mergeOfficeHours(current: OfficeHours, patch: Partial<OfficeHours>): OfficeHours {
  const next = { ...current };
  for (const day of Object.keys(patch) as WeekdayKey[]) {
    if (!patch[day]) continue;
    next[day] = {
      enabled: patch[day]!.enabled ?? current[day].enabled,
      periods: patch[day]!.periods ?? current[day].periods,
    };
  }
  return next;
}

export async function updateAdministratorSettings(
  userId: string,
  patch: ReturnType<typeof administratorSettingsPatchSchema.parse>,
): Promise<AdministratorSettings> {
  const current = await getAdministratorSettings(userId);

  const merged = administratorSettingsSchema.parse({
    officeHours: patch.officeHours
      ? mergeOfficeHours(current.officeHours, patch.officeHours)
      : current.officeHours,
    companyContact: patch.companyContact
      ? { ...current.companyContact, ...patch.companyContact }
      : current.companyContact,
  });

  await prisma.user.update({
    where: { id: userId },
    data: { administratorSettings: merged },
  });

  return merged;
}

export async function updatePreferredBuilding(userId: string, buildingId: string) {
  const membership = await prisma.buildingMembership.findUnique({
    where: { userId_buildingId: { userId, buildingId } },
  });
  if (!membership) throw new Error('FORBIDDEN');

  return prisma.user.update({
    where: { id: userId },
    data: { preferredBuildingId: buildingId },
    select: { preferredBuildingId: true },
  });
}
