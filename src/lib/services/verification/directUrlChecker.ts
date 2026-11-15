// src/lib/services/verification/directUrlChecker.ts
/**
 * Direct Posting URL Availability & Integrity Checker (Phase 2 - Chunk 2.1)
 *
 * Verifies live opportunity posting URLs:
 * 1. Authoritative status codes:
 *    - 404 (Not Found) / 410 (Gone) -> CLOSED (listing removed)
 *    - 5xx, network timeout, connection refused -> UNKNOWN (NEVER marked CLOSED on transient source errors!)
 *    - 429 -> UNKNOWN with retryAfterSeconds
 * 2. In-page closure signals: Detects phrases like "no longer accepting applications" or "position filled".
 * 3. Content Drift Detection: Computes SHA-256 hash of posting text; flags CONFLICT if description changed.
 */

import crypto from "crypto";
import type { OpportunityAvailabilityChecker } from "./checker.ts";
import type {
  SourceListingInfo,
  SourceConfig,
  VerificationResult,
} from "./types.ts";

export const CLOSURE_TEXT_PATTERNS = [
  /\b(?:this\s+(?:job|position|opening|role)\s+is\s+no\s+longer\s+available)\b/i,
  /\b(?:job|position|opening)\s+(?:has\s+been\s+)?closed\b/i,
  /\bno\s+longer\s+accepting\s+applications\b/i,
  /\bposition\s+(?:has\s+been\s+)?filled\b/i,
  /\bthis\s+posting\s+has\s+expired\b/i,
];

/**
 * Computes deterministic SHA-256 content hash of normalized text.
 */
export function computeContentHash(content: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export class DirectUrlAvailabilityChecker
  implements OpportunityAvailabilityChecker
{
  readonly providerName = "direct_url";
  private fetchFn: typeof fetch;

  constructor(options?: { fetchFn?: typeof fetch }) {
    this.fetchFn = options?.fetchFn ?? fetch;
  }

  async checkAvailability(
    listing: SourceListingInfo,
    sourceConfig: SourceConfig
  ): Promise<VerificationResult> {
    const checkedAt = new Date();
    const targetUrl = listing.sourceUrl || listing.applicationUrl;

    if (!targetUrl) {
      return {
        outcome: "UNKNOWN",
        checkedAt,
        reason: "Source listing is missing target URL for direct verification",
      };
    }

    // Protocol validation
    try {
      const parsed = new URL(targetUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return {
          outcome: "CONFLICT",
          checkedAt,
          reason: `Invalid or unsupported protocol "${parsed.protocol}" in URL "${targetUrl}"`,
        };
      }
    } catch {
      return {
        outcome: "CONFLICT",
        checkedAt,
        reason: `Malformed URL "${targetUrl}"`,
      };
    }

    const timeoutSec = sourceConfig.verificationTimeoutSec || 15;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutSec * 1000);
    const startMs = Date.now();

    try {
      const response = await this.fetchFn(targetUrl, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "User-Agent": "CareerLaunch-Verifier/2.0 (student career intelligence platform)",
          Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        },
      });

      const responseTimeMs = Date.now() - startMs;
      const status = response.status;

      // 1. Authoritative 404 / 410 -> CLOSED
      if (status === 404 || status === 410) {
        return {
          outcome: "CLOSED",
          checkedAt,
          evidence: `Original job posting removed: HTTP ${status} from ${targetUrl}`,
          evidenceType: "http_status_404",
          httpStatus: status,
          responseTimeMs,
        };
      }

      // 2. Source-level rate limiting 429 -> UNKNOWN (Never CLOSED)
      if (status === 429) {
        const retryHeader = response.headers.get("Retry-After");
        const retryAfterSeconds = retryHeader ? parseInt(retryHeader, 10) : 60;
        return {
          outcome: "UNKNOWN",
          checkedAt,
          reason: `Source rate limit exceeded (HTTP 429) on ${targetUrl}`,
          httpStatus: 429,
          responseTimeMs,
          retryAfterSeconds: isNaN(retryAfterSeconds) ? 60 : retryAfterSeconds,
        };
      }

      // 3. Source-level 5xx server error -> UNKNOWN (Never CLOSED)
      if (status >= 500) {
        return {
          outcome: "UNKNOWN",
          checkedAt,
          reason: `Source server error (HTTP ${status}) on ${targetUrl}`,
          httpStatus: status,
          responseTimeMs,
        };
      }

      // 4. Source-level 401/403 -> UNKNOWN (Never CLOSED)
      if (status === 401 || status === 403) {
        return {
          outcome: "UNKNOWN",
          checkedAt,
          reason: `Source authentication or permission required (HTTP ${status}) on ${targetUrl}`,
          httpStatus: status,
          responseTimeMs,
        };
      }

      // Read response body text
      let bodyText = "";
      try {
        bodyText = await response.text();
      } catch {
        bodyText = "";
      }

      // 5. Detect in-page closure text patterns
      for (const pattern of CLOSURE_TEXT_PATTERNS) {
        const match = bodyText.match(pattern);
        if (match) {
          return {
            outcome: "CLOSED",
            checkedAt,
            evidence: `Listing closed via in-page notice: "${match[0]}" at ${targetUrl}`,
            evidenceType: "in_page_closure_notice",
            httpStatus: status,
            responseTimeMs,
          };
        }
      }

      // 6. Content Hash Drift Detection
      const currentHash = computeContentHash(bodyText);
      if (listing.contentHash && listing.contentHash.trim() !== "") {
        if (listing.contentHash !== currentHash) {
          return {
            outcome: "CONFLICT",
            checkedAt,
            reason: `Job description changed (content hash mismatch: previous ${listing.contentHash} vs current ${currentHash})`,
            httpStatus: status,
            responseTimeMs,
          };
        }
      }

      // 7. Successful verification -> AVAILABLE
      return {
        outcome: "AVAILABLE",
        checkedAt,
        evidence: `Job posting confirmed active at ${targetUrl} (HTTP ${status}, hash: ${currentHash.substring(0, 12)}...)`,
        evidenceType: "direct_url_available",
        httpStatus: status,
        responseTimeMs,
      };
    } catch (err: any) {
      const responseTimeMs = Date.now() - startMs;

      // Timeout or network error -> UNKNOWN (Never CLOSED)
      if (err.name === "AbortError" || err.name === "TimeoutError") {
        return {
          outcome: "UNKNOWN",
          checkedAt,
          reason: `Network timeout connecting to ${targetUrl} after ${timeoutSec}s`,
          responseTimeMs,
        };
      }

      return {
        outcome: "UNKNOWN",
        checkedAt,
        reason: `Network error connecting to ${targetUrl}: ${err.message || "Connection refused"}`,
        responseTimeMs,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
