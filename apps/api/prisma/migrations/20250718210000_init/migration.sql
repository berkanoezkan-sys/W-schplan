-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('RESIDENT', 'ADMINISTRATOR');

-- CreateEnum
CREATE TYPE "MachineType" AS ENUM ('WASHING_MACHINE', 'TUMBLE_DRYER');

-- CreateEnum
CREATE TYPE "MachineStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'IN_USE', 'CLEANING_REQUIRED', 'DEFECTIVE', 'ADMINISTRATION_NOTIFIED', 'UNDER_REPAIR', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "TimerStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DefectStatus" AS ENUM ('REPORTED', 'ADMINISTRATION_NOTIFIED', 'UNDER_REVIEW', 'REPAIR_SCHEDULED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "DefectCategory" AS ENUM ('MACHINE_DOES_NOT_START', 'MACHINE_DOES_NOT_DRAIN', 'DOOR_CANNOT_BE_OPENED', 'WATER_LEAKAGE', 'UNUSUAL_NOISE', 'DRYER_DOES_NOT_HEAT', 'DISPLAY_ERROR', 'PAYMENT_SYSTEM_ISSUE', 'MACHINE_IS_DIRTY', 'OTHER');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "PrivacyLabelMode" AS ENUM ('FIRST_NAME', 'APARTMENT_NUMBER', 'INITIALS', 'RESERVED');

-- CreateEnum
CREATE TYPE "ChecklistType" AS ENUM ('WASHING_MACHINE', 'TUMBLE_DRYER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('UPCOMING_RESERVATION', 'RESERVATION_STARTING_SOON', 'TIMER_ALMOST_FINISHED', 'CYCLE_COMPLETED', 'CHECKLIST_REMINDER', 'RESERVATION_CHANGED', 'DEFECT_AFFECTING_RESERVATION', 'DEFECT_STATUS_UPDATED', 'MACHINE_AVAILABLE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "apartmentNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Zurich',
    "language" TEXT NOT NULL DEFAULT 'de',
    "privacyLabelMode" "PrivacyLabelMode" NOT NULL DEFAULT 'FIRST_NAME',
    "bookingRules" JSONB NOT NULL,
    "houseRules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildingMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'RESIDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuildingMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaundryRoom" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "floor" TEXT,
    "instructions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "blockedUntil" TIMESTAMP(3),
    "blockReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaundryRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Machine" (
    "id" TEXT NOT NULL,
    "laundryRoomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "machineType" "MachineType" NOT NULL,
    "model" TEXT,
    "status" "MachineStatus" NOT NULL DEFAULT 'AVAILABLE',
    "estimatedDefaultRuntime" INTEGER NOT NULL DEFAULT 90,
    "qrCodeIdentifier" TEXT NOT NULL,
    "cleaningChecklistConfiguration" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "recurrenceRule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Timer" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT,
    "machineId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedCompletionTime" TIMESTAMP(3) NOT NULL,
    "status" "TimerStatus" NOT NULL DEFAULT 'ACTIVE',
    "notificationSettings" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Timer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefectReport" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "category" "DefectCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "photoUrl" TEXT,
    "severity" "Severity" NOT NULL DEFAULT 'MEDIUM',
    "status" "DefectStatus" NOT NULL DEFAULT 'REPORTED',
    "administrationNotifiedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DefectReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistCompletion" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "reservationId" TEXT,
    "userId" TEXT NOT NULL,
    "checklistType" "ChecklistType" NOT NULL,
    "completedItems" JSONB NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "upcomingReservation" BOOLEAN NOT NULL DEFAULT true,
    "reservationStartingSoon" BOOLEAN NOT NULL DEFAULT true,
    "timerAlmostFinished" BOOLEAN NOT NULL DEFAULT true,
    "cycleCompleted" BOOLEAN NOT NULL DEFAULT true,
    "checklistReminder" BOOLEAN NOT NULL DEFAULT true,
    "reservationChanged" BOOLEAN NOT NULL DEFAULT true,
    "defectAffectingReservation" BOOLEAN NOT NULL DEFAULT true,
    "defectStatusUpdated" BOOLEAN NOT NULL DEFAULT true,
    "machineAvailable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BuildingMembership_userId_buildingId_key" ON "BuildingMembership"("userId", "buildingId");

-- CreateIndex
CREATE UNIQUE INDEX "Machine_qrCodeIdentifier_key" ON "Machine"("qrCodeIdentifier");

-- CreateIndex
CREATE INDEX "Reservation_machineId_startTime_endTime_idx" ON "Reservation"("machineId", "startTime", "endTime");

-- CreateIndex
CREATE UNIQUE INDEX "Timer_reservationId_key" ON "Timer"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- AddForeignKey
ALTER TABLE "BuildingMembership" ADD CONSTRAINT "BuildingMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildingMembership" ADD CONSTRAINT "BuildingMembership_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaundryRoom" ADD CONSTRAINT "LaundryRoom_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_laundryRoomId_fkey" FOREIGN KEY ("laundryRoomId") REFERENCES "LaundryRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timer" ADD CONSTRAINT "Timer_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timer" ADD CONSTRAINT "Timer_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timer" ADD CONSTRAINT "Timer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectReport" ADD CONSTRAINT "DefectReport_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectReport" ADD CONSTRAINT "DefectReport_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectReport" ADD CONSTRAINT "DefectReport_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistCompletion" ADD CONSTRAINT "ChecklistCompletion_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistCompletion" ADD CONSTRAINT "ChecklistCompletion_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistCompletion" ADD CONSTRAINT "ChecklistCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

