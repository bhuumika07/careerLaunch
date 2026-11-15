// src/lib/services/enrichment/types.ts
/**
 * TypeScript definitions for Phase 3: AI Opportunity Enrichment
 * Aligned strictly with docs/phase3/extraction-contract.md
 */

export type OpportunityType =
  | 'internship'
  | 'full_time'
  | 'part_time'
  | 'contract'
  | 'unknown';

export type WorkMode = 'remote' | 'hybrid' | 'onsite' | 'unknown';

export type ExperienceLevel =
  | 'entry'
  | 'mid'
  | 'senior'
  | 'lead'
  | 'executive'
  | 'unknown';

export type DegreeLevel =
  | 'Bachelors'
  | 'Masters'
  | 'PhD'
  | 'Associate'
  | 'HighSchool'
  | 'Any'
  | 'Other';

export type CompensationInterval =
  | 'hourly'
  | 'monthly'
  | 'yearly'
  | 'stipend_total';

export type EnrichmentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'needs_review';

export interface ProvenanceSnippet {
  source_snippet: string;
  char_start?: number | null;
  char_end?: number | null;
}

export interface SkillItem {
  name: string;
  category:
    | 'programming_language'
    | 'framework'
    | 'database'
    | 'cloud_devops'
    | 'tool'
    | 'soft_skill'
    | 'domain_knowledge'
    | 'other';
  source_snippet?: string | null;
}

export interface InferredSkillItem {
  name: string;
  rationale: string;
}

export interface OpportunityEnrichmentPayload {
  schema_version: string;
  prompt_version: string;
  basic: {
    role_title: string;
    company: string;
    department?: string | null;
    description_summary: string;
  };
  opportunity_type: {
    primary_type: OpportunityType;
    provenance: ProvenanceSnippet | null;
  };
  skills: {
    required_skills: SkillItem[];
    preferred_skills: SkillItem[];
    inferred_skills: InferredSkillItem[];
  };
  qualifications: {
    degree_levels: DegreeLevel[];
    branches: string[];
    graduation_years: number[];
    min_cgpa?: number | null;
    academic_requirements?: string | null;
    provenance?: ProvenanceSnippet | null;
  };
  experience: {
    experience_level: ExperienceLevel;
    min_experience_months?: number | null;
    max_experience_months?: number | null;
    provenance?: ProvenanceSnippet | null;
  };
  location: {
    work_mode: WorkMode;
    cities: string[];
    state_or_region?: string | null;
    country?: string | null;
    is_worldwide: boolean;
    provenance?: ProvenanceSnippet | null;
  };
  compensation: {
    is_paid?: boolean | null;
    currency?: string | null;
    min_amount?: number | null;
    max_amount?: number | null;
    interval?: CompensationInterval | null;
    text_verbatim?: string | null;
    provenance?: ProvenanceSnippet | null;
  };
  timeline: {
    application_deadline?: string | null; // ISO-8601 YYYY-MM-DD
    start_date?: string | null;
    duration_text?: string | null;
    provenance?: ProvenanceSnippet | null;
  };
  eligibility: {
    work_authorization?: string | null;
    explicit_restrictions: string[];
    target_audience?: string | null;
    provenance?: ProvenanceSnippet | null;
  };
  confidence: {
    overall_score: number;
    field_scores: Record<string, number>;
  };
  quality: {
    missing_fields: string[];
    unsupported_claims: string[];
    extraction_errors: string[];
    needs_manual_review: boolean;
    review_reasons: string[];
  };
}

export interface OpportunityEnrichmentEntity {
  id: string;
  opportunityId: string;
  status: EnrichmentStatus;
  extractionModel: string;
  promptVersion: string;
  schemaVersion: string;
  contentHash: string;
  processedAt?: Date | null;
  retryCount: number;
  errorDetails?: Record<string, unknown> | null;
  isCurrent: boolean;

  // Flattened searchable fields
  roleTitle?: string | null;
  company?: string | null;
  department?: string | null;
  descriptionSummary?: string | null;
  opportunityType?: OpportunityType | null;
  workMode?: WorkMode | null;
  country?: string | null;
  stateOrRegion?: string | null;
  cities: string[];
  isWorldwide: boolean;

  degreeLevels: DegreeLevel[];
  branches: string[];
  graduationYears: number[];
  minCgpa?: number | null;
  academicRequirements?: string | null;
  workAuthorization?: string | null;
  explicitRestrictions: string[];
  targetAudience?: string | null;

  experienceLevel?: ExperienceLevel | null;
  minExperienceMonths?: number | null;
  maxExperienceMonths?: number | null;

  requiredSkills: string[];
  preferredSkills: string[];
  inferredSkills: string[];

  isPaid?: boolean | null;
  currency?: string | null;
  minAmount?: number | null;
  maxAmount?: number | null;
  compensationInterval?: CompensationInterval | null;
  compensationVerbatim?: string | null;

  applicationDeadline?: Date | null;
  startDate?: string | null;
  durationText?: string | null;

  overallConfidence?: number | null;
  fieldConfidences?: Record<string, number> | null;
  needsManualReview: boolean;
  missingFields: string[];
  unsupportedClaims: string[];
  reviewReasons: string[];
  extractionErrors: string[];

  rawPayload: OpportunityEnrichmentPayload;
  createdAt: Date;
  updatedAt: Date;
}
