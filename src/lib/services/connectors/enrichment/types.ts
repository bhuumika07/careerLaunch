// src/lib/services/connectors/enrichment/types.ts
/**
 * Chunk 6: AI Enrichment Types & Contracts
 */

export type EnrichmentDomain =
  | "software"
  | "data_ai_ml"
  | "design"
  | "business"
  | "security"
  | "devops_cloud"
  | "product"
  | "other";

export interface SkillExtractionResult {
  technicalSkills: string[];
  softSkills: string[];
  toolsAndFrameworks: string[];
  allSkills: string[];
}

export interface FresherEvaluation {
  isFresherFriendly: boolean;
  confidence: number; // 0.0 to 1.0
  reasons: string[];
  minYears: number;
  maxYears?: number;
}

export interface OpportunityEnrichment {
  domain: EnrichmentDomain;
  skills: SkillExtractionResult;
  fresherEvaluation: FresherEvaluation;
  summary: string | null;
  enrichmentTimestamp: string;
}
