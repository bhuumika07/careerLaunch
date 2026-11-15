// src/lib/services/verification/types.ts

export type VerificationOutcome = "AVAILABLE" | "CLOSED" | "UNKNOWN" | "CONFLICT";

export type VerificationResult =
  | {
      outcome: "AVAILABLE";
      checkedAt: Date;
      evidence: string;
      evidenceType: string;
      httpStatus?: number;
      responseTimeMs?: number;
    }
  | {
      outcome: "CLOSED";
      checkedAt: Date;
      evidence: string;
      evidenceType: string;
      httpStatus?: number;
      responseTimeMs?: number;
    }
  | {
      outcome: "UNKNOWN";
      checkedAt: Date;
      reason: string;
      httpStatus?: number;
      responseTimeMs?: number;
      retryAfterSeconds?: number;
    }
  | {
      outcome: "CONFLICT";
      checkedAt: Date;
      reason: string;
      httpStatus?: number;
      responseTimeMs?: number;
    };

export interface SourceListingInfo {
  opportunityId: string;
  sourceId: string;
  sourceUrl: string;
  externalId?: string | null;
  applicationUrl?: string | null;
  title?: string;
  organizationName?: string;
  contentHash?: string | null;
  description?: string | null;
}

export interface SourceConfig {
  id: string;
  name: string;
  baseUrl: string;
  boardToken?: string;
  config?: Record<string, any>;
  verificationRateLimit?: number | null;
  verificationTimeoutSec?: number | null;
}
