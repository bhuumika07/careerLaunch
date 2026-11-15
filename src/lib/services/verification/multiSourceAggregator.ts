// src/lib/services/verification/multiSourceAggregator.ts
import type { OpportunityLifecycleStatus } from "./decisionEngine.ts";
import type { VerificationOutcome } from "./types.ts";

export interface SourceListingContext {
  id: string;
  sourceId: string;
  externalId?: string | null;
  sourceUrl: string;
  applicationUrl?: string | null;
  verificationStatus: string;
  lastVerificationOutcome?: VerificationOutcome | null;
  lastVerificationAt?: Date | null;
  source: {
    id: string;
    name: string;
    status: string; // active | paused | failing | disabled
    healthStatus?: string; // HEALTHY | DEGRADED | FAILING | DISABLED
    complianceStatus?: string; // permitted | restricted | blocked | unreviewed
  };
}

export interface CanonicalOpportunityContext {
  id: string;
  status: OpportunityLifecycleStatus;
  applicationDeadline?: Date | null;
  lastVerifiedAt?: Date | null;
  closedAt?: Date | null;
}

export interface CanonicalAggregationResult {
  newStatus: OpportunityLifecycleStatus;
  lastVerificationOutcome: VerificationOutcome;
  lastVerifiedAt?: Date;
  closedAt?: Date | null;
  reason: string;
  reopenAllowed?: boolean;
}

/**
 * Multi-Source Canonical Opportunity Status Aggregator
 *
 * Rules:
 * 1. Disabled, paused, failing, or non-compliant sources are EXCLUDED and never infer closure.
 * 2. If at least one eligible source confirms AVAILABLE -> Canonical status is ACTIVE.
 *    (Documented rule: Positive availability on any authorized source keeps the job live for students).
 * 3. Canonical lastVerifiedAt is the latest timestamp among positive verifications.
 * 4. CLOSED only when ALL eligible authoritative sources confirm closure.
 * 5. Discrepancies without positive confirmation -> REVIEW_REQUIRED.
 * 6. CLOSED jobs returning with AVAILABLE evidence are evaluated via reopening policy.
 */
export function aggregateCanonicalOpportunityStatus(
  opportunity: CanonicalOpportunityContext,
  sources: SourceListingContext[],
  reopeningPolicy: (opp: CanonicalOpportunityContext) => boolean = () => false,
  now: Date = new Date()
): CanonicalAggregationResult {
  // 1. Check authoritative deadline
  if (
    opportunity.applicationDeadline &&
    opportunity.applicationDeadline.getTime() <= now.getTime()
  ) {
    return {
      newStatus: "EXPIRED",
      lastVerificationOutcome: "CLOSED",
      lastVerifiedAt: opportunity.lastVerifiedAt ?? undefined,
      closedAt: null,
      reason: "Application deadline has passed",
    };
  }

  // 2. Filter for eligible, active sources
  const eligibleSources = sources.filter((s) => {
    const src = s.source;
    if (src.status === "disabled" || src.status === "paused") return false;
    if (src.healthStatus === "FAILING" || src.healthStatus === "DISABLED") return false;
    if (src.complianceStatus === "blocked" || src.complianceStatus === "restricted") return false;
    return true;
  });

  if (eligibleSources.length === 0) {
    // No eligible active sources to evaluate
    return {
      newStatus: opportunity.status === "ACTIVE" ? "STALE" : opportunity.status,
      lastVerificationOutcome: "UNKNOWN",
      lastVerifiedAt: opportunity.lastVerifiedAt ?? undefined,
      closedAt: opportunity.closedAt,
      reason: "No active eligible sources available to verify",
    };
  }

  // 3. Check for any AVAILABLE sources
  const availableSources = eligibleSources.filter(
    (s) => s.lastVerificationOutcome === "AVAILABLE"
  );

  if (availableSources.length > 0) {
    // Find the most recent positive verification timestamp
    let latestVerifiedAt = opportunity.lastVerifiedAt || new Date(0);
    for (const s of availableSources) {
      if (s.lastVerificationAt && s.lastVerificationAt > latestVerifiedAt) {
        latestVerifiedAt = s.lastVerificationAt;
      }
    }

    // Check Reopening Policy if currently CLOSED
    if (opportunity.status === "CLOSED") {
      const allowed = reopeningPolicy(opportunity);
      if (allowed) {
        return {
          newStatus: "ACTIVE",
          lastVerificationOutcome: "AVAILABLE",
          lastVerifiedAt: latestVerifiedAt,
          closedAt: null,
          reopenAllowed: true,
          reason: `Reopening policy approved: Fresh authoritative evidence from ${availableSources.length} source(s)`,
        };
      }
      return {
        newStatus: "REVIEW_REQUIRED",
        lastVerificationOutcome: "AVAILABLE",
        lastVerifiedAt: latestVerifiedAt,
        closedAt: opportunity.closedAt,
        reopenAllowed: false,
        reason: "Job was CLOSED but source reported AVAILABLE. Flagged for review under reopening policy.",
      };
    }

    return {
      newStatus: "ACTIVE",
      lastVerificationOutcome: "AVAILABLE",
      lastVerifiedAt: latestVerifiedAt,
      closedAt: null,
      reason: `${availableSources.length} of ${eligibleSources.length} eligible source(s) confirm AVAILABLE`,
    };
  }

  // 4. Check if ALL eligible sources confirm CLOSED
  const closedSources = eligibleSources.filter(
    (s) => s.lastVerificationOutcome === "CLOSED"
  );

  if (closedSources.length === eligibleSources.length) {
    return {
      newStatus: "CLOSED",
      lastVerificationOutcome: "CLOSED",
      lastVerifiedAt: opportunity.lastVerifiedAt ?? undefined,
      closedAt: opportunity.closedAt || now,
      reason: `All ${eligibleSources.length} eligible sources confirm job is CLOSED`,
    };
  }

  // 5. Check for conflicts or mixed states
  const conflictSources = eligibleSources.filter(
    (s) => s.lastVerificationOutcome === "CONFLICT"
  );

  if (conflictSources.length > 0) {
    return {
      newStatus: "REVIEW_REQUIRED",
      lastVerificationOutcome: "CONFLICT",
      lastVerifiedAt: opportunity.lastVerifiedAt ?? undefined,
      closedAt: null,
      reason: "Sources report conflicting metadata or contradictory states",
    };
  }

  // 6. Default to current state or UNKNOWN
  return {
    newStatus: opportunity.status,
    lastVerificationOutcome: "UNKNOWN",
    lastVerifiedAt: opportunity.lastVerifiedAt ?? undefined,
    closedAt: opportunity.closedAt,
    reason: "No conclusive evidence to change canonical status",
  };
}
