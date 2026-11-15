// src/lib/services/connectors/verification/verifier.ts
/**
 * Chunk 6: Opportunity Verification & Scam Detection Engine
 *
 * Implements:
 * 1. Multi-factor Scam & Fraud Detection heuristics
 * 2. URL Liveness and Expired/Closed Job Checking
 * 3. Confidence Scoring (0.0 to 1.0) and Verification Status Assignment
 */

import type { ConnectorOpportunity } from "../types.ts";
import type {
  ScamDetectionResult,
  UrlLivenessResult,
  OpportunityVerificationResult,
} from "./types.ts";

// Scam Heuristic Patterns
const SCAM_FEE_PATTERNS = [
  /\b(?:registration|application|security|training|processing|document|exam)\s+fee\b/i,
  /\b(?:refundable|nominal|mandatory)\s+(?:security\s+)?deposit\b/i,
  /\bpay\s+(?:rs\.?|inr|usd|\$|₹)\s*[\d,]+/i,
  /\bcharges\s+apply\s+for\s+(?:interview|selection|onboarding)\b/i,
  /\bmoney\s+back\s+guarantee\s+after\s+training\b/i,
];

const SCAM_CONTACT_PATTERNS = [
  /\bcontact\s+(?:\w+\s+)?(?:on|via)\s+telegram\b/i,
  /\bon\s+telegram\s+@[a-z0-9_]+/i,
  /\btelegram\s+@[a-z0-9_]+/i,
  /\b@[a-z0-9_]+\s+(?:on\s+telegram|via\s+telegram)\b/i,
  /\bt\.me\/[a-z0-9_]+/i,
  /\bwa\.me\/[0-9]+/i,
  /\bwhatsapp\s+(?:us|only|hr)\s+at\b/i,
  /\bdm\s+on\s+instagram\b/i,
];

const FREE_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "yopmail.com",
  "rediffmail.com",
];

const SCAM_UNREALISTIC_OFFER_PATTERNS = [
  /\bno\s+interview\s+(?:required|needed)\b/i,
  /\bdirect\s+(?:joining|selection)\s+(?:without|upon)\b/i,
  /\bearn\s+(?:rs\.?|inr|usd|\$|₹)?\s*[\d,]+\s+daily\b/i,
  /\bguaranteed\s+job\s+offer\s+without\s+test\b/i,
  /\bcrypto\s+wallet\s+deposit\b/i,
];

/**
 * 1. Scam & Fraud Detection Heuristics
 */
export function detectScam(opp: {
  title: string;
  organization: string;
  description: string;
  originalUrl?: string;
}): ScamDetectionResult {
  const text = `${opp.title} ${opp.organization} ${opp.description} ${opp.originalUrl || ""}`.toLowerCase();
  const detectedPatterns: string[] = [];
  let score = 0.0;

  // Check 1: Fee requirements (Critical Risk)
  for (const pattern of SCAM_FEE_PATTERNS) {
    if (pattern.test(text)) {
      score += 0.85;
      detectedPatterns.push("Demands registration, security, or application fee");
      break;
    }
  }

  // Check 2: Unofficial contact channels (Telegram / WhatsApp only)
  for (const pattern of SCAM_CONTACT_PATTERNS) {
    if (pattern.test(text)) {
      score += 0.6;
      detectedPatterns.push("Directs applicants to Telegram/WhatsApp for hiring");
      break;
    }
  }

  // Check 3: Corporate recruiter using free personal email
  const emailMatch = text.match(/\b[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
  if (emailMatch) {
    const domain = emailMatch[1].toLowerCase();
    if (FREE_EMAIL_DOMAINS.includes(domain)) {
      score += 0.45;
      detectedPatterns.push(`Official contact uses free public email domain (@${domain})`);
    }
  }

  // Check 4: Unrealistic claims / No interview required
  for (const pattern of SCAM_UNREALISTIC_OFFER_PATTERNS) {
    if (pattern.test(text)) {
      score += 0.5;
      detectedPatterns.push("Suspicious promise of instant hiring without interview or unrealistic daily payout");
      break;
    }
  }

  // Check 5: Suspicious shortened URL or suspicious TLD
  if (opp.originalUrl) {
    const urlLower = opp.originalUrl.toLowerCase();
    if (urlLower.includes("bit.ly") || urlLower.includes("tinyurl.com") || urlLower.includes("is.gd")) {
      score += 0.3;
      detectedPatterns.push("Application URL uses an opaque shortener");
    }
  }

  const finalScore = Math.min(1.0, parseFloat(score.toFixed(2)));
  const isScam = finalScore >= 0.5;

  let riskLevel: ScamDetectionResult["riskLevel"] = "safe";
  if (finalScore >= 0.8) riskLevel = "critical";
  else if (finalScore >= 0.5) riskLevel = "medium";
  else if (finalScore > 0.0) riskLevel = "low";

  return {
    isScam,
    scamScore: finalScore,
    riskLevel,
    detectedPatterns,
  };
}

/**
 * 2. URL Liveness & Expiration Prober
 */
export async function probeUrlLiveness(
  url: string,
  options: {
    timeoutMs?: number;
    mockFetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  } = {}
): Promise<UrlLivenessResult> {
  const { timeoutMs = 5000, mockFetch } = options;

  try {
    const parsed = new URL(url);

    // SSRF & Loopback Protection
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return {
        isLive: false,
        statusCode: null,
        finalUrl: url,
        isExpiredOrClosed: true,
        reason: `Blocked unsafe protocol: ${parsed.protocol}`,
      };
    }

    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.startsWith("192.168.") ||
      host.startsWith("10.") ||
      host === "169.254.169.254"
    ) {
      return {
        isLive: false,
        statusCode: null,
        finalUrl: url,
        isExpiredOrClosed: true,
        reason: `Blocked non-routable or private host: ${host}`,
      };
    }

    const fetcher = mockFetch || globalThis.fetch;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      // Try HEAD first for efficiency
      res = await fetcher(url, {
        method: "HEAD",
        signal: controller.signal,
        headers: { "User-Agent": "CareerLaunch-Verifier/1.0" },
      });

      // If HEAD returns 405 Method Not Allowed, fallback to GET
      if (res.status === 405) {
        res = await fetcher(url, {
          method: "GET",
          signal: controller.signal,
          headers: { "User-Agent": "CareerLaunch-Verifier/1.0" },
        });
      }
    } finally {
      clearTimeout(timeout);
    }

    const finalUrl = res.url || url;

    // HTTP 404 or 410 explicitly means the listing expired or was removed
    if (res.status === 404 || res.status === 410) {
      return {
        isLive: false,
        statusCode: res.status,
        finalUrl,
        isExpiredOrClosed: true,
        reason: `HTTP ${res.status}: Job posting not found or permanently removed`,
      };
    }

    // Success HTTP 200..399
    if (res.ok || (res.status >= 300 && res.status < 400)) {
      // Check if redirect went to generic boards list (common ATS behaviour when job closes)
      const isAtsJobPage = /\/jobs\/\d+/i.test(url);
      const isGenericRedirect = !/\/jobs\/\d+/i.test(finalUrl) && isAtsJobPage;

      if (isGenericRedirect) {
        return {
          isLive: false,
          statusCode: res.status,
          finalUrl,
          isExpiredOrClosed: true,
          reason: "Listing was closed and redirected to main careers index",
        };
      }

      return {
        isLive: true,
        statusCode: res.status,
        finalUrl,
        isExpiredOrClosed: false,
        reason: `HTTP ${res.status} OK`,
      };
    }

    return {
      isLive: false,
      statusCode: res.status,
      finalUrl,
      isExpiredOrClosed: false,
      reason: `HTTP ${res.status} returned by source`,
    };
  } catch (err: any) {
    return {
      isLive: false,
      statusCode: null,
      finalUrl: url,
      isExpiredOrClosed: false,
      reason: err.name === "AbortError" ? "Request timed out" : (err.message || "Network error"),
    };
  }
}

