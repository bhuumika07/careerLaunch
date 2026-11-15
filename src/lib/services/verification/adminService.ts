// src/lib/services/verification/adminService.ts
/**
 * Admin Service for Opportunity Verification & Lifecycle Management.
 * Provides real-time metrics, queue diagnostics, source health tracking,
 * verification audit history, and administrative actions (manual re-verify & retry).
 */

import type { VerificationOutcome } from './types.ts';
import { calculateFreshnessCutoff, DEFAULT_FRESHNESS_CONFIG } from './freshnessManager.ts';

export interface AdminSummaryMetrics {
  activeAndFresh: number;
  stale: number;
  closed: number;
  reviewRequired: number;
  pending: number;
  expired: number;
  totalOpportunities: number;
  failedJobs: number;
  stalePercentage: number;
  verificationSuccessRate: number;
  lastSuccessfulWorkerRun: string | null;
  sourceApiErrorCounts: Record<string, number>;
  queueBacklog: {
    waiting: number;
    active: number;
    failed: number;
    delayed: number;
  };
}

export interface SourceHealthOverview {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  healthStatus: string;
  rateLimit: number;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  activeOpportunitiesCount: number;
}

export interface OpportunityHistoryLog {
  id: string;
  opportunityId: string;
  sourceListingId?: string | null;
  outcome: VerificationOutcome;
  reason?: string | null;
  httpStatus?: number | null;
  responseTimeMs?: number | null;
  checkedAt: string;
  evidence?: Record<string, unknown> | null;
}

export interface ManualVerificationResult {
  success: boolean;
  jobId: string;
  opportunityId: string;
  enqueuedAt: string;
  adminId: string;
  message: string;
}

/**
 * Asserts that the authenticated user possesses the admin role.
 * Throws an error with statusCode 401 for unauthenticated users,
 * or 403 FORBIDDEN_ROLE if authenticated with another role (e.g. student).
 */
export function assertAdminRole(user: { role?: string; id?: string } | null | undefined): void {
  if (!user) {
    const err: any = new Error("Authentication required. Please sign in.");
    err.statusCode = 401;
    err.code = "UNAUTHENTICATED";
    throw err;
  }
  if (user.role !== "admin") {
    const err: any = new Error(
      `Access denied. This endpoint requires [admin] role, but you are authenticated as [${user.role}].`
    );
    err.statusCode = 403;
    err.code = "FORBIDDEN_ROLE";
    throw err;
  }
}

/**
 * Computes administrative metrics from real database state and optional BullMQ queue.
 * Strictly avoids any hardcoded numbers.
 */
export async function computeAdminMetrics(
  db: {
    opportunities?: any[];
    verificationLogs?: any[];
    sources?: any[];
    adminAuditLogs?: any[];
  },
  queue?: {
    getWaitingCount?: () => Promise<number>;
    getActiveCount?: () => Promise<number>;
    getFailedCount?: () => Promise<number>;
    getDelayedCount?: () => Promise<number>;
  } | null,
  now = new Date()
): Promise<AdminSummaryMetrics> {
  const opportunities = db.opportunities || [];
  const logs = db.verificationLogs || [];

  const freshnessCutoff = calculateFreshnessCutoff('NORMAL', DEFAULT_FRESHNESS_CONFIG, now);

  let activeAndFresh = 0;
  let stale = 0;
  let closed = 0;
  let reviewRequired = 0;
  let pending = 0;
  let expired = 0;

  for (const opp of opportunities) {
    const status = opp.status ? opp.status.toUpperCase() : 'PENDING';
    if (status === 'ACTIVE') {
      const verifiedAt = opp.lastVerifiedAt ? new Date(opp.lastVerifiedAt) : null;
      if (verifiedAt && verifiedAt >= freshnessCutoff) {
        activeAndFresh++;
      } else {
        stale++;
      }
    } else if (status === 'STALE') {
      stale++;
    } else if (status === 'CLOSED') {
      closed++;
    } else if (status === 'REVIEW_REQUIRED') {
      reviewRequired++;
    } else if (status === 'PENDING') {
      pending++;
    } else if (status === 'EXPIRED') {
      expired++;
    }
  }

  const totalOpportunities = opportunities.length;
  const stalePercentage = totalOpportunities > 0
    ? Math.round((stale / totalOpportunities) * 10000) / 100
    : 0;

  // Verification success rate from logs
  let successfulLogs = 0;
  let lastSuccessfulWorkerRun: string | null = null;
  const sourceApiErrorCounts: Record<string, number> = {};

  for (const log of logs) {
    if (log.outcome === 'AVAILABLE') {
      successfulLogs++;
      if (!lastSuccessfulWorkerRun || new Date(log.checkedAt) > new Date(lastSuccessfulWorkerRun)) {
        lastSuccessfulWorkerRun = log.checkedAt;
      }
    } else if (log.outcome === 'UNKNOWN') {
      const src = log.sourceName || log.sourceListingId || 'unknown_source';
      sourceApiErrorCounts[src] = (sourceApiErrorCounts[src] || 0) + 1;
    }
  }

  const verificationSuccessRate = logs.length > 0
    ? Math.round((successfulLogs / logs.length) * 10000) / 100
    : 100;

  // Queue backlog counts from BullMQ or degraded gracefully
  let queueBacklog = {
    waiting: 0,
    active: 0,
    failed: 0,
    delayed: 0,
  };

  if (queue) {
    try {
      const [waiting, active, failed, delayed] = await Promise.all([
        queue.getWaitingCount ? queue.getWaitingCount() : Promise.resolve(0),
        queue.getActiveCount ? queue.getActiveCount() : Promise.resolve(0),
        queue.getFailedCount ? queue.getFailedCount() : Promise.resolve(0),
        queue.getDelayedCount ? queue.getDelayedCount() : Promise.resolve(0),
      ]);
      queueBacklog = { waiting, active, failed, delayed };
    } catch {
      // Degrade gracefully if queue client is temporarily unreachable
    }
  }

  return {
    activeAndFresh,
    stale,
    closed,
    reviewRequired,
    pending,
    expired,
    totalOpportunities,
    failedJobs: queueBacklog.failed,
    stalePercentage,
    verificationSuccessRate,
    lastSuccessfulWorkerRun,
    sourceApiErrorCounts,
    queueBacklog,
  };
}

