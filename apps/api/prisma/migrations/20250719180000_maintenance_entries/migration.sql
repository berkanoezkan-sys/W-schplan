-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('MAINTENANCE', 'REPAIR', 'INSPECTION', 'SERVICE', 'CLEANING', 'OTHER');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MaintenanceRecurrenceType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "MaintenanceSeriesScope" AS ENUM ('THIS_OCCURRENCE', 'THIS_AND_FUTURE', 'ENTIRE_SERIES');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'MAINTENANCE_ENTRY';

-- CreateTable
CREATE TABLE "MaintenanceEntry" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "MaintenanceType" NOT NULL,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'PLANNED',
    "occurrenceDate" DATE NOT NULL,
    "endDate" DATE,
    "startTimeMinutes" INTEGER NOT NULL,
    "endTimeMinutes" INTEGER NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceType" "MaintenanceRecurrenceType",
    "recurrenceInterval" INTEGER,
    "recurrenceDays" JSONB,
    "recurrenceEndDate" DATE,
    "notifyResidents" BOOLEAN NOT NULL DEFAULT false,
    "notificationSentAt" TIMESTAMP(3),
    "location" TEXT,
    "affectedAreaIds" JSONB NOT NULL DEFAULT '[]',
    "affectedMachineIds" JSONB NOT NULL DEFAULT '[]',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaintenanceEntry_buildingId_occurrenceDate_idx" ON "MaintenanceEntry"("buildingId", "occurrenceDate");

-- CreateIndex
CREATE INDEX "MaintenanceEntry_seriesId_occurrenceDate_idx" ON "MaintenanceEntry"("seriesId", "occurrenceDate");

-- AddForeignKey
ALTER TABLE "MaintenanceEntry" ADD CONSTRAINT "MaintenanceEntry_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceEntry" ADD CONSTRAINT "MaintenanceEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
