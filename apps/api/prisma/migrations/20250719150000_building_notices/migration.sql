-- CreateEnum
CREATE TYPE "NoticeCategory" AS ENUM ('MAINTENANCE', 'WATER_SHUTOFF', 'CONSTRUCTION', 'GENERAL_INFO', 'ELEVATOR', 'HEATING');

-- CreateTable
CREATE TABLE "BuildingNotice" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "NoticeCategory" NOT NULL,
    "severity" "Severity" NOT NULL DEFAULT 'MEDIUM',
    "icon" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "affectsLaundry" BOOLEAN NOT NULL DEFAULT false,
    "showOnLogin" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuildingNotice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildingNoticeAcknowledgment" (
    "id" TEXT NOT NULL,
    "noticeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuildingNoticeAcknowledgment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BuildingNotice_buildingId_startTime_endTime_idx" ON "BuildingNotice"("buildingId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "BuildingNotice_buildingId_archivedAt_idx" ON "BuildingNotice"("buildingId", "archivedAt");

-- CreateIndex
CREATE INDEX "BuildingNoticeAcknowledgment_userId_idx" ON "BuildingNoticeAcknowledgment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BuildingNoticeAcknowledgment_noticeId_userId_key" ON "BuildingNoticeAcknowledgment"("noticeId", "userId");

-- AddForeignKey
ALTER TABLE "BuildingNotice" ADD CONSTRAINT "BuildingNotice_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildingNotice" ADD CONSTRAINT "BuildingNotice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildingNoticeAcknowledgment" ADD CONSTRAINT "BuildingNoticeAcknowledgment_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "BuildingNotice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildingNoticeAcknowledgment" ADD CONSTRAINT "BuildingNoticeAcknowledgment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
