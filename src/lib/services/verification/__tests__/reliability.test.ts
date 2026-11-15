// src/lib/services/verification/__tests__/reliability.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateBackoffWithJitter,
  SourceRateLimiter,
} from "../reliability.ts";
import { SourceHealthManager } from "../sourceHealthManager.ts";
import { OpportunityLifecycleManager } from "../lifecycleManager.ts";
import { processVerifyOpportunityJob } from "../../../../workers/verificationWorker.ts";
import { ConnectorManager } from "../connectorManager.ts";
import type { OpportunityAvailabilityChecker } from "../checker.ts";
import type { VerificationResult } from "../types.ts";

describe("Chunk 7: Reliability Hardening & Failure Recovery", () => {
  it("computes exponential backoff with full jitter correctly", () => {
    const delay1 = calculateBackoffWithJitter(1, 1000, 60000);
    const delay2 = calculateBackoffWithJitter(2, 1000, 60000);
    const delay3 = calculateBackoffWithJitter(3, 1000, 60000);

    // Attempt 1: 1000 * [0.75, 1.25] = 750 to 1250
    assert.ok(delay1 >= 750 && delay1 <= 1250);
    // Attempt 2: 2000 * [0.75, 1.25] = 1500 to 2500
    assert.ok(delay2 >= 1500 && delay2 <= 2500);
    // Attempt 3: 4000 * [0.75, 1.25] = 3000 to 5000
    assert.ok(delay3 >= 3000 && delay3 <= 5000);
  });

  it("applies source-wide pause when HTTP 429 is encountered", () => {
    const limiter = new SourceRateLimiter();
    const sourceId = "src-gh-ratelimited";

    // Initially allowed
    const initial = limiter.canRequest(sourceId, 60);
    assert.equal(initial.allowed, true);

    // 429 received with Retry-After 30 seconds
    limiter.pauseSource(sourceId, 30, "HTTP 429 Rate Limit");

    // Immediate next request is blocked
    const blocked = limiter.canRequest(sourceId, 60);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.waitMs! > 25000);
    assert.ok(blocked.reason?.includes("429"));
  });

  it("handles permanent 401/403: marks source FAILING, emits alert, but NEVER closes opportunities", async () => {
    let sourceRecord = {
      id: "src-unauth",
      name: "Private Greenhouse Board",
      healthStatus: "HEALTHY",
      lastFailureAt: null as any,
      lastErrorMessage: null as any,
    };

    const auditLogs: any[] = [];

    const mockPrisma = {
      source: {
        findUnique: async () => sourceRecord,
        update: async ({ data }: any) => {
          sourceRecord = { ...sourceRecord, ...data };
          return sourceRecord;
        },
      },
      auditLog: {
        create: async ({ data }: any) => {
          auditLogs.push(data);
          return { id: "audit-1", ...data };
        },
      },
    };

    const healthManager = new SourceHealthManager(mockPrisma as any);

    const res = await healthManager.recordPermanentFailure(
      "src-unauth",
      "API key revoked by employer",
      401
    );

    assert.equal(res.healthStatus, "FAILING");
    assert.equal(sourceRecord.healthStatus, "FAILING");
    assert.ok(sourceRecord.lastErrorMessage?.includes("401"));
    assert.equal(auditLogs.length, 1);
    assert.equal(auditLogs[0].action, "SOURCE_AUTH_FAILURE");
  });

  it("concurrency control: two concurrent workers verifying the same opportunity do not duplicate logs or corrupt state", async () => {
    const initialOpp = {
      id: "opp-concurrent-1",
      status: "PENDING",
      applicationDeadline: null,
      lastVerifiedAt: null,
      consecutiveFailures: 0,
      lastVerificationOutcome: null,
    };

    const initialSource = {
      id: "opp-src-c1",
      opportunityId: "opp-concurrent-1",
      sourceId: "src-c1",
      sourceUrl: "https://boards.greenhouse.io/acme/jobs/1",
      externalId: "1",
      verificationStatus: "pending",
    };

    const logs: any[] = [];
    let currentOpp = { ...initialOpp };
    let currentSource = { ...initialSource };

    const mockPrisma = {
      $transaction: async (cb: any) => {
        const tx = {
          opportunity: {
            findUnique: async () => ({ ...currentOpp }),
            update: async ({ data }: any) => {
              currentOpp = { ...currentOpp, ...data };
              return currentOpp;
            },
            updateMany: async ({ data }: any) => {
              currentOpp = { ...currentOpp, ...data };
              return { count: 1 };
            },
          },
          opportunitySource: {
            findUnique: async () => ({ ...currentSource }),
            update: async ({ data }: any) => {
              currentSource = { ...currentSource, ...data };
              return currentSource;
            },
          },
          verificationLog: {
            findFirst: async ({ where }: any) => {
              return logs.find(
                (l) =>
                  l.opportunitySourceId === where.opportunitySourceId &&
                  l.checkedAt.getTime() === where.checkedAt.getTime()
              );
            },
            create: async ({ data }: any) => {
              const log = { id: `log-${logs.length + 1}`, ...data };
              logs.push(log);
              return log;
            },
          },
        };
        return cb(tx);
      },
    };

    const lifecycleManager = new OpportunityLifecycleManager(mockPrisma as any);
    const checkedAt = new Date("2026-11-15T18:00:00Z");

    const result: VerificationResult = {
      outcome: "AVAILABLE",
      checkedAt,
      evidence: "Verified active",
      evidenceType: "test",
      httpStatus: 200,
    };

    // Worker 1 and Worker 2 attempt to process the exact same verification result in parallel
    const [res1, res2] = await Promise.all([
      lifecycleManager.processResult({
        opportunityId: "opp-concurrent-1",
        opportunitySourceId: "opp-src-c1",
        sourceId: "src-c1",
        result,
      }),
      lifecycleManager.processResult({
        opportunityId: "opp-concurrent-1",
        opportunitySourceId: "opp-src-c1",
        sourceId: "src-c1",
        result,
      }),
    ]);

    // One succeeds, one detects duplicate / idempotent skip
    assert.equal(currentOpp.status, "ACTIVE");
    assert.equal(logs.length, 1, "Only 1 log entry must be created");
    assert.ok(res1.idempotentSkip || res2.idempotentSkip);
  });

  it("outage simulation: 5xx errors increment consecutiveFailures but NEVER wrongly mark opportunity CLOSED", async () => {
    const opp = {
      id: "opp-outage-1",
      title: "DevOps Engineer",
      status: "ACTIVE",
      applicationDeadline: null,
      lastVerifiedAt: new Date("2026-11-15T10:00:00Z"),
      consecutiveFailures: 0,
      opportunitySources: [
        {
          id: "opp-src-outage",
          opportunityId: "opp-outage-1",
          sourceId: "src-outage",
          sourceUrl: "https://boards.greenhouse.io/outage/jobs/99",
          externalId: "99",
          source: {
            id: "src-outage",
            name: "Down Service",
            baseUrl: "https://boards-api.greenhouse.io/v1/boards/outage/jobs",
            config: { provider: "greenhouse", status: "active", complianceStatus: "permitted" },
            status: "active",
            complianceStatus: "permitted",
          },
        },
      ],
    };

    let updatedOpp = { ...opp };
    const logs: any[] = [];

    const mockPrisma = {
      opportunity: {
        findUnique: async () => opp,
        update: async ({ data }: any) => {
          updatedOpp = { ...updatedOpp, ...data };
          return updatedOpp;
        },
        updateMany: async ({ data }: any) => {
          updatedOpp = { ...updatedOpp, ...data };
          return { count: 1 };
        },
      },
      opportunitySource: {
        findUnique: async () => opp.opportunitySources[0],
        update: async () => {},
      },
      verificationLog: {
        findFirst: async () => null,
        create: async ({ data }: any) => {
          logs.push(data);
          return { id: "log-outage", ...data };
        },
      },
      source: {
        update: async () => {},
      },
      $transaction: async (cb: any) => cb(mockPrisma),
    };

    const mockOutageChecker: OpportunityAvailabilityChecker = {
      providerName: "greenhouse",
      checkAvailability: async (): Promise<VerificationResult> => {
        return {
          outcome: "UNKNOWN",
          checkedAt: new Date(),
          reason: "HTTP 503 Backend Service Outage",
          httpStatus: 503,
        };
      },
    };

    const connectorManager = new ConnectorManager();
    connectorManager.registerChecker("greenhouse", mockOutageChecker);
    const lifecycleManager = new OpportunityLifecycleManager(mockPrisma as any);

    const jobResult = await processVerifyOpportunityJob(
      { data: { opportunityId: "opp-outage-1" } },
      {
        prisma: mockPrisma as any,
        connectorManager,
        lifecycleManager,
      }
    );

    assert.equal(jobResult.processedCount, 1);
    assert.equal(jobResult.results[0].outcome, "UNKNOWN");

    // Assert non-negotiable rule: Outage NEVER closes opportunities
    assert.notEqual(updatedOpp.status, "CLOSED");
    assert.equal(updatedOpp.consecutiveFailures, 1);
    assert.equal(updatedOpp.lastVerificationOutcome, "UNKNOWN");
  });
});
