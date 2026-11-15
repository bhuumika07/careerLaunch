// src/lib/services/connectors/framework/rateLimiter.ts
import type { RateLimitConfig } from "./types.ts";

/**
 * Sliding Window & Minimum Delay Rate Limiter
 *
 * Guarantees compliance with upstream provider polling limits (e.g. max requests per minute,
 * minimum delay between consecutive calls).
 */
export class RateLimiter {
  private maxRequestsPerMinute: number;
  private minIntervalMs: number;
  private requestTimestamps: number[] = [];
  private lastRequestAt: number = 0;

  constructor(config?: RateLimitConfig) {
    this.maxRequestsPerMinute = config?.maxRequestsPerMinute ?? 60; // 60 req/min default
    this.minIntervalMs = config?.minIntervalMs ?? 50;              // 50ms min interval default
  }

  /**
   * Acquires permission to execute a request, sleeping if rate limits would be exceeded.
   */
  async acquire(signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      throw new Error("RateLimiter request aborted before acquisition.");
    }

    const now = Date.now();

    // 1. Enforce minimum interval between consecutive requests
    const timeSinceLast = now - this.lastRequestAt;
    if (timeSinceLast < this.minIntervalMs) {
      const waitTime = this.minIntervalMs - timeSinceLast;
      await this.sleep(waitTime, signal);
    }

    // 2. Enforce sliding 60-second window quota
    const windowStart = Date.now() - 60_000;
    // Prune timestamps older than 60 seconds
    this.requestTimestamps = this.requestTimestamps.filter((t) => t > windowStart);

    if (this.requestTimestamps.length >= this.maxRequestsPerMinute) {
      const oldest = this.requestTimestamps[0];
      const waitTime = Math.max(0, oldest + 60_000 - Date.now());
      if (waitTime > 0) {
        await this.sleep(waitTime, signal);
      }
    }

    const recordTime = Date.now();
    this.requestTimestamps.push(recordTime);
    this.lastRequestAt = recordTime;
  }

  /**
   * Helper to reset in-memory timestamps (useful for testing).
   */
  reset(): void {
    this.requestTimestamps = [];
    this.lastRequestAt = 0;
  }

  private sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        return reject(new Error("RateLimiter sleep aborted."));
      }

      const timer = setTimeout(resolve, ms);

      if (signal) {
        signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(new Error("RateLimiter sleep aborted."));
          },
          { once: true }
        );
      }
    });
  }
}
