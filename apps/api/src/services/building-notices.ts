import { formatInTimeZone } from 'date-fns-tz';
import {
  createBuildingNoticeSchema,
  defaultIconForCategory,
  isNoticeActive,
  isNoticeExpired,
  isNoticeUpcoming,
  noticeSortPriority,
  updateBuildingNoticeSchema,
  type CreateBuildingNoticeInput,
  type NoticeAttachment,
  type UpdateBuildingNoticeInput,
} from '@woeschplan/shared';
import { prisma } from '../db.js';
import { maybeSendNoticePush, parseStoredAttachments, dispatchPendingNoticePushesForBuilding } from './notice-push.js';

function serializeNotice(
  notice: {
    id: string;
    buildingId: string;
    title: string;
    body: string;
    category: string;
    severity: string;
    icon: string;
    attachmentUrl: string | null;
    attachments: unknown;
    startTime: Date;
    endTime: Date;
    affectsLaundry: boolean;
    showOnLogin: boolean;
    sendPushNotification: boolean;
    archivedAt: Date | null;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: { firstName: string; lastName: string };
    acknowledgments?: Array<{ userId: string }>;
  },
  timezone: string,
  userId?: string,
) {
  const now = new Date();
  const acknowledged =
    userId != null
      ? (notice.acknowledgments?.some((a) => a.userId === userId) ?? false)
      : undefined;

  const attachments = parseStoredAttachments(notice.attachments, notice.attachmentUrl);
  const primaryLink = attachments.find((a) => a.kind === 'link')?.url ?? notice.attachmentUrl;

  return {
    id: notice.id,
    buildingId: notice.buildingId,
    title: notice.title,
    body: notice.body,
    category: notice.category,
    severity: notice.severity,
    icon: notice.icon,
    attachmentUrl: primaryLink,
    attachments,
    startTime: notice.startTime.toISOString(),
    endTime: notice.endTime.toISOString(),
    localStart: formatInTimeZone(notice.startTime, timezone, 'HH:mm'),
    localEnd: formatInTimeZone(notice.endTime, timezone, 'HH:mm'),
    localDate: formatInTimeZone(notice.startTime, timezone, 'yyyy-MM-dd'),
    localEndDate: formatInTimeZone(notice.endTime, timezone, 'yyyy-MM-dd'),
    localDateLabel: formatInTimeZone(notice.startTime, timezone, 'EEE, d MMM'),
    affectsLaundry: notice.affectsLaundry,
    showOnLogin: notice.showOnLogin,
    sendPushNotification: notice.sendPushNotification,
    archivedAt: notice.archivedAt?.toISOString() ?? null,
    isActive: isNoticeActive(notice, now),
    isUpcoming: isNoticeUpcoming(notice, now),
    isExpired: isNoticeExpired(notice, now),
    acknowledged,
    createdBy: notice.createdBy
      ? { name: `${notice.createdBy.firstName} ${notice.createdBy.lastName}`.trim() }
      : undefined,
    createdAt: notice.createdAt.toISOString(),
    updatedAt: notice.updatedAt.toISOString(),
  };
}

function legacyAttachmentUrl(attachments: NoticeAttachment[]): string | null {
  return attachments.find((a) => a.kind === 'link')?.url ?? attachments[0]?.url ?? null;
}

export async function listBuildingNotices(params: {
  buildingId: string;
  userId: string;
  includeArchived?: boolean;
}) {
  const building = await prisma.building.findUnique({ where: { id: params.buildingId } });
  if (!building) throw new Error('NOT_FOUND');

  await dispatchPendingNoticePushesForBuilding(params.buildingId);

  const notices = await prisma.buildingNotice.findMany({
    where: {
      buildingId: params.buildingId,
      ...(params.includeArchived ? {} : { archivedAt: null }),
    },
    include: {
      createdBy: { select: { firstName: true, lastName: true } },
      acknowledgments: { where: { userId: params.userId }, select: { userId: true } },
    },
    orderBy: [{ archivedAt: 'asc' }, { startTime: 'desc' }],
  });

  const serialized = notices
    .map((n) => serializeNotice(n, building.timezone, params.userId))
    .sort((a, b) => noticeSortPriority(b) - noticeSortPriority(a));

  return { notices: serialized, timezone: building.timezone };
}

