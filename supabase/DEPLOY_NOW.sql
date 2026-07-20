-- =============================================================================
-- iProjectX — REQUIRED Supabase SQL for Streamlit parity (existing databases)
-- Copy ALL of this into Supabase → SQL Editor → Run
-- Safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
-- =============================================================================

-- 1) Latest Updates fields (Streamlit updates.json parity)
ALTER TABLE "Update" ADD COLUMN IF NOT EXISTS "projectName" TEXT;
ALTER TABLE "Update" ADD COLUMN IF NOT EXISTS "impact" TEXT NOT NULL DEFAULT 'Medium';
ALTER TABLE "Update" ADD COLUMN IF NOT EXISTS "author" TEXT;
ALTER TABLE "Update" ADD COLUMN IF NOT EXISTS "updateDate" TIMESTAMP(3);
ALTER TABLE "Update" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 2) Dependencies sheet
CREATE TABLE IF NOT EXISTS "Dependency" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
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

-- 3) Benefits sheet
CREATE TABLE IF NOT EXISTS "Benefit" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "projectId" TEXT,
  "projectCode" TEXT,
  "projectName" TEXT,
  "title" TEXT NOT NULL,
  "benefitType" TEXT NOT NULL DEFAULT 'Financial',
  "targetValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "realisedValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "owner" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Tracked',
  "fy" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Benefit_organizationId_idx" ON "Benefit"("organizationId");

-- 4) CostBenefit sheet (year-by-year)
CREATE TABLE IF NOT EXISTS "CostBenefitYear" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "projectId" TEXT,
  "projectCode" TEXT,
  "projectName" TEXT,
  "year" INTEGER NOT NULL,
  "capex" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "opex" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "benefitRecurring" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "benefitOneOff" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes" TEXT
);
CREATE INDEX IF NOT EXISTS "CostBenefitYear_organizationId_idx" ON "CostBenefitYear"("organizationId");
CREATE UNIQUE INDEX IF NOT EXISTS "CostBenefitYear_org_code_year_key"
  ON "CostBenefitYear"("organizationId", "projectCode", "year");

-- 5) FYAllocation sheet
CREATE TABLE IF NOT EXISTS "FyAllocation" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "projectId" TEXT,
  "projectCode" TEXT NOT NULL,
  "projectName" TEXT,
  "fy" TEXT NOT NULL,
  "budgetPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "forecastPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "budgetAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "forecastAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "FyAllocation_organizationId_idx" ON "FyAllocation"("organizationId");
CREATE UNIQUE INDEX IF NOT EXISTS "FyAllocation_org_code_fy_key"
  ON "FyAllocation"("organizationId", "projectCode", "fy");

-- 6) PortfolioMovements sheet
CREATE TABLE IF NOT EXISTS "PortfolioMovement" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "projectId" TEXT,
  "projectCode" TEXT NOT NULL,
  "projectName" TEXT,
  "fromCategory" TEXT NOT NULL,
  "toCategory" TEXT NOT NULL,
  "reason" TEXT,
  "changedBy" TEXT,
  "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PortfolioMovement_organizationId_idx" ON "PortfolioMovement"("organizationId");

-- 7) PhaseFinancials sheet
CREATE TABLE IF NOT EXISTS "PhaseFinancial" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "projectId" TEXT,
  "projectCode" TEXT NOT NULL,
  "projectName" TEXT,
  "stage" TEXT NOT NULL,
  "plannedStart" TIMESTAMP(3),
  "plannedEnd" TIMESTAMP(3),
  "actualStart" TIMESTAMP(3),
  "actualEnd" TIMESTAMP(3),
  "budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "forecast" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "actual" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'Planned',
  "notes" TEXT
);
CREATE INDEX IF NOT EXISTS "PhaseFinancial_organizationId_idx" ON "PhaseFinancial"("organizationId");

-- 8) ProjectLinks sheet
CREATE TABLE IF NOT EXISTS "ProjectLink" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "projectId" TEXT,
  "projectCode" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "linkType" TEXT NOT NULL DEFAULT 'Document'
);
CREATE INDEX IF NOT EXISTS "ProjectLink_organizationId_idx" ON "ProjectLink"("organizationId");

-- 9) Prioritisation sheet
CREATE TABLE IF NOT EXISTS "PrioritisationScore" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "projectId" TEXT,
  "projectCode" TEXT NOT NULL,
  "projectName" TEXT,
  "strategicAlignment" INTEGER NOT NULL DEFAULT 3,
  "benefitValue" INTEGER NOT NULL DEFAULT 3,
  "riskReduction" INTEGER NOT NULL DEFAULT 2,
  "compliance" INTEGER NOT NULL DEFAULT 2,
  "complexity" INTEGER NOT NULL DEFAULT 3,
  "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PrioritisationScore_organizationId_idx" ON "PrioritisationScore"("organizationId");
CREATE UNIQUE INDEX IF NOT EXISTS "PrioritisationScore_org_code_key"
  ON "PrioritisationScore"("organizationId", "projectCode");

-- 10) Config + ConfigRules
CREATE TABLE IF NOT EXISTS "OrgConfigItem" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "category" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS "OrgConfigItem_organizationId_idx" ON "OrgConfigItem"("organizationId");
CREATE UNIQUE INDEX IF NOT EXISTS "OrgConfigItem_org_cat_key"
  ON "OrgConfigItem"("organizationId", "category", "key");

-- 11) RAID sheet (Assumptions / Issues)
CREATE TABLE IF NOT EXISTS "RaidItem" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "projectId" TEXT,
  "projectCode" TEXT,
  "raidType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "owner" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Open',
  "impact" TEXT NOT NULL DEFAULT 'Medium',
  "dueDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "RaidItem_organizationId_idx" ON "RaidItem"("organizationId");

-- 12) Stripe Invoice table (if not already created)
CREATE TABLE IF NOT EXISTS "Invoice" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "stripeInvoiceId" TEXT UNIQUE,
  "stripeCustomerId" TEXT,
  "number" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "amountDue" INTEGER NOT NULL DEFAULT 0,
  "amountPaid" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'usd',
  "description" TEXT,
  "planSlug" TEXT,
  "seatCount" INTEGER,
  "interval" TEXT,
  "hostedInvoiceUrl" TEXT,
  "invoicePdf" TEXT,
  "dueDate" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Invoice_organizationId_idx" ON "Invoice"("organizationId");
CREATE INDEX IF NOT EXISTS "Invoice_status_idx" ON "Invoice"("status");
