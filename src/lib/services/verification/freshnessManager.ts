// src/lib/services/verification/freshnessManager.ts
import type { PrismaClient } from "@prisma/client";

export type FreshnessPriority = "HIGH" | "NORMAL" | "LOW";

export interface FreshnessThresholdConfig {
  /** Maximum hours without positive verification before ACTIVE becomes STALE */
  highPriorityHours: number;
  normalPriorityHours: number;
  lowPriorityHours: number;
}

export const DEFAULT_FRESHNESS_CONFIG: FreshnessThresholdConfig = {
  highPriorityHours: 6, // High priority (e.g. expiring within 48h, internships)
  normalPriorityHours: 24, // Standard active opportunities
  lowPriorityHours: 48, // Low velocity / extended roles
};

export interface FreshnessTarget {
  id: string;
  status: string;
  category?: string;
  applicationDeadline?: Date | null;
  lastVerifiedAt?: Date | null;
  sourceMinIntervalMinutes?: number | null;
}

/**
 * Determines freshness priority tier based on urgency and role velocity.
 */
export function determineFreshnessPriority(
  target: FreshnessTarget,
  now: Date = new Date()
): FreshnessPriority {
  // Urgent: explicit deadline within 48 hours
  if (target.applicationDeadline) {
    const hoursRemaining =
      (target.applicationDeadline.getTime() - now.getTime()) / (3600 * 1000);
    if (hoursRemaining > 0 && hoursRemaining <= 48) {
      return "HIGH";
    }
  }

  // Fast-moving categories
  const cat = (target.category || "").toLowerCase();
  if (cat === "internships" || cat === "hackathons") {
    return "HIGH";
  }

  if (cat === "research" || cat === "scholarships") {
    return "LOW";
  }

  return "NORMAL";
}

/**
 * Calculates the effective freshness threshold in hours.
 *
 * Core invariant: Respects source rate limits so the threshold is never
 * unachievable under the source's polling limits.
 */
export function calculateEffectiveFreshnessThresholdHours(
  priority: FreshnessPriority,
  sourceMinIntervalMinutes?: number | null,
  config: FreshnessThresholdConfig = DEFAULT_FRESHNESS_CONFIG
): number {
  let baseHours: number;
  switch (priority) {
    case "HIGH":
      baseHours = config.highPriorityHours;
      break;
    case "LOW":
      baseHours = config.lowPriorityHours;
      break;
    case "NORMAL":
    default:
      baseHours = config.normalPriorityHours;
      break;
  }

  // If source rate limit requires e.g. 6 hours between checks,
  // the freshness threshold cannot be 4 hours. Give at least 2x polling window.
  if (sourceMinIntervalMinutes && sourceMinIntervalMinutes > 0) {
    const minAchievableHours = (sourceMinIntervalMinutes * 2) / 60;
    return Math.max(baseHours, minAchievableHours);
  }

  return baseHours;
}

/**
 * Calculates the absolute cutoff Date for a given freshness priority.
 * Records verified before this Date are considered stale.
 */
export function calculateFreshnessCutoff(
  priority: FreshnessPriority = "NORMAL",
  config: FreshnessThresholdConfig = DEFAULT_FRESHNESS_CONFIG,
  now: Date = new Date()
): Date {
  const hours = calculateEffectiveFreshnessThresholdHours(priority, null, config);
  return new Date(now.getTime() - hours * 3600 * 1000);
}

export interface SweepResults {
  staleCount: number;
  expiredCount: number;
  staleIds: string[];
  expiredIds: string[];
}

/**
 * Freshness & Expiry Sweeper
 *
 * Runs independent background sweeps:
 * 1. Freshness sweep: ACTIVE -> STALE when lastVerifiedAt exceeds threshold.
 * 2. Expiry sweep: Opportunities with past applicationDeadline -> EXPIRED.
 *
 * Timezone / Date semantics for deadlines:
 * - Deadlines are stored as authoritative UTC DateTime in PostgreSQL.
 * - When an external ATS (Greenhouse) provides a calendar date (e.g. 2026-11-15),
 *   it is normalized at ingestion to 23:59:59.999 UTC for that date.
 * - An opportunity expires strictly when now >= applicationDeadline.
 * - Opportunities without an explicit deadline (applicationDeadline == null) NEVER expire.
 */
