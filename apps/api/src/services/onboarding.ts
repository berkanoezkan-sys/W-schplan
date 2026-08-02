import type {
  OnboardingBuildingInput,
  OnboardingCompanyProfileInput,
  OnboardingLaundryRoomInput,
} from '@woeschplan/shared';
import {
  createDefaultBookingRules,
  createDefaultHouseRules,
  formatBuildingAddress,
  normalizeAdministratorSettings,
} from '@woeschplan/shared';
import { prisma } from '../db.js';
import { assertBuildingBelongsToOrganisation } from '../middleware/organisation.js';
import { ensureDefaultChecklistTemplates } from './building-settings.js';
import { createBuildingRegistration } from './registration.js';

async function getPropertyAdminOrganisation(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { organisation: true },
  });

  if (!user?.organisationId || !user.organisation) {
    throw new Error('FORBIDDEN');
  }

  if (user.platformRole !== 'PROPERTY_ADMIN') {
    throw new Error('FORBIDDEN');
  }

  if (!user.emailVerifiedAt) {
    throw new Error('EMAIL_NOT_VERIFIED');
  }

  return { user, organisation: user.organisation };
}

export async function getOnboardingState(userId: string) {
  const { user, organisation } = await getPropertyAdminOrganisation(userId);

  const buildings = await prisma.building.findMany({
    where: { organisationId: organisation.id },
    include: {
      laundryRooms: {
        include: { resources: true },
      },
      registration: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const firstBuilding = buildings[0] ?? null;
  const firstRoom = firstBuilding?.laundryRooms[0] ?? null;

  return {
    onboardingStatus: organisation.onboardingStatus,
    onboardingData: organisation.onboardingData,
    organisation: {
      id: organisation.id,
      name: organisation.name,
      email: organisation.email,
      phone: organisation.phone,
      website: organisation.website,
    },
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      administratorSettings: normalizeAdministratorSettings(user.administratorSettings),
    },
    building: firstBuilding
      ? {
          id: firstBuilding.id,
          name: firstBuilding.name,
          street: firstBuilding.street,
          postalCode: firstBuilding.postalCode,
          city: firstBuilding.city,
          country: firstBuilding.country,
          timezone: firstBuilding.timezone,
          language: firstBuilding.language,
        }
      : null,
    laundryRoom: firstRoom
      ? {
          id: firstRoom.id,
          name: firstRoom.name,
          floor: firstRoom.floor,
          resourceCount: firstRoom.resources.length,
        }
      : null,
    registrationConfigured: !!firstBuilding?.registration,
  };
}

export async function saveOnboardingCompanyProfile(
  userId: string,
  input: OnboardingCompanyProfileInput,
) {
  const { user, organisation } = await getPropertyAdminOrganisation(userId);
  const currentSettings = normalizeAdministratorSettings(user.administratorSettings);

  const administratorSettings = {
    ...currentSettings,
    companyContact: {
      companyName: input.companyName,
      contactPerson: input.contactPerson,
      phone: input.phone,
      email: input.email,
      website: input.website,
    },
    officeHours: input.officeHours ?? currentSettings.officeHours,
  };

  await prisma.$transaction(async (tx) => {
    await tx.organisation.update({
      where: { id: organisation.id },
      data: {
        name: input.companyName,
        email: input.email,
        phone: input.phone,
        website: input.website,
        onboardingStatus: 'FIRST_BUILDING',
        onboardingData: {
          ...(typeof organisation.onboardingData === 'object' && organisation.onboardingData
            ? organisation.onboardingData
            : {}),
          companyProfile: input,
        },
      },
    });

    await tx.user.update({
      where: { id: user.id },
      data: {
        phone: input.phone,
        administratorSettings,
      },
    });
  });

  return getOnboardingState(userId);
}

export async function saveOnboardingBuilding(userId: string, input: OnboardingBuildingInput) {
  const { user, organisation } = await getPropertyAdminOrganisation(userId);
  const address = formatBuildingAddress(input);

  const existing = await prisma.building.findFirst({
    where: { organisationId: organisation.id },
    orderBy: { createdAt: 'asc' },
  });

  const building = await prisma.$transaction(async (tx) => {
    let saved;
    if (existing) {
      saved = await tx.building.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          address,
          street: input.street,
          postalCode: input.postalCode,
          city: input.city,
          country: input.country,
          timezone: input.timezone,
          language: input.language,
        },
      });
    } else {
      saved = await tx.building.create({
        data: {
          organisationId: organisation.id,
          name: input.name,
          address,
          street: input.street,
          postalCode: input.postalCode,
          city: input.city,
          country: input.country,
          timezone: input.timezone,
          language: input.language,
          bookingRules: createDefaultBookingRules(),
          houseRules: createDefaultHouseRules(),
        },
      });

      await tx.buildingMembership.create({
        data: {
          userId: user.id,
          buildingId: saved.id,
          role: 'ADMINISTRATOR',
        },
      });
    }

    await tx.organisation.update({
      where: { id: organisation.id },
      data: {
        onboardingStatus: 'LAUNDRY_SETUP',
        onboardingData: {
          ...(typeof organisation.onboardingData === 'object' && organisation.onboardingData
            ? organisation.onboardingData
            : {}),
          building: input,
        },
      },
    });

    return saved;
  });

  await ensureDefaultChecklistTemplates(building.id);
  return getOnboardingState(userId);
}

