-- ==============================================================================
-- Phase 3 Migration: AI Opportunity Enrichment (Additive Only)
-- ==============================================================================
-- Description:
-- Creates the `opportunity_enrichments` table and supporting enum/indexes.
-- This migration is strictly ADDITIVE: it does not modify, alter, or drop any
-- existing columns or tables from Phase 1 or Phase 2 (e.g. `opportunities`, `sources`,
-- `raw_listings`, `verification_logs`).
-- ==============================================================================

-- ==============================================================================
-- UP MIGRATION
-- ==============================================================================

-- 1. Create EnrichmentStatus enum if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EnrichmentStatus') THEN
        CREATE TYPE "EnrichmentStatus" AS ENUM (
            'pending',
            'processing',
            'succeeded',
            'failed',
            'needs_review'
        );
    END IF;
END$$;

-- 2. Create opportunity_enrichments table
CREATE TABLE IF NOT EXISTS "opportunity_enrichments" (
    "id" VARCHAR(36) PRIMARY KEY,
    "opportunity_id" VARCHAR(36) NOT NULL,
    "status" "EnrichmentStatus" NOT NULL DEFAULT 'pending',
    "extraction_model" VARCHAR(50) NOT NULL,
    "prompt_version" VARCHAR(50) NOT NULL,
    "schema_version" VARCHAR(20) NOT NULL,
    "content_hash" VARCHAR(64) NOT NULL,
    "processed_at" TIMESTAMPTZ,
    "retry_count" INT NOT NULL DEFAULT 0,
    "error_details" JSONB,
    "is_current" BOOLEAN NOT NULL DEFAULT TRUE,

    -- Basic classification & descriptions
    "role_title" TEXT,
    "company" TEXT,
    "department" TEXT,
    "description_summary" TEXT,
    "opportunity_type" VARCHAR(20),  -- internship | full_time | part_time | contract | unknown
    "work_mode" VARCHAR(20),         -- remote | hybrid | onsite | unknown
    "country" VARCHAR(100),
    "state_or_region" VARCHAR(100),
    "cities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_worldwide" BOOLEAN NOT NULL DEFAULT FALSE,

    -- Academic qualifications & eligibility criteria
    "degree_levels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "branches" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "graduation_years" INT[] DEFAULT ARRAY[]::INT[],
    "min_cgpa" NUMERIC(4, 2),
    "academic_requirements" TEXT,
    "work_authorization" TEXT,
    "explicit_restrictions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "target_audience" TEXT,

    -- Professional experience requirements
    "experience_level" VARCHAR(20),  -- entry | mid | senior | lead | executive | unknown
    "min_experience_months" INT,
    "max_experience_months" INT,

    -- Partitioned skills (Required vs Preferred vs Inferred)
    "required_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferred_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "inferred_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Compensation details (strictly factual)
    "is_paid" BOOLEAN,
    "currency" VARCHAR(10),
    "min_amount" NUMERIC(12, 2),
    "max_amount" NUMERIC(12, 2),
    "compensation_interval" VARCHAR(20), -- hourly | monthly | yearly | stipend_total
    "compensation_verbatim" TEXT,

    -- Timeline & deadlines
    "application_deadline" TIMESTAMPTZ,
    "start_date" TEXT,
    "duration_text" TEXT,

    -- Confidence scores & human review triggers
    "overall_confidence" NUMERIC(3, 2),
    "field_confidences" JSONB,
    "needs_manual_review" BOOLEAN NOT NULL DEFAULT FALSE,
    "missing_fields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "unsupported_claims" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "review_reasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "extraction_errors" TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Complete raw JSON extraction payload including full provenance snippets
    "raw_payload" JSONB NOT NULL,

    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Foreign Key constraint with cascade deletion on opportunity removal
    CONSTRAINT "fk_enrichment_opportunity" FOREIGN KEY ("opportunity_id")
        REFERENCES "opportunities"("id") ON DELETE CASCADE,

    -- Idempotency constraint across opportunity, text content, and versioning
    CONSTRAINT "uq_opportunity_enrichment_version" UNIQUE ("opportunity_id", "content_hash", "schema_version", "prompt_version")
);

-- 3. High-performance search and filter indexes for student discovery
CREATE INDEX IF NOT EXISTS "idx_enrichment_opp_current" ON "opportunity_enrichments" ("opportunity_id", "is_current");
CREATE INDEX IF NOT EXISTS "idx_enrichment_opp_type" ON "opportunity_enrichments" ("opportunity_type");
CREATE INDEX IF NOT EXISTS "idx_enrichment_work_mode" ON "opportunity_enrichments" ("work_mode");
CREATE INDEX IF NOT EXISTS "idx_enrichment_deadline" ON "opportunity_enrichments" ("application_deadline");
CREATE INDEX IF NOT EXISTS "idx_enrichment_status_review" ON "opportunity_enrichments" ("status", "needs_manual_review");
CREATE INDEX IF NOT EXISTS "idx_enrichment_hash" ON "opportunity_enrichments" ("content_hash");

-- Array GIN indexes for fast student filtering on multi-value attributes
CREATE INDEX IF NOT EXISTS "idx_enrichment_req_skills" ON "opportunity_enrichments" USING GIN ("required_skills");
CREATE INDEX IF NOT EXISTS "idx_enrichment_pref_skills" ON "opportunity_enrichments" USING GIN ("preferred_skills");
CREATE INDEX IF NOT EXISTS "idx_enrichment_branches" ON "opportunity_enrichments" USING GIN ("branches");
CREATE INDEX IF NOT EXISTS "idx_enrichment_grad_years" ON "opportunity_enrichments" USING GIN ("graduation_years");
CREATE INDEX IF NOT EXISTS "idx_enrichment_degree_levels" ON "opportunity_enrichments" USING GIN ("degree_levels");
CREATE INDEX IF NOT EXISTS "idx_enrichment_cities" ON "opportunity_enrichments" USING GIN ("cities");

-- ==============================================================================
-- DOWN MIGRATION (ROLLBACK PATH)
-- ==============================================================================
/*
DROP INDEX IF EXISTS "idx_enrichment_cities";
DROP INDEX IF EXISTS "idx_enrichment_degree_levels";
DROP INDEX IF EXISTS "idx_enrichment_grad_years";
DROP INDEX IF EXISTS "idx_enrichment_branches";
DROP INDEX IF EXISTS "idx_enrichment_pref_skills";
DROP INDEX IF EXISTS "idx_enrichment_req_skills";
DROP INDEX IF EXISTS "idx_enrichment_hash";
DROP INDEX IF EXISTS "idx_enrichment_status_review";
DROP INDEX IF EXISTS "idx_enrichment_deadline";
DROP INDEX IF EXISTS "idx_enrichment_work_mode";
DROP INDEX IF EXISTS "idx_enrichment_opp_type";
DROP INDEX IF EXISTS "idx_enrichment_opp_current";

DROP TABLE IF EXISTS "opportunity_enrichments";
DROP TYPE IF EXISTS "EnrichmentStatus";
*/
