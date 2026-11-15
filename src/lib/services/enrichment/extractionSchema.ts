// src/lib/services/enrichment/extractionSchema.ts
/**
 * Zod Schemas for Structured AI Opportunity Extraction (Phase 3 - Chunk 3.1)
 *
 * Enforces:
 * 1. Strict typing and validation for basic info, qualifications, compensation, work mode, eligibility.
 * 2. Strict separation of skills into required, preferred, and inferred tiers (never merged).
 * 3. Null-if-absent invariant: missing information must strictly be null or empty array.
 * 4. Provenance tracking: verbatim quotes from the original job listing.
 */

import { z } from "zod";

export const SCHEMA_VERSION = "1.0.0";
export const PROMPT_VERSION = "2026-11-v1.0.0";

/**
 * Provenance tracking schema for grounding extracted facts
 */
export const ProvenanceSnippetSchema = z.object({
  source_snippet: z.string().nullable(),
  char_start: z.number().int().min(0).nullable().optional(),
  char_end: z.number().int().min(0).nullable().optional(),
  confidence: z.number().min(0).max(1).optional(),
});
export type ProvenanceSnippetDto = z.infer<typeof ProvenanceSnippetSchema>;

/**
 * Basic Information
 */
export const BasicInfoSchema = z.object({
  role_title: z.string().min(1, "Role title cannot be empty"),
  description_summary: z.string().nullable().default(null),
  domain: z
    .enum([
      "software",
      "data_ai_ml",
      "design",
      "devops_cloud",
      "security",
      "product",
      "business",
      "other",
    ])
    .nullable()
    .default(null),
  provenance: ProvenanceSnippetSchema.optional(),
});

/**
 * Opportunity Type
 */
export const OpportunityTypeSchema = z.object({
  primary_type: z.enum([
    "internship",
    "full_time",
    "fellowship",
    "research",
    "contract",
    "unknown",
  ]),
  provenance: ProvenanceSnippetSchema.optional(),
});

/**
 * Skill Item Schema
 */
export const SkillItemSchema = z.object({
  name: z.string().min(1, "Skill name cannot be empty"),
  category: z
    .enum([
      "programming_language",
      "framework",
      "database",
      "cloud_devops",
      "tool",
      "core_concept",
      "soft_skill",
      "other",
    ])
    .default("other"),
  provenance: ProvenanceSnippetSchema.optional(),
});
export type SkillItemDto = z.infer<typeof SkillItemSchema>;

/**
 * Strict Skills Separation:
 * Required, Preferred, and Inferred skills MUST be strictly separated.
 * Required: explicitly stated as mandatory.
 * Preferred: nice-to-have, bonus, plus.
 * Inferred: not explicitly stated, but implied.
 */
export const SkillsSchema = z.object({
  required_skills: z.array(SkillItemSchema),
  preferred_skills: z.array(SkillItemSchema),
  inferred_skills: z.array(z.any()),
});

/**
 * Academic Qualifications & Eligibility
 */
export const QualificationsSchema = z.object({
  degree_levels: z
    .array(
      z.enum([
        "Bachelors",
        "Masters",
        "PhD",
        "Diploma",
        "Associate",
        "Other",
      ])
    )
    .default([]),
  branches: z.array(z.string()).default([]),
  graduation_years: z.array(z.number().int()).default([]),
  min_cgpa: z.number().min(0).max(10).nullable().default(null),
  academic_requirements: z.string().nullable().default(null),
  provenance: ProvenanceSnippetSchema.optional(),
});

/**
 * Professional Experience Eligibility
 */
export const ExperienceSchema = z.object({
  experience_level: z.enum([
    "entry",
    "mid",
    "senior",
    "lead",
    "director",
    "unspecified",
  ]),
  min_experience_months: z.number().int().min(0).nullable().default(null),
  max_experience_months: z.number().int().min(0).nullable().default(null),
  provenance: ProvenanceSnippetSchema.optional(),
});

/**
 * Compensation & Stipend
 */
export const CompensationSchema = z.object({
  is_paid: z.boolean().nullable().default(null),
  min_amount: z.number().nullable().default(null),
  max_amount: z.number().nullable().default(null),
  currency: z.string().nullable().default(null),
  interval: z
    .enum(["hourly", "monthly", "yearly", "stipend"])
    .nullable()
    .default(null),
  text_verbatim: z.string().nullable().default(null),
  provenance: ProvenanceSnippetSchema.optional(),
});

/**
 * Location & Work Mode
 */
export const WorkModeSchema = z.object({
  work_mode: z.enum(["remote", "hybrid", "onsite", "unspecified"]),
  locations: z
    .array(
      z.object({
        city: z.string().nullable().default(null),
        state: z.string().nullable().default(null),
        country: z.string().nullable().default(null),
        raw_location: z.string().nullable().default(null),
      })
    )
    .default([]),
  cities: z.array(z.string()).optional(),
  state_or_region: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  is_worldwide: z.boolean().optional(),
  provenance: ProvenanceSnippetSchema.optional(),
});

/**
 * Timeline & Deadlines
 */
export const TimelineSchema = z.object({
  application_deadline: z.string().nullable().default(null),
  start_date: z.string().nullable().default(null),
  duration_text: z.string().nullable().default(null),
  provenance: ProvenanceSnippetSchema.optional(),
});

/**
 * Work Authorization & Explicit Restrictions
 */
export const EligibilityRestrictionsSchema = z.object({
  work_authorization: z.string().nullable().default(null),
  explicit_restrictions: z.array(z.string()).default([]),
  target_audience: z.string().nullable().default(null),
  provenance: ProvenanceSnippetSchema.optional(),
});

/**
 * Quality Assessment
 */
export const QualityAssessmentSchema = z.object({
  missing_fields: z.array(z.string()).default([]),
  unsupported_claims: z.array(z.string()).default([]),
  extraction_errors: z.array(z.string()).default([]),
  needs_manual_review: z.boolean().default(false),
  review_reasons: z.array(z.string()).default([]),
});

/**
 * Extraction Metadata & Confidence Tracking
 */
export const ExtractionMetadataSchema = z.object({
  schema_version: z.string().default(SCHEMA_VERSION),
  prompt_version: z.string().default(PROMPT_VERSION),
  extracted_at: z.string(),
  overall_confidence: z.number().min(0).max(1),
  missing_fields: z.array(z.string()).default([]),
  needs_manual_review: z.boolean().default(false),
  unsupported_claims: z.array(z.any()).default([]),
});

/**
 * Top-Level Canonical Extraction Payload Schema
 */
export const ExtractionPayloadSchema = z.object({
  opportunity_id: z.string().min(1, "opportunity_id is required"),
  basic: BasicInfoSchema,
  opportunity_type: OpportunityTypeSchema,
  skills: SkillsSchema,
  qualifications: QualificationsSchema,
  experience: ExperienceSchema,
  compensation: CompensationSchema.nullable().default(null),
  location: WorkModeSchema,
  timeline: TimelineSchema.optional(),
  eligibility: EligibilityRestrictionsSchema.optional(),
  quality: QualityAssessmentSchema.optional(),
  metadata: ExtractionMetadataSchema.optional(),
});

export type ValidatedExtractionPayload = z.infer<typeof ExtractionPayloadSchema>;

/**
 * Helper to safely validate raw LLM JSON output against the Zod schema.
 */
export function validateExtractionPayload(rawJson: unknown): {
  success: boolean;
  data?: ValidatedExtractionPayload;
  error?: z.ZodError;
} {
  const result = ExtractionPayloadSchema.safeParse(rawJson);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
