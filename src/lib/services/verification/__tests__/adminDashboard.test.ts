// src/lib/services/verification/__tests__/adminDashboard.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeAdminMetrics,
  getSourcesHealthOverview,
  getOpportunitiesNeedingReview,
  getOpportunityVerificationHistory,
  triggerManualVerification,
  assertAdminRole,
} from '../adminService.ts';

describe('Chunk 11: Admin Tooling & Verification Dashboard', () => {
  describe('RBAC & Role Authorization Guards', () => {
    it('restricts admin access: throws 403 FORBIDDEN_ROLE for student role', () => {
      const studentUser = { id: 'u_student_99', role: 'student', email: 'student@example.com' };

      assert.throws(
        () => assertAdminRole(studentUser),
        (err: any) => {
          assert.equal(err.statusCode, 403);
          assert.equal(err.code, 'FORBIDDEN_ROLE');
          assert.match(err.message, /requires \[admin\] role, but you are authenticated as \[student\]/);
          return true;
        }
      );
    });

    it('rejects unauthenticated requests with 401 UNAUTHENTICATED', () => {
      assert.throws(
        () => assertAdminRole(null),
        (err: any) => {
          assert.equal(err.statusCode, 401);
          assert.equal(err.code, 'UNAUTHENTICATED');
          return true;
        }
      );
    });

    it('allows admin role to proceed without throwing', () => {
      const adminUser = { id: 'u_admin_1', role: 'admin', email: 'admin@careerlaunch.internal' };
      assert.doesNotThrow(() => assertAdminRole(adminUser));
    });
  });

  describe('Real Data Metrics Computation', () => {
    it('computes accurate counts, stale percentage, and success rate without hardcoded numbers', async () => {
      const now = new Date('2026-11-15T12:00:00.000Z');
      const freshDate = new Date('2026-11-15T10:00:00.000Z').toISOString(); // 2h old (fresh for NORMAL 24h threshold)
      const staleDate = new Date('2026-11-14T08:00:00.000Z').toISOString(); // 28h old (stale for NORMAL 24h threshold)

      const mockDb = {
        opportunities: [
          { id: 'opp-1', status: 'ACTIVE', lastVerifiedAt: freshDate },
          { id: 'opp-2', status: 'ACTIVE', lastVerifiedAt: freshDate },
          { id: 'opp-3', status: 'ACTIVE', lastVerifiedAt: staleDate }, // stale due to age
          { id: 'opp-4', status: 'STALE', lastVerifiedAt: staleDate },
          { id: 'opp-5', status: 'CLOSED', lastVerifiedAt: staleDate },
          { id: 'opp-6', status: 'REVIEW_REQUIRED', lastVerifiedAt: freshDate },
          { id: 'opp-7', status: 'PENDING', lastVerifiedAt: null },
          { id: 'opp-8', status: 'EXPIRED', lastVerifiedAt: staleDate },
        ],
        verificationLogs: [
          { id: 'l1', opportunityId: 'opp-1', outcome: 'AVAILABLE', checkedAt: '2026-11-15T10:00:00.000Z' },
          { id: 'l2', opportunityId: 'opp-2', outcome: 'AVAILABLE', checkedAt: '2026-11-15T11:00:00.000Z' },
          { id: 'l3', opportunityId: 'opp-3', outcome: 'AVAILABLE', checkedAt: '2026-11-14T20:00:00.000Z' },
          { id: 'l4', opportunityId: 'opp-4', outcome: 'UNKNOWN', sourceName: 'greenhouse', checkedAt: '2026-11-15T09:00:00.000Z' },
        ],
        sources: [
          { id: 'src-1', name: 'greenhouse', healthStatus: 'HEALTHY', rateLimit: 60, enabled: true },
        ],
      };

      const mockQueue = {
        getWaitingCount: async () => 2,
        getActiveCount: async () => 1,
        getFailedCount: async () => 3,
        getDelayedCount: async () => 0,
      };

      const metrics = await computeAdminMetrics(mockDb, mockQueue as any, now);

      assert.equal(metrics.activeAndFresh, 2);
      assert.equal(metrics.stale, 2); // opp-3 (active but old) + opp-4 (stale status)
      assert.equal(metrics.closed, 1);
      assert.equal(metrics.reviewRequired, 1);
      assert.equal(metrics.pending, 1);
      assert.equal(metrics.expired, 1);
      assert.equal(metrics.totalOpportunities, 8);
      assert.equal(metrics.stalePercentage, 25); // 2 / 8 = 25%

      // Success rate: 3 AVAILABLE out of 4 logs = 75%
      assert.equal(metrics.verificationSuccessRate, 75);
      assert.equal(metrics.lastSuccessfulWorkerRun, '2026-11-15T11:00:00.000Z');
      assert.equal(metrics.sourceApiErrorCounts['greenhouse'], 1);

      // Backlog
      assert.equal(metrics.queueBacklog.waiting, 2);
      assert.equal(metrics.queueBacklog.active, 1);
      assert.equal(metrics.queueBacklog.failed, 3);
      assert.equal(metrics.failedJobs, 3);
    });

    it('gracefully handles empty database and missing queue client', async () => {
      const emptyDb = {
        opportunities: [],
        verificationLogs: [],
        sources: [],
      };

      const metrics = await computeAdminMetrics(emptyDb, null);

      assert.equal(metrics.activeAndFresh, 0);
      assert.equal(metrics.stale, 0);
      assert.equal(metrics.closed, 0);
      assert.equal(metrics.totalOpportunities, 0);
      assert.equal(metrics.stalePercentage, 0);
      assert.equal(metrics.verificationSuccessRate, 100);
      assert.equal(metrics.lastSuccessfulWorkerRun, null);
      assert.equal(metrics.failedJobs, 0);
      assert.equal(metrics.queueBacklog.waiting, 0);
    });
  });

  describe('Source Health & Review Queue', () => {
    it('aggregates source health and active opportunity counts', () => {
      const mockDb = {
        sources: [
          {
            id: 's_greenhouse',
            name: 'Greenhouse Board',
            type: 'ATS',
            enabled: true,
            healthStatus: 'HEALTHY',
            rateLimit: 30,
            lastSuccessAt: '2026-11-15T10:00:00.000Z',
          },
          {
            id: 's_lever',
            name: 'Lever API',
            type: 'ATS',
            enabled: false,
            healthStatus: 'FAILING',
            rateLimit: 15,
            lastErrorAt: '2026-11-15T09:00:00.000Z',
            lastErrorMessage: '401 Unauthorized',
          },
        ],
        opportunities: [
          { id: 'opp-1', sourceId: 's_greenhouse', status: 'ACTIVE' },
          { id: 'opp-2', sourceId: 's_greenhouse', status: 'ACTIVE' },
          { id: 'opp-3', sourceId: 's_lever', status: 'CLOSED' },
        ],
      };

      const health = getSourcesHealthOverview(mockDb);

      assert.equal(health.length, 2);
      assert.equal(health[0].id, 's_greenhouse');
      assert.equal(health[0].activeOpportunitiesCount, 2);
      assert.equal(health[0].enabled, true);

      assert.equal(health[1].id, 's_lever');
      assert.equal(health[1].activeOpportunitiesCount, 0);
      assert.equal(health[1].enabled, false);
      assert.equal(health[1].healthStatus, 'FAILING');
      assert.equal(health[1].lastErrorMessage, '401 Unauthorized');
    });

    it('filters opportunities requiring administrative review', () => {
      const mockDb = {
        opportunities: [
          { id: 'opp-1', title: 'Software Eng', status: 'ACTIVE' },
          { id: 'opp-2', title: 'Data Scientist', status: 'REVIEW_REQUIRED', reviewReason: 'Metadata conflict' },
          { id: 'opp-3', title: 'Product Manager', status: 'REVIEW_REQUIRED', reviewReason: 'Unapproved redirect' },
        ],
      };

      const reviewOpps = getOpportunitiesNeedingReview(mockDb);

      assert.equal(reviewOpps.length, 2);
      assert.equal(reviewOpps[0].id, 'opp-2');
      assert.equal(reviewOpps[1].id, 'opp-3');
    });
  });

  describe('Verification History & Manual Re-Verification', () => {
    it('returns chronological audit history for a specific opportunity', () => {
      const mockDb = {
        verificationLogs: [
          { id: 'log-1', opportunityId: 'opp-target', outcome: 'AVAILABLE', checkedAt: '2026-11-15T08:00:00.000Z', httpStatus: 200 },
          { id: 'log-2', opportunityId: 'opp-other', outcome: 'AVAILABLE', checkedAt: '2026-11-15T09:00:00.000Z', httpStatus: 200 },
          { id: 'log-3', opportunityId: 'opp-target', outcome: 'UNKNOWN', checkedAt: '2026-11-15T10:00:00.000Z', httpStatus: 429 },
        ],
      };

      const history = getOpportunityVerificationHistory(mockDb, 'opp-target');

      assert.equal(history.length, 2);
      // Descending sort check: newest first
      assert.equal(history[0].id, 'log-3');
      assert.equal(history[0].httpStatus, 429);
      assert.equal(history[1].id, 'log-1');
      assert.equal(history[1].httpStatus, 200);
    });

    it('enqueues deduplicated manual re-verification with admin audit logging', async () => {
      const mockDb: any = {
        opportunities: [
          { id: 'opp-100', title: 'Staff Engineer', status: 'STALE' },
        ],
        adminAuditLogs: [],
      };

      const addedJobs: any[] = [];
      const mockQueue = {
        getJob: async (jobId: string) => null, // No job currently queued
        add: async (name: string, data: any, opts: any) => {
          addedJobs.push({ name, data, opts });
          return { id: opts.jobId };
        },
      };

      const adminUser = { id: 'admin_user_42', email: 'lead-admin@careerlaunch.com', role: 'admin' };

      const result = await triggerManualVerification('opp-100', adminUser, mockDb, mockQueue as any);

      assert.equal(result.success, true);
      assert.equal(result.jobId, 'verify-opp-100');
      assert.equal(result.adminId, 'admin_user_42');

      // Check queue addition
      assert.equal(addedJobs.length, 1);
      assert.equal(addedJobs[0].opts.jobId, 'verify-opp-100');
      assert.equal(addedJobs[0].data.opportunityId, 'opp-100');
      assert.equal(addedJobs[0].data.triggeredBy, 'admin_user_42');

      // Check audit log created
      assert.equal(mockDb.adminAuditLogs.length, 1);
      assert.equal(mockDb.adminAuditLogs[0].action, 'MANUAL_VERIFICATION_TRIGGER');
      assert.equal(mockDb.adminAuditLogs[0].adminId, 'admin_user_42');
      assert.equal(mockDb.adminAuditLogs[0].opportunityId, 'opp-100');
    });

    it('deduplicates manual verification when a job is already in queue', async () => {
      const mockDb: any = {
        opportunities: [{ id: 'opp-200', title: 'ML Researcher', status: 'ACTIVE' }],
        adminAuditLogs: [],
      };

      const mockQueue = {
        getJob: async (jobId: string) => ({
          getState: async () => 'waiting',
        }),
        add: async () => {
          throw new Error('Should not add duplicate job');
        },
      };

      const adminUser = { id: 'admin_1', role: 'admin' };
      const result = await triggerManualVerification('opp-200', adminUser, mockDb, mockQueue as any);

      assert.equal(result.success, false);
      assert.match(result.message, /already queued in state: waiting/);
    });
  });
});
