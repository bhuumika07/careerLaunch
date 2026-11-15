// src/lib/services/verification/greenhouseChecker.ts
import type {
  VerificationResult,
  SourceListingInfo,
  SourceConfig,
} from "./types.ts";
import type { OpportunityAvailabilityChecker } from "./checker.ts";

export interface GreenhouseJob {
  id: number | string;
  title: string;
  absolute_url: string;
  updated_at?: string;
  content?: string;
  internal_job_id?: number | string;
  location?: {
    name?: string;
  };
}

export interface GreenhouseBoardResponse {
  jobs: GreenhouseJob[];
}

interface CacheEntry {
  data: GreenhouseJob[];
  fetchedAt: number;
}

const ALLOWED_DOMAINS = new Set([
  "boards-api.greenhouse.io",
  "boards.greenhouse.io",
]);

/**
 * Greenhouse Availability Checker
 *
 * Implements authoritative availability checking against Greenhouse's official Job Board API.
 */
export class GreenhouseAvailabilityChecker
  implements OpportunityAvailabilityChecker
{
  readonly providerName = "greenhouse";

  // In-memory cache: boardToken -> { data: jobs[], fetchedAt }
  private boardCache = new Map<string, CacheEntry>();
  private cacheTtlMs: number;
  private fetchFn: typeof fetch;

  constructor(options?: {
    cacheTtlMs?: number;
    fetchFn?: typeof fetch;
  }) {
    this.cacheTtlMs = options?.cacheTtlMs ?? 60_000; // 60s default cache
    this.fetchFn = options?.fetchFn ?? fetch;
  }

  /**
   * Clears the in-memory board cache (useful for testing or forced re-checks).
   */
  clearCache(): void {
    this.boardCache.clear();
  }

  /**
   * Validates target URL against strict SSRF domain allowlist.
   */
  private validateUrl(rawUrl: string): URL {
    const parsed = new URL(rawUrl);
    if (!ALLOWED_DOMAINS.has(parsed.hostname.toLowerCase())) {
      throw new Error(
        `SSRF Protection: Domain "${parsed.hostname}" is not in the allowed Greenhouse domains list.`
      );
    }
    return parsed;
  }

  /**
   * Resolves the board token from sourceConfig or sourceUrl.
   */
  private resolveBoardToken(
    listing: SourceListingInfo,
    sourceConfig: SourceConfig
  ): string {
    if (sourceConfig.boardToken) {
      return sourceConfig.boardToken;
    }
    if (sourceConfig.config?.boardToken) {
      return sourceConfig.config.boardToken;
    }
    if (sourceConfig.config?.board) {
      return sourceConfig.config.board;
    }

    // Try parsing from baseUrl or sourceUrl
    const urlStr = sourceConfig.baseUrl || listing.sourceUrl;
    try {
      const parsed = new URL(urlStr);
      const segments = parsed.pathname.split("/").filter(Boolean);
      // Format 1: boards-api.greenhouse.io/v1/boards/{board_token}/...
      const boardIdx = segments.indexOf("boards");
      if (boardIdx !== -1 && segments[boardIdx + 1]) {
        return segments[boardIdx + 1];
      }
      // Format 2: boards.greenhouse.io/{board_token}
      if (segments.length > 0) {
        return segments[0];
      }
    } catch {
      // Ignored
    }

    throw new Error(
      `Could not determine Greenhouse board token for source "${sourceConfig.name || sourceConfig.id}"`
    );
  }

  /**
   * Fetches all published jobs from the Greenhouse board with in-memory caching.
   */
  private async fetchBoardJobs(
    boardToken: string,
    timeoutSec: number
  ): Promise<{
    jobs: GreenhouseJob[];
    httpStatus: number;
    responseTimeMs: number;
    fromCache: boolean;
  }> {
    const cached = this.boardCache.get(boardToken);
    const now = Date.now();
    if (cached && now - cached.fetchedAt < this.cacheTtlMs) {
      return {
        jobs: cached.data,
        httpStatus: 200,
        responseTimeMs: 0,
        fromCache: true,
      };
    }

    const endpoint = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(
      boardToken
    )}/jobs?content=true`;
    this.validateUrl(endpoint);

    const controller = new AbortController();
    const timeoutMs = (timeoutSec || 15) * 1000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const startTime = performance.now();
    try {
      const response = await this.fetchFn(endpoint, {
        headers: {
          Accept: "application/json",
          "User-Agent": "CareerLaunch-Verifier/1.0",
        },
        signal: controller.signal,
      });

      const responseTimeMs = Math.round(performance.now() - startTime);

      if (!response.ok) {
        const status = response.status;
        let retryAfter: number | undefined;
        if (status === 429) {
          const retryHeader = response.headers.get("Retry-After");
          if (retryHeader) {
            const parsed = parseInt(retryHeader, 10);
            if (!isNaN(parsed)) retryAfter = parsed;
          }
        }
        const err: any = new Error(`Greenhouse API responded with HTTP ${status}`);
        err.httpStatus = status;
        err.responseTimeMs = responseTimeMs;
        err.retryAfterSeconds = retryAfter;
        throw err;
      }

      let data: any;
      try {
        data = await response.json();
      } catch {
        const err: any = new Error("Greenhouse response body is not valid JSON");
        err.httpStatus = response.status;
        err.responseTimeMs = responseTimeMs;
        throw err;
      }

      if (!data || !Array.isArray(data.jobs)) {
        const err: any = new Error(
          "Malformed Greenhouse response: 'jobs' array is missing"
        );
        err.httpStatus = response.status;
        err.responseTimeMs = responseTimeMs;
        throw err;
      }

      const jobs: GreenhouseJob[] = data.jobs;
      this.boardCache.set(boardToken, { data: jobs, fetchedAt: now });

      return {
        jobs,
        httpStatus: response.status,
        responseTimeMs,
        fromCache: false,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Main availability check implementation.
   */
  async checkAvailability(
    listing: SourceListingInfo,
    sourceConfig: SourceConfig
  ): Promise<VerificationResult> {
    const checkedAt = new Date();
    const timeoutSec = sourceConfig.verificationTimeoutSec || 15;

    let boardToken: string;
    try {
      boardToken = this.resolveBoardToken(listing, sourceConfig);
    } catch (e: any) {
      return {
        outcome: "UNKNOWN",
        checkedAt,
        reason: e.message || "Failed to resolve Greenhouse board token",
      };
    }

    let boardResult: {
      jobs: GreenhouseJob[];
      httpStatus: number;
      responseTimeMs: number;
      fromCache: boolean;
    };

    try {
      boardResult = await this.fetchBoardJobs(boardToken, timeoutSec);
    } catch (e: any) {
      const httpStatus = e.httpStatus;
      const responseTimeMs = e.responseTimeMs ?? 0;

      if (e.name === "AbortError" || e.name === "TimeoutError") {
        return {
          outcome: "UNKNOWN",
          checkedAt,
          reason: `Greenhouse request timed out after ${timeoutSec} seconds`,
          responseTimeMs: timeoutSec * 1000,
        };
      }

      if (httpStatus === 429) {
        return {
          outcome: "UNKNOWN",
          checkedAt,
          reason: "Greenhouse rate limit exceeded (HTTP 429)",
          httpStatus,
          responseTimeMs,
          retryAfterSeconds: e.retryAfterSeconds,
        };
      }

      if (httpStatus && httpStatus >= 500) {
        return {
          outcome: "UNKNOWN",
          checkedAt,
          reason: `Greenhouse server error (HTTP ${httpStatus})`,
          httpStatus,
          responseTimeMs,
        };
      }

      if (httpStatus === 401 || httpStatus === 403) {
        return {
          outcome: "UNKNOWN",
          checkedAt,
          reason: `Greenhouse access forbidden or unauthorized (HTTP ${httpStatus})`,
          httpStatus,
          responseTimeMs,
        };
      }

      return {
        outcome: "UNKNOWN",
        checkedAt,
        reason: e.message || "Network error while connecting to Greenhouse",
        httpStatus,
        responseTimeMs,
      };
    }

    const { jobs, httpStatus, responseTimeMs } = boardResult;

    // Match by externalId (numeric or string)
    const targetExternalId = listing.externalId
      ? String(listing.externalId).trim()
      : null;

    if (!targetExternalId) {
      return {
        outcome: "UNKNOWN",
        checkedAt,
        reason: "Source listing is missing externalId required for Greenhouse lookup",
        httpStatus,
        responseTimeMs,
      };
    }

    const matchedJob = jobs.find(
      (j) => String(j.id).trim() === targetExternalId
    );

    // 1. PRESENT ON BOARD
    if (matchedJob) {
      // Consistency verification:
      // Compare stored title vs current title
      if (listing.title && matchedJob.title) {
        const storedNorm = listing.title.toLowerCase().trim();
        const currentNorm = matchedJob.title.toLowerCase().trim();
        if (storedNorm !== currentNorm) {
          return {
            outcome: "CONFLICT",
            checkedAt,
            reason: `Material metadata conflict: Stored title "${listing.title}" diverges from Greenhouse published title "${matchedJob.title}"`,
            httpStatus,
            responseTimeMs,
          };
        }
      }

      // Supplementary check: if an application URL was recorded and differs completely
      if (
        listing.applicationUrl &&
        matchedJob.absolute_url &&
        !this.urlsMatch(listing.applicationUrl, matchedJob.absolute_url)
      ) {
        // If the listing URL points to a completely different job path
        return {
          outcome: "CONFLICT",
          checkedAt,
          reason: `Material metadata conflict: Stored application URL "${listing.applicationUrl}" diverges from Greenhouse URL "${matchedJob.absolute_url}"`,
          httpStatus,
          responseTimeMs,
        };
      }

      return {
        outcome: "AVAILABLE",
        checkedAt,
        evidence: `Job ID ${targetExternalId} ("${matchedJob.title}") confirmed active on Greenhouse board "${boardToken}"`,
        evidenceType: "greenhouse_board_api",
        httpStatus,
        responseTimeMs,
      };
    }

    // 2. ABSENT FROM COMPLETE BOARD RESPONSE
    /**
     * Greenhouse Semantics Guarantee:
     * The Greenhouse Job Board API endpoint GET /v1/boards/{board_token}/jobs returns
     * the authoritative, exhaustive array of all currently published job openings for the given board.
     * When the endpoint responds with HTTP 200 OK and a valid 'jobs' array, any job ID that is
     * absent from this response has been unpublished, closed, or archived by the employer.
     */
    return {
      outcome: "CLOSED",
      checkedAt,
      evidence: `Job ID ${targetExternalId} is absent from Greenhouse board "${boardToken}" (${jobs.length} published jobs total)`,
      evidenceType: "greenhouse_board_api",
      httpStatus,
      responseTimeMs,
    };
  }

  /**
   * Helper to compare URLs tolerating query param ordering and trailing slashes.
   */
  private urlsMatch(urlA: string, urlB: string): boolean {
    try {
      const uA = new URL(urlA);
      const uB = new URL(urlB);
      return (
        uA.hostname.toLowerCase() === uB.hostname.toLowerCase() &&
        uA.pathname.replace(/\/+$/, "") === uB.pathname.replace(/\/+$/, "")
      );
    } catch {
      return urlA.trim() === urlB.trim();
    }
  }
}
