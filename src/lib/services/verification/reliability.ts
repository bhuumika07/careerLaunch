// src/lib/services/verification/reliability.ts

/**
 * Calculates exponential backoff with full jitter to avoid thundering herd.
 *
 * @param attempt 1-indexed attempt number
 * @param baseMs Base backoff in milliseconds (default 1000ms)
 * @param maxMs Maximum backoff ceiling in milliseconds (default 60000ms)
 * @returns Delay in milliseconds with random jitter
 */
export function calculateBackoffWithJitter(
  attempt: number,
  baseMs = 1000,
  maxMs = 60000
): number {
  const expDelay = Math.min(maxMs, baseMs * Math.pow(2, Math.max(0, attempt - 1)));
  // Jitter factor between 0.75 and 1.25 (centered around 1.0)
  const jitter = 0.75 + Math.random() * 0.5;
  return Math.round(expDelay * jitter);
}

interface SourceRateLimitState {
  tokens: number;
  lastRefillAt: number;
  pausedUntil?: number;
  pauseReason?: string;
}

/**
 * Source Rate Limiter & Pause Manager
 *
 * Enforces per-source rate limits (requests per minute) and manages source-wide pauses
 * when HTTP 429 Too Many Requests (with Retry-After) is encountered.
 */
export class SourceRateLimiter {
  private sources = new Map<string, SourceRateLimitState>();

  /**
   * Applies a source-wide pause (e.g. upon receiving HTTP 429 with Retry-After).
   */
  pauseSource(sourceId: string, durationSeconds: number, reason?: string): void {
    const pauseMs = Math.max(1, durationSeconds) * 1000;
    const pausedUntil = Date.now() + pauseMs;
    const existing = this.sources.get(sourceId) || {
      tokens: 10,
      lastRefillAt: Date.now(),
    };

    this.sources.set(sourceId, {
      ...existing,
      pausedUntil,
      pauseReason: reason || `Rate limit pause for ${durationSeconds}s`,
    });
  }

  /**
   * Checks whether requests to a source are permitted or currently rate-limited/paused.
   */
  canRequest(
    sourceId: string,
    rateLimitPerMinute?: number | null,
    now: number = Date.now()
  ): { allowed: boolean; waitMs?: number; reason?: string } {
    const state = this.sources.get(sourceId);

    // 1. Check if source-wide pause is active
    if (state?.pausedUntil && state.pausedUntil > now) {
      const waitMs = state.pausedUntil - now;
      return {
        allowed: false,
        waitMs,
        reason: state.pauseReason || `Source is paused for ${Math.ceil(waitMs / 1000)}s`,
      };
    }

    const limit = rateLimitPerMinute && rateLimitPerMinute > 0 ? rateLimitPerMinute : 60;
    const intervalMs = (60 * 1000) / limit;

    if (!state) {
      this.sources.set(sourceId, {
        tokens: limit - 1,
        lastRefillAt: now,
      });
      return { allowed: true };
    }

    // Refill tokens based on elapsed time
    const elapsed = now - state.lastRefillAt;
    const tokensToAdd = (elapsed / 60000) * limit;
    const currentTokens = Math.min(limit, state.tokens + tokensToAdd);

    if (currentTokens >= 1) {
      this.sources.set(sourceId, {
        tokens: currentTokens - 1,
        lastRefillAt: now,
        pausedUntil: undefined,
        pauseReason: undefined,
      });
      return { allowed: true };
    }

    const waitMs = Math.ceil(intervalMs);
    return {
      allowed: false,
      waitMs,
      reason: `Source rate limit exceeded (${limit} req/min). Wait ${Math.ceil(waitMs / 1000)}s`,
    };
  }

  /**
   * Resets rate-limiting state for a source (useful for testing).
   */
  reset(sourceId?: string): void {
    if (sourceId) {
      this.sources.delete(sourceId);
    } else {
      this.sources.clear();
    }
  }
}
