// Collector infrastructure
// src/lib/services/collector/connector.ts
export interface Connector {
  /** Discover listing identifiers or URLs for the given source */
  discover(): Promise<string[]>;
  /** Fetch raw content for a specific listing identifier (or URL) */
  fetch(listingId: string): Promise<{ rawHtml?: string; rawJson?: any; rawText?: string; sourceUrl: string }>; 
}

export enum ConnectorType {
  API = "api",
  RSS = "rss",
  HTML = "html",
  MANUAL = "manual",
}