export async function saveOnboardingLaundryRoom(
  userId: string,
  input: OnboardingLaundryRoomInput,
) {
  const { user, organisation } = await getPropertyAdminOrganisation(userId);
  const building = await prisma.building.findFirst({
    where: { organisationId: organisation.id },
    orderBy: { createdAt: 'asc' },
  });

  if (!building) throw new Error('BUILDING_REQUIRED');
  await assertBuildingBelongsToOrganisation(building.id, organisation.id);

  await prisma.$transaction(async (tx) => {
    const existingRoom = await tx.laundryRoom.findFirst({
      where: { buildingId: building.id },
      include: { resources: true },
      orderBy: { createdAt: 'asc' },
    });

    let roomId = existingRoom?.id;
    if (!existingRoom) {
      const room = await tx.laundryRoom.create({
        data: {
          buildingId: building.id,
          name: input.name,
          floor: input.floor,
        },
      });
      roomId = room.id;
    } else {
      await tx.laundryRoom.update({
        where: { id: existingRoom.id },
        data: {
          name: input.name,
          floor: input.floor,
        },
      });
    }

    if (!roomId) throw new Error('ROOM_CREATE_FAILED');

    const existingCounts = {
      WASHING_MACHINE: existingRoom?.resources.filter((r) => r.resourceType === 'WASHING_MACHINE')
        .length ?? 0,
      TUMBLE_DRYER:
        existingRoom?.resources.filter((r) => r.resourceType === 'TUMBLE_DRYER').length ?? 0,
      DRYING_ROOM:
        existingRoom?.resources.filter((r) => r.resourceType === 'DRYING_ROOM').length ?? 0,
    };

    const createResources = async (
      type: 'WASHING_MACHINE' | 'TUMBLE_DRYER' | 'DRYING_ROOM',
      targetCount: number,
      labelPrefix: string,
    ) => {
      const current = existingCounts[type];
      for (let i = current + 1; i <= targetCount; i += 1) {
        await tx.resource.create({
          data: {
            laundryRoomId: roomId,
            name: `${labelPrefix} ${i}`,
            resourceType: type,
          },
        });
      }
    };

    await createResources('WASHING_MACHINE', input.washingMachines, 'Waschmaschine');
    await createResources('TUMBLE_DRYER', input.tumbleDryers, 'Tumbler');
    await createResources('DRYING_ROOM', input.dryingRooms, 'Trocknungsraum');

    await tx.organisation.update({
      where: { id: organisation.id },
      data: {
        onboardingStatus: 'RESIDENT_INVITATION',
        onboardingData: {
          ...(typeof organisation.onboardingData === 'object' && organisation.onboardingData
            ? organisation.onboardingData
            : {}),
          laundryRoom: input,
        },
      },
    });
  });

  return getOnboardingState(userId);
}

export async function completeOnboardingInvitation(userId: string) {
  const { organisation } = await getPropertyAdminOrganisation(userId);
  const building = await prisma.building.findFirst({
    where: { organisationId: organisation.id },
    orderBy: { createdAt: 'asc' },
  });

  if (!building) throw new Error('BUILDING_REQUIRED');
  await assertBuildingBelongsToOrganisation(building.id, organisation.id);

  let registration = await prisma.buildingRegistration.findUnique({
    where: { buildingId: building.id },
  });

  let plainToken: string | undefined;
  if (!registration) {
    const created = await createBuildingRegistration(building.id, userId);
    registration = created.registration;
    plainToken = created.plainToken;
  }

  await prisma.organisation.update({
    where: { id: organisation.id },
    data: { onboardingStatus: 'COMPLETED' },
  });

  const state = await getOnboardingState(userId);
  return {
    ...state,
    registrationToken: plainToken,
  };
}

export async function generateOnboardingRegistrationToken(userId: string) {
  const { organisation } = await getPropertyAdminOrganisation(userId);
  const building = await prisma.building.findFirst({
    where: { organisationId: organisation.id },
    orderBy: { createdAt: 'asc' },
  });

  if (!building) throw new Error('BUILDING_REQUIRED');
  await assertBuildingBelongsToOrganisation(building.id, organisation.id);

  const { plainToken, urls } = await createBuildingRegistration(building.id, userId);
  return {
    buildingId: building.id,
    token: plainToken,
    shareUrl: urls.shareUrl,
    appDeepLink: urls.appDeepLink,
  };
}
