// src/lib/services/connectors/deduplication/deduplicationEngine.ts
/**
 * Chunk 5: Cross-Source Deduplication & Provenance Aggregation Engine
 *
 * Implements a 3-layer deduplication pipeline:
 * 1. Layer 1: Canonical Clean URL matching (strips utm params, tracking IDs)
 * 2. Layer 2: Deterministic Fingerprint matching (normalized company + canonical title + location + type)
 * 3. Layer 3: Fuzzy token similarity matching for slight naming variants
 *
 * Invariant: Never discards provenance. Merged records retain all source references.
 */

import { createHash } from "node:crypto";
import type { ConnectorOpportunity } from "../types.ts";
import {
  normalizeTitle,
  normalizeLocation,
  normalizeEmploymentType,
} from "../normalization/normalizationEngine.ts";

export interface OpportunitySourceProvenance {
  sourceId: string;
  originalUrl: string;
  sourceExternalId?: string | null;
  fetchedAt: string;
  lastVerifiedAt?: string | null;
  rawPayloadRef?: string | null;
}

export interface MergedOpportunity extends ConnectorOpportunity {
  canonicalFingerprint: string;
  sourceProvenance: OpportunitySourceProvenance[];
  mergeCount: number;
}

export interface DeduplicationMatchResult {
  isDuplicate: boolean;
  matchType: "canonical_url" | "fingerprint" | "fuzzy" | "none";
  similarityScore: number;
  matchedOppId?: string;
}

/**
 * Layer 1: Normalizes URLs by stripping tracking parameters, hash fragments, and trailing slashes.
 */
export function normalizeCanonicalUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.trim());
    parsed.hash = "";

    // Strip common tracking and referral query params
    const TRACKING_PARAMS = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gh_jid",
      "ref",
      "source",
      "fbclid",
      "gclid",
      "lever-source",
      "ashby_jid",
    ];

    for (const param of TRACKING_PARAMS) {
      parsed.searchParams.delete(param);
    }

    // Standardize pathname (remove trailing slash)
    let cleanPath = parsed.pathname.replace(/\/+$/, "");
    if (!cleanPath) cleanPath = "/";
    parsed.pathname = cleanPath;

    return parsed.toString();
  } catch {
    return rawUrl.trim().toLowerCase().replace(/\/+$/, "");
  }
}

/**
 * Normalizes organization name by stripping legal suffixes and punctuation.
 */
export function normalizeOrgName(org: string): string {
  return org
    .toLowerCase()
    .replace(/\b(inc|corp|corporation|llc|ltd|limited|technologies|tech|labs|co|group)\b/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Layer 2: Generates a deterministic SHA-256 fingerprint for title + company + location + type.
 */
export function generateOpportunityFingerprint(opp: {
  title: string;
  organization: string;
  location?: string | null;
  type?: string;
}): string {
  const normTitle = opp.title.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normOrg = normalizeOrgName(opp.organization);
  const normLoc = normalizeLocation(opp.location).city?.toLowerCase().replace(/[^a-z0-9]/g, "") || (opp.location?.toLowerCase().includes("remote") ? "remote" : "any");
  const normType = normalizeEmploymentType(opp.type, opp.title);

  const rawKey = `${normOrg}:${normTitle}:${normLoc}:${normType}`;
  return createHash("sha256").update(rawKey, "utf8").digest("hex");
}

/**
 * Layer 3: Computes Jaccard / N-Gram token similarity between two strings (0.0 to 1.0).
 */
export function calculateTokenSimilarity(strA: string, strB: string): number {
  const tokenize = (s: string) => {
    return new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 1)
    );
  };

  const tokensA = tokenize(strA);
  const tokensB = tokenize(strB);

  if (tokensA.size === 0 && tokensB.size === 0) return 1.0;
  if (tokensA.size === 0 || tokensB.size === 0) return 0.0;

  let intersectionCount = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      intersectionCount++;
    }
  }

  const unionCount = new Set([...tokensA, ...tokensB]).size;
  return intersectionCount / unionCount;
}

/**
 * Deduplication Engine
 */
export class DeduplicationEngine {
  private urlIndex = new Map<string, MergedOpportunity>();
  private fingerprintIndex = new Map<string, MergedOpportunity>();
  private opportunities: MergedOpportunity[] = [];

  constructor() {}

  /**
   * Resets all internal indices.
   */
  public clear(): void {
    this.urlIndex.clear();
    this.fingerprintIndex.clear();
    this.opportunities = [];
  }

