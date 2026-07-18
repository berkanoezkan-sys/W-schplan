import { bookingRulesSchema } from '@woeschplan/shared';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth.js';

const prisma = new PrismaClient();

async function main() {
  const bookingRules = bookingRulesSchema.parse({});

  const building = await prisma.building.upsert({
    where: { id: 'seed-building-1' },
    update: {},
    create: {
      id: 'seed-building-1',
      name: 'Limmatquai 12',
      address: 'Limmatquai 12, 8001 Zürich',
      timezone: 'Europe/Zurich',
      language: 'de',
      bookingRules,
      houseRules: {
        openingHours: '06:00 – 22:00',
        quietHours: '22:00 – 06:00',
        maxBookingDuration: '3 hours',
        cleaningRules: 'Please complete the checklist after every cycle.',
        contact: 'Hauswart: hauswart@limmatquai12.ch',
        emergency: 'Bei Wasserschaden sofort Verwaltung anrufen.',
      },
    },
  });

  const adminPassword = await hashPassword('admin12345');
  const residentPassword = await hashPassword('resident12345');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@woeschplan.local' },
    update: {},
    create: {
      email: 'admin@woeschplan.local',
      passwordHash: adminPassword,
      firstName: 'Anna',
      lastName: 'Verwaltung',
      apartmentNumber: '0.1',
      notificationPrefs: { create: {} },
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

  await prisma.machine.upsert({
    where: { id: 'seed-washer-1' },
    update: {},
    create: {
      id: 'seed-washer-1',
      laundryRoomId: room.id,
      name: 'Waschmaschine 1',
      machineType: 'WASHING_MACHINE',
      model: 'Miele PW 6065',
      estimatedDefaultRuntime: 90,
    },
  });

  await prisma.machine.upsert({
    where: { id: 'seed-dryer-1' },
    update: {},
    create: {
      id: 'seed-dryer-1',
      laundryRoomId: room.id,
      name: 'Tumbler 1',
      machineType: 'TUMBLE_DRYER',
      model: 'Miele PT 7186',
      estimatedDefaultRuntime: 60,
    },
  });

  console.log('Seed complete');
  console.log('Admin: admin@woeschplan.local / admin12345');
  console.log('Resident: resident@woeschplan.local / resident12345');
}

main()
  .catch(console.error)
  .finally(async () => prisma.$disconnect());
