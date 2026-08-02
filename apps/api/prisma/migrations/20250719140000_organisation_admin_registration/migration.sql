-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('PROPERTY_ADMIN', 'SUPER_ADMIN', 'PLATFORM_ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "OrganisationStatus" AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('PENDING_EMAIL_VERIFICATION', 'COMPANY_PROFILE', 'FIRST_BUILDING', 'LAUNDRY_SETUP', 'RESIDENT_INVITATION', 'COMPLETED');

-- CreateEnum
CREATE TYPE "OrganisationMembershipRole" AS ENUM ('OWNER', 'PROPERTY_ADMIN', 'ADMIN');

-- CreateEnum
CREATE TYPE "OrganisationMembershipStatus" AS ENUM ('ACTIVE', 'INVITED', 'REVOKED');

-- CreateEnum
CREATE TYPE "OrganisationInvitationStatus" AS ENUM ('INVITED', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- AlterTable User
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "organisationId" TEXT;
ALTER TABLE "User" ADD COLUMN "platformRole" "PlatformRole";
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable Building
ALTER TABLE "Building" ADD COLUMN "organisationId" TEXT;
ALTER TABLE "Building" ADD COLUMN "street" TEXT;
ALTER TABLE "Building" ADD COLUMN "postalCode" TEXT;
ALTER TABLE "Building" ADD COLUMN "city" TEXT;
ALTER TABLE "Building" ADD COLUMN "country" TEXT DEFAULT 'CH';

-- CreateTable Organisation
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT NOT NULL,
    "status" "OrganisationStatus" NOT NULL DEFAULT 'PENDING',
    "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'PENDING_EMAIL_VERIFICATION',
    "onboardingData" JSONB,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable OrganisationMembership
CREATE TABLE "OrganisationMembership" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrganisationMembershipRole" NOT NULL DEFAULT 'PROPERTY_ADMIN',
    "status" "OrganisationMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "invitedById" TEXT,
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganisationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable OrganisationInvitation
CREATE TABLE "OrganisationInvitation" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "OrganisationMembershipRole" NOT NULL DEFAULT 'PROPERTY_ADMIN',
    "tokenHash" TEXT NOT NULL,
    "status" "OrganisationInvitationStatus" NOT NULL DEFAULT 'INVITED',
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "OrganisationInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable EmailVerificationToken
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_ownerId_key" ON "Organisation"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganisationMembership_organisationId_userId_key" ON "OrganisationMembership"("organisationId", "userId");

-- CreateIndex
CREATE INDEX "OrganisationMembership_userId_idx" ON "OrganisationMembership"("userId");

-- CreateIndex
CREATE INDEX "OrganisationInvitation_tokenHash_idx" ON "OrganisationInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "OrganisationInvitation_organisationId_email_idx" ON "OrganisationInvitation"("organisationId", "email");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_tokenHash_idx" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");

-- CreateIndex
CREATE INDEX "Building_organisationId_idx" ON "Building"("organisationId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organisation" ADD CONSTRAINT "Organisation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationMembership" ADD CONSTRAINT "OrganisationMembership_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationMembership" ADD CONSTRAINT "OrganisationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationInvitation" ADD CONSTRAINT "OrganisationInvitation_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationInvitation" ADD CONSTRAINT "OrganisationInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: mark existing seed/demo users as verified
UPDATE "User" SET "emailVerifiedAt" = CURRENT_TIMESTAMP, "status" = 'ACTIVE' WHERE "emailVerifiedAt" IS NULL;
