// src/lib/services/connectors/verification/types.ts
/**
 * Chunk 6: Verification & Scam Detection Types
 */

export type ConnectorVerificationStatus =
  | "verified"
  | "flagged_scam"
  | "expired"
  | "closed"
  | "pending";

export interface ScamDetectionResult {
  isScam: boolean;
  scamScore: number; // 0.0 to 1.0 (0 = completely safe, 1 = definite scam)
  riskLevel: "safe" | "low" | "medium" | "critical";
  detectedPatterns: string[];
}

export interface UrlLivenessResult {
  isLive: boolean;
  statusCode: number | null;
  finalUrl: string;
  isExpiredOrClosed: boolean;
  reason: string;
}

export interface OpportunityVerificationResult {
  opportunityId: string;
  verificationStatus: ConnectorVerificationStatus;
  confidenceScore: number; // 0.0 to 1.0
  scamDetection: ScamDetectionResult;
  urlLiveness: UrlLivenessResult;
  verifiedAt: string;
}

export interface ReverificationBatchResult {
  totalEvaluated: number;
  stillActiveCount: number;
  expiredOrClosedCount: number;
  scamFlaggedCount: number;
  errorsCount: number;
  durationMs: number;
}
