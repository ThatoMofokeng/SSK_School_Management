-- AlterTable
-- Adds a real "posted at" timestamp to Announcement, separate from
-- `date` (which is a scheduling/display date the announcement author
-- picks, e.g. the date of a meeting - not necessarily when the
-- announcement itself was created). Existing rows get createdAt = now()
-- via the column default; new rows get it automatically going forward.
ALTER TABLE "public"."Announcement" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;