export async function getActiveNoticesForSchedule(params: {
  buildingId: string;
  userId: string;
  rangeStart: Date;
  rangeEnd: Date;
}) {
  const building = await prisma.building.findUnique({ where: { id: params.buildingId } });
  if (!building) throw new Error('NOT_FOUND');

  const notices = await prisma.buildingNotice.findMany({
    where: {
      buildingId: params.buildingId,
      archivedAt: null,
      startTime: { lt: params.rangeEnd },
      endTime: { gt: params.rangeStart },
    },
    include: {
      acknowledgments: { where: { userId: params.userId }, select: { userId: true } },
    },
    orderBy: { startTime: 'asc' },
  });

  return notices.map((n) => serializeNotice(n, building.timezone, params.userId));
}

export async function getLoginPopupNotices(params: { buildingId: string; userId: string }) {
  const building = await prisma.building.findUnique({ where: { id: params.buildingId } });
  if (!building) throw new Error('NOT_FOUND');

  await dispatchPendingNoticePushesForBuilding(params.buildingId);

  const now = new Date();
  const notices = await prisma.buildingNotice.findMany({
    where: {
      buildingId: params.buildingId,
      archivedAt: null,
      showOnLogin: true,
      startTime: { lte: now },
      endTime: { gte: now },
      acknowledgments: { none: { userId: params.userId } },
    },
    include: {
      acknowledgments: { where: { userId: params.userId }, select: { userId: true } },
    },
    orderBy: { severity: 'desc' },
  });

  return notices
    .map((n) => serializeNotice(n, building.timezone, params.userId))
    .sort((a, b) => noticeSortPriority(b) - noticeSortPriority(a));
}

export async function createBuildingNotice(params: {
  buildingId: string;
  userId: string;
  input: CreateBuildingNoticeInput;
}) {
  const building = await prisma.building.findUnique({ where: { id: params.buildingId } });
  if (!building) throw new Error('NOT_FOUND');

  const data = createBuildingNoticeSchema.parse(params.input);
  const attachments = data.attachments ?? [];

  const notice = await prisma.buildingNotice.create({
    data: {
      buildingId: params.buildingId,
      title: data.title,
      body: data.body,
      category: data.category,
      severity: data.severity,
      icon: data.icon ?? defaultIconForCategory(data.category),
      attachmentUrl: data.attachmentUrl ?? legacyAttachmentUrl(attachments),
      attachments,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      affectsLaundry: data.affectsLaundry,
      showOnLogin: data.showOnLogin,
      sendPushNotification: data.sendPushNotification,
      createdById: params.userId,
    },
    include: {
      createdBy: { select: { firstName: true, lastName: true } },
      acknowledgments: { where: { userId: params.userId }, select: { userId: true } },
    },
  });

  await maybeSendNoticePush({
    buildingId: params.buildingId,
    noticeId: notice.id,
    title: notice.title,
    body: notice.body,
    startTime: notice.startTime,
    endTime: notice.endTime,
    archivedAt: notice.archivedAt,
    sendPushNotification: notice.sendPushNotification,
    pushNotificationSentAt: notice.pushNotificationSentAt,
  });

  return serializeNotice(notice, building.timezone, params.userId);
}

