import { formatInTimeZone } from 'date-fns-tz';
import {
  formatMinutesAsTime,
  MAINTENANCE_TYPE_I18N_KEYS,
  type MaintenanceType,
} from '@woeschplan/shared';
import { prisma } from '../db.js';

type MaintenanceEntryLike = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  occurrenceDate: Date;
  startTimeMinutes: number;
  location: string | null;
  notifyResidents: boolean;
  notificationSentAt: Date | null;
};

export async function notifyResidentsAboutMaintenance(params: {
  buildingId: string;
  entry: MaintenanceEntryLike;
  timezone: string;
}) {
  if (!params.entry.notifyResidents || params.entry.notificationSentAt) return false;

  const residents = await prisma.buildingMembership.findMany({
    where: { buildingId: params.buildingId, role: 'RESIDENT' },
    select: { userId: true },
  });
  if (residents.length === 0) return false;

  const localDate = formatInTimeZone(params.entry.occurrenceDate, params.timezone, 'dd.MM.yyyy');
  const localTime = formatMinutesAsTime(params.entry.startTimeMinutes);
  const typeLabelKey = MAINTENANCE_TYPE_I18N_KEYS[params.entry.type as MaintenanceType];
  const parts = [
    localDate,
    localTime,
    params.entry.location ? params.entry.location : null,
    params.entry.description ? truncate(params.entry.description, 120) : null,
  ].filter(Boolean);

  const body = parts.join(' · ');

  await prisma.notification.createMany({
    data: residents.map((resident) => ({
      userId: resident.userId,
      type: 'MAINTENANCE_ENTRY',
      title: params.entry.title,
      body,
      data: {
        maintenanceEntryId: params.entry.id,
        buildingId: params.buildingId,
        maintenanceType: params.entry.type,
        typeLabelKey,
        localDate,
        localTime,
      },
    })),
  });

  return true;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

export async function dispatchDueMaintenanceReminders() {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const pending = await prisma.maintenanceEntry.findMany({
    where: {
      notifyResidents: true,
      notificationSentAt: null,
      status: { in: ['PLANNED', 'IN_PROGRESS'] },
      occurrenceDate: { lte: in24h },
    },
    include: { building: { select: { timezone: true } } },
    take: 50,
  });

  for (const entry of pending) {
    await notifyResidentsAboutMaintenance({
      buildingId: entry.buildingId,
      entry,
      timezone: entry.building.timezone,
    });
    await prisma.maintenanceEntry.update({
      where: { id: entry.id },
      data: { notificationSentAt: now },
    });
  }
}
