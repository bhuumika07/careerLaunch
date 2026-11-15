// src/lib/services/verification/decisionEngine.ts
import type { VerificationResult, VerificationOutcome } from "./types.ts";

export type OpportunityLifecycleStatus =
  | "PENDING"
  | "ACTIVE"
  | "STALE"
  | "CLOSED"
  | "EXPIRED"
  | "INVALID"
  | "REVIEW_REQUIRED";

export interface FreshnessConfig {
  /** Maximum hours without a positive verification before transitioning to STALE */
  staleThresholdHours?: number;
  /** Regular verification interval for active opportunities (hours) */
  verificationIntervalHours?: number;
  /** Backoff interval after a transient failure (minutes) */
  transientRetryDelayMinutes?: number;
  /** Maximum consecutive failures before triggering REVIEW_REQUIRED */
  maxConsecutiveFailures?: number;
}

export interface DecisionEngineInput {
  currentStatus: OpportunityLifecycleStatus;
  applicationDeadline: Date | null;
  lastVerifiedAt: Date | null;
  consecutiveFailures: number;
  result: VerificationResult;
  now?: Date;
  freshnessConfig?: FreshnessConfig;
  /** Reopening policy: returns true only if an authoritative policy allows reopening a CLOSED/INVALID/EXPIRED job */
  reopeningPolicy?: (context: {
    currentStatus: OpportunityLifecycleStatus;
    result: VerificationResult;
  }) => boolean;
}

export interface DecisionEngineOutput {
  newStatus: OpportunityLifecycleStatus;
  lastVerificationOutcome: VerificationOutcome;
  lastVerifiedAt?: Date;
  nextVerificationAt: Date;
  consecutiveFailures: number;
  lastVerificationError: string | null;
  closedAt: Date | null;
  reopenPrevented?: boolean;
}

/** Default reopening policy: never auto-reactivate without explicit manual review */
export const defaultReopeningPolicy = (): boolean => false;

const DEFAULT_CONFIG: Required<FreshnessConfig> = {
  staleThresholdHours: 72, // 3 days
  verificationIntervalHours: 24, // daily
  transientRetryDelayMinutes: 30, // 30 mins
  maxConsecutiveFailures: 5,
};

/**
 * PURE Function: Verification Decision Engine
 *
 * Computes deterministic status transitions, error counters, and next verification schedules
 * without performing any database operations, network calls, or side effects.
 */
export function evaluateVerificationDecision(
  input: DecisionEngineInput
): DecisionEngineOutput {
  const now = input.now ?? new Date();
  const config: Required<FreshnessConfig> = {
    ...DEFAULT_CONFIG,
    ...input.freshnessConfig,
  };
  const canReopen = (input.reopeningPolicy ?? defaultReopeningPolicy)({
    currentStatus: input.currentStatus,
    result: input.result,
  });

  const outcome = input.result.outcome;

  // RULE 1: Explicit deadline in the past takes precedence over ACTIVE/STALE.
  // Note: Only from an authoritative deadline, never inferred or fabricated.
  if (
    input.applicationDeadline &&
    input.applicationDeadline.getTime() <= now.getTime()
  ) {
    return {
      newStatus: "EXPIRED",
      lastVerificationOutcome: outcome,
      lastVerifiedAt: input.lastVerifiedAt ?? undefined,
      nextVerificationAt: new Date(
        now.getTime() + 7 * 24 * 60 * 60 * 1000 // Checked infrequently once expired
      ),
      consecutiveFailures: input.consecutiveFailures,
      lastVerificationError: null,
      closedAt: null,
    };
  }

  // RULE 2: Terminal or gated states (CLOSED, INVALID, EXPIRED) must NOT auto-reactivate
  const isTerminalOrGated =
    input.currentStatus === "CLOSED" ||
    input.currentStatus === "INVALID" ||
    input.currentStatus === "EXPIRED";

  if (outcome === "AVAILABLE") {
    if (isTerminalOrGated && !canReopen) {
      // Reopening attempt detected but forbidden by policy: flag REVIEW_REQUIRED
      return {
        newStatus: "REVIEW_REQUIRED",
        lastVerificationOutcome: "AVAILABLE",
        lastVerifiedAt: input.lastVerifiedAt ?? undefined,
        nextVerificationAt: new Date(
          now.getTime() + config.verificationIntervalHours * 3600 * 1000
        ),
        consecutiveFailures: 0,
        lastVerificationError: `Reopening attempt blocked: job was ${input.currentStatus} but source reported AVAILABLE. Flagged for review.`,
        closedAt: input.currentStatus === "CLOSED" ? now : null,
        reopenPrevented: true,
      };
    }

    // Normal positive verification: PENDING / STALE / ACTIVE / REVIEW_REQUIRED -> ACTIVE
    return {
      newStatus: "ACTIVE",
      lastVerificationOutcome: "AVAILABLE",
      lastVerifiedAt: now, // updated ONLY after positive AVAILABLE verification
      nextVerificationAt: new Date(
        now.getTime() + config.verificationIntervalHours * 3600 * 1000
      ),
      consecutiveFailures: 0,
      lastVerificationError: null,
      closedAt: null,
    };
  }

  if (outcome === "CLOSED") {
    return {
      newStatus: "CLOSED",
      lastVerificationOutcome: "CLOSED",
      lastVerifiedAt: input.lastVerifiedAt ?? undefined, // Do NOT overwrite lastVerifiedAt with closing time
      nextVerificationAt: new Date(
        now.getTime() + 14 * 24 * 60 * 60 * 1000 // Infrequently checked
      ),
      consecutiveFailures: 0,
      lastVerificationError: null,
      closedAt: now,
    };
  }

  if (outcome === "CONFLICT") {
    return {
      newStatus: "REVIEW_REQUIRED",
      lastVerificationOutcome: "CONFLICT",
      lastVerifiedAt: input.lastVerifiedAt ?? undefined,
      nextVerificationAt: new Date(
        now.getTime() + config.verificationIntervalHours * 3600 * 1000
      ),
      consecutiveFailures: 0,
      lastVerificationError: input.result.reason,
      closedAt: null,
    };
  }

  // outcome === "UNKNOWN" (Transient errors: 429, 5xx, timeouts, network errors)
  // Non-negotiable: Never CLOSED, never touch lastVerifiedAt
  const failures = input.consecutiveFailures + 1;
  const reason = input.result.reason;

  // Check freshness: if lastVerifiedAt is too old, status becomes STALE
  let statusAfterUnknown = input.currentStatus;
  if (input.currentStatus === "ACTIVE" && input.lastVerifiedAt) {
    const elapsedHours =
      (now.getTime() - input.lastVerifiedAt.getTime()) / (3600 * 1000);
    if (elapsedHours > config.staleThresholdHours) {
      statusAfterUnknown = "STALE";
    }
  }

  if (failures >= config.maxConsecutiveFailures && statusAfterUnknown === "ACTIVE") {
    statusAfterUnknown = "REVIEW_REQUIRED";
  }

  // Next verification uses exponential/transient backoff
  const retryMs =
    (input.result.retryAfterSeconds
      ? input.result.retryAfterSeconds
      : config.transientRetryDelayMinutes * 60) * 1000;

  return {
    newStatus: statusAfterUnknown,
    lastVerificationOutcome: "UNKNOWN",
    lastVerifiedAt: input.lastVerifiedAt ?? undefined, // NEVER TOUCHED on UNKNOWN
    nextVerificationAt: new Date(now.getTime() + retryMs),
    consecutiveFailures: failures,
    lastVerificationError: reason,
    closedAt: null,
  };
}
