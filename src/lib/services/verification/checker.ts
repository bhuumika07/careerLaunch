// src/lib/services/verification/checker.ts
import type { VerificationResult, SourceListingInfo, SourceConfig } from "./types.ts";

/**
 * Common verification checker interface.
 * Implemented by Greenhouse, Lever, Ashby, and future ATS connectors.
 * This decouples the verification scheduler, queue worker, and lifecycle manager
 * from provider-specific API details.
 */
export interface OpportunityAvailabilityChecker {
  readonly providerName: string;

  /**
   * Check whether a specific source listing is still available on the external provider.
   *
   * @param listing The opportunity source listing to check
   * @param sourceConfig Configuration of the parent source (board token, base URL, rate limits)
   * @returns VerificationResult (AVAILABLE | CLOSED | UNKNOWN | CONFLICT)
   */
  checkAvailability(
    listing: SourceListingInfo,
    sourceConfig: SourceConfig
  ): Promise<VerificationResult>;
}
