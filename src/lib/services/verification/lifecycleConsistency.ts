// src/lib/services/verification/lifecycleConsistency.ts
/**
 * Opportunity Lifecycle Consistency & Recommendation Filter (Phase 2 - Chunk 2.2)
 *
 * Implements:
 * 1. Authoritative status mapping:
 *    Maps ACTIVE / STALE / CLOSED / EXPIRED / REMOVED / REJECTED onto canonical lifecycle states.
 * 2. Central `isRecommendable()` predicate:
 *    Strict Invariant: ONLY ACTIVE counts for normal student recommendations.
 *    Opportunities that are EXPIRED (past deadline), CLOSED, STALE (exceeding freshness window),
 *    REMOVED, or REJECTED are strictly excluded.
 * 3. Saved Application Invariant:
 *    Even if an opportunity transitions to CLOSED, EXPIRED, STALE, or REJECTED, existing saved/tracked
 *    applications for that opportunity remain accessible to student owners.
 */

export type CanonicalLifecycleStatus =
  | "ACTIVE"
  | "STALE"
  | "CLOSED"
  | "EXPIRED"
  | "REMOVED"
  | "REJECTED"
  | "PENDING"
  | "REVIEW_REQUIRED";

export interface LifecycleNormalizationOptions {
  deadline?: string | Date | null;
  lastVerifiedAt?: string | Date | null;
  freshnessThresholdHours?: number;
  now?: Date;
  isQuarantined?: boolean;
  verificationStatus?: string | null;
}

/**
 * Normalizes any database enum or status string onto the authoritative CanonicalLifecycleStatus.
 */
export function normalizeLifecycleStatus(
  status?: string | null,
  options: LifecycleNormalizationOptions = {}
): CanonicalLifecycleStatus {
  const now = options.now ?? new Date();

  // Quarantined records are permanently quarantined/rejected from student access
  if (options.isQuarantined) {
    return "REJECTED";
  }

  // Verification status rejection takes immediate priority
  const verNorm = String(options.verificationStatus || "").toUpperCase();
  if (verNorm === "REJECTED") {
    return "REJECTED";
  }

  // Authoritative deadline in the past takes precedence over ACTIVE/STALE
  if (options.deadline) {
    const deadlineTime = new Date(options.deadline).getTime();
    if (!isNaN(deadlineTime) && deadlineTime <= now.getTime()) {
      return "EXPIRED";
    }
  }

  const raw = String(status || "").toUpperCase().trim();

  if (raw === "CLOSED") return "CLOSED";
  if (raw === "REMOVED") return "REMOVED";
  if (raw === "EXPIRED") return "EXPIRED";
  if (raw === "REJECTED") return "REJECTED";
  if (raw === "PENDING") return "PENDING";
  if (raw === "REVIEW_REQUIRED" || raw === "NEEDS_REVIEW" || raw === "CONFLICT") return "REVIEW_REQUIRED";
  if (raw === "STALE") return "STALE";

  // Check freshness cutoff if status is ACTIVE
  if (raw === "ACTIVE") {
    if (options.lastVerifiedAt && typeof options.freshnessThresholdHours === "number") {
      const vTime = new Date(options.lastVerifiedAt).getTime();
      const cutoff = now.getTime() - options.freshnessThresholdHours * 3600 * 1000;
      if (!isNaN(vTime) && vTime < cutoff) {
        return "STALE";
      }
    }
    return "ACTIVE";
  }

  return "ACTIVE";
}

/**
 * Maps canonical lifecycle status to Prisma LifecycleStatus enum strings.
 */
export function mapToPrismaLifecycleStatus(status: CanonicalLifecycleStatus): "active" | "expiring" | "expired" | "removed" {
  switch (status) {
    case "ACTIVE":
      return "active";
    case "STALE":
      return "expiring";
    case "EXPIRED":
      return "expired";
    case "CLOSED":
    case "REMOVED":
    case "REJECTED":
      return "removed";
    default:
      return "active";
  }
}

export interface RecommendableOptions {
  now?: Date;
  freshnessThresholdHours?: number; // e.g. 72 hours
  allowQuarantined?: boolean; // Default false
}

/**
 * Central recommendation eligibility predicate.
 * Strict Phase 2 Invariant: ONLY ACTIVE counts for normal student recommendations.
 * Opportunities that are EXPIRED, CLOSED, STALE, REMOVED, or REJECTED are strictly excluded.
 */
export function isRecommendable(
  opp: any,
  options: RecommendableOptions = {}
): boolean {
  if (!opp) return false;

  // 1. Quarantined synthetic records are never recommendable
  if (opp.isQuarantined && !options.allowQuarantined) {
    return false;
  }

  const now = options.now ?? new Date();

  // 2. Strict Deadline Invariant: null never expires; if specified, past deadline is excluded
  const deadlineStr = opp.applicationDeadline || opp.deadline;
  if (deadlineStr) {
    const deadlineTime = new Date(deadlineStr).getTime();
    if (!isNaN(deadlineTime) && deadlineTime <= now.getTime()) {
      return false; // EXPIRED
    }
  }

  // 3. Strict Freshness Invariant: must have recent positive verification
  const verifiedStr = opp.lastVerifiedAt || opp.lastVerifiedDate;
  if (!verifiedStr) {
    return false;
  }
  const verifiedTime = new Date(verifiedStr).getTime();
  if (isNaN(verifiedTime)) {
    return false;
  }

  if (typeof options.freshnessThresholdHours === "number") {
    const cutoffMs = now.getTime() - options.freshnessThresholdHours * 3600 * 1000;
    if (verifiedTime < cutoffMs) {
      return false; // STALE
    }
  }

  // 4. Strict Lifecycle Status: ONLY ACTIVE
  const rawStatus = String(opp.status || "").toUpperCase();
  const lifecycleStatus = String(opp.lifecycleStatus || "").toUpperCase();
  const verificationStatus = String(opp.verificationStatus || "").toUpperCase();

  if (verificationStatus === "REJECTED") {
    return false; // REJECTED
  }

  if (
    rawStatus === "CLOSED" ||
    rawStatus === "EXPIRED" ||
    rawStatus === "STALE" ||
    rawStatus === "REMOVED" ||
    rawStatus === "REJECTED" ||
    rawStatus === "REVIEW_REQUIRED" ||
    lifecycleStatus === "REMOVED" ||
    lifecycleStatus === "EXPIRED"
  ) {
    return false;
  }

  // Must be explicitly ACTIVE
  if (rawStatus !== "ACTIVE") {
    return false;
  }

  return true;
}
