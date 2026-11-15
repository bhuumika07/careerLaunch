-- Migration: 20261116_career_role_catalogue.sql
-- Additive migration for CareerRole catalogue and Opportunity mapping (Chunk 5.1)

-- 1. CareerRole catalogue table
CREATE TABLE IF NOT EXISTS "CareerRole" (
    "id" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "description" TEXT,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "domain" TEXT NOT NULL,
    "requiredSkillIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "relatedSkillIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareerRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CareerRole_canonicalName_key" ON "CareerRole"("canonicalName");
CREATE INDEX IF NOT EXISTS "CareerRole_domain_idx" ON "CareerRole"("domain");
CREATE INDEX IF NOT EXISTS "CareerRole_isActive_idx" ON "CareerRole"("isActive");

-- 2. Add nullable foreign key to Opportunity to keep the original title while mapping canonically
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "careerRoleId" TEXT;
CREATE INDEX IF NOT EXISTS "Opportunity_careerRoleId_idx" ON "Opportunity"("careerRoleId");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Opportunity_careerRoleId_fkey') THEN
        ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_careerRoleId_fkey" FOREIGN KEY ("careerRoleId") REFERENCES "CareerRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
