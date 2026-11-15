// src/lib/services/connectors/types.ts
/**
 * TypeScript Data Models and Contracts for Chunk 2: Data Model and Source Registry
 */

export type SourceRegistryCategory =
  | "job_board"
  | "ats"
  | "government"
  | "internship_portal";

export type SourceRegistryStatus =
  | "active"
  | "permission_pending"
  | "external_link_only"
  | "disabled";

export type IngestionOpportunityType =
  | "job"
  | "internship"
  | "fellowship"
  | "research";

export type ConnectorVerificationStatus =
  | "verified"
  | "pending"
  | "unverified"
  | "closed"
  | "rejected";

/**
 * 1. Source Registry Record
 */
export interface SourceRegistryEntry {
  id: string; // e.g. "naukri", "greenhouse", "lever", "ashby"
  name: string;
  category: SourceRegistryCategory;
  geography: string; // e.g. "India", "Global", "US"
  accessMethod: string; // e.g. "public_api", "licensed_api", "external_search", "rss_feed"
  status: SourceRegistryStatus;
  termsUrl?: string | null;
  refreshInterval: number; // in minutes (0 for external_link_only)
  attributionText?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 2. Standardized Connector Opportunity Model
 */
export interface ConnectorOpportunity {
  id: string;
  title: string;
  organization: string;
  description: string;
  type: IngestionOpportunityType;
  experienceLevel: string; // "fresher", "entry", "mid", "senior"
  location?: string | null;
  isRemote: boolean;
  salary?: string | null;
  skills: string[];
  postedDate?: string | null;
  deadline?: string | null;
  originalUrl: string;
  sourceId: string;
  sourceExternalId?: string | null;
  fetchedAt: string;
  lastVerifiedAt?: string | null;
  verificationStatus: ConnectorVerificationStatus | string;
  rawPayloadRef?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 3. Ingestion Run Log
 */
export interface IngestionRunLog {
  id: string;
  sourceId: string;
  startTime: string;
  endTime?: string | null;
  status: "running" | "completed" | "failed";
  fetchedCount: number;
  newCount: number;
  updatedCount: number;
  rejectedCount: number;
  errors?: string[] | any;
  durationMs?: number;
  createdAt: string;
}

/**
 * Ingestion Run Metrics delta
 */
export interface IngestionCountsDelta {
  fetchedCount?: number;
  newCount?: number;
  updatedCount?: number;
  rejectedCount?: number;
}
