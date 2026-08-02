import { randomUUID } from 'node:crypto';
import { formatInTimeZone } from 'date-fns-tz';
import {
  calendarRangeForView,
  generateRecurrenceDates,
} from '@woeschplan/shared';
import {
  createMaintenanceEntrySchema,
  deleteMaintenanceEntrySchema,
  formatMinutesAsTime,
  maintenanceQuerySchema,
  updateMaintenanceEntrySchema,
  type CreateMaintenanceEntryInput,
  type MaintenanceSeriesScope,
  type UpdateMaintenanceEntryInput,
} from '@woeschplan/shared';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { notifyResidentsAboutMaintenance } from './maintenance-notify.js';

function parseIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function serializeEntry(
  entry: {
    id: string;
    buildingId: string;
    seriesId: string;
    title: string;
    description: string | null;
    type: string;
    status: string;
    occurrenceDate: Date;
    endDate: Date | null;
    startTimeMinutes: number;
    endTimeMinutes: number;
    isRecurring: boolean;
    recurrenceType: string | null;
    recurrenceInterval: number | null;
    recurrenceDays: unknown;
    recurrenceEndDate: Date | null;
    notifyResidents: boolean;
    notificationSentAt: Date | null;
    location: string | null;
    affectedAreaIds: unknown;
    affectedMachineIds: unknown;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: { firstName: string; lastName: string };
  },
  timezone: string,
) {
  const localDate = formatInTimeZone(entry.occurrenceDate, timezone, 'yyyy-MM-dd');
  const localEndDate = entry.endDate
    ? formatInTimeZone(entry.endDate, timezone, 'yyyy-MM-dd')
    : localDate;

  return {
    id: entry.id,
    buildingId: entry.buildingId,
    seriesId: entry.seriesId,
    title: entry.title,
    description: entry.description,
    type: entry.type,
    status: entry.status,
    occurrenceDate: entry.occurrenceDate.toISOString(),
    endDate: entry.endDate?.toISOString() ?? null,
    localDate,
    localEndDate,
    localDateLabel: formatInTimeZone(entry.occurrenceDate, timezone, 'EEE, d MMM'),
    startTimeMinutes: entry.startTimeMinutes,
    endTimeMinutes: entry.endTimeMinutes,
    localStart: formatMinutesAsTime(entry.startTimeMinutes),
    localEnd: formatMinutesAsTime(entry.endTimeMinutes),
    isRecurring: entry.isRecurring,
    recurrenceType: entry.recurrenceType,
    recurrenceInterval: entry.recurrenceInterval,
    recurrenceDays: Array.isArray(entry.recurrenceDays) ? entry.recurrenceDays : [],
    recurrenceEndDate: entry.recurrenceEndDate?.toISOString() ?? null,
    notifyResidents: entry.notifyResidents,
    residentsNotified: !!entry.notificationSentAt,
    location: entry.location,
    affectedAreaIds: parseIdList(entry.affectedAreaIds),
    affectedMachineIds: parseIdList(entry.affectedMachineIds),
    createdBy: entry.createdBy
      ? { name: `${entry.createdBy.firstName} ${entry.createdBy.lastName}`.trim() }
      : undefined,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

function buildOccurrenceRows(
  seriesId: string,
  buildingId: string,
  userId: string,
  input: CreateMaintenanceEntryInput,
  dates: string[],
): Prisma.MaintenanceEntryCreateManyInput[] {
  const endDate = input.endDate ?? input.startDate;
  return dates.map((date) => ({
    id: randomUUID(),
    buildingId,
    seriesId,
    title: input.title,
    description: input.description ?? null,
    type: input.type,
    status: input.status ?? 'PLANNED',
    occurrenceDate: toDateOnly(date),
    endDate: toDateOnly(endDate),
    startTimeMinutes: input.startTimeMinutes,
    endTimeMinutes: input.endTimeMinutes,
    isRecurring: input.isRecurring,
    recurrenceType: input.isRecurring ? input.recurrenceType ?? null : null,
    recurrenceInterval: input.isRecurring ? input.recurrenceInterval ?? null : null,
    recurrenceDays: input.isRecurring ? input.recurrenceDays ?? [] : [],
    recurrenceEndDate: input.isRecurring && input.recurrenceEndDate ? toDateOnly(input.recurrenceEndDate) : null,
    notifyResidents: input.notifyResidents ?? false,
    location: input.location ?? null,
    affectedAreaIds: input.affectedAreaIds ?? [],
    affectedMachineIds: input.affectedMachineIds ?? [],
    createdById: userId,
  }));
}

function recurrenceDatesForInput(input: CreateMaintenanceEntryInput): string[] {
  if (!input.isRecurring) return [input.startDate];
  return generateRecurrenceDates({
    startDate: input.startDate,
    recurrenceType: input.recurrenceType!,
    recurrenceInterval: input.recurrenceInterval ?? 1,
    recurrenceDays: input.recurrenceDays,
    recurrenceEndDate: input.recurrenceEndDate,
  });
}

export async function listMaintenanceEntries(params: {
  buildingId: string;
  userId: string;
  query: ReturnType<typeof maintenanceQuerySchema.parse>;
}) {
  const building = await prisma.building.findUnique({ where: { id: params.buildingId } });
  if (!building) throw new Error('NOT_FOUND');

  const anchorDate =
    params.query.date ??
    formatInTimeZone(new Date(), building.timezone, 'yyyy-MM-dd');
  const { startDate, endDate } = calendarRangeForView(params.query.view, anchorDate);

  const where: Prisma.MaintenanceEntryWhereInput = {
    buildingId: params.buildingId,
    occurrenceDate: {
      gte: toDateOnly(startDate),
      lte: toDateOnly(endDate),
    },
  };

  if (params.query.type) where.type = params.query.type;
  if (params.query.status) where.status = params.query.status;

  const entries = await prisma.maintenanceEntry.findMany({
    where,
    include: { createdBy: { select: { firstName: true, lastName: true } } },
    orderBy: [{ occurrenceDate: 'asc' }, { startTimeMinutes: 'asc' }],
  });

  return {
    timezone: building.timezone,
    anchorDate,
    view: params.query.view,
    entries: entries.map((entry) => serializeEntry(entry, building.timezone)),
  };
}

export async function getMaintenanceEntry(params: {
  buildingId: string;
  entryId: string;
}) {
  const building = await prisma.building.findUnique({ where: { id: params.buildingId } });
  if (!building) throw new Error('NOT_FOUND');

  const entry = await prisma.maintenanceEntry.findFirst({
    where: { id: params.entryId, buildingId: params.buildingId },
    include: { createdBy: { select: { firstName: true, lastName: true } } },
  });
  if (!entry) throw new Error('NOT_FOUND');

  return serializeEntry(entry, building.timezone);
}

export async function createMaintenanceEntry(params: {
  buildingId: string;
  userId: string;
  raw: unknown;
}) {
  const input = createMaintenanceEntrySchema.parse(params.raw);
  const building = await prisma.building.findUnique({ where: { id: params.buildingId } });
  if (!building) throw new Error('NOT_FOUND');

  await validateAffectedIds(params.buildingId, input.affectedAreaIds, input.affectedMachineIds);

  const seriesId = randomUUID();
  const dates = recurrenceDatesForInput(input);
  const rows = buildOccurrenceRows(seriesId, params.buildingId, params.userId, input, dates);

  await prisma.maintenanceEntry.createMany({ data: rows });

  const first = await prisma.maintenanceEntry.findFirst({
    where: { seriesId },
    orderBy: { occurrenceDate: 'asc' },
    include: { createdBy: { select: { firstName: true, lastName: true } } },
  });
  if (!first) throw new Error('CREATE_FAILED');

  if (input.notifyResidents) {
    await notifyResidentsAboutMaintenance({
      buildingId: params.buildingId,
      entry: first,
      timezone: building.timezone,
    });
    await prisma.maintenanceEntry.updateMany({
      where: { seriesId },
      data: { notificationSentAt: new Date() },
    });
  }

  return serializeEntry(first, building.timezone);
}

async function validateAffectedIds(
  buildingId: string,
  areaIds: string[],
  machineIds: string[],
) {
  if (areaIds.length) {
    const count = await prisma.laundryRoom.count({
      where: { buildingId, id: { in: areaIds } },
    });
    if (count !== areaIds.length) throw new Error('INVALID_AREAS');
  }
  if (machineIds.length) {
    const count = await prisma.resource.count({
      where: { id: { in: machineIds }, laundryRoom: { buildingId } },
    });
    if (count !== machineIds.length) throw new Error('INVALID_MACHINES');
  }
}

function mergeUpdateInput(
  existing: {
    title: string;
    description: string | null;
    type: string;
    status: string;
    occurrenceDate: Date;
    endDate: Date | null;
    startTimeMinutes: number;
    endTimeMinutes: number;
    isRecurring: boolean;
    recurrenceType: string | null;
    recurrenceInterval: number | null;
    recurrenceDays: unknown;
    recurrenceEndDate: Date | null;
    notifyResidents: boolean;
    location: string | null;
    affectedAreaIds: unknown;
    affectedMachineIds: unknown;
  },
  patch: UpdateMaintenanceEntryInput,
): CreateMaintenanceEntryInput {
  const startDate = patch.startDate ?? formatInTimeZone(existing.occurrenceDate, 'UTC', 'yyyy-MM-dd');
  const endDate =
    patch.endDate ??
    (existing.endDate ? formatInTimeZone(existing.endDate, 'UTC', 'yyyy-MM-dd') : startDate);

  return createMaintenanceEntrySchema.parse({
    title: patch.title ?? existing.title,
    description: patch.description ?? existing.description,
    type: patch.type ?? existing.type,
    status: patch.status ?? existing.status,
    isRecurring: patch.isRecurring ?? existing.isRecurring,
    startDate,
    endDate,
    startTimeMinutes: patch.startTimeMinutes ?? existing.startTimeMinutes,
    endTimeMinutes: patch.endTimeMinutes ?? existing.endTimeMinutes,
    recurrenceType: patch.recurrenceType ?? existing.recurrenceType,
    recurrenceInterval: patch.recurrenceInterval ?? existing.recurrenceInterval ?? 1,
    recurrenceDays: patch.recurrenceDays ?? (Array.isArray(existing.recurrenceDays) ? existing.recurrenceDays : []),
    recurrenceEndDate:
      patch.recurrenceEndDate ??
      (existing.recurrenceEndDate
        ? formatInTimeZone(existing.recurrenceEndDate, 'UTC', 'yyyy-MM-dd')
        : null),
    notifyResidents: patch.notifyResidents ?? existing.notifyResidents,
    location: patch.location ?? existing.location,
    affectedAreaIds: patch.affectedAreaIds ?? parseIdList(existing.affectedAreaIds),
    affectedMachineIds: patch.affectedMachineIds ?? parseIdList(existing.affectedMachineIds),
  });
}

export async function updateMaintenanceEntry(params: {
  buildingId: string;
  userId: string;
  entryId: string;
  raw: unknown;
}) {
  const patch = updateMaintenanceEntrySchema.parse(params.raw);
  const scope: MaintenanceSeriesScope =
    patch.scope ?? (patch.isRecurring ? 'ENTIRE_SERIES' : 'THIS_OCCURRENCE');

  const existing = await prisma.maintenanceEntry.findFirst({
    where: { id: params.entryId, buildingId: params.buildingId },
  });
  if (!existing) throw new Error('NOT_FOUND');

  const building = await prisma.building.findUnique({ where: { id: params.buildingId } });
  if (!building) throw new Error('NOT_FOUND');

  const merged = mergeUpdateInput(existing, patch);
  await validateAffectedIds(params.buildingId, merged.affectedAreaIds, merged.affectedMachineIds);

  const occurrenceDate = formatInTimeZone(existing.occurrenceDate, 'UTC', 'yyyy-MM-dd');

  if (!existing.isRecurring || scope === 'THIS_OCCURRENCE') {
    const updated = await prisma.maintenanceEntry.update({
      where: { id: existing.id },
      data: {
        title: merged.title,
        description: merged.description,
        type: merged.type,
        status: merged.status,
        occurrenceDate: toDateOnly(merged.startDate),
        endDate: toDateOnly(merged.endDate ?? merged.startDate),
        startTimeMinutes: merged.startTimeMinutes,
        endTimeMinutes: merged.endTimeMinutes,
        notifyResidents: merged.notifyResidents,
        location: merged.location,
        affectedAreaIds: merged.affectedAreaIds,
        affectedMachineIds: merged.affectedMachineIds,
      },
      include: { createdBy: { select: { firstName: true, lastName: true } } },
    });

    if (merged.notifyResidents && !existing.notificationSentAt) {
      await notifyResidentsAboutMaintenance({
        buildingId: params.buildingId,
        entry: updated,
        timezone: building.timezone,
      });
      await prisma.maintenanceEntry.update({
        where: { id: updated.id },
        data: { notificationSentAt: new Date() },
      });
    }

    return serializeEntry(updated, building.timezone);
  }

  const deleteWhere: Prisma.MaintenanceEntryWhereInput = { seriesId: existing.seriesId };
  if (scope === 'THIS_AND_FUTURE') {
    deleteWhere.occurrenceDate = { gte: existing.occurrenceDate };
  }

  await prisma.maintenanceEntry.deleteMany({ where: deleteWhere });

  const dates =
    scope === 'THIS_AND_FUTURE'
      ? generateRecurrenceDates({
          startDate: occurrenceDate,
          recurrenceType: merged.recurrenceType!,
          recurrenceInterval: merged.recurrenceInterval ?? 1,
          recurrenceDays: merged.recurrenceDays,
          recurrenceEndDate: merged.recurrenceEndDate,
        })
      : recurrenceDatesForInput(merged);

  const rows = buildOccurrenceRows(
    existing.seriesId,
    params.buildingId,
    params.userId,
    merged,
    dates,
  );
  await prisma.maintenanceEntry.createMany({ data: rows });

  const first = await prisma.maintenanceEntry.findFirst({
    where: { seriesId: existing.seriesId },
    orderBy: { occurrenceDate: 'asc' },
    include: { createdBy: { select: { firstName: true, lastName: true } } },
  });
  if (!first) throw new Error('UPDATE_FAILED');

  return serializeEntry(first, building.timezone);
}

export async function deleteMaintenanceEntry(params: {
  buildingId: string;
  entryId: string;
  raw: unknown;
}) {
  const body = deleteMaintenanceEntrySchema.parse(params.raw ?? {});
  const scope: MaintenanceSeriesScope =
    body.scope ?? 'THIS_OCCURRENCE';

  const existing = await prisma.maintenanceEntry.findFirst({
    where: { id: params.entryId, buildingId: params.buildingId },
  });
  if (!existing) throw new Error('NOT_FOUND');

  if (!existing.isRecurring || scope === 'THIS_OCCURRENCE') {
    await prisma.maintenanceEntry.delete({ where: { id: existing.id } });
    return { ok: true };
  }

  const where: Prisma.MaintenanceEntryWhereInput = { seriesId: existing.seriesId };
  if (scope === 'THIS_AND_FUTURE') {
    where.occurrenceDate = { gte: existing.occurrenceDate };
  }

  await prisma.maintenanceEntry.deleteMany({ where });
  return { ok: true };
}

export { maintenanceQuerySchema };
