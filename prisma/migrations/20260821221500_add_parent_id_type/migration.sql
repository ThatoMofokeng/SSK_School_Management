-- CreateEnum
CREATE TYPE "public"."IdType" AS ENUM ('SA_ID', 'PASSPORT');

-- AlterTable
-- Nullable so existing Parent rows (created before this feature) don't
-- need a backfill value. New parents are required to supply one at the
-- application/Zod layer, not enforced as NOT NULL in the database.
ALTER TABLE "public"."Parent" ADD COLUMN "idType" "public"."IdType";
ALTER TABLE "public"."Parent" ADD COLUMN "idNumber" TEXT;

-- CreateIndex
-- Postgres treats each NULL as distinct for a unique index, so this is
-- safe even though existing rows will have idNumber = NULL.
CREATE UNIQUE INDEX "Parent_idNumber_key" ON "public"."Parent"("idNumber");
