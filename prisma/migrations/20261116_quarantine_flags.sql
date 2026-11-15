-- Migration: 20261116_quarantine_flags
-- Purpose: Add quarantine flags and data quality tracking to Opportunity and ConnectorOpportunity models.
-- Additive only: adds nullable or defaulted columns, creates indexes with IF NOT EXISTS.

-- 1. Add quarantine columns and index to Opportunity
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "isQuarantined" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "quarantineReasons" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "dataQualityScore" DOUBLE PRECISION;
CREATE INDEX IF NOT EXISTS "idx_opportunity_quarantined" ON "Opportunity"("isQuarantined");

-- 2. Add quarantine columns and index to ConnectorOpportunity
ALTER TABLE "ConnectorOpportunity" ADD COLUMN IF NOT EXISTS "isQuarantined" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ConnectorOpportunity" ADD COLUMN IF NOT EXISTS "quarantineReasons" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "ConnectorOpportunity" ADD COLUMN IF NOT EXISTS "dataQualityScore" DOUBLE PRECISION;
CREATE INDEX IF NOT EXISTS "idx_connector_opp_quarantined" ON "ConnectorOpportunity"("isQuarantined");
