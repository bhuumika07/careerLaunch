// src/lib/services/enrichment/enrichmentService.ts
/**
 * Enrichment Service for Opportunity Extraction & Persistence
 *
 * Core Invariants:
 * 1. Raw Opportunity.description is NEVER modified.
 * 2. Idempotency: identical content_hash under same prompt/schema version skips redundant LLM calls.
 * 3. Historical versioning: prior enrichments are kept with isCurrent = false.
 * 4. Isolation: extraction failures never block ingestion or alter opportunity availability.
 */

import { randomUUID } from "node:crypto";
import { processDescription } from "./normalizer.ts";
import {
  extractOpportunityEnrichment,
  PROMPT_VERSION,
  SCHEMA_VERSION,
} from "./extractor.ts";
import type { LlmExtractionClient } from "./llmClient.ts";
import type { OpportunityEnrichmentPayload } from "./types.ts";

export interface ProcessEnrichmentParams {
  opportunityId: string;
  forceReprocess?: boolean;
  triggeredBy?: string;
}

export interface EnrichmentServiceResult {
  success: boolean;
  opportunityId: string;
  enrichmentId?: string;
  status: string;
  contentHash: string;
  isCurrent: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
}

export class OpportunityEnrichmentService {
  private prisma: any;
  private llmClient: LlmExtractionClient;

  constructor(prisma: any, llmClient: LlmExtractionClient) {
    this.prisma = prisma;
    this.llmClient = llmClient;
  }

