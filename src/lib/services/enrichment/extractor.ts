// src/lib/services/enrichment/extractor.ts
/**
 * Module 3.2: AI Extraction Engine & Validation Pipeline
 * Strictly executes extraction contract defined in docs/phase3/extraction-contract.md
 */

import type {
  OpportunityEnrichmentPayload,
  OpportunityType,
  WorkMode,
  ExperienceLevel,
  ProvenanceSnippet,
} from "./types.ts";
import type { LlmExtractionClient } from "./llmClient.ts";

export const PROMPT_VERSION = "2026-11-v1.0.0";
export const SCHEMA_VERSION = "1.0.0";

export interface ExtractionInput {
  opportunity_id: string;
  raw_title: string;
  raw_company: string;
  posted_at?: string | null;
  source_url?: string | null;
  normalized_description: string;
}

export interface ExtractionPipelineResult {
  success: boolean;
  payload?: OpportunityEnrichmentPayload;
  error?: string;
  attempts: number;
  durationMs: number;
}

export interface ExtractionOptions {
  maxRetries?: number;
  retryBaseDelayMs?: number;
}

/**
 * Builds the versioned system and user prompt for the LLM.
 */
export function buildExtractionPrompts(input: ExtractionInput): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = `You are a high-precision, factual data extraction engine for student career opportunities.
Your sole job is to extract structured information from the provided job listing into valid, strict JSON matching schema version ${SCHEMA_VERSION}.

STRICT INVARIANTS:
1. ONLY extract information that is explicitly stated in the source text.
2. If a field is not explicitly mentioned, return null (or an empty array for list fields). DO NOT invent, assume, or infer missing facts.
3. Keep skills strictly separated:
   - "required_skills": Only skills explicitly stated as required, mandatory, or minimum requirements.
   - "preferred_skills": Only skills stated as nice-to-have, bonus, plus, or preferred.
   - "inferred_skills": Skills not explicitly stated, but strongly implied by the role.
4. For every significant extracted value, provide a "provenance" object containing the verbatim substring ("source_snippet") where the information appears.
5. If the listing contains contradictions (e.g. title says "Intern" but text demands "5+ years of experience"), extract what is written, record the contradiction in "unsupported_claims", and flag "needs_manual_review": true.
6. Return raw, valid JSON only. Do not wrap in markdown or add conversational filler.`;

  const userPrompt = `Extract structured data from the following job listing.

[METADATA]
Opportunity ID: ${input.opportunity_id}
Raw Title: ${input.raw_title}
Raw Company: ${input.raw_company}
Posted Date: ${input.posted_at || "Not provided"}
Source URL: ${input.source_url || "Not provided"}

[NORMALIZED DESCRIPTION]
${input.normalized_description}`;

  return { systemPrompt, userPrompt };
}

/**
 * Strips markdown code blocks if the LLM returned JSON wrapped in ```json ... ```
 */
export function cleanJsonOutput(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return cleaned.trim();
}

/**
 * Validates whether a source snippet exists verbatim in the normalized text
 * and computes exact 0-indexed character offsets (char_start, char_end).
 */
export function verifyAndGroundSnippet(
  snippet: string | null | undefined,
  normalizedText: string
): {
  grounded: boolean;
  snippet: string | null;
  char_start: number | null;
  char_end: number | null;
} {
  if (!snippet || !snippet.trim()) {
    return { grounded: true, snippet: null, char_start: null, char_end: null };
  }

  const cleanSnippet = snippet.trim();
  const index = normalizedText.toLowerCase().indexOf(cleanSnippet.toLowerCase());

  if (index === -1) {
    return {
      grounded: false,
      snippet: cleanSnippet,
      char_start: null,
      char_end: null,
    };
  }

  // Exact bounds based on normalizedText
  const char_start = index;
  const char_end = index + cleanSnippet.length;

  return {
    grounded: true,
    snippet: cleanSnippet,
    char_start,
    char_end,
  };
}

/**
 * Calculates weighted confidence score per contract section 5.1:
 * - Skills: 25%
 * - Opportunity Type: 20%
 * - Qualifications & Experience: 20%
 * - Location & Work Mode: 15%
 * - Compensation: 10%
 * - Timeline / Deadline: 10%
 */
