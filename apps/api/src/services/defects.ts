import { prisma } from '../db.js';
import { isSeriousDefect } from './reservations.js';

export async function createDefectReport(params: {
  userId: string;
  machineId: string;
  category: string;
  description: string;
  severity: string;
  photoUrl?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const report = await tx.defectReport.create({
      data: {
        machineId: params.machineId,
        reportedById: params.userId,
        category: params.category as never,
        description: params.description,
        severity: params.severity as never,
        photoUrl: params.photoUrl,
      },
      include: { machine: { include: { laundryRoom: true } }, reportedBy: true },
    });

    if (isSeriousDefect(params.category) || params.severity === 'CRITICAL') {
      await tx.machine.update({
        where: { id: params.machineId },
        data: { status: 'OUT_OF_SERVICE' },
      });
    } else {
      await tx.machine.update({
        where: { id: params.machineId },
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

    await tx.machine.update({
      where: { id: defect.machineId },
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

    await tx.machine.update({
      where: { id: defect.machineId },
      data: { status: 'AVAILABLE' },
    });

    return updated;
  });
}