/**
 * 3. Confidence Scoring & Status Decision Engine
 */
export async function verifyOpportunity(
  opp: ConnectorOpportunity,
  options: {
    probeLiveness?: boolean;
    mockFetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  } = {}
): Promise<OpportunityVerificationResult> {
  const { probeLiveness = true, mockFetch } = options;

  // 1. Run Scam Detection
  const scamDetection = detectScam(opp);

  // 2. Run URL Liveness Probe if requested
  let urlLiveness: UrlLivenessResult;
  if (probeLiveness && opp.originalUrl) {
    urlLiveness = await probeUrlLiveness(opp.originalUrl, { mockFetch });
  } else {
    urlLiveness = {
      isLive: true,
      statusCode: 200,
      finalUrl: opp.originalUrl,
      isExpiredOrClosed: false,
      reason: "Probe skipped (cached or disabled)",
    };
  }

  // 3. Evaluate Status & Confidence Score
  let verificationStatus: OpportunityVerificationResult["verificationStatus"] = "pending";
  let confidence = 0.5;

  // Base score from source credibility
  if (["greenhouse", "lever", "ashby"].includes(opp.sourceId)) {
    confidence = 0.9;
  } else if (["naukri", "internshala", "aicte"].includes(opp.sourceId)) {
    confidence = 0.75;
  }

  // A. Scam detected -> immediate flag and 0 confidence
  if (scamDetection.isScam) {
    verificationStatus = "flagged_scam";
    confidence = 0.0;
  }
  // B. URL Expired / Closed -> marked expired and 0 confidence
  else if (urlLiveness.isExpiredOrClosed) {
    verificationStatus = "expired";
    confidence = 0.0;
  }
  // C. Live & Safe -> verified
  else if (urlLiveness.isLive) {
    verificationStatus = "verified";
    confidence += 0.05;

    // Bonus for rich description and clean data
    if (opp.description && opp.description.length > 100) confidence += 0.03;
    if (opp.skills && opp.skills.length > 0) confidence += 0.02;
  } else {
    // URL was unreachable or timed out
    verificationStatus = "pending";
    confidence *= 0.6; // reduce confidence for unconfirmed URL
  }

  confidence = Math.max(0.0, Math.min(1.0, parseFloat(confidence.toFixed(2))));

  return {
    opportunityId: opp.id,
    verificationStatus,
    confidenceScore: confidence,
    scamDetection,
    urlLiveness,
    verifiedAt: new Date().toISOString(),
  };
}