export function calculateWeightedConfidence(
  fieldScores: Record<string, number>
): number {
  const weights: Record<string, number> = {
    skills: 0.25,
    opportunity_type: 0.20,
    qualifications: 0.20,
    location: 0.15,
    compensation: 0.10,
    timeline: 0.10,
  };

  let totalScore = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const score = typeof fieldScores[key] === "number" ? Math.max(0, Math.min(1, fieldScores[key])) : 0.5;
    totalScore += score * weight;
    totalWeight += weight;
  }

  const overall = totalWeight > 0 ? totalScore / totalWeight : 0.5;
  return Math.round(overall * 100) / 100;
}

/**
 * Evaluates deterministic human review rules and grounds provenance snippets.
 */
export function postProcessAndGroundPayload(
  payload: any,
  normalizedText: string
): OpportunityEnrichmentPayload {
  // Ensure default root structures exist for defensive safety
  payload.quality = payload.quality || {
    missing_fields: [],
    unsupported_claims: [],
    extraction_errors: [],
    needs_manual_review: false,
    review_reasons: [],
  };

  payload.skills = payload.skills || {
    required_skills: [],
    preferred_skills: [],
    inferred_skills: [],
  };
  payload.skills.required_skills = payload.skills.required_skills || [];
  payload.skills.preferred_skills = payload.skills.preferred_skills || [];
  payload.skills.inferred_skills = payload.skills.inferred_skills || [];

  payload.qualifications = payload.qualifications || {
    degree_levels: [],
    branches: [],
    graduation_years: [],
    min_cgpa: null,
    academic_requirements: null,
  };
  payload.qualifications.degree_levels = payload.qualifications.degree_levels || [];
  payload.qualifications.branches = payload.qualifications.branches || [];
  payload.qualifications.graduation_years = payload.qualifications.graduation_years || [];

  payload.experience = payload.experience || {
    experience_level: "unknown",
    min_experience_months: null,
    max_experience_months: null,
  };

  payload.location = payload.location || {
    work_mode: "unknown",
    cities: [],
    is_worldwide: false,
  };

  payload.timeline = payload.timeline || {
    application_deadline: null,
    start_date: null,
    duration_text: null,
  };

  payload.eligibility = payload.eligibility || {
    work_authorization: null,
    explicit_restrictions: [],
    target_audience: null,
  };
  payload.eligibility.explicit_restrictions = payload.eligibility.explicit_restrictions || [];

  payload.confidence = payload.confidence || {
    overall_score: 0.8,
    field_scores: {},
  };
  payload.confidence.field_scores = payload.confidence.field_scores || {};

  const unsupportedClaims: string[] = [...(payload.quality.unsupported_claims || [])];
  const reviewReasons: string[] = [...(payload.quality.review_reasons || [])];
  const extractionErrors: string[] = [...(payload.quality.extraction_errors || [])];
  const missingFields: string[] = [...(payload.quality.missing_fields || [])];

  // Helper to ground provenance object
  const groundProvenance = (prov: ProvenanceSnippet | null | undefined, fieldName: string): ProvenanceSnippet | null => {
    if (!prov || !prov.source_snippet) return null;
    const check = verifyAndGroundSnippet(prov.source_snippet, normalizedText);
    if (!check.grounded) {
      unsupportedClaims.push(
        `Field "${fieldName}" cites snippet "${prov.source_snippet}" which does not exist verbatim in source text.`
      );
      return {
        source_snippet: prov.source_snippet,
        char_start: null,
        char_end: null,
      };
    }
    return {
      source_snippet: check.snippet!,
      char_start: check.char_start,
      char_end: check.char_end,
    };
  };

  // 1. Ground main provenance snippets
  if (payload.opportunity_type) {
    payload.opportunity_type.provenance = groundProvenance(payload.opportunity_type.provenance, "opportunity_type");
  }
  if (payload.qualifications) {
    payload.qualifications.provenance = groundProvenance(payload.qualifications.provenance, "qualifications");
  }
  if (payload.experience) {
    payload.experience.provenance = groundProvenance(payload.experience.provenance, "experience");
  }
  if (payload.location) {
    payload.location.provenance = groundProvenance(payload.location.provenance, "location");
  }
  if (payload.compensation) {
    payload.compensation.provenance = groundProvenance(payload.compensation.provenance, "compensation");
  }
  if (payload.timeline) {
    payload.timeline.provenance = groundProvenance(payload.timeline.provenance, "timeline");
  }
  if (payload.eligibility) {
    payload.eligibility.provenance = groundProvenance(payload.eligibility.provenance, "eligibility");
  }

  // 2. Ground required & preferred skill snippets and enforce skills separation
  for (const skill of payload.skills.required_skills) {
    if (skill.source_snippet) {
      const check = verifyAndGroundSnippet(skill.source_snippet, normalizedText);
      if (!check.grounded) {
        unsupportedClaims.push(`Required skill "${skill.name}" snippet "${skill.source_snippet}" not found in source text.`);
      }

      // Enforce skills separation rule: preferred skill wrongly placed in required_skills
      const lowerSnip = skill.source_snippet.toLowerCase();
      if (/\b(?:preferred|nice to have|plus|bonus|optional|advantageous)\b/i.test(lowerSnip)) {
        extractionErrors.push(
          `Skills separation violation: Skill "${skill.name}" contains preferred marker in snippet "${skill.source_snippet}" but was placed in required_skills.`
        );
        reviewReasons.push(
          `Preferred skill "${skill.name}" was wrongly placed in required_skills.`
        );
      }
    }
  }

  for (const skill of payload.skills.preferred_skills) {
    if (skill.source_snippet) {
      const check = verifyAndGroundSnippet(skill.source_snippet, normalizedText);
      if (!check.grounded) {
        unsupportedClaims.push(`Preferred skill "${skill.name}" snippet "${skill.source_snippet}" not found in source text.`);
      }
    }
  }

  // 3. Schema & Enum Validation
  const VALID_PRIMARY_TYPES = [
    "internship",
    "full_time",
    "part_time",
    "contract",
    "fellowship",
    "research",
    "job",
    "unknown",
  ];
  if (!VALID_PRIMARY_TYPES.includes(payload.opportunity_type.primary_type)) {
    extractionErrors.push(
      `Invalid opportunity_type: "${payload.opportunity_type.primary_type}". Must be one of: ${VALID_PRIMARY_TYPES.join(", ")}`
    );
    reviewReasons.push(`Schema violation: Invalid opportunity_type enum "${payload.opportunity_type.primary_type}".`);
  }

  const VALID_WORK_MODES = ["onsite", "remote", "hybrid", "unspecified", "unknown"];
  if (payload.location && !VALID_WORK_MODES.includes(payload.location.work_mode)) {
    extractionErrors.push(
      `Invalid work_mode: "${payload.location.work_mode}". Must be one of: ${VALID_WORK_MODES.join(", ")}`
    );
    reviewReasons.push(`Schema violation: Invalid work_mode enum "${payload.location.work_mode}".`);
  }

  const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)?$/;
  if (
    payload.timeline?.application_deadline &&
    !ISO_DATE_REGEX.test(payload.timeline.application_deadline)
  ) {
    extractionErrors.push(
      `Invalid date format for application_deadline: "${payload.timeline.application_deadline}". Expected YYYY-MM-DD or ISO-8601.`
    );
    reviewReasons.push("Schema violation: Invalid deadline date format.");
  }

  // 3. Contradiction Detection:
  // Role is intern/internship but demands > 24 months experience
  const isInternRole =
    payload.opportunity_type.primary_type === "internship" ||
    payload.basic.role_title.toLowerCase().includes("intern");

  if (isInternRole && (payload.experience.min_experience_months || 0) > 24) {
    reviewReasons.push(
      `Contradiction: Role is classified as an internship, but requires ${payload.experience.min_experience_months} months (>2 years) experience.`
    );
  }

  // Conflicting Remote vs daily commute
  if (payload.location?.work_mode === "remote" && Array.isArray(payload.location?.cities) && payload.location.cities.length > 0) {
    const locSnippet = (payload.location.provenance?.source_snippet || "").toLowerCase();
    if (locSnippet.includes("commute") || locSnippet.includes("headquarters") || locSnippet.includes("office daily")) {
      reviewReasons.push("Contradiction: Work mode listed as remote but requires daily physical office attendance.");
    }
  }

  // Compensation min > max
  if (
    payload.compensation &&
    payload.compensation.min_amount != null &&
    payload.compensation.max_amount != null &&
    payload.compensation.min_amount > payload.compensation.max_amount
  ) {
    reviewReasons.push(`Invalid compensation: min_amount (${payload.compensation.min_amount}) > max_amount (${payload.compensation.max_amount}).`);
  }

  // Check missing required fields
  if (payload.opportunity_type?.primary_type === "unknown") {
    missingFields.push("opportunity_type.primary_type");
  }
  if (!payload.timeline?.application_deadline) {
    missingFields.push("timeline.application_deadline");
  }
  if (!payload.qualifications?.degree_levels || payload.qualifications.degree_levels.length === 0) {
    missingFields.push("qualifications.degree_levels");
  }

  // 4. Calculate weighted confidence
  const fieldScores = payload.confidence?.field_scores || {};
  const overallConfidence = calculateWeightedConfidence(fieldScores);
  payload.confidence.overall_score = overallConfidence;

  // 5. Deterministic needs_manual_review rule evaluation (Contract section 5.2)
  let needsManualReview = payload.quality.needs_manual_review || false;

  if (overallConfidence < 0.65) {
    needsManualReview = true;
    reviewReasons.push(`Low overall confidence (${overallConfidence} < 0.65 threshold).`);
  }

  if (unsupportedClaims.length > 0) {
    needsManualReview = true;
  }

  if (reviewReasons.length > 0) {
    needsManualReview = true;
  }

  payload.quality.needs_manual_review = needsManualReview;
  payload.quality.unsupported_claims = Array.from(new Set(unsupportedClaims));
  payload.quality.review_reasons = Array.from(new Set(reviewReasons));
  payload.quality.extraction_errors = Array.from(new Set(extractionErrors));
  payload.quality.missing_fields = Array.from(new Set(missingFields));

  // Enforce versions
  payload.schema_version = SCHEMA_VERSION;
  payload.prompt_version = PROMPT_VERSION;

  return payload;
}

