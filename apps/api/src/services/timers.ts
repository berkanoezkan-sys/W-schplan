import { prisma } from '../db.js';

export async function createTimer(params: {
  userId: string;
  machineId: string;
  reservationId?: string;
  remainingMinutes: number;
  notificationSettings: Record<string, boolean>;
}) {
  const expectedCompletionTime = new Date(Date.now() + params.remainingMinutes * 60000);

  const timer = await prisma.$transaction(async (tx) => {
    await tx.machine.update({
      where: { id: params.machineId },
      data: { status: 'IN_USE' },
    });

    if (params.reservationId) {
      await tx.timer.updateMany({
        where: { reservationId: params.reservationId, status: 'ACTIVE' },
        data: { status: 'CANCELLED' },
      });
    }

    return tx.timer.create({
      data: {
        userId: params.userId,
        machineId: params.machineId,
        reservationId: params.reservationId,
        expectedCompletionTime,
        notificationSettings: params.notificationSettings,
      },
      include: { machine: true },
    });
  });

  return timer;
}

export async function completeTimer(timerId: string, userId: string) {
  const timer = await prisma.timer.findUnique({ where: { id: timerId } });
  if (!timer || timer.userId !== userId) {
    throw new Error('NOT_FOUND');
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.timer.update({
      where: { id: timerId },
      data: { status: 'COMPLETED' },
    });

    await tx.machine.update({
      where: { id: timer.machineId },
      data: { status: 'CLEANING_REQUIRED' },
    });

    await tx.notification.create({
      data: {
        userId,
        type: 'CYCLE_COMPLETED',
        title: 'Cycle completed',
        body: 'Your laundry cycle is finished. Please complete the cleaning checklist.',
        data: { machineId: timer.machineId, timerId },
      },
    });

    return updated;
  });
}

export async function processDueTimerNotifications() {
  const now = new Date();
  const activeTimers = await prisma.timer.findMany({
    where: { status: 'ACTIVE' },
    include: { user: true, machine: true },
  });

  for (const timer of activeTimers) {
    const settings = timer.notificationSettings as Record<string, boolean>;
    const msRemaining = timer.expectedCompletionTime.getTime() - now.getTime();

    if (settings.notifyFiveMinutesBefore && msRemaining <= 5 * 60000 && msRemaining > 4 * 60000) {
      await prisma.notification.create({
        data: {
          userId: timer.userId,
          type: 'TIMER_ALMOST_FINISHED',
          title: 'Almost finished',
          body: `${timer.machine.name} will finish in about 5 minutes.`,
          data: { timerId: timer.id },
        },
      });
    }

    if (msRemaining <= 0) {
      await completeTimer(timer.id, timer.userId);
    }
  }
}