  /**
   * Finds potential duplicate among existing opportunities.
   */
  public findDuplicate(
    candidate: ConnectorOpportunity,
    fuzzyThreshold: number = 0.85
  ): DeduplicationMatchResult {
    // 1. Layer 1: Canonical URL exact match
    const cleanUrl = normalizeCanonicalUrl(candidate.originalUrl);
    const urlMatch = this.urlIndex.get(cleanUrl);
    if (urlMatch) {
      return {
        isDuplicate: true,
        matchType: "canonical_url",
        similarityScore: 1.0,
        matchedOppId: urlMatch.id,
      };
    }

    // 2. Layer 2: Deterministic Fingerprint exact match
    const fingerprint = generateOpportunityFingerprint(candidate);
    const fpMatch = this.fingerprintIndex.get(fingerprint);
    if (fpMatch) {
      return {
        isDuplicate: true,
        matchType: "fingerprint",
        similarityScore: 1.0,
        matchedOppId: fpMatch.id,
      };
    }

    // 3. Layer 3: Fuzzy matching on title + organization
    const candLoc = normalizeLocation(candidate.location);
    const normCandOrg = normalizeOrgName(candidate.organization);

    for (const existing of this.opportunities) {
      // Must match organization closely
      const normExistOrg = normalizeOrgName(existing.organization);
      const orgSim =
        normCandOrg === normExistOrg
          ? 1.0
          : calculateTokenSimilarity(candidate.organization, existing.organization);
      if (orgSim < 0.7) continue;

      // Must have compatible workMode / location
      const existLoc = normalizeLocation(existing.location);
      const locCompatible =
        candLoc.isRemote ||
        existLoc.isRemote ||
        (candLoc.city && existLoc.city && candLoc.city.toLowerCase() === existLoc.city.toLowerCase());

      if (!locCompatible) continue;

      // Check title token similarity
      const titleSim = calculateTokenSimilarity(candidate.title, existing.title);

      const overallSim = (orgSim * 0.4) + (titleSim * 0.6);

      if (overallSim >= fuzzyThreshold) {
        return {
          isDuplicate: true,
          matchType: "fuzzy",
          similarityScore: overallSim,
          matchedOppId: existing.id,
        };
      }
    }

    return {
      isDuplicate: false,
      matchType: "none",
      similarityScore: 0.0,
    };
  }

  /**
   * Processes a candidate opportunity: either merges with existing or registers as new.
   * INVARIANT: Never discards provenance.
   */
  public process(candidate: ConnectorOpportunity): {
    opportunity: MergedOpportunity;
    isNew: boolean;
    matchType: string;
  } {
    const match = this.findDuplicate(candidate);
    const cleanUrl = normalizeCanonicalUrl(candidate.originalUrl);
    const fingerprint = generateOpportunityFingerprint(candidate);

    const sourceRef: OpportunitySourceProvenance = {
      sourceId: candidate.sourceId,
      originalUrl: candidate.originalUrl,
      sourceExternalId: candidate.sourceExternalId || null,
      fetchedAt: candidate.fetchedAt || new Date().toISOString(),
      lastVerifiedAt: candidate.lastVerifiedAt || new Date().toISOString(),
      rawPayloadRef: candidate.rawPayloadRef || null,
    };

    if (match.isDuplicate && match.matchedOppId) {
      // Find and merge with existing record
      const existing = this.opportunities.find((o) => o.id === match.matchedOppId)!;

      // Merge provenance (avoiding duplicate identical URLs within source)
      const alreadyHasExactUrl = existing.sourceProvenance.some(
        (p) => p.originalUrl === candidate.originalUrl && p.sourceId === candidate.sourceId
      );
      if (!alreadyHasExactUrl) {
        existing.sourceProvenance.push(sourceRef);
      }

      // Merge skills
      const mergedSkills = Array.from(new Set([...existing.skills, ...candidate.skills]));
      existing.skills = mergedSkills;

      // Enrich salary if candidate has one and existing doesn't
      if (!existing.salary && candidate.salary) {
        existing.salary = candidate.salary;
      }

      // Keep richest description
      if ((candidate.description?.length || 0) > (existing.description?.length || 0)) {
        existing.description = candidate.description;
      }

      existing.mergeCount++;
      existing.updatedAt = new Date().toISOString();

      // Index candidate's URL as well
      this.urlIndex.set(cleanUrl, existing);

      return {
        opportunity: existing,
        isNew: false,
        matchType: match.matchType,
      };
    }

    // Brand new opportunity
    const newMerged: MergedOpportunity = {
      ...candidate,
      canonicalFingerprint: fingerprint,
      sourceProvenance: [sourceRef],
      mergeCount: 1,
      createdAt: candidate.createdAt || new Date().toISOString(),
      updatedAt: candidate.updatedAt || new Date().toISOString(),
    };

    this.opportunities.push(newMerged);
    this.urlIndex.set(cleanUrl, newMerged);
    this.fingerprintIndex.set(fingerprint, newMerged);

    return {
      opportunity: newMerged,
      isNew: true,
      matchType: "none",
    };
  }

  /**
   * Returns all deduplicated opportunities.
   */
  public getOpportunities(): MergedOpportunity[] {
    return this.opportunities;
  }
}
