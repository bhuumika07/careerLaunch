// src/lib/services/verification/frequencyPolicy.ts
import type { OpportunityLifecycleStatus } from "./decisionEngine.ts";

export interface FrequencyConfig {
  /** Delay for newly ingested / PENDING opportunities (minutes) */
  pendingDelayMinutes: number;
  /** Verification interval for opportunities 0-24h old (hours) */
  under24hIntervalHours: number;
  /** Verification interval for opportunities 1-7 days old (hours) */
  oneToSevenDaysIntervalHours: number;
  /** Verification interval for opportunities 8-30 days old (hours) */
  eightToThirtyDaysIntervalHours: number;
  /** Verification interval for opportunities older than 30 days (hours) */
  overThirtyDaysIntervalHours: number;
  /** Horizon in hours where a job is considered "near deadline" */
  nearDeadlineThresholdHours: number;
  /** Verification interval when near explicit deadline (hours) */
  nearDeadlineIntervalHours: number;
  /** Base backoff interval for failed verifications (minutes) */
  baseFailureRetryMinutes: number;
  /** Maximum backoff ceiling for consecutive failures (hours) */
  maxFailureRetryHours: number;
}

export const DEFAULT_FREQUENCY_CONFIG: FrequencyConfig = {
  pendingDelayMinutes: 0, // Immediately
  under24hIntervalHours: 3,
  oneToSevenDaysIntervalHours: 8,
  eightToThirtyDaysIntervalHours: 24,
  overThirtyDaysIntervalHours: 48,
  nearDeadlineThresholdHours: 48,
  nearDeadlineIntervalHours: 3,
  baseFailureRetryMinutes: 30,
  maxFailureRetryHours: 12,
};

export interface FrequencyPolicyInput {
  status: OpportunityLifecycleStatus;
  postedAt?: Date | null;
  createdAt?: Date | null;
  applicationDeadline?: Date | null;
  consecutiveFailures?: number;
  sourceMinIntervalMinutes?: number | null;
  now?: Date;
}

export interface FrequencyPolicyOutput {
  nextVerificationAt: Date;
  intervalMinutes: number;
  scheduleReason: string;
}

/**
 * Calculates the next verification schedule based on the configurable frequency policy.
 *
 * Rules:
 * 1. PENDING: scheduled immediately.
 * 2. Consecutive failures: exponential backoff.
 * 3. Near explicit deadline: checked frequently (every 2-4h).
 * 4. Age-based tiering (0-24h: 3h, 1-7d: 8h, 8-30d: 24h, >30d: 48h).
 *    Note: Posting age is used SOLELY for frequency scheduling, never as freshness or expiry.
 * 5. Provider rate-limit override: source minimum interval establishes lower bound.
 */
export function calculateNextVerificationSchedule(
  input: FrequencyPolicyInput,
  customConfig?: Partial<FrequencyConfig>
): FrequencyPolicyOutput {
  const config: FrequencyConfig = {
    ...DEFAULT_FREQUENCY_CONFIG,
    ...customConfig,
  };
  const now = input.now ?? new Date();

  // 1. PENDING (newly ingested) -> immediate
  if (input.status === "PENDING") {
    const delayMs = config.pendingDelayMinutes * 60 * 1000;
    return {
      nextVerificationAt: new Date(now.getTime() + delayMs),
      intervalMinutes: config.pendingDelayMinutes,
      scheduleReason: "Newly ingested / PENDING status scheduled immediately",
    };
  }

  // 2. Failed verification backoff
  const failures = input.consecutiveFailures ?? 0;
  if (failures > 0) {
    const maxRetryMins = config.maxFailureRetryHours * 60;
    const backoffMins = Math.min(
      maxRetryMins,
      config.baseFailureRetryMinutes * Math.pow(2, failures - 1)
    );
    const effectiveMins = Math.max(
      backoffMins,
      input.sourceMinIntervalMinutes ?? 0
    );

    return {
      nextVerificationAt: new Date(now.getTime() + effectiveMins * 60 * 1000),
      intervalMinutes: effectiveMins,
      scheduleReason: `Exponential backoff for failure #${failures}`,
    };
  }

  // 3. Near explicit deadline (within nearDeadlineThresholdHours)
  if (input.applicationDeadline) {
    const msToDeadline = input.applicationDeadline.getTime() - now.getTime();
    const hoursToDeadline = msToDeadline / (3600 * 1000);

    if (hoursToDeadline > 0 && hoursToDeadline <= config.nearDeadlineThresholdHours) {
      let intervalMins = config.nearDeadlineIntervalHours * 60;
      if (input.sourceMinIntervalMinutes && input.sourceMinIntervalMinutes > intervalMins) {
        intervalMins = input.sourceMinIntervalMinutes;
      }

      return {
        nextVerificationAt: new Date(now.getTime() + intervalMins * 60 * 1000),
        intervalMinutes: intervalMins,
        scheduleReason: `Near explicit deadline (${hoursToDeadline.toFixed(1)}h remaining)`,
      };
    }
  }

  // 4. Age-based frequency tiering
  const anchorDate = input.postedAt || input.createdAt || now;
  const ageHours = Math.max(0, (now.getTime() - anchorDate.getTime()) / (3600 * 1000));

  let intervalHours: number;
  let reasonTier: string;

  if (ageHours <= 24) {
    intervalHours = config.under24hIntervalHours;
    reasonTier = "0-24h old (high frequency)";
  } else if (ageHours <= 7 * 24) {
    intervalHours = config.oneToSevenDaysIntervalHours;
    reasonTier = "1-7 days old (regular frequency)";
  } else if (ageHours <= 30 * 24) {
    intervalHours = config.eightToThirtyDaysIntervalHours;
    reasonTier = "8-30 days old (daily frequency)";
  } else {
    intervalHours = config.overThirtyDaysIntervalHours;
    reasonTier = ">30 days old (extended frequency)";
  }

  let finalIntervalMinutes = intervalHours * 60;

  // 5. Provider rate-limit override
  if (
    input.sourceMinIntervalMinutes &&
    input.sourceMinIntervalMinutes > finalIntervalMinutes
  ) {
    finalIntervalMinutes = input.sourceMinIntervalMinutes;
    reasonTier += ` [overridden by provider rate-limit: ${finalIntervalMinutes}m]`;
  }

  return {
    nextVerificationAt: new Date(now.getTime() + finalIntervalMinutes * 60 * 1000),
    intervalMinutes: finalIntervalMinutes,
    scheduleReason: reasonTier,
  };
}
