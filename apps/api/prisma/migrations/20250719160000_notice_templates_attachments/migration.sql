-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'BUILDING_NOTICE';

-- AlterTable
ALTER TABLE "BuildingNotice" ADD COLUMN "attachments" JSONB;
ALTER TABLE "BuildingNotice" ADD COLUMN "sendPushNotification" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BuildingNotice" ADD COLUMN "pushNotificationSentAt" TIMESTAMP(3);
