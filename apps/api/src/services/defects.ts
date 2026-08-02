import { prisma } from '../db.js';
import { isSeriousDefect } from './reservations.js';

export async function createDefectReport(params: {
  userId: string;
  resourceId: string;
  category: string;
  description: string;
  severity: string;
  photoUrl?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const report = await tx.defectReport.create({
      data: {
        resourceId: params.resourceId,
        reportedById: params.userId,
        category: params.category as never,
        description: params.description,
        severity: params.severity as never,
        photoUrl: params.photoUrl,
      },
      include: { resource: { include: { laundryRoom: true } }, reportedBy: true },
    });

    if (isSeriousDefect(params.category) || params.severity === 'CRITICAL') {
      await tx.resource.update({
        where: { id: params.resourceId },
        data: { status: 'OUT_OF_SERVICE' },
      });
    } else {
      await tx.resource.update({
        where: { id: params.resourceId },
        data: { status: 'DEFECTIVE' },
      });
    }

    return report;
  });
}

export async function markAdministrationNotified(defectId: string, userId: string) {
  const defect = await prisma.defectReport.findUnique({ where: { id: defectId } });
  if (!defect) throw new Error('NOT_FOUND');

  return prisma.$transaction(async (tx) => {
    const updated = await tx.defectReport.update({
      where: { id: defectId },
      data: {
        status: 'ADMINISTRATION_NOTIFIED',
        administrationNotifiedAt: new Date(),
      },
    });

    await tx.resource.update({
      where: { id: defect.resourceId },
      data: { status: 'ADMINISTRATION_NOTIFIED' },
    });

    await tx.notification.create({
      data: {
        userId,
        type: 'DEFECT_STATUS_UPDATED',
        title: 'Administration notified',
        body: 'The building administration has been notified about the defect.',
        data: { defectId },
      },
    });

    return updated;
  });
}

export async function resolveDefect(defectId: string, adminUserId: string) {
  const defect = await prisma.defectReport.findUnique({ where: { id: defectId } });
  if (!defect) throw new Error('NOT_FOUND');

  return prisma.$transaction(async (tx) => {
    const updated = await tx.defectReport.update({
      where: { id: defectId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedById: adminUserId,
      },
    });

    await tx.resource.update({
      where: { id: defect.resourceId },
      data: { status: 'AVAILABLE' },
    });

    return updated;
  });
}
