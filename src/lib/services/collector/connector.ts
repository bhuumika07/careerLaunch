// Collector & Verification infrastructure
// src/lib/services/collector/connector.ts
import type { VerificationResult, SourceListingInfo, SourceConfig } from "../verification/types";

export interface Connector {
  /** Discover listing identifiers or URLs for the given source */
  discover(): Promise<string[]>;
  /** Fetch raw content for a specific listing identifier (or URL) */
  fetch(listingId: string): Promise<{ rawHtml?: string; rawJson?: any; rawText?: string; sourceUrl: string }>;
  /** Optional availability checker method for verifiable sources */
  checkAvailability?(
    listing: SourceListingInfo,
    sourceConfig?: SourceConfig
  ): Promise<VerificationResult>;
}

export enum ConnectorType {
  API = "api",
  RSS = "rss",
  HTML = "html",
  MANUAL = "manual",
}
