-- Migration: Chunk 2 - Data Model and Source Registry
-- Creates SourceRegistry, ConnectorOpportunity, and IngestionRunLog tables with enum types and indexes.

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE "SourceRegistryCategory" AS ENUM ('job_board', 'ats', 'government', 'internship_portal');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "SourceRegistryStatus" AS ENUM ('active', 'permission_pending', 'external_link_only', 'disabled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "IngestionOpportunityType" AS ENUM ('job', 'internship', 'fellowship', 'research');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create SourceRegistry Table
CREATE TABLE IF NOT EXISTS "SourceRegistry" (
    "id" VARCHAR(64) PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "category" "SourceRegistryCategory" NOT NULL,
    "geography" VARCHAR(64) NOT NULL,
    "accessMethod" VARCHAR(64) NOT NULL,
    "status" "SourceRegistryStatus" NOT NULL DEFAULT 'disabled',
    "termsUrl" TEXT,
    "refreshInterval" INTEGER NOT NULL DEFAULT 60,
    "attributionText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create ConnectorOpportunity Table
CREATE TABLE IF NOT EXISTS "ConnectorOpportunity" (
    "id" VARCHAR(128) PRIMARY KEY,
    "title" VARCHAR(512) NOT NULL,
    "organization" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "type" "IngestionOpportunityType" NOT NULL,
    "experienceLevel" VARCHAR(64) NOT NULL,
    "location" VARCHAR(255),
    "isRemote" BOOLEAN NOT NULL DEFAULT false,
    "salary" VARCHAR(128),
    "skills" TEXT[] NOT NULL DEFAULT '{}',
    "postedDate" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "originalUrl" TEXT NOT NULL,
    "sourceId" VARCHAR(64) NOT NULL REFERENCES "SourceRegistry"("id") ON DELETE CASCADE,
    "sourceExternalId" VARCHAR(255),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" TIMESTAMP(3),
    "verificationStatus" VARCHAR(64) NOT NULL DEFAULT 'pending',
    "rawPayloadRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_connector_opp_source" ON "ConnectorOpportunity"("sourceId");
CREATE INDEX IF NOT EXISTS "idx_connector_opp_type" ON "ConnectorOpportunity"("type");
CREATE INDEX IF NOT EXISTS "idx_connector_opp_remote" ON "ConnectorOpportunity"("isRemote");
CREATE INDEX IF NOT EXISTS "idx_connector_opp_verification" ON "ConnectorOpportunity"("verificationStatus");

-- 4. Create IngestionRunLog Table
CREATE TABLE IF NOT EXISTS "IngestionRunLog" (
    "id" VARCHAR(128) PRIMARY KEY,
    "sourceId" VARCHAR(64) NOT NULL REFERENCES "SourceRegistry"("id") ON DELETE CASCADE,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "status" VARCHAR(32) NOT NULL DEFAULT 'running',
    "fetchedCount" INTEGER NOT NULL DEFAULT 0,
    "newCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB DEFAULT '[]'::jsonb,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_ingestion_log_source" ON "IngestionRunLog"("sourceId");
CREATE INDEX IF NOT EXISTS "idx_ingestion_log_status" ON "IngestionRunLog"("status");

-- 5. Seed Initial Sources
-- Naukri seeded with external_link_only per Chunk 1 decision
INSERT INTO "SourceRegistry" ("id", "name", "category", "geography", "accessMethod", "status", "termsUrl", "refreshInterval", "attributionText")
VALUES
    ('naukri', 'Naukri.com', 'job_board', 'India', 'external_search', 'external_link_only', 'https://www.naukri.com/termsconditions', 0, 'Direct external search destination. Listings not stored or redistributed.'),
    ('greenhouse', 'Greenhouse Public Job Board API', 'ats', 'Global', 'public_api', 'active', 'https://support.greenhouse.io', 60, 'Powered by Greenhouse Official Job Board API'),
    ('lever', 'Lever Public Postings API', 'ats', 'Global', 'public_api', 'active', 'https://www.lever.co', 60, 'Powered by Lever Official Postings API'),
    ('ashby', 'Ashby Public Job Board Posting API', 'ats', 'Global', 'public_api', 'active', 'https://www.ashbyhq.com', 60, 'Powered by Ashby Official Posting API'),
    ('aicte', 'AICTE National Internship Portal', 'internship_portal', 'India', 'external_search', 'external_link_only', 'https://internship.aicte-india.org', 0, 'Direct external destination for AICTE internship programs.'),
    ('adzuna', 'Adzuna Job Search API (India)', 'job_board', 'India', 'licensed_api', 'permission_pending', 'https://developer.adzuna.com', 360, 'Job search data powered by Adzuna API.'),
    ('ncs', 'National Career Service (Ministry of Labour & Employment)', 'government', 'India', 'public_api', 'permission_pending', 'https://data.gov.in', 720, 'Open Data under National Data Sharing and Accessibility Policy (NDSAP).')
ON CONFLICT ("id") DO UPDATE SET
    "name" = EXCLUDED."name",
    "category" = EXCLUDED."category",
    "geography" = EXCLUDED."geography",
    "accessMethod" = EXCLUDED."accessMethod",
    "status" = EXCLUDED."status",
    "termsUrl" = EXCLUDED."termsUrl",
    "refreshInterval" = EXCLUDED."refreshInterval",
    "attributionText" = EXCLUDED."attributionText",
    "updatedAt" = CURRENT_TIMESTAMP;
