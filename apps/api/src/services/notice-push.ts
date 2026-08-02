import { prisma } from '../db.js';
import { isNoticeActive, noticeAttachmentSchema, type NoticeAttachment } from '@woeschplan/shared';

export function parseStoredAttachments(
  attachments: unknown,
  legacyUrl: string | null,
): NoticeAttachment[] {
  const parsed: NoticeAttachment[] = [];
  if (Array.isArray(attachments)) {
    for (const item of attachments) {
      const result = noticeAttachmentSchema.safeParse(item);
      if (result.success) parsed.push(result.data);
    }
  }
  if (legacyUrl && !parsed.some((a) => a.url === legacyUrl)) {
    parsed.push({ id: 'legacy-link', kind: 'link', name: 'Link', url: legacyUrl });
  }
  return parsed;
}

export async function dispatchNoticePushNotifications(params: {
  buildingId: string;
  noticeId: string;
  title: string;
  body: string;
  startTime: Date;
  endTime: Date;
  archivedAt: Date | null;
}) {
  const now = new Date();
  const isVisible = isNoticeActive(
    {
      startTime: params.startTime,
      endTime: params.endTime,
      archivedAt: params.archivedAt,
    },
    now,
  );
  if (!isVisible) return false;

  const residents = await prisma.buildingMembership.findMany({
    where: { buildingId: params.buildingId, role: 'RESIDENT' },
    select: { userId: true },
  });

  if (residents.length === 0) return false;

  await prisma.notification.createMany({
    data: residents.map((r) => ({
      userId: r.userId,
      type: 'BUILDING_NOTICE',
      title: params.title,
      body: params.body.length > 240 ? `${params.body.slice(0, 237)}…` : params.body,
      data: { noticeId: params.noticeId, buildingId: params.buildingId },
    })),
  });

  await prisma.buildingNotice.update({
    where: { id: params.noticeId },
    data: { pushNotificationSentAt: now },
  });

  return true;
}

export async function dispatchPendingNoticePushesForBuilding(buildingId: string) {
  const now = new Date();
  const pending = await prisma.buildingNotice.findMany({
    where: {
      buildingId,
      archivedAt: null,
      sendPushNotification: true,
      pushNotificationSentAt: null,
      startTime: { lte: now },
      endTime: { gte: now },
    },
  });

  for (const notice of pending) {
    await dispatchNoticePushNotifications({
      buildingId,
      noticeId: notice.id,
      title: notice.title,
      body: notice.body,
      startTime: notice.startTime,
      endTime: notice.endTime,
      archivedAt: notice.archivedAt,
    });
  }
}

export async function maybeSendNoticePush(params: {
  buildingId: string;
  noticeId: string;
  title: string;
  body: string;
  startTime: Date;
  endTime: Date;
  archivedAt: Date | null;
  sendPushNotification: boolean;
  pushNotificationSentAt: Date | null;
}) {
  if (!params.sendPushNotification || params.pushNotificationSentAt) return;
  await dispatchNoticePushNotifications(params);
}