  /**
   * Processes opportunity enrichment end-to-end.
   */
  async enrichOpportunity(
    params: ProcessEnrichmentParams
  ): Promise<EnrichmentServiceResult> {
    const { opportunityId, forceReprocess } = params;

    // 1. Fetch Opportunity without altering it
    const opp = await this.prisma.opportunity.findUnique({
      where: { id: opportunityId },
    });

    if (!opp) {
      throw new Error(`Opportunity with ID "${opportunityId}" not found`);
    }

    const rawDescription = opp.description || opp.originalText || "";

    if (!rawDescription.trim()) {
      return {
        success: false,
        opportunityId,
        status: "failed",
        contentHash: "",
        isCurrent: false,
        error: "Opportunity description is empty",
      };
    }

    // 2. Normalize description and compute SHA-256 content_hash
    const { normalizedText, contentHash } = processDescription(rawDescription);

    // 3. Idempotency check: see if already successfully enriched with this content_hash
    if (!forceReprocess && this.prisma.opportunityEnrichment) {
      const existing = await this.prisma.opportunityEnrichment.findFirst({
        where: {
          opportunityId,
          contentHash,
          schemaVersion: SCHEMA_VERSION,
          promptVersion: PROMPT_VERSION,
          status: { in: ["succeeded", "needs_review"] },
        },
      });

      if (existing) {
        return {
          success: true,
          opportunityId,
          enrichmentId: existing.id,
          status: existing.status,
          contentHash,
          isCurrent: existing.isCurrent,
          skipped: true,
          reason: "Identical content_hash already successfully enriched",
        };
      }
    }

    // 4. Invoke AI extraction engine
    const extractionResult = await extractOpportunityEnrichment(
      {
        opportunity_id: opportunityId,
        raw_title: opp.title || opp.roleTitle || "Untitled Opportunity",
        raw_company: opp.organizationName || opp.employer || opp.company || "Unknown Organization",
        posted_at: opp.postedAt ? new Date(opp.postedAt).toISOString() : null,
        source_url: opp.sourceUrl || opp.applicationUrl || null,
        normalized_description: normalizedText,
      },
      this.llmClient
    );

    const now = new Date();
    const enrichmentId = randomUUID();

    // 5. Handle Extraction Failure
    if (!extractionResult.success || !extractionResult.payload) {
      const failedRecord = {
        id: enrichmentId,
        opportunityId,
        status: "failed",
        extractionModel: "llm-enricher",
        promptVersion: PROMPT_VERSION,
        schemaVersion: SCHEMA_VERSION,
        contentHash,
        processedAt: now,
        retryCount: extractionResult.attempts,
        errorDetails: { error: extractionResult.error || "Extraction failed" },
        isCurrent: false,
        rawPayload: {},
      };

      if (this.prisma.opportunityEnrichment) {
        await this.prisma.opportunityEnrichment.create({
          data: failedRecord,
        });
      }

      return {
        success: false,
        opportunityId,
        enrichmentId,
        status: "failed",
        contentHash,
        isCurrent: false,
        error: extractionResult.error,
      };
    }

    // 6. Extraction Succeeded: Map to structured database record
    const payload: OpportunityEnrichmentPayload = extractionResult.payload;
    const finalStatus = payload.quality.needs_manual_review ? "needs_review" : "succeeded";

    const enrichmentData = {
      id: enrichmentId,
      opportunityId,
      status: finalStatus,
      extractionModel: "llm-enricher",
      promptVersion: PROMPT_VERSION,
      schemaVersion: SCHEMA_VERSION,
      contentHash,
      processedAt: now,
      retryCount: extractionResult.attempts,
      isCurrent: true,

      // Basic
      roleTitle: payload.basic.role_title,
      company: payload.basic.company,
      department: payload.basic.department,
      descriptionSummary: payload.basic.description_summary,
      opportunityType: payload.opportunity_type.primary_type,
      workMode: payload.location.work_mode,
      country: payload.location.country,
      stateOrRegion: payload.location.state_or_region,
      cities: payload.location.cities || [],
      isWorldwide: payload.location.is_worldwide || false,

      // Qualifications
      degreeLevels: payload.qualifications.degree_levels || [],
      branches: payload.qualifications.branches || [],
      graduationYears: payload.qualifications.graduation_years || [],
      minCgpa: payload.qualifications.min_cgpa,
      academicRequirements: payload.qualifications.academic_requirements,
      workAuthorization: payload.eligibility.work_authorization,
      explicitRestrictions: payload.eligibility.explicit_restrictions || [],
      targetAudience: payload.eligibility.target_audience,

      // Experience
      experienceLevel: payload.experience.experience_level,
      minExperienceMonths: payload.experience.min_experience_months,
      maxExperienceMonths: payload.experience.max_experience_months,

      // Three-Tier Skills
      requiredSkills: (payload.skills.required_skills || []).map((s) => s.name),
      preferredSkills: (payload.skills.preferred_skills || []).map((s) => s.name),
      inferredSkills: (payload.skills.inferred_skills || []).map((s) => s.name),

      // Compensation
      isPaid: payload.compensation.is_paid,
      currency: payload.compensation.currency,
      minAmount: payload.compensation.min_amount,
      maxAmount: payload.compensation.max_amount,
      compensationInterval: payload.compensation.interval,
      compensationVerbatim: payload.compensation.text_verbatim,

      // Timeline
      applicationDeadline: payload.timeline.application_deadline
        ? new Date(payload.timeline.application_deadline)
        : null,
      startDate: payload.timeline.start_date,
      durationText: payload.timeline.duration_text,

      // Confidence & Review
      overallConfidence: payload.confidence.overall_score,
      fieldConfidences: payload.confidence.field_scores,
      needsManualReview: payload.quality.needs_manual_review,
      missingFields: payload.quality.missing_fields || [],
      unsupportedClaims: payload.quality.unsupported_claims || [],
      reviewReasons: payload.quality.review_reasons || [],
      extractionErrors: payload.quality.extraction_errors || [],

      // Complete raw JSON payload
      rawPayload: payload,
    };

    // 7. Atomic persistence: retire older versions to isCurrent = false, insert new version
    if (this.prisma.$transaction) {
      await this.prisma.$transaction(async (tx: any) => {
        if (tx.opportunityEnrichment) {
          // Retire existing versions
          await tx.opportunityEnrichment.updateMany({
            where: { opportunityId },
            data: { isCurrent: false },
          });

          // Insert new active version
          await tx.opportunityEnrichment.create({
            data: enrichmentData,
          });
        }
      });
    } else if (this.prisma.opportunityEnrichment) {
      await this.prisma.opportunityEnrichment.create({
        data: enrichmentData,
      });
    }

    return {
      success: true,
      opportunityId,
      enrichmentId,
      status: finalStatus,
      contentHash,
      isCurrent: true,
    };
  }
}
