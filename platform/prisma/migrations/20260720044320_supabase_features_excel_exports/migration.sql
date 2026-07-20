-- CreateTable
CREATE TABLE "SiteConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "brandName" TEXT NOT NULL DEFAULT 'iProjectX',
    "heroTitle" TEXT NOT NULL DEFAULT 'The enterprise platform for portfolio, delivery, and outcomes.',
    "heroSubtitle" TEXT NOT NULL DEFAULT 'Move from spreadsheet PMO tooling to a multi-tenant SaaS workspace with subscription seats, interactive delivery intelligence, and full white-label branding.',
    "heroCtaLabel" TEXT NOT NULL DEFAULT 'Start 14-day trial',
    "heroCtaHref" TEXT NOT NULL DEFAULT '/signup',
    "secondaryCtaLabel" TEXT NOT NULL DEFAULT 'View plans',
    "secondaryCtaHref" TEXT NOT NULL DEFAULT '/pricing',
    "primaryColor" TEXT NOT NULL DEFAULT '#0F766E',
    "accentColor" TEXT NOT NULL DEFAULT '#0284C7',
    "secondaryColor" TEXT NOT NULL DEFAULT '#134E4A',
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "supportEmail" TEXT,
    "footerText" TEXT NOT NULL DEFAULT 'Enterprise project management & delivery',
    "showPricing" BOOLEAN NOT NULL DEFAULT true,
    "showSignup" BOOLEAN NOT NULL DEFAULT true,
    "enableExcelImport" BOOLEAN NOT NULL DEFAULT true,
    "enablePptExport" BOOLEAN NOT NULL DEFAULT true,
    "enablePdfExport" BOOLEAN NOT NULL DEFAULT true,
    "featureCardsJson" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProjectBrief" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "strategicAlignment" TEXT,
    "problemStatement" TEXT,
    "proposedSolution" TEXT,
    "scope" TEXT,
    "outOfScope" TEXT,
    "fundingAsk" REAL NOT NULL DEFAULT 0,
    "expectedBenefits" TEXT,
    "keyRisks" TEXT,
    "assumptions" TEXT,
    "successMetrics" TEXT,
    "optionsConsidered" TEXT,
    "recommendation" TEXT,
    "stakeholderSummary" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectBrief_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "filename" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "rowsUpserted" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ImportJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "planId" TEXT,
    "billingEmail" TEXT,
    "seatCount" INTEGER NOT NULL DEFAULT 1,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'trialing',
    "trialEndsAt" DATETIME,
    "stripeCustomerId" TEXT,
    "stripeSubId" TEXT,
    "brandName" TEXT,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#0F766E',
    "accentColor" TEXT NOT NULL DEFAULT '#0EA5E9',
    "secondaryColor" TEXT NOT NULL DEFAULT '#134E4A',
    "customDomain" TEXT,
    "supportEmail" TEXT,
    "loginTagline" TEXT,
    "hidePoweredBy" BOOLEAN NOT NULL DEFAULT false,
    "enableExcelImport" BOOLEAN NOT NULL DEFAULT true,
    "enablePptExport" BOOLEAN NOT NULL DEFAULT true,
    "enablePdfExport" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Organization_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Organization" ("accentColor", "billingEmail", "brandName", "createdAt", "customDomain", "faviconUrl", "hidePoweredBy", "id", "loginTagline", "logoUrl", "name", "planId", "primaryColor", "seatCount", "secondaryColor", "slug", "stripeCustomerId", "stripeSubId", "subscriptionStatus", "supportEmail", "trialEndsAt", "updatedAt") SELECT "accentColor", "billingEmail", "brandName", "createdAt", "customDomain", "faviconUrl", "hidePoweredBy", "id", "loginTagline", "logoUrl", "name", "planId", "primaryColor", "seatCount", "secondaryColor", "slug", "stripeCustomerId", "stripeSubId", "subscriptionStatus", "supportEmail", "trialEndsAt", "updatedAt" FROM "Organization";
DROP TABLE "Organization";
ALTER TABLE "new_Organization" RENAME TO "Organization";
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "Organization_customDomain_key" ON "Organization"("customDomain");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("avatarUrl", "createdAt", "email", "id", "name", "passwordHash", "updatedAt") SELECT "avatarUrl", "createdAt", "email", "id", "name", "passwordHash", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ProjectBrief_projectId_key" ON "ProjectBrief"("projectId");
