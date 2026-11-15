// src/lib/services/connectors/framework/circuitBreaker.ts
import type { CircuitBreakerConfig, CircuitState } from "./types.ts";

export class CircuitBreakerOpenError extends Error {
  constructor(sourceId: string, resetInMs: number) {
    super(
      `Circuit breaker is OPEN for source "${sourceId}". Upstream calls blocked for another ${Math.ceil(
        resetInMs / 1000
      )}s to prevent cascading failures.`
    );
    this.name = "CircuitBreakerOpenError";
  }
}

/**
 * Per-Source Circuit Breaker
 *
 * Isolates failing or throttled upstream sources so that temporary outages do not
 * block workers or affect healthy sources.
 */
export class CircuitBreaker {
  private readonly sourceId: string;
  private readonly failureThreshold: number;
  private readonly recoveryTimeMs: number;

  private state: CircuitState = "CLOSED";
  private consecutiveFailures: number = 0;
  private nextAttemptAt: number = 0;
  private lastFailureTime: number = 0;
  private lastError: Error | null = null;

  constructor(sourceId: string, config?: CircuitBreakerConfig) {
    this.sourceId = sourceId;
    this.failureThreshold = config?.failureThreshold ?? 5; // trip after 5 consecutive failures
    this.recoveryTimeMs = config?.recoveryTimeMs ?? 30_000; // 30s recovery window
  }

  /**
   * Current circuit state.
   */
  getState(): CircuitState {
    const now = Date.now();
    if (this.state === "OPEN" && now >= this.nextAttemptAt) {
      this.state = "HALF_OPEN";
    }
    return this.state;
  }

  /**
   * Number of consecutive recorded failures.
   */
  getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }

  /**
   * Executes an asynchronous task guarded by the circuit breaker.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    if (currentState === "OPEN") {
      const remainingMs = Math.max(0, this.nextAttemptAt - Date.now());
      throw new CircuitBreakerOpenError(this.sourceId, remainingMs);
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (err: any) {
      this.recordFailure(err);
      throw err;
    }
  }

  /**
   * Records a successful execution, resetting failures and closing the circuit.
   */
  recordSuccess(): void {
    this.state = "CLOSED";
    this.consecutiveFailures = 0;
    this.nextAttemptAt = 0;
    this.lastError = null;
  }

  /**
   * Records an upstream failure, incrementing counter and checking threshold.
   */
  recordFailure(error?: Error): void {
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();
    this.lastError = error || null;

    if (this.state === "HALF_OPEN" || this.consecutiveFailures >= this.failureThreshold) {
      this.state = "OPEN";
      this.nextAttemptAt = Date.now() + this.recoveryTimeMs;
    }
  }

  /**
   * Forcefully resets the circuit breaker to CLOSED.
   */
  reset(): void {
    this.state = "CLOSED";
    this.consecutiveFailures = 0;
    this.nextAttemptAt = 0;
    this.lastError = null;
  }

  /**
   * Manually trips the circuit breaker to OPEN (useful for tests or immediate outages).
   */
  trip(recoveryTimeMs?: number): void {
    this.state = "OPEN";
    this.nextAttemptAt = Date.now() + (recoveryTimeMs ?? this.recoveryTimeMs);
  }
}
