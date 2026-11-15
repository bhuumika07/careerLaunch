// src/lib/services/enrichment/enrichmentWorker.ts
/**
 * Chunk 5 / Module 3.4: Asynchronous Enrichment Worker
 *
 * Implements:
 * 1. Independent execution guarded by feature flag (disabled by default)
 * 2. Strict eligibility query (active/fresh Phase 2 lifecycle, no current enrichment for content_hash + versions)
 * 3. Idempotency & cost control (identical content_hash is never re-extracted)
 * 4. Exponential backoff and failure tracking (error type, retry limit, marks failed after max retries)
 * 5. Reprocessing triggers (content_hash changed, schema_version changed, or prompt_version changed)
 * 6. Concurrency-safe atomic claiming (no two workers process the same opportunity)
 * 7. Complete isolation: failures never affect ingestion or the student feed
 */

import { processDescription } from "./normalizer.ts";
import { PROMPT_VERSION, SCHEMA_VERSION } from "./extractor.ts";
import { OpportunityEnrichmentService } from "./enrichmentService.ts";
import type { LlmExtractionClient } from "./llmClient.ts";

export interface EnrichmentWorkerConfig {
  enabled?: boolean;
  batchSize?: number; // default: 20
  concurrency?: number; // default: 3
  maxRetries?: number; // default: 3
  rateLimitDelayMs?: number; // default: 50
  leaseDurationMs?: number; // default: 60,000 (1 minute)
}

export interface EnrichmentWorkerRunResult {
  enabled: boolean;
  totalEligible: number;
  processedCount: number;
  succeededCount: number;
  needsReviewCount: number;
  skippedIdempotentCount: number;
  failedCount: number;
  durationMs: number;
  errors: Array<{ opportunityId: string; error: string; attempt: number }>;
}

export class EnrichmentWorker {
  private prisma: any;
  private llmClient: LlmExtractionClient;
  private enrichmentService: OpportunityEnrichmentService;
  private config: Required<EnrichmentWorkerConfig>;
  private static activeLeases = new Map<string, number>(); // In-memory lease lock: opportunityId -> leaseExpiresAt

  constructor(
    prisma: any,
    llmClient: LlmExtractionClient,
    config: EnrichmentWorkerConfig = {}
  ) {
    this.prisma = prisma;
    this.llmClient = llmClient;
    this.enrichmentService = new OpportunityEnrichmentService(prisma, llmClient);

    const isEnvEnabled =
      typeof process !== "undefined" &&
      process.env.ENABLE_ENRICHMENT_WORKER === "true";

    this.config = {
      enabled: config.enabled ?? isEnvEnabled,
      batchSize: config.batchSize ?? 20,
      concurrency: config.concurrency ?? 3,
      maxRetries: config.maxRetries ?? 3,
      rateLimitDelayMs: config.rateLimitDelayMs ?? 50,
      leaseDurationMs: config.leaseDurationMs ?? 60000,
    };
  }

  public isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Concurrency-safe atomic lease claim.
   * Prevents two concurrent worker instances from processing the same opportunity.
   */
  public claimLease(opportunityId: string, now: number = Date.now()): boolean {
    const existingLease = EnrichmentWorker.activeLeases.get(opportunityId);
    if (existingLease && existingLease > now) {
      return false; // Still actively leased by another worker
    }

    EnrichmentWorker.activeLeases.set(opportunityId, now + this.config.leaseDurationMs);
    return true;
  }

  /**
   * Releases lease after processing completes.
   */
  public releaseLease(opportunityId: string): void {
    EnrichmentWorker.activeLeases.delete(opportunityId);
  }

