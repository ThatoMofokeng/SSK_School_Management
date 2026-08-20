-- CreateTable
CREATE TABLE "ContentFile" (
    "id" SERIAL NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER,
    "uploadedBy" TEXT NOT NULL,
    "uploaderRole" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentFile_uploadedBy_idx" ON "ContentFile"("uploadedBy");
