-- CreateTable
CREATE TABLE "BuildingRegistration" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "selfRegistrationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastRegeneratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalRegistrations" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BuildingRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResidentRegistration" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResidentRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BuildingRegistration_buildingId_key" ON "BuildingRegistration"("buildingId");

-- CreateIndex
CREATE INDEX "BuildingRegistration_tokenHash_idx" ON "BuildingRegistration"("tokenHash");

-- CreateIndex
CREATE INDEX "ResidentRegistration_buildingId_registeredAt_idx" ON "ResidentRegistration"("buildingId", "registeredAt");

-- CreateIndex
CREATE INDEX "ResidentRegistration_userId_idx" ON "ResidentRegistration"("userId");

-- AddForeignKey
ALTER TABLE "BuildingRegistration" ADD CONSTRAINT "BuildingRegistration_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildingRegistration" ADD CONSTRAINT "BuildingRegistration_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentRegistration" ADD CONSTRAINT "ResidentRegistration_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentRegistration" ADD CONSTRAINT "ResidentRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentRegistration" ADD CONSTRAINT "ResidentRegistration_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "BuildingRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
