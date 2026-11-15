// src/lib/services/connectors/framework/types.ts
/**
 * TypeScript Contracts for Chunk 3: Connector Framework
 */

import type { ConnectorOpportunity, SourceRegistryEntry } from "../types.ts";

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerConfig {
  failureThreshold?: number; // Number of consecutive errors before tripping (default: 5)
  recoveryTimeMs?: number;   // Cooldown period in ms before attempting HALF_OPEN probe (default: 30000)
}

export interface RateLimitConfig {
  maxRequestsPerMinute?: number; // Max requests per 60s
  minIntervalMs?: number;        // Minimum delay between consecutive requests in ms
}

export interface RetryConfig {
  maxRetries?: number;      // Max retry attempts on transient errors (default: 3)
  baseDelayMs?: number;     // Base backoff in ms (default: 500)
  maxDelayMs?: number;      // Maximum backoff ceiling in ms (default: 10000)
}

export interface ConnectorConfig {
  timeoutMs?: number;                // Network timeout in ms (default: 10000)
  enabled?: boolean;                 // Connector enable/disable switch
  rateLimit?: RateLimitConfig;
  circuitBreaker?: CircuitBreakerConfig;
  retry?: RetryConfig;
  allowedDomains?: string[];         // SSRF protection allowlist
}

export interface HealthCheckResult {
  healthy: boolean;
  status: "healthy" | "degraded" | "down";
  latencyMs: number;
  message?: string;
  lastCheckedAt: string;
}

export interface RawPayloadRecord {
  ref: string;          // URI / Storage Key (e.g. raw://greenhouse/gh_123_a1b2c3.json)
  sourceId: string;
  externalId?: string | null;
  contentHash: string;  // Deterministic SHA-256 hash
  payload: string;      // Raw text or stringified JSON
  contentType: string;  // e.g. "application/json" | "text/html"
  fetchedAt: string;
}

export interface FetchResult<TRawItem = any> {
  rawItems: TRawItem[];
  rawPayloads: RawPayloadRecord[];
  metadata?: Record<string, any>;
}

export interface IngestionContext {
  runId: string;
  sourceId: string;
  abortSignal?: AbortSignal;
}

export interface ConnectorExecutionResult {
  sourceId: string;
  runId: string;
  success: boolean;
  fetchedCount: number;
  normalizedCount: number;
  rejectedCount: number;
  opportunities: ConnectorOpportunity[];
  errors: string[];
  circuitState: CircuitState;
  durationMs: number;
}

/**
 * Standardized Plug-and-Play Connector Interface
 */
export interface IConnector<TRawItem = any, TParsedItem = any> {
  readonly sourceId: string;
  readonly sourceName: string;
  readonly config: ConnectorConfig;

  /**
   * Healthcheck probing upstream availability.
   */
  healthcheck(): Promise<HealthCheckResult>;

  /**
   * Fetches raw listings from upstream with rate limiting, retries, and timeouts.
   */
  fetch(context: IngestionContext): Promise<FetchResult<TRawItem>>;

  /**
   * Parses raw item into structured domain representation.
   */
  parse(rawItem: TRawItem): Promise<TParsedItem> | TParsedItem;

  /**
   * Transforms parsed item into standardized ConnectorOpportunity.
   */
  to_normalized(
    parsedItem: TParsedItem,
    rawPayloadRef?: string | null
  ): Promise<ConnectorOpportunity | null> | ConnectorOpportunity | null;

  /**
   * Runs the complete pipeline: healthcheck -> fetch -> parse -> to_normalized.
   */
  execute(context: IngestionContext): Promise<ConnectorExecutionResult>;
}
