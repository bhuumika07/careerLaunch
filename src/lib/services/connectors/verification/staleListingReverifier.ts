// src/lib/services/connectors/verification/staleListingReverifier.ts
/**
 * Chunk 6: Scheduled Re-verification Worker for Stale Listings
 *
 * Scans opportunities to find listings with stale verification timestamps
 * (default: > 24 hours since last verification) and re-verifies them.
 * Updates verification status, confidence score, and lastVerifiedAt.
 */

import type { ConnectorOpportunity } from "../types.ts";
import { verifyOpportunity } from "./verifier.ts";
import type { ReverificationBatchResult } from "./types.ts";

export interface ReverificationConfig {
  maxStalenessHours?: number; // default: 24
  batchSize?: number; // default: 50
  concurrency?: number; // default: 5
  mockFetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

export class StaleListingReverifier {
  private config: Required<Omit<ReverificationConfig, "mockFetch">> & {
    mockFetch?: ReverificationConfig["mockFetch"];
  };

  constructor(config: ReverificationConfig = {}) {
    this.config = {
      maxStalenessHours: config.maxStalenessHours ?? 24,
      batchSize: config.batchSize ?? 50,
      concurrency: config.concurrency ?? 5,
      mockFetch: config.mockFetch,
    };
  }

  /**
   * Determines if an opportunity is stale and needs re-verification.
   */
  public isOpportunityStale(opp: ConnectorOpportunity, now: Date = new Date()): boolean {
    if (!opp.lastVerifiedAt) return true;

    const lastVerified = new Date(opp.lastVerifiedAt).getTime();
    if (isNaN(lastVerified)) return true;

    const stalenessMs = now.getTime() - lastVerified;
    const maxStalenessMs = this.config.maxStalenessHours * 60 * 60 * 1000;

    return stalenessMs >= maxStalenessMs;
  }

  /**
   * Filters and selects opportunities due for re-verification.
   */
  public selectStaleOpportunities(
    opportunities: ConnectorOpportunity[],
    now: Date = new Date()
  ): ConnectorOpportunity[] {
    return opportunities
      .filter((opp) => this.isOpportunityStale(opp, now))
      .slice(0, this.config.batchSize);
  }

  /**
   * Executes scheduled re-verification on stale opportunities.
   */
  public async runReverification(
    opportunities: ConnectorOpportunity[],
    onUpdate?: (updated: ConnectorOpportunity) => Promise<void> | void
  ): Promise<ReverificationBatchResult> {
    const startTime = Date.now();
    const staleList = this.selectStaleOpportunities(opportunities);

    let stillActiveCount = 0;
    let expiredOrClosedCount = 0;
    let scamFlaggedCount = 0;
    let errorsCount = 0;

    // Process in chunks up to concurrency limit
    const concurrency = this.config.concurrency;
    for (let i = 0; i < staleList.length; i += concurrency) {
      const slice = staleList.slice(i, i + concurrency);

      await Promise.all(
        slice.map(async (opp) => {
          try {
            const result = await verifyOpportunity(opp, {
              probeLiveness: true,
              mockFetch: this.config.mockFetch,
            });

            // Update opportunity in-place
            opp.lastVerifiedAt = result.verifiedAt;
            opp.verificationStatus = result.verificationStatus;

            if (result.verificationStatus === "verified") {
              stillActiveCount++;
            } else if (result.verificationStatus === "expired" || result.verificationStatus === "closed") {
              expiredOrClosedCount++;
            } else if (result.verificationStatus === "flagged_scam") {
              scamFlaggedCount++;
            }

            if (onUpdate) {
              await onUpdate(opp);
            }
          } catch (err) {
            errorsCount++;
          }
        })
      );
    }

    return {
      totalEvaluated: staleList.length,
      stillActiveCount,
      expiredOrClosedCount,
      scamFlaggedCount,
      errorsCount,
      durationMs: Date.now() - startTime,
    };
  }
}
