-- AlterTable
ALTER TABLE "public"."Assignment" ADD COLUMN "description" TEXT;

-- CreateTable
CREATE TABLE "public"."AssignmentAttachment" (
    "id" SERIAL NOT NULL,
    "assignmentId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssignmentAttachment_assignmentId_idx" ON "public"."AssignmentAttachment"("assignmentId");

-- AddForeignKey
ALTER TABLE "public"."AssignmentAttachment" ADD CONSTRAINT "AssignmentAttachment_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;