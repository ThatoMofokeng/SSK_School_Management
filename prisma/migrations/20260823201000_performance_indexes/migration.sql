-- Performance indexes for the most frequently filtered/sorted dashboard data.
-- pg_trgm makes case-insensitive `contains` searches on parent names much
-- faster than a normal B-tree index.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Parent_name_trgm_idx"
  ON "Parent" USING GIN ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Announcement_createdAt_classId_idx"
  ON "Announcement" ("createdAt", "classId");

CREATE INDEX IF NOT EXISTS "Event_startTime_idx"
  ON "Event" ("startTime");

CREATE INDEX IF NOT EXISTS "ContentFile_uploadedBy_createdAt_idx"
  ON "ContentFile" ("uploadedBy", "createdAt" DESC);