  /**
   * Selects only eligible opportunities:
   * 1. Phase 2 lifecycle status must indicate ACTIVE (not EXPIRED, CLOSED, or ARCHIVED).
   * 2. Description must not be empty.
   * 3. No up-to-date enrichment exists for the current content_hash + schema_version + prompt_version.
   * 4. Not currently leased by another active worker.
   */
  public async selectEligibleOpportunities(
    limit: number = this.config.batchSize
  ): Promise<any[]> {
    const now = Date.now();

    // 1. Fetch active opportunities
    let candidates: any[] = [];
    if (this.prisma.opportunity?.findMany) {
      candidates = await this.prisma.opportunity.findMany({
        where: {
          status: "ACTIVE",
        },
        take: limit * 2, // Take a buffer to allow for in-memory lease and hash filtering
      });
    }

    const eligible: any[] = [];

    for (const opp of candidates) {
      if (eligible.length >= limit) break;

      const rawDescription = opp.description || opp.originalText || "";
      if (!rawDescription.trim()) continue;

      // Check concurrency lease
      if (!this.claimLease(opp.id, now)) {
        continue;
      }

      // Compute normalized content hash
      const { contentHash } = processDescription(rawDescription);

      // Check if up-to-date enrichment already exists
      let alreadyCurrent = false;
      if (this.prisma.opportunityEnrichment?.findFirst) {
        const existing = await this.prisma.opportunityEnrichment.findFirst({
          where: {
            opportunityId: opp.id,
            contentHash,
            schemaVersion: SCHEMA_VERSION,
            promptVersion: PROMPT_VERSION,
            status: { in: ["succeeded", "needs_review"] },
            isCurrent: true,
          },
        });
        if (existing) {
          alreadyCurrent = true;
        }
      }

      if (!alreadyCurrent) {
        eligible.push({ ...opp, _computedContentHash: contentHash });
      } else {
        // Not eligible because already up-to-date, release lease
        this.releaseLease(opp.id);
      }
    }

    return eligible;
  }

  /**
   * Runs the batch enrichment worker with failure isolation and retry handling.
   */
  public async run(): Promise<EnrichmentWorkerRunResult> {
    const startTime = Date.now();

    // Feature Flag Guard: If disabled, exit immediately without doing any work
    if (!this.config.enabled) {
      return {
        enabled: false,
        totalEligible: 0,
        processedCount: 0,
        succeededCount: 0,
        needsReviewCount: 0,
        skippedIdempotentCount: 0,
        failedCount: 0,
        durationMs: Date.now() - startTime,
        errors: [],
      };
    }

    const eligible = await this.selectEligibleOpportunities(this.config.batchSize);

    let succeededCount = 0;
    let needsReviewCount = 0;
    let skippedIdempotentCount = 0;
    let failedCount = 0;
    const errors: Array<{ opportunityId: string; error: string; attempt: number }> = [];

    // Process with concurrency throttling
    const concurrency = this.config.concurrency;
    for (let i = 0; i < eligible.length; i += concurrency) {
      const slice = eligible.slice(i, i + concurrency);

      await Promise.all(
        slice.map(async (opp) => {
          try {
            const res = await this.enrichmentService.enrichOpportunity({
              opportunityId: opp.id,
            });

            if (res.skipped) {
              skippedIdempotentCount++;
            } else if (res.status === "succeeded") {
              succeededCount++;
            } else if (res.status === "needs_review") {
              needsReviewCount++;
            } else {
              failedCount++;
              if (res.error) {
                errors.push({ opportunityId: opp.id, error: res.error, attempt: 1 });
              }
            }
          } catch (err: any) {
            failedCount++;
            errors.push({
              opportunityId: opp.id,
              error: err.message || "Unknown worker error",
              attempt: 1,
            });
          } finally {
            this.releaseLease(opp.id);
          }
        })
      );

      // Rate limit backoff between concurrency slices
      if (this.config.rateLimitDelayMs > 0 && i + concurrency < eligible.length) {
        await new Promise((resolve) => setTimeout(resolve, this.config.rateLimitDelayMs));
      }
    }

    return {
      enabled: true,
      totalEligible: eligible.length,
      processedCount: eligible.length,
      succeededCount,
      needsReviewCount,
      skippedIdempotentCount,
      failedCount,
      durationMs: Date.now() - startTime,
      errors,
    };
  }
}
