import {
  createDefaultAdministratorSettings,
  createDefaultBookingRules,
  createDefaultChecklistTemplate,
  createDefaultHouseRules,
} from '@woeschplan/shared';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth.js';
import { createBuildingRegistration } from '../src/services/registration.js';

const prisma = new PrismaClient();

async function main() {
  const bookingRules = createDefaultBookingRules();
  const houseRules = createDefaultHouseRules();

  const building = await prisma.building.upsert({
    where: { id: 'seed-building-1' },
    update: {
      houseRules,
      bookingRules,
    },
    create: {
      id: 'seed-building-1',
      name: 'Limmatquai 12',
      address: 'Limmatquai 12, 8001 Zürich',
      timezone: 'Europe/Zurich',
      language: 'de',
      bookingRules,
      houseRules,
    },
  });

  for (const type of ['WASHING_MACHINE', 'TUMBLE_DRYER'] as const) {
    const template = createDefaultChecklistTemplate(type);
    await prisma.checklistTemplate.upsert({
      where: {
        buildingId_checklistType: { buildingId: building.id, checklistType: type },
      },
      update: { items: template.items },
      create: {
        buildingId: building.id,
        checklistType: type,
        items: template.items,
      },
    });
  }

  const adminPassword = await hashPassword('admin12345');
  const residentPassword = await hashPassword('resident12345');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@woeschplan.local' },
    update: {
      administratorSettings: createDefaultAdministratorSettings(),
      preferredBuildingId: building.id,
      platformRole: 'PROPERTY_ADMIN',
      emailVerifiedAt: new Date(),
      status: 'ACTIVE',
    },
    create: {
      email: 'admin@woeschplan.local',
      passwordHash: adminPassword,
      firstName: 'Anna',
      lastName: 'Verwaltung',
      apartmentNumber: '0.1',
      preferredBuildingId: building.id,
      administratorSettings: createDefaultAdministratorSettings(),
      platformRole: 'PROPERTY_ADMIN',
      emailVerifiedAt: new Date(),
      status: 'ACTIVE',
      notificationPrefs: { create: {} },
    },
  });

  const organisation = await prisma.organisation.upsert({
    where: { ownerId: admin.id },
    update: {
      name: 'Limmatquai Verwaltung AG',
      email: admin.email,
      status: 'ACTIVE',
      onboardingStatus: 'COMPLETED',
    },
    create: {
      name: 'Limmatquai Verwaltung AG',
      email: admin.email,
      phone: '+41 44 555 55 55',
      website: 'https://limmatquai12.ch',
      status: 'ACTIVE',
      onboardingStatus: 'COMPLETED',
      ownerId: admin.id,
    },
  });

  await prisma.user.update({
    where: { id: admin.id },
    data: { organisationId: organisation.id },
  });

  await prisma.organisationMembership.upsert({
    where: { organisationId_userId: { organisationId: organisation.id, userId: admin.id } },
    update: { role: 'OWNER', status: 'ACTIVE' },
    create: {
      organisationId: organisation.id,
      userId: admin.id,
      role: 'OWNER',
      status: 'ACTIVE',
      joinedAt: new Date(),
    },
  });

  await prisma.building.update({
    where: { id: building.id },
    data: {
      organisationId: organisation.id,
      street: 'Limmatquai 12',
      postalCode: '8001',
      city: 'Zürich',
      country: 'CH',
    },
  });

  const resident = await prisma.user.upsert({
    where: { email: 'resident@woeschplan.local' },
    update: {},
    create: {
      email: 'resident@woeschplan.local',
      passwordHash: residentPassword,
      firstName: 'Marco',
      lastName: 'Meier',
      apartmentNumber: '4B',
      notificationPrefs: { create: {} },
    },
  });

  await prisma.buildingMembership.upsert({
    where: { userId_buildingId: { userId: admin.id, buildingId: building.id } },
    update: { role: 'ADMINISTRATOR' },
    create: { userId: admin.id, buildingId: building.id, role: 'ADMINISTRATOR' },
  });

  const building2 = await prisma.building.upsert({
    where: { id: 'seed-building-2' },
    update: {
      houseRules,
      bookingRules,
      organisationId: organisation.id,
      street: 'Bahnhofstrasse 45',
      postalCode: '8001',
      city: 'Zürich',
      country: 'CH',
    },
    create: {
      id: 'seed-building-2',
      name: 'Bahnhofstrasse 45',
      address: 'Bahnhofstrasse 45, 8001 Zürich',
      organisationId: organisation.id,
      street: 'Bahnhofstrasse 45',
      postalCode: '8001',
      city: 'Zürich',
      country: 'CH',
      timezone: 'Europe/Zurich',
      language: 'de',
      bookingRules,
      houseRules,
    },
  });

  await prisma.buildingMembership.upsert({
    where: { userId_buildingId: { userId: admin.id, buildingId: building2.id } },
    update: { role: 'ADMINISTRATOR' },
    create: { userId: admin.id, buildingId: building2.id, role: 'ADMINISTRATOR' },
  });

  for (const bId of [building2.id]) {
    for (const type of ['WASHING_MACHINE', 'TUMBLE_DRYER'] as const) {
      const template = createDefaultChecklistTemplate(type);
      await prisma.checklistTemplate.upsert({
        where: { buildingId_checklistType: { buildingId: bId, checklistType: type } },
        update: { items: template.items },
        create: { buildingId: bId, checklistType: type, items: template.items },
      });
    }
  }

  const room2 = await prisma.laundryRoom.upsert({
    where: { id: 'seed-room-2' },
    update: {},
    create: {
      id: 'seed-room-2',
      buildingId: building2.id,
      name: 'Waschküche 1. OG',
      floor: '1. OG',
    },
  });

  await prisma.resource.upsert({
    where: { id: 'seed-washer-2' },
    update: {},
    create: {
      id: 'seed-washer-2',
      laundryRoomId: room2.id,
      name: 'Waschmaschine 1',
      resourceType: 'WASHING_MACHINE',
      estimatedDefaultRuntime: 90,
    },
  });

  await prisma.buildingMembership.upsert({
    where: { userId_buildingId: { userId: resident.id, buildingId: building.id } },
    update: {},
    create: { userId: resident.id, buildingId: building.id, role: 'RESIDENT' },
  });

  const room = await prisma.laundryRoom.upsert({
    where: { id: 'seed-room-1' },
    update: {},
    create: {
      id: 'seed-room-1',
      buildingId: building.id,
      name: 'Waschküche UG',
      floor: 'UG',
      instructions: 'Bitte Schuhe ausziehen. Fenster nach Gebrauch öffnen.',
    },
  });

  await prisma.resource.upsert({
    where: { id: 'seed-washer-1' },
    update: {},
    create: {
      id: 'seed-washer-1',
      laundryRoomId: room.id,
      name: 'Waschmaschine 1',
      resourceType: 'WASHING_MACHINE',
      model: 'Miele PW 6065',
      estimatedDefaultRuntime: 90,
    },
  });

  await prisma.resource.upsert({
    where: { id: 'seed-dryer-1' },
    update: {},
    create: {
      id: 'seed-dryer-1',
      laundryRoomId: room.id,
      name: 'Tumbler 1',
      resourceType: 'TUMBLE_DRYER',
      model: 'Miele PT 7186',
      estimatedDefaultRuntime: 60,
    },
  });

  await prisma.resource.upsert({
    where: { id: 'seed-drying-room-1' },
    update: {},
    create: {
      id: 'seed-drying-room-1',
      laundryRoomId: room.id,
      name: 'Trocknungsraum',
      resourceType: 'DRYING_ROOM',
      estimatedDefaultRuntime: 120,
    },
  });

  for (const b of [building, building2]) {
    const { plainToken, urls } = await createBuildingRegistration(b.id, admin.id);
    console.log(`Registration for ${b.name}:`);
    console.log(`  App link: ${urls.appDeepLink}`);
    console.log(`  Web link: ${urls.shareUrl}`);
    console.log(`  Token (demo): ${plainToken}`);
  }

  console.log('Seed complete');
  console.log('Admin: admin@woeschplan.local / admin12345');
  console.log('Resident: resident@woeschplan.local / resident12345');
}

main()
  .catch(console.error)
  .finally(async () => prisma.$disconnect());
