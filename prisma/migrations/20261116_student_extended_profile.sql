-- Migration: 20261116_student_extended_profile.sql
-- Additive migration for StudentSkill, CareerInterest, StudentProject, StudentExperience, StudentPreference (Chunk 4.2)

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SkillReviewStatus') THEN
        CREATE TYPE "SkillReviewStatus" AS ENUM ('CONFIRMED', 'NEEDS_REVIEW', 'REJECTED');
    END IF;
END $$;

-- 1. StudentSkill
CREATE TABLE IF NOT EXISTS "StudentSkill" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "skillId" TEXT,
    "rawSkillName" TEXT,
    "source" "ProfileFieldSource" NOT NULL DEFAULT 'STUDENT',
    "reviewStatus" "SkillReviewStatus" NOT NULL DEFAULT 'CONFIRMED',
    "proficiency" TEXT,
    "yearsExperience" DOUBLE PRECISION,
    "confirmed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentSkill_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudentSkill_studentProfileId_skillId_key" ON "StudentSkill"("studentProfileId", "skillId");
CREATE INDEX IF NOT EXISTS "StudentSkill_studentProfileId_idx" ON "StudentSkill"("studentProfileId");
CREATE INDEX IF NOT EXISTS "StudentSkill_skillId_idx" ON "StudentSkill"("skillId");

-- 2. CareerInterest
CREATE TABLE IF NOT EXISTS "CareerInterest" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareerInterest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CareerInterest_studentProfileId_idx" ON "CareerInterest"("studentProfileId");

-- 3. StudentProject
CREATE TABLE IF NOT EXISTS "StudentProject" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "repoUrl" TEXT,
    "liveUrl" TEXT,
    "source" "ProfileFieldSource" NOT NULL DEFAULT 'STUDENT',
    "confirmed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentProject_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "StudentProject_studentProfileId_idx" ON "StudentProject"("studentProfileId");

-- 4. StudentExperience
CREATE TABLE IF NOT EXISTS "StudentExperience" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "workMode" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" "ProfileFieldSource" NOT NULL DEFAULT 'STUDENT',
    "confirmed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentExperience_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "StudentExperience_studentProfileId_idx" ON "StudentExperience"("studentProfileId");

-- 5. StudentPreference
CREATE TABLE IF NOT EXISTS "StudentPreference" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "preferredLocations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredWorkModes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minExpectedSalary" DOUBLE PRECISION,
    "openToRelocation" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentPreference_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "StudentPreference_studentProfileId_key" ON "StudentPreference"("studentProfileId");

-- Foreign key constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentSkill_studentProfileId_fkey') THEN
        ALTER TABLE "StudentSkill" ADD CONSTRAINT "StudentSkill_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentSkill_skillId_fkey') THEN
        ALTER TABLE "StudentSkill" ADD CONSTRAINT "StudentSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CareerInterest_studentProfileId_fkey') THEN
        ALTER TABLE "CareerInterest" ADD CONSTRAINT "CareerInterest_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentProject_studentProfileId_fkey') THEN
        ALTER TABLE "StudentProject" ADD CONSTRAINT "StudentProject_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentExperience_studentProfileId_fkey') THEN
        ALTER TABLE "StudentExperience" ADD CONSTRAINT "StudentExperience_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentPreference_studentProfileId_fkey') THEN
        ALTER TABLE "StudentPreference" ADD CONSTRAINT "StudentPreference_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
