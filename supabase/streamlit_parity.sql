-- Streamlit parity schema additions
-- Run in Supabase SQL editor after deploying this release.

-- Latest Updates extra fields (Streamlit updates.json parity)
ALTER TABLE "Update" ADD COLUMN IF NOT EXISTS "projectName" TEXT;
ALTER TABLE "Update" ADD COLUMN IF NOT EXISTS "impact" TEXT NOT NULL DEFAULT 'Medium';
ALTER TABLE "Update" ADD COLUMN IF NOT EXISTS "author" TEXT;
ALTER TABLE "Update" ADD COLUMN IF NOT EXISTS "updateDate" TIMESTAMP(3);
ALTER TABLE "Update" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Dependencies sheet parity
CREATE TABLE IF NOT EXISTS "Dependency" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "fromProjectId" TEXT,
  "toProjectId" TEXT,
  "fromName" TEXT NOT NULL,
  "toName" TEXT NOT NULL,
  "dependencyType" TEXT NOT NULL DEFAULT 'Finish-to-Start',
  "status" TEXT NOT NULL DEFAULT 'Healthy',
  "impact" TEXT NOT NULL DEFAULT 'Medium',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Dependency_organizationId_idx" ON "Dependency"("organizationId");
