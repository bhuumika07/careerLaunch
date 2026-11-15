// src/lib/services/enrichment/adminEnrichmentService.ts
/**
 * Admin Diagnostics & Review Service for AI Opportunity Enrichment (Phase 3 - Chunk 7)
 *
 * Provides inspection, quality auditing, diagnostics, and human-in-the-loop (HITL)
 * review actions for AI-extracted opportunity enrichments.
 */

export interface EnrichmentReviewFilterOptions {
  status?: string; // 'needs_review' | 'failed' | 'succeeded' | 'all'
  minConfidence?: number;
  maxConfidence?: number;
  query?: string;
  hasUnsupportedClaims?: boolean;
  hasContradictions?: boolean;
  page?: number;
  limit?: number;
}

export interface EnrichmentAdminMetrics {
  totalProcessed: number;
  succeededCount: number;
  needsReviewCount: number;
  failedCount: number;
  pendingCount: number;
  successRate: number; // percentage succeeded
  failureRate: number; // percentage failed
  reviewRate: number; // percentage needs_review
  averageConfidence: number;
  lowConfidenceRate: number; // percentage below 0.65
  unsupportedClaimsCount: number;
  topMissingFields: Array<{ field: string; count: number }>;
  versionBreakdown: Record<string, number>;
}

export interface DiagnosticDetail {
  id: string;
  opportunityId: string;
  opportunityTitle: string;
  employer: string;
  status: string;
  confidenceScore: number;
  fieldConfidences: Record<string, number>;
  missingFields: string[];
  unsupportedClaims: Array<{
    field: string;
    claimedValue: any;
    citedSnippet?: string | null;
    reason: string;
  }>;
  contradictions: string[];
  extractionModel: string;
  promptVersion: string;
  schemaVersion: string;
  contentHash: string;
  processedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  adminNotes?: string | null;
  retryCount: number;
  errorDetails?: any;
  isCurrent: boolean;
  structuredData: any;
  normalizedDescription?: string;
}

export interface ReviewActionResult {
  success: boolean;
  enrichmentId: string;
  newStatus: string;
  reviewedAt: string;
  reviewedBy: string;
  adminNotes?: string;
  error?: string;
}

/**
 * Computes aggregate diagnostic metrics across all enrichments.
 */