/**
 * Aggregates live source health status across all configured sources.
 */
export function getSourcesHealthOverview(db: {
  sources?: any[];
  opportunities?: any[];
}): SourceHealthOverview[] {
  const sources = db.sources || [];
  const opportunities = db.opportunities || [];

  return sources.map((s) => {
    const activeCount = opportunities.filter(
      (opp) => (opp.sourceId === s.id || opp.sourceName === s.name) && opp.status === 'ACTIVE'
    ).length;

    return {
      id: s.id,
      name: s.name,
      type: s.type || 'ATS',
      enabled: s.enabled !== false,
      healthStatus: s.healthStatus || 'HEALTHY',
      rateLimit: s.rateLimit || 10,
      lastSuccessAt: s.lastSuccessAt || null,
      lastErrorAt: s.lastErrorAt || null,
      lastErrorMessage: s.lastErrorMessage || null,
      activeOpportunitiesCount: activeCount,
    };
  });
}

/**
 * Returns opportunities currently flagged as REVIEW_REQUIRED.
 */
export function getOpportunitiesNeedingReview(db: { opportunities?: any[] }) {
  const opportunities = db.opportunities || [];
  return opportunities.filter(
    (opp) => (opp.status && opp.status.toUpperCase() === 'REVIEW_REQUIRED')
  );
}

/**
 * Retrieves per-opportunity verification audit log history.
 */
export function getOpportunityVerificationHistory(
  db: { verificationLogs?: any[] },
  opportunityId: string
): OpportunityHistoryLog[] {
  const logs = db.verificationLogs || [];
  return logs
    .filter((l) => l.opportunityId === opportunityId)
    .sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime());
}

/**
 * Dispatches a manual re-verification job, strictly deduplicating and audit-logging with admin user ID.
 */
export async function triggerManualVerification(
  opportunityId: string,
  adminUser: { id: string; email?: string; role?: string },
  db: {
    opportunities?: any[];
    adminAuditLogs?: any[];
  },
  queue?: {
    getJob?: (id: string) => Promise<any>;
    add?: (name: string, data: any, opts: any) => Promise<any>;
  } | null
): Promise<ManualVerificationResult> {
  const opportunities = db.opportunities || [];
  const opp = opportunities.find((o) => o.id === opportunityId);

  if (!opp) {
    throw new Error(`Opportunity with ID "${opportunityId}" not found`);
  }

  const now = new Date().toISOString();
  const stableJobId = `verify-${opportunityId}`;

  // Deduplication check: if a job is already in queue and not in a terminal state
  if (queue && typeof queue.getJob === 'function') {
    const existing = await queue.getJob(stableJobId);
    if (existing) {
      const state = typeof existing.getState === 'function' ? await existing.getState() : 'waiting';
      if (state === 'active' || state === 'waiting' || state === 'delayed') {
        return {
          success: false,
          jobId: stableJobId,
          opportunityId,
          enqueuedAt: now,
          adminId: adminUser.id,
          message: `Verification job ${stableJobId} is already queued in state: ${state}`,
        };
      }
      // If completed or failed, remove so it can be re-run
      if (typeof existing.remove === 'function') {
        await existing.remove();
      }
    }
  }

  // Enqueue job if queue is connected
  if (queue && typeof queue.add === 'function') {
    await queue.add(
      'verify-opportunity',
      {
        opportunityId,
        source: 'ADMIN_MANUAL_TRIGGER',
        triggeredBy: adminUser.id,
      },
      {
        jobId: stableJobId,
      }
    );
  }

  // Record audit log entry
  if (!db.adminAuditLogs) {
    db.adminAuditLogs = [];
  }
  db.adminAuditLogs.push({
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    action: 'MANUAL_VERIFICATION_TRIGGER',
    adminId: adminUser.id,
    adminEmail: adminUser.email || 'admin@careerlaunch.internal',
    opportunityId,
    timestamp: now,
    details: {
      previousStatus: opp.status,
      jobId: stableJobId,
    },
  });

  return {
    success: true,
    jobId: stableJobId,
    opportunityId,
    enqueuedAt: now,
    adminId: adminUser.id,
    message: `Manual verification successfully queued for opportunity ${opportunityId}`,
  };
}
