// src/lib/services/connectors/framework/baseConnector.ts
import type {
  IConnector,
  ConnectorConfig,
  HealthCheckResult,
  FetchResult,
  IngestionContext,
  ConnectorExecutionResult,
} from "./types.ts";
import type { ConnectorOpportunity } from "../types.ts";
import { RateLimiter } from "./rateLimiter.ts";
import { CircuitBreaker } from "./circuitBreaker.ts";
import { RawPayloadStore } from "./rawPayloadStore.ts";
import { validateConnectorOpportunity } from "../opportunityModel.ts";

/**
 * Abstract Base Connector Class
 *
 * Implements resilient operational invariants for all ingestion connectors:
 * 1. Per-source enable/disable switch
 * 2. Rate limiting (sliding window + min interval)
 * 3. Circuit breaking (fault isolation)
 * 4. Retries with exponential backoff & full jitter
 * 5. Request timeouts via AbortSignal
 * 6. Isolated raw payload archiving with deterministic content hashing
 * 7. Standardized pipeline: healthcheck -> fetch -> parse -> to_normalized -> validate
 */
export abstract class BaseConnector<TRawItem = any, TParsedItem = any>
  implements IConnector<TRawItem, TParsedItem>
{
  public abstract readonly sourceId: string;
  public abstract readonly sourceName: string;
  public readonly config: ConnectorConfig;

  public readonly rateLimiter: RateLimiter;
  public readonly circuitBreaker: CircuitBreaker;
  public readonly rawStore: RawPayloadStore;

  constructor(config?: ConnectorConfig) {
    this.config = {
      enabled: config?.enabled ?? true,
      timeoutMs: config?.timeoutMs ?? 10_000,
      rateLimit: config?.rateLimit,
      circuitBreaker: config?.circuitBreaker,
      retry: {
        maxRetries: config?.retry?.maxRetries ?? 3,
        baseDelayMs: config?.retry?.baseDelayMs ?? 300,
        maxDelayMs: config?.retry?.maxDelayMs ?? 5_000,
      },
      allowedDomains: config?.allowedDomains,
    };

    this.rateLimiter = new RateLimiter(this.config.rateLimit);
    this.circuitBreaker = new CircuitBreaker("connector", this.config.circuitBreaker);
    this.rawStore = RawPayloadStore.getInstance();
  }

  public abstract healthcheck(): Promise<HealthCheckResult>;
  public abstract fetch(context: IngestionContext): Promise<FetchResult<TRawItem>>;
  public abstract parse(rawItem: TRawItem): Promise<TParsedItem> | TParsedItem;
  public abstract to_normalized(
    parsedItem: TParsedItem,
    rawPayloadRef?: string | null
  ): Promise<ConnectorOpportunity | null> | ConnectorOpportunity | null;

  /**
   * Helper for extracting an external identifier from a raw item for payload storage.
   */
  protected getExternalId(rawItem: TRawItem): string | null {
    if (typeof rawItem === "object" && rawItem !== null) {
      return (rawItem as any).id?.toString() || (rawItem as any).externalId?.toString() || null;
    }
    return null;
  }

  /**
   * Validates target URL against SSRF domain allowlist.
   */
  protected validateDomain(urlStr: string): void {
    if (!this.config.allowedDomains || this.config.allowedDomains.length === 0) {
      return;
    }

    try {
      const parsed = new URL(urlStr);
      const isAllowed = this.config.allowedDomains.some(
        (d) => parsed.hostname.toLowerCase() === d.toLowerCase() || parsed.hostname.toLowerCase().endsWith(`.${d.toLowerCase()}`)
      );
      if (!isAllowed) {
        throw new Error(
          `SSRF Protection: Host "${parsed.hostname}" is not in the allowed domains list: [${this.config.allowedDomains.join(", ")}].`
        );
      }
    } catch (err: any) {
      throw new Error(`Invalid URL or SSRF block for "${urlStr}": ${err.message}`);
    }
  }

  /**
   * Resilient HTTP fetcher with rate limiting, timeouts, and exponential backoff.
   */
  protected async fetchWithRetry(
    url: string,
    options?: RequestInit,
    externalSignal?: AbortSignal
  ): Promise<Response> {
    this.validateDomain(url);

    const maxRetries = this.config.retry?.maxRetries ?? 3;
    const baseDelay = this.config.retry?.baseDelayMs ?? 300;
    const maxDelay = this.config.retry?.maxDelayMs ?? 5_000;
    const timeoutMs = this.config.timeoutMs ?? 10_000;

    let attempt = 0;

    while (true) {
      attempt++;

      // Wait for rate limiter quota
      await this.rateLimiter.acquire(externalSignal);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      // Link external abort signal if present
      if (externalSignal) {
        externalSignal.addEventListener("abort", () => controller.abort(), { once: true });
      }

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Check for rate limit or server errors
        if (response.status === 429 || (response.status >= 500 && response.status <= 504)) {
          if (attempt <= maxRetries) {
            let delayMs = baseDelay * Math.pow(2, attempt - 1);
            // Full jitter
            delayMs = Math.floor(Math.random() * delayMs);
            delayMs = Math.min(delayMs, maxDelay);

            // Honor Retry-After header if returned by upstream
            const retryAfter = response.headers.get("retry-after");
            if (retryAfter) {
              const seconds = parseInt(retryAfter, 10);
              if (!isNaN(seconds)) {
                delayMs = seconds * 1000;
              }
            }

            await new Promise((r) => setTimeout(r, delayMs));
            continue;
          }
        }

        return response;
      } catch (error: any) {
        clearTimeout(timeoutId);

        const isTimeout = error.name === "AbortError";
        const isNetworkError = !isTimeout;

        if (attempt <= maxRetries && (isTimeout || isNetworkError)) {
          let delayMs = baseDelay * Math.pow(2, attempt - 1);
          delayMs = Math.floor(Math.random() * delayMs);
          delayMs = Math.min(delayMs, maxDelay);
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }

        throw error;
      }
    }
  }

  /**
   * Executes the full connector ingestion pipeline with complete fault isolation.
   */
  public async execute(context: IngestionContext): Promise<ConnectorExecutionResult> {
    const startTime = performance.now();
    const errors: string[] = [];
    const opportunities: ConnectorOpportunity[] = [];
    let fetchedCount = 0;
    let normalizedCount = 0;
    let rejectedCount = 0;

    // 1. Check enabled switch
    if (this.config.enabled === false) {
      return {
        sourceId: this.sourceId,
        runId: context.runId,
        success: true,
        fetchedCount: 0,
        normalizedCount: 0,
        rejectedCount: 0,
        opportunities: [],
        errors: [`Connector "${this.sourceId}" is disabled via configuration switch. Ingestion skipped.`],
        circuitState: this.circuitBreaker.getState(),
        durationMs: performance.now() - startTime,
      };
    }

    try {
      // 2. Fetch raw listings wrapped in circuit breaker
      const fetchResult = await this.circuitBreaker.execute(async () => {
        return this.fetch(context);
      });

      const rawItems = fetchResult.rawItems || [];
      fetchedCount = rawItems.length;

      // 3. Process each raw item: Archive payload -> Parse -> Normalize -> Validate
      for (const item of rawItems) {
        try {
          const externalId = this.getExternalId(item);

          // Archive raw payload to guarantee provenance
          const payloadRecord = await this.rawStore.save({
            sourceId: this.sourceId,
            payload: item as any,
            externalId,
          });

          // Parse into domain object
          const parsed = await this.parse(item);

          // Normalize into standardized ConnectorOpportunity
          const normalized = await this.to_normalized(parsed, payloadRecord.ref);

          if (!normalized) {
            rejectedCount++;
            continue;
          }

          // Validate against Opportunity model
          const validation = validateConnectorOpportunity(normalized);
          if (!validation.valid) {
            rejectedCount++;
            errors.push(`Validation failed for item ${externalId || "unknown"}: ${validation.errors.join(", ")}`);
            continue;
          }

          opportunities.push(normalized);
          normalizedCount++;
        } catch (itemErr: any) {
          rejectedCount++;
          errors.push(`Error processing item: ${itemErr.message}`);
        }
      }

      return {
        sourceId: this.sourceId,
        runId: context.runId,
        success: errors.length === 0 || opportunities.length > 0,
        fetchedCount,
        normalizedCount,
        rejectedCount,
        opportunities,
        errors,
        circuitState: this.circuitBreaker.getState(),
        durationMs: performance.now() - startTime,
      };
    } catch (pipelineErr: any) {
      errors.push(`Pipeline execution failed: ${pipelineErr.message}`);
      return {
        sourceId: this.sourceId,
        runId: context.runId,
        success: false,
        fetchedCount,
        normalizedCount,
        rejectedCount,
        opportunities,
        errors,
        circuitState: this.circuitBreaker.getState(),
        durationMs: performance.now() - startTime,
      };
    }
  }
}
