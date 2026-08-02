-- Rename MachineType → ResourceType and add drying rooms
ALTER TYPE "MachineType" RENAME TO "ResourceType";
ALTER TYPE "ResourceType" ADD VALUE 'DRYING_ROOM';

-- Rename Machine → Resource
ALTER TABLE "Machine" RENAME TO "Resource";
ALTER TABLE "Resource" RENAME COLUMN "machineType" TO "resourceType";

-- Rename foreign key columns on dependent tables
ALTER TABLE "Reservation" RENAME COLUMN "machineId" TO "resourceId";
ALTER TABLE "Timer" RENAME COLUMN "machineId" TO "resourceId";
ALTER TABLE "DefectReport" RENAME COLUMN "machineId" TO "resourceId";
ALTER TABLE "ChecklistCompletion" RENAME COLUMN "machineId" TO "resourceId";

-- Rename indexes
ALTER INDEX "Machine_qrCodeIdentifier_key" RENAME TO "Resource_qrCodeIdentifier_key";
ALTER INDEX "Reservation_machineId_startTime_endTime_idx" RENAME TO "Reservation_resourceId_startTime_endTime_idx";
