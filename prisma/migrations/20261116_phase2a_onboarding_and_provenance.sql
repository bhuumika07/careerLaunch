-- Migration: 20261116_phase2a_onboarding_and_provenance.sql

-- 1. Create Enums if they do not exist
DO $$ BEGIN
  CREATE TYPE "OnboardingStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "SkillVerificationState" AS ENUM ('SELF_REPORTED', 'CONFIRMED', 'VERIFIED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Safely expand ProfileFieldSource enum values
ALTER TYPE "ProfileFieldSource" ADD VALUE IF NOT EXISTS 'STUDENT_ENTERED';
ALTER TYPE "ProfileFieldSource" ADD VALUE IF NOT EXISTS 'RESUME_EXTRACTED';
ALTER TYPE "ProfileFieldSource" ADD VALUE IF NOT EXISTS 'ASSESSMENT_VERIFIED';
ALTER TYPE "ProfileFieldSource" ADD VALUE IF NOT EXISTS 'SYSTEM_DERIVED';

-- 3. StudentProfile additive columns
ALTER TABLE "StudentProfile"
  ADD COLUMN IF NOT EXISTS "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN IF NOT EXISTS "onboardingStep" INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "profileVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "lastCompletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastUpdatedBy" TEXT DEFAULT 'STUDENT';

-- 4. StudentSkill additive columns
ALTER TABLE "StudentSkill"
  ADD COLUMN IF NOT EXISTS "verificationState" "SkillVerificationState" NOT NULL DEFAULT 'SELF_REPORTED',
  ADD COLUMN IF NOT EXISTS "experienceMonths" INTEGER;

-- 5. CareerInterest additive columns
ALTER TABLE "CareerInterest"
  ADD COLUMN IF NOT EXISTS "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3);

-- Deduplicate / renumber existing CareerInterest priority per student (1, 2, 3) before applying unique index
WITH ranked AS (
  SELECT id, "studentProfileId",
         ROW_NUMBER() OVER (PARTITION BY "studentProfileId" ORDER BY "createdAt" ASC) as r_num
  FROM "CareerInterest"
)
UPDATE "CareerInterest" ci
SET priority = ranked.r_num,
    "isPrimary" = (ranked.r_num = 1)
FROM ranked
WHERE ci.id = ranked.id;

CREATE UNIQUE INDEX IF NOT EXISTS "CareerInterest_studentProfileId_priority_key"
  ON "CareerInterest"("studentProfileId", "priority");

-- 6. Create StudentRoadmap table
CREATE TABLE IF NOT EXISTS "StudentRoadmap" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "careerRoleId" TEXT NOT NULL,
  "careerRoleTitle" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "profileVersion" INTEGER NOT NULL DEFAULT 1,
  "generationVersion" INTEGER NOT NULL DEFAULT 1,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "currentModuleIndex" INTEGER NOT NULL DEFAULT 0,
  "progressPercentage" INTEGER NOT NULL DEFAULT 0,
  "milestonesCompleted" INTEGER NOT NULL DEFAULT 0,
  "totalMilestones" INTEGER NOT NULL DEFAULT 0,
  "modules" JSONB NOT NULL DEFAULT '[]',
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentRoadmap_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StudentRoadmap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "StudentRoadmap_userId_idx" ON "StudentRoadmap"("userId");
CREATE INDEX IF NOT EXISTS "StudentRoadmap_careerRoleId_idx" ON "StudentRoadmap"("careerRoleId");
CREATE INDEX IF NOT EXISTS "StudentRoadmap_isActive_idx" ON "StudentRoadmap"("isActive");

-- 7. Create ProfileIntelligenceJob table
CREATE TABLE IF NOT EXISTS "ProfileIntelligenceJob" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "profileId" TEXT,
  "jobType" TEXT NOT NULL,
  "inputProfileVersion" INTEGER NOT NULL DEFAULT 1,
  "targetRoleId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "model" TEXT,
  "promptVersion" TEXT,
  "resultRef" TEXT,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "ProfileIntelligenceJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProfileIntelligenceJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProfileIntelligenceJob_userId_idx" ON "ProfileIntelligenceJob"("userId");
CREATE INDEX IF NOT EXISTS "ProfileIntelligenceJob_status_idx" ON "ProfileIntelligenceJob"("status");
CREATE INDEX IF NOT EXISTS "ProfileIntelligenceJob_jobType_idx" ON "ProfileIntelligenceJob"("jobType");

-- ============================================================================
-- 8. Backfill existing records cleanly
-- ============================================================================

-- Backfill StudentSkill: populate experienceMonths from yearsExperience where available
UPDATE "StudentSkill"
SET "experienceMonths" = ROUND("yearsExperience" * 12)
WHERE "yearsExperience" IS NOT NULL AND "experienceMonths" IS NULL;

-- Backfill StudentSkill: reviewStatus CONFIRMED maps to verificationState CONFIRMED
UPDATE "StudentSkill"
SET "verificationState" = 'CONFIRMED'
WHERE "reviewStatus" = 'CONFIRMED' AND "verificationState" = 'SELF_REPORTED';

-- Backfill StudentProfile:
-- A: Mark profiles meeting minimum completion rule as COMPLETED
UPDATE "StudentProfile" sp
SET "onboardingStatus" = 'COMPLETED',
    "onboardingStep" = 5,
    "lastCompletedAt" = CURRENT_TIMESTAMP
WHERE (sp."college" IS NOT NULL AND TRIM(sp."college") != '')
  AND (sp."degree" IS NOT NULL AND TRIM(sp."degree") != '')
  AND (sp."graduationYear" IS NOT NULL AND sp."graduationYear" >= 2000)
  AND EXISTS (SELECT 1 FROM "CareerInterest" ci WHERE ci."studentProfileId" = sp."id")
  AND EXISTS (SELECT 1 FROM "StudentSkill" ss WHERE ss."studentProfileId" = sp."id");

-- B: Mark profiles with partial data as IN_PROGRESS
UPDATE "StudentProfile" sp
SET "onboardingStatus" = 'IN_PROGRESS',
    "onboardingStep" = CASE
      WHEN EXISTS (SELECT 1 FROM "StudentSkill" ss WHERE ss."studentProfileId" = sp."id") THEN 4
      WHEN EXISTS (SELECT 1 FROM "CareerInterest" ci WHERE ci."studentProfileId" = sp."id") THEN 3
      WHEN (sp."college" IS NOT NULL AND TRIM(sp."college") != '') THEN 2
      ELSE 1
    END
WHERE sp."onboardingStatus" = 'NOT_STARTED'
  AND (
    (sp."college" IS NOT NULL AND TRIM(sp."college") != '')
    OR (sp."degree" IS NOT NULL AND TRIM(sp."degree") != '')
    OR (sp."branch" IS NOT NULL AND TRIM(sp."branch") != '')
    OR (sp."bio" IS NOT NULL AND TRIM(sp."bio") != '')
    OR (sp."location" IS NOT NULL AND TRIM(sp."location") != '')
    OR EXISTS (SELECT 1 FROM "CareerInterest" ci WHERE ci."studentProfileId" = sp."id")
    OR EXISTS (SELECT 1 FROM "StudentSkill" ss WHERE ss."studentProfileId" = sp."id")
    OR EXISTS (SELECT 1 FROM "StudentProject" prj WHERE prj."studentProfileId" = sp."id")
    OR EXISTS (SELECT 1 FROM "StudentExperience" exp WHERE exp."studentProfileId" = sp."id")
  );
