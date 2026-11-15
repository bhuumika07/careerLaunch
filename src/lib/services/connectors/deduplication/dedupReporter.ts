// src/lib/services/connectors/deduplication/dedupReporter.ts
import type { ConnectorOpportunity } from "../types.ts";
import { DeduplicationEngine, type MergedOpportunity } from "./deduplicationEngine.ts";

export interface DeduplicationReport {
  timestamp: string;
  totalInputOpportunities: number;
  totalUniqueCanonical: number;
  totalDuplicatesMerged: number;
  deduplicationRatio: number; // percentage of input reduced
  matchLayerBreakdown: {
    canonicalUrlMatches: number;
    fingerprintMatches: number;
    fuzzyMatches: number;
  };
  provenanceCheck: {
    totalSourceReferencesRetained: number;
    zeroProvenanceLoss: boolean;
  };
  mergedExamples: Array<{
    canonicalId: string;
    title: string;
    organization: string;
    mergedSources: string[];
    sourceCount: number;
  }>;
}

/**
 * Executes a deduplication pass and generates a structured report.
 */
export function generateDeduplicationReport(
  opportunities: ConnectorOpportunity[]
): {
  engine: DeduplicationEngine;
  report: DeduplicationReport;
} {
  const engine = new DeduplicationEngine();
  const breakdown = {
    canonicalUrlMatches: 0,
    fingerprintMatches: 0,
    fuzzyMatches: 0,
  };

  let duplicatesMerged = 0;

  for (const opp of opportunities) {
    const res = engine.process(opp);
    if (!res.isNew) {
      duplicatesMerged++;
      if (res.matchType === "canonical_url") breakdown.canonicalUrlMatches++;
      else if (res.matchType === "fingerprint") breakdown.fingerprintMatches++;
      else if (res.matchType === "fuzzy") breakdown.fuzzyMatches++;
    }
  }

  const canonicals = engine.getOpportunities();

  // Provenance verification: count all retained source records
  let totalSourcesRetained = 0;
  for (const c of canonicals) {
    totalSourcesRetained += c.sourceProvenance.length;
  }

  const zeroProvenanceLoss = totalSourcesRetained === opportunities.length;

  const dedupRatio =
    opportunities.length > 0
      ? (duplicatesMerged / opportunities.length) * 100
      : 0;

  const mergedExamples = canonicals
    .filter((c) => c.sourceProvenance.length > 1)
    .map((c) => ({
      canonicalId: c.id,
      title: c.title,
      organization: c.organization,
      mergedSources: c.sourceProvenance.map((p) => `${p.sourceId} (${p.originalUrl})`),
      sourceCount: c.sourceProvenance.length,
    }));

  const report: DeduplicationReport = {
    timestamp: new Date().toISOString(),
    totalInputOpportunities: opportunities.length,
    totalUniqueCanonical: canonicals.length,
    totalDuplicatesMerged: duplicatesMerged,
    deduplicationRatio: parseFloat(dedupRatio.toFixed(2)),
    matchLayerBreakdown: breakdown,
    provenanceCheck: {
      totalSourceReferencesRetained: totalSourcesRetained,
      zeroProvenanceLoss,
    },
    mergedExamples,
  };

  return { engine, report };
}