export class FreshnessAndExpirySweeper {
  private prisma: PrismaClient;
  private config: FreshnessThresholdConfig;

  constructor(
    prisma: PrismaClient,
    config: FreshnessThresholdConfig = DEFAULT_FRESHNESS_CONFIG
  ) {
    this.prisma = prisma;
    this.config = config;
  }

  /**
   * Executes a full freshness and expiry sweep pass.
   */
  async runSweep(now: Date = new Date()): Promise<SweepResults> {
    const results: SweepResults = {
      staleCount: 0,
      expiredCount: 0,
      staleIds: [],
      expiredIds: [],
    };

    // ==========================================
    // 1. EXPIRY SWEEP
    // ==========================================
    // Select all non-terminal opportunities with an explicit deadline in the past
    const expiredCandidates = await (this.prisma.opportunity as any).findMany({
      where: {
        status: { in: ["PENDING", "ACTIVE", "STALE", "REVIEW_REQUIRED"] },
        applicationDeadline: {
          not: null,
          lte: now,
        },
      },
      select: {
        id: true,
        status: true,
        applicationDeadline: true,
      },
    });

    for (const cand of expiredCandidates) {
      await (this.prisma.opportunity as any).update({
        where: { id: cand.id },
        data: {
          status: "EXPIRED",
          closedAt: now,
        },
      });

      // Audit status transition in OpportunityChange
      try {
        if ((this.prisma as any).opportunityChange?.create) {
          await (this.prisma as any).opportunityChange.create({
            data: {
              opportunityId: cand.id,
              field: "status",
              oldValue: cand.status,
              newValue: "EXPIRED",
              detectedAt: now,
            },
          });
        }
      } catch {
        // Ignored
      }

      results.expiredCount++;
      results.expiredIds.push(cand.id);
    }

    // ==========================================
    // 2. FRESHNESS SWEEP
    // ==========================================
    // Query ACTIVE opportunities
    const activeOpportunities = await (this.prisma.opportunity as any).findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        id: true,
        status: true,
        category: true,
        applicationDeadline: true,
        lastVerifiedAt: true,
        source: {
          select: {
            verificationRateLimit: true,
          },
        },
      },
    });

    for (const opp of activeOpportunities) {
      if (!opp.lastVerifiedAt) {
        // Never verified, set nextVerificationAt to now
        await (this.prisma.opportunity as any).update({
          where: { id: opp.id },
          data: {
            status: "STALE",
            nextVerificationAt: now,
          },
        });
        results.staleCount++;
        results.staleIds.push(opp.id);
        continue;
      }

      const priority = determineFreshnessPriority(opp, now);
      const rateLimit = opp.source?.verificationRateLimit;
      const minIntervalMins = rateLimit ? Math.ceil((60 / rateLimit) * 10) : null;

      const thresholdHours = calculateEffectiveFreshnessThresholdHours(
        priority,
        minIntervalMins,
        this.config
      );

      const elapsedHours =
        (now.getTime() - opp.lastVerifiedAt.getTime()) / (3600 * 1000);

      if (elapsedHours > thresholdHours) {
        // Transition to STALE and schedule immediate re-verification
        await (this.prisma.opportunity as any).update({
          where: { id: opp.id },
          data: {
            status: "STALE",
            nextVerificationAt: now,
          },
        });

        // Audit status transition in OpportunityChange
        try {
          if ((this.prisma as any).opportunityChange?.create) {
            await (this.prisma as any).opportunityChange.create({
              data: {
                opportunityId: opp.id,
                field: "status",
                oldValue: "ACTIVE",
                newValue: "STALE",
                detectedAt: now,
              },
            });
          }
        } catch {
          // Ignored
        }

        results.staleCount++;
        results.staleIds.push(opp.id);
      }
    }

    return results;
  }
}
