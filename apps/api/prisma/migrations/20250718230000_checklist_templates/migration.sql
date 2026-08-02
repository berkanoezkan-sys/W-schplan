-- CreateTable
CREATE TABLE "ChecklistTemplate" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "checklistType" "ChecklistType" NOT NULL,
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistTemplate_buildingId_checklistType_key" ON "ChecklistTemplate"("buildingId", "checklistType");

-- AddForeignKey
ALTER TABLE "ChecklistTemplate" ADD CONSTRAINT "ChecklistTemplate_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;