/**
 * Primary Extraction Pipeline execution function.
 */
export async function extractOpportunityEnrichment(
  input: ExtractionInput,
  client: LlmExtractionClient,
  options: ExtractionOptions = {}
): Promise<ExtractionPipelineResult> {
  const startTime = performance.now();
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.retryBaseDelayMs ?? 100;

  const { systemPrompt, userPrompt } = buildExtractionPrompts(input);

  let currentPrompt = userPrompt;
  let attempts = 0;
  let lastError: string | null = null;

  while (attempts < maxRetries) {
    attempts++;
    try {
      const response = await client.generateCompletion({
        systemPrompt,
        userPrompt: currentPrompt,
        temperature: 0.1, // Low temperature for deterministic factual extraction
      });

      const cleanedText = cleanJsonOutput(response.rawText);

      let parsed: any;
      try {
        parsed = JSON.parse(cleanedText);
      } catch (parseErr: any) {
        lastError = `JSON parse error: ${parseErr.message}`;
        // Feedback loop for next attempt
        currentPrompt = `${userPrompt}\n\n[ERROR IN PREVIOUS ATTEMPT]: Output was malformed JSON (${parseErr.message}). You must output strictly valid JSON matching the schema with no markdown.`;
        if (attempts < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, baseDelayMs * Math.pow(2, attempts - 1)));
          continue;
        }
        break;
      }

      // Validate core required keys
      if (!parsed.basic || !parsed.opportunity_type || !parsed.skills) {
        lastError = "Response missing mandatory root keys (basic, opportunity_type, skills)";
        currentPrompt = `${userPrompt}\n\n[ERROR IN PREVIOUS ATTEMPT]: ${lastError}. Ensure all schema keys are present.`;
        if (attempts < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, baseDelayMs * Math.pow(2, attempts - 1)));
          continue;
        }
        break;
      }

      // Post-process, ground provenance against normalized text, and evaluate review triggers
      const processed = postProcessAndGroundPayload(parsed, input.normalized_description);

      return {
        success: true,
        payload: processed,
        attempts,
        durationMs: Math.round(performance.now() - startTime),
      };
    } catch (apiErr: any) {
      lastError = apiErr.message || "Unknown error during LLM invocation";
      if (attempts < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, baseDelayMs * Math.pow(2, attempts - 1)));
        continue;
      }
    }
  }

  return {
    success: false,
    error: lastError || "Extraction failed after exhausting retries",
    attempts,
    durationMs: Math.round(performance.now() - startTime),
  };
}