export function computeEnrichmentMetrics(
  enrichments: any[] = []
): EnrichmentAdminMetrics {
  const total = enrichments.length;
  if (total === 0) {
    return {
      totalProcessed: 0,
      succeededCount: 0,
      needsReviewCount: 0,
      failedCount: 0,
      pendingCount: 0,
      successRate: 0,
      failureRate: 0,
      reviewRate: 0,
      averageConfidence: 0,
      lowConfidenceRate: 0,
      unsupportedClaimsCount: 0,
      topMissingFields: [],
      versionBreakdown: {},
    };
  }

  let succeeded = 0;
  let needsReview = 0;
  let failed = 0;
  let pending = 0;
  let totalConfidence = 0;
  let lowConfidenceCount = 0;
  let totalUnsupportedClaims = 0;
  const missingFieldFrequency: Record<string, number> = {};
  const versionBreakdown: Record<string, number> = {};

  for (const item of enrichments) {
    const status = String(item.status || "pending").toLowerCase();
    if (status === "succeeded") succeeded++;
    else if (status === "needs_review") needsReview++;
    else if (status === "failed") failed++;
    else pending++;

    // Track prompt / model versions
    const versionKey = `${item.extractionModel || "unknown"} / ${item.promptVersion || "unknown"}`;
    versionBreakdown[versionKey] = (versionBreakdown[versionKey] || 0) + 1;

    const conf =
      typeof item.overallConfidence === "number"
        ? item.overallConfidence
        : typeof item.confidence === "number"
        ? item.confidence
        : typeof item.confidenceScore === "number"
        ? item.confidenceScore
        : typeof item.quality?.overall_confidence === "number"
        ? item.quality.overall_confidence
        : null;

    if (conf !== null) {
      totalConfidence += conf;
      if (conf < 0.65) {
        lowConfidenceCount++;
      }
    }

    const unsupp =
      item.unsupportedClaims ||
      item.quality?.unsupported_claims ||
      [];
    totalUnsupportedClaims += Array.isArray(unsupp) ? unsupp.length : 0;

    const missing =
      item.missingFields ||
      item.quality?.missing_fields ||
      [];
    if (Array.isArray(missing)) {
      for (const f of missing) {
        missingFieldFrequency[f] = (missingFieldFrequency[f] || 0) + 1;
      }
    }
  }

  const averageConfidence =
    total > 0 ? Number((totalConfidence / total).toFixed(3)) : 0;
  const lowConfidenceRate =
    total > 0 ? Number(((lowConfidenceCount / total) * 100).toFixed(1)) : 0;
  const successRate =
    total > 0 ? Number(((succeeded / total) * 100).toFixed(1)) : 0;
  const failureRate =
    total > 0 ? Number(((failed / total) * 100).toFixed(1)) : 0;
  const reviewRate =
    total > 0 ? Number(((needsReview / total) * 100).toFixed(1)) : 0;

  const topMissingFields = Object.entries(missingFieldFrequency)
    .map(([field, count]) => ({ field, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalProcessed: total,
    succeededCount: succeeded,
    needsReviewCount: needsReview,
    failedCount: failed,
    pendingCount: pending,
    successRate,
    failureRate,
    reviewRate,
    averageConfidence,
    lowConfidenceRate,
    unsupportedClaimsCount: totalUnsupportedClaims,
    topMissingFields,
    versionBreakdown,
  };
}

/**
 * Filters and paginates enrichments for the admin review queue.
 */
export function getEnrichmentReviewQueue(
  enrichments: any[] = [],
  opportunities: any[] = [],
  filters: EnrichmentReviewFilterOptions = {}
) {
  const oppMap = new Map<string, any>();
  for (const o of opportunities) {
    oppMap.set(o.id, o);
  }

  const filtered = enrichments.filter((item) => {
    // 1. Status Filter
    if (filters.status && filters.status !== "all") {
      const targetStatus = filters.status.toLowerCase();
      const currentStatus = String(item.status || "").toLowerCase();
      if (currentStatus !== targetStatus) {
        return false;
      }
    }

    const conf =
      typeof item.overallConfidence === "number"
        ? item.overallConfidence
        : typeof item.confidence === "number"
        ? item.confidence
        : typeof item.confidenceScore === "number"
        ? item.confidenceScore
        : typeof item.quality?.overall_confidence === "number"
        ? item.quality.overall_confidence
        : 1.0;

    // 2. Confidence Filter
    if (typeof filters.minConfidence === "number" && conf < filters.minConfidence) {
      return false;
    }
    if (typeof filters.maxConfidence === "number" && conf > filters.maxConfidence) {
      return false;
    }

    // 3. Unsupported Claims Filter
    const unsupp = item.unsupportedClaims || item.quality?.unsupported_claims || [];
    if (filters.hasUnsupportedClaims && (!Array.isArray(unsupp) || unsupp.length === 0)) {
      return false;
    }

    // 4. Text Search
    if (filters.query && filters.query.trim()) {
      const q = filters.query.toLowerCase().trim();
      const opp = oppMap.get(item.opportunityId);
      const title = String(opp?.title || item.roleTitle || "").toLowerCase();
      const employer = String(opp?.organizationName || opp?.org || item.company || "").toLowerCase();
      const notes = String(item.adminNotes || "").toLowerCase();

      if (!title.includes(q) && !employer.includes(q) && !notes.includes(q)) {
        return false;
      }
    }

    return true;
  });

  const totalCount = filtered.length;
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.max(1, filters.limit ?? 20);
  const totalPages = Math.ceil(totalCount / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginated = filtered.slice(startIndex, startIndex + limit);

  const items = paginated.map((item) => {
    const opp = oppMap.get(item.opportunityId);
    const conf =
      typeof item.overallConfidence === "number"
        ? item.overallConfidence
        : typeof item.confidence === "number"
        ? item.confidence
        : typeof item.confidenceScore === "number"
        ? item.confidenceScore
        : typeof item.quality?.overall_confidence === "number"
        ? item.quality.overall_confidence
        : 1.0;

    return {
      id: item.id,
      opportunityId: item.opportunityId,
      opportunityTitle: opp?.title || item.roleTitle || "Untitled Opportunity",
      employer: opp?.organizationName || opp?.org || item.company || "Unknown Employer",
      status: item.status || "pending",
      confidenceScore: conf,
      missingFieldsCount: (item.missingFields || item.quality?.missing_fields || []).length,
      unsupportedClaimsCount: (item.unsupportedClaims || item.quality?.unsupported_claims || []).length,
      processedAt: item.processedAt ? new Date(item.processedAt).toISOString() : new Date().toISOString(),
      retryCount: item.retryCount || 0,
      isCurrent: item.isCurrent ?? true,
      errorDetails: item.errorDetails || null,
      adminNotes: item.adminNotes || null,
    };
  });

  return {
    items,
    totalCount,
    page,
    limit,
    totalPages,
  };
}

/**
 * Fetches comprehensive diagnostics for a single enrichment record.
 */
export function getEnrichmentDiagnostics(
  enrichmentId: string,
  enrichments: any[] = [],
  opportunities: any[] = []
): DiagnosticDetail | null {
  const item = enrichments.find((e) => e.id === enrichmentId);
  if (!item) return null;

  const opp = opportunities.find((o) => o.id === item.opportunityId);

  const conf =
    typeof item.overallConfidence === "number"
      ? item.overallConfidence
      : typeof item.confidence === "number"
      ? item.confidence
      : typeof item.confidenceScore === "number"
      ? item.confidenceScore
      : typeof item.quality?.overall_confidence === "number"
      ? item.quality.overall_confidence
      : 1.0;

  const fieldConfidences =
    item.fieldConfidences || item.quality?.field_confidences || {};
  const missingFields = item.missingFields || item.quality?.missing_fields || [];
  const unsupportedClaims =
    item.unsupportedClaims || item.quality?.unsupported_claims || [];
  const contradictions =
    item.contradictions || item.quality?.contradictions || [];

  return {
    id: item.id,
    opportunityId: item.opportunityId,
    opportunityTitle: opp?.title || item.roleTitle || "Untitled Opportunity",
    employer: opp?.organizationName || opp?.org || item.company || "Unknown Employer",
    status: item.status || "pending",
    confidenceScore: conf,
    fieldConfidences,
    missingFields,
    unsupportedClaims,
    contradictions,
    extractionModel: item.extractionModel || "unknown",
    promptVersion: item.promptVersion || "unknown",
    schemaVersion: item.schemaVersion || "unknown",
    contentHash: item.contentHash || "",
    processedAt: item.processedAt ? new Date(item.processedAt).toISOString() : new Date().toISOString(),
    reviewedAt: item.reviewedAt ? new Date(item.reviewedAt).toISOString() : null,
    reviewedBy: item.reviewedBy || null,
    adminNotes: item.adminNotes || null,
    retryCount: item.retryCount || 0,
    errorDetails: item.errorDetails || null,
    isCurrent: item.isCurrent ?? true,
    structuredData: {
      roleTitle: item.roleTitle,
      company: item.company,
      opportunityType: item.opportunityType,
      workMode: item.workMode,
      descriptionSummary: item.descriptionSummary,
      requiredSkills: item.requiredSkills || [],
      preferredSkills: item.preferredSkills || [],
      inferredSkills: item.inferredSkills || [],
      degreeLevels: item.degreeLevels || [],
      branches: item.branches || [],
      graduationYears: item.graduationYears || [],
      minCgpa: item.minCgpa,
      experienceLevel: item.experienceLevel,
      minExperienceMonths: item.minExperienceMonths,
      maxExperienceMonths: item.maxExperienceMonths,
      compensation: item.compensation || null,
      isPaid: item.isPaid,
      applicationDeadline: item.applicationDeadline,
    },
    normalizedDescription: opp?.description || undefined,
  };
}

/**
 * Pure state updater for Admin Manual Review actions:
 * - 'approve': marks record 'succeeded', sets reviewedBy/reviewedAt, isCurrent = true
 * - 'override': applies partial edits, marks 'succeeded', sets reviewedBy/reviewedAt
 * - 'reject': marks record 'failed', sets isCurrent = false, records reason
 */
export function applyAdminReviewAction(
  enrichment: any,
  action: "approve" | "override" | "reject",
  options: {
    adminId: string;
    notes?: string;
    editedPayload?: Partial<any>;
    now?: Date;
  }
): { updatedRecord: any; result: ReviewActionResult } {
  if (!enrichment) {
    throw new Error("Enrichment record not found");
  }

  const now = options.now || new Date();
  const reviewedAtStr = now.toISOString();

  let newStatus = enrichment.status;
  let updatedRecord = { ...enrichment };

  if (action === "approve") {
    newStatus = "succeeded";
    updatedRecord = {
      ...updatedRecord,
      status: newStatus,
      isCurrent: true,
      reviewedAt: now,
      reviewedBy: options.adminId,
      adminNotes: options.notes || "Approved by administrator.",
    };
  } else if (action === "override") {
    newStatus = "succeeded";
    updatedRecord = {
      ...updatedRecord,
      ...(options.editedPayload || {}),
      status: newStatus,
      isCurrent: true,
      reviewedAt: now,
      reviewedBy: options.adminId,
      adminNotes: options.notes || "Overridden with manual edits by administrator.",
    };
  } else if (action === "reject") {
    newStatus = "failed";
    updatedRecord = {
      ...updatedRecord,
      status: newStatus,
      isCurrent: false,
      reviewedAt: now,
      reviewedBy: options.adminId,
      adminNotes: options.notes || "Rejected by administrator.",
      errorDetails: { reason: "Admin rejected enrichment", notes: options.notes },
    };
  }

  return {
    updatedRecord,
    result: {
      success: true,
      enrichmentId: enrichment.id,
      newStatus,
      reviewedAt: reviewedAtStr,
      reviewedBy: options.adminId,
      adminNotes: options.notes,
    },
  };
}