export async function updateBuildingNotice(params: {
  buildingId: string;
  noticeId: string;
  userId: string;
  input: UpdateBuildingNoticeInput;
}) {
  const building = await prisma.building.findUnique({ where: { id: params.buildingId } });
  if (!building) throw new Error('NOT_FOUND');

  const existing = await prisma.buildingNotice.findFirst({
    where: { id: params.noticeId, buildingId: params.buildingId },
  });
  if (!existing) throw new Error('NOT_FOUND');

  const data = updateBuildingNoticeSchema.parse(params.input);
  const startTime = data.startTime ? new Date(data.startTime) : existing.startTime;
  const endTime = data.endTime ? new Date(data.endTime) : existing.endTime;
  if (endTime <= startTime) throw new Error('END_BEFORE_START');

  const category = data.category ?? existing.category;

  const notice = await prisma.buildingNotice.update({
    where: { id: params.noticeId },
    data: {
      ...(data.title != null ? { title: data.title } : {}),
      ...(data.body != null ? { body: data.body } : {}),
      ...(data.category != null ? { category: data.category } : {}),
      ...(data.severity != null ? { severity: data.severity } : {}),
      ...(data.icon != null ? { icon: data.icon } : {}),
      ...(data.attachments != null
        ? {
            attachments: data.attachments,
            attachmentUrl: legacyAttachmentUrl(data.attachments),
          }
        : data.attachmentUrl !== undefined
          ? { attachmentUrl: data.attachmentUrl }
          : {}),
      ...(data.startTime != null ? { startTime: new Date(data.startTime) } : {}),
      ...(data.endTime != null ? { endTime: new Date(data.endTime) } : {}),
      ...(data.affectsLaundry != null ? { affectsLaundry: data.affectsLaundry } : {}),
      ...(data.showOnLogin != null ? { showOnLogin: data.showOnLogin } : {}),
      ...(data.sendPushNotification != null ? { sendPushNotification: data.sendPushNotification } : {}),
      ...(data.category != null && data.icon == null && data.category !== existing.category
        ? { icon: defaultIconForCategory(category) }
        : {}),
    },
    include: {
      createdBy: { select: { firstName: true, lastName: true } },
      acknowledgments: { where: { userId: params.userId }, select: { userId: true } },
    },
  });

  await maybeSendNoticePush({
    buildingId: params.buildingId,
    noticeId: notice.id,
    title: notice.title,
    body: notice.body,
    startTime: notice.startTime,
    endTime: notice.endTime,
    archivedAt: notice.archivedAt,
    sendPushNotification: notice.sendPushNotification,
    pushNotificationSentAt: notice.pushNotificationSentAt,
  });

  return serializeNotice(notice, building.timezone, params.userId);
}

export async function archiveBuildingNotice(params: {
  buildingId: string;
  noticeId: string;
  userId: string;
}) {
  const building = await prisma.building.findUnique({ where: { id: params.buildingId } });
  if (!building) throw new Error('NOT_FOUND');

  const existing = await prisma.buildingNotice.findFirst({
    where: { id: params.noticeId, buildingId: params.buildingId },
  });
  if (!existing) throw new Error('NOT_FOUND');

  const notice = await prisma.buildingNotice.update({
    where: { id: params.noticeId },
    data: { archivedAt: new Date() },
    include: {
      createdBy: { select: { firstName: true, lastName: true } },
      acknowledgments: { where: { userId: params.userId }, select: { userId: true } },
    },
  });

  return serializeNotice(notice, building.timezone, params.userId);
}

export async function acknowledgeBuildingNotice(params: {
  buildingId: string;
  noticeId: string;
  userId: string;
}) {
  const notice = await prisma.buildingNotice.findFirst({
    where: { id: params.noticeId, buildingId: params.buildingId, archivedAt: null },
  });
  if (!notice) throw new Error('NOT_FOUND');

  await prisma.buildingNoticeAcknowledgment.upsert({
    where: { noticeId_userId: { noticeId: params.noticeId, userId: params.userId } },
    create: { noticeId: params.noticeId, userId: params.userId },
    update: { acknowledgedAt: new Date() },
  });

  return { ok: true };
}

export async function acknowledgeBuildingNotices(params: {
  buildingId: string;
  userId: string;
  noticeIds: string[];
}) {
  if (params.noticeIds.length === 0) return { ok: true };

  const valid = await prisma.buildingNotice.findMany({
    where: {
      id: { in: params.noticeIds },
      buildingId: params.buildingId,
      archivedAt: null,
    },
    select: { id: true },
  });

  await prisma.$transaction(
    valid.map((n) =>
      prisma.buildingNoticeAcknowledgment.upsert({
        where: { noticeId_userId: { noticeId: n.id, userId: params.userId } },
        create: { noticeId: n.id, userId: params.userId },
        update: { acknowledgedAt: new Date() },
      }),
    ),
  );

  return { ok: true };
}
