// src/lib/services/verification/scheduler.ts
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import type { Queue } from "bullmq";
import type { VerifyOpportunityJobData } from "../../queue/verificationQueue.ts";

export interface SchedulerConfig {
  batchSize?: number;
  claimLeaseDurationMs?: number; // Lease duration in ms, default 5 minutes
}

export interface SchedulerPassResult {
  eligibleCount: number;
  claimedCount: number;
  enqueuedCount: number;
  skippedCount: number;
  opportunityIds: string[];
  errors: Array<{ opportunityId: string; error: string }>;
}

const ELIGIBLE_STATUSES = ["PENDING", "ACTIVE", "STALE", "REVIEW_REQUIRED"];

/**
 * Verification Scheduler
 *
 * Responsibilities:
 * - Queries database for due opportunities
 * - Atomically leases candidate rows to prevent split-brain / duplicate enqueueing across multiple instances
 * - Enqueues verification jobs to BullMQ with deduplication
 * - Strictly zero external ATS or HTTP calls
 */
export class VerificationScheduler {
  private prisma: PrismaClient;
  private queue: Queue<VerifyOpportunityJobData>;
  private config: Required<SchedulerConfig>;

  constructor(
    prisma: PrismaClient,
    queue: Queue<VerifyOpportunityJobData>,
    config?: SchedulerConfig
  ) {
    this.prisma = prisma;
    this.queue = queue;
    this.config = {
      batchSize: config?.batchSize ?? 50,
      claimLeaseDurationMs: config?.claimLeaseDurationMs ?? 5 * 60 * 1000, // 5m
    };
  }

  /**
   * Executes a single atomic scheduler pass.
   */
  async runSchedulerPass(now: Date = new Date()): Promise<SchedulerPassResult> {
    const leaseExpiryCutoff = new Date(
      now.getTime() - this.config.claimLeaseDurationMs
    );
    const claimToken = randomUUID();

    // 1. Transactionally find and atomically claim due opportunities
    const claimedOpportunities = await this.prisma.$transaction(async (tx) => {
      // Find candidate opportunities due for verification
      const candidates = await (tx.opportunity as any).findMany({
        where: {
          status: { in: ELIGIBLE_STATUSES },
          OR: [
            { nextVerificationAt: { lte: now } },
            { nextVerificationAt: null },
          ],
          // Available if never claimed or lease has expired
          AND: [
            {
              OR: [
                { lastVerificationError: null },
                {
                  NOT: {
                    lastVerificationError: { startsWith: "[LEASE:" },
                  },
                },
                // Expired lease condition checked in memory/filter
              ],
            },
          ],
        },
        select: {
          id: true,
          status: true,
          nextVerificationAt: true,
          lastVerificationError: true,
        },
        take: this.config.batchSize,
      });

      // Filter out actively leased opportunities whose lease has not expired
      const eligibleToClaim = candidates.filter((c: any) => {
        if (!c.lastVerificationError?.startsWith("[LEASE:")) return true;
        try {
          const match = c.lastVerificationError.match(/\[LEASE:(\d+)\]/);
          if (match && match[1]) {
            const leaseTimestamp = parseInt(match[1], 10);
            return leaseTimestamp < leaseExpiryCutoff.getTime();
          }
        } catch {
          return true;
        }
        return true;
      });

      if (eligibleToClaim.length === 0) {
        return [];
      }

      const claimed: any[] = [];
      const leaseMarker = `[LEASE:${now.getTime()}:${claimToken}]`;

      for (const cand of eligibleToClaim) {
        // Lease row and set temporary nextVerificationAt forward so concurrent sweeps pass over
        const updated = await (tx.opportunity as any).update({
          where: { id: cand.id },
          data: {
            lastVerificationError: leaseMarker,
            // Advance nextVerificationAt temporarily by lease duration
            nextVerificationAt: new Date(
              now.getTime() + this.config.claimLeaseDurationMs
            ),
          },
        });
        claimed.push(updated);
      }

      return claimed;
    });

    const result: SchedulerPassResult = {
      eligibleCount: claimedOpportunities.length,
      claimedCount: claimedOpportunities.length,
      enqueuedCount: 0,
      skippedCount: 0,
      opportunityIds: [],
      errors: [],
    };

    // 2. Enqueue each claimed opportunity into BullMQ with deduplication
    for (const opp of claimedOpportunities) {
      const stableJobId = `verify-${opp.id}`;

      try {
        // Handle BullMQ behavior: if a previous job with this ID was completed or failed,
        // remove it first so future verification runs are not silently blocked.
        const existingJob = await this.queue.getJob(stableJobId);
        if (existingJob) {
          const state = await existingJob.getState();
          if (state === "completed" || state === "failed") {
            await existingJob.remove();
          } else if (state === "active" || state === "waiting" || state === "delayed") {
            // Already in flight; avoid redundant double enqueue
            result.skippedCount++;
            continue;
          }
        }

        await this.queue.add(
          "verify-opportunity",
          {
            opportunityId: opp.id,
            triggeredBy: "scheduler",
            enqueuedAt: now.toISOString(),
          },
          {
            jobId: stableJobId,
          }
        );

        result.enqueuedCount++;
        result.opportunityIds.push(opp.id);
      } catch (err: any) {
        result.errors.push({
          opportunityId: opp.id,
          error: err.message || "Failed to enqueue job in BullMQ",
        });
      }
    }

    return result;
  }
}
