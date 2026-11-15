// src/lib/services/verification/__tests__/lifecycleManager.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OpportunityLifecycleManager } from "../lifecycleManager.ts";
import type { VerificationResult } from "../types.ts";

describe("OpportunityLifecycleManager (Atomic Persistence & Idempotency)", () => {
  function createMockPrisma(initialData?: {
    opportunity?: any;
    opportunitySource?: any;
  }) {
    const opp = initialData?.opportunity ?? {
      id: "opp-123",
      title: "Backend Engineer",
      status: "PENDING",
      applicationDeadline: null,
      lastVerifiedAt: null,
      consecutiveFailures: 0,
      lastVerificationOutcome: null,
    };

    const oppSource = initialData?.opportunitySource ?? {
      id: "opp-src-456",
      opportunityId: "opp-123",
      sourceId: "src-789",
      sourceUrl: "https://boards.greenhouse.io/acme/jobs/101",
      externalId: "101",
      verificationStatus: "pending",
    };

    const logs: any[] = [];
    let updatedOpp: any = null;
    let updatedOppSource: any = null;

    const mockTx = {
      opportunity: {
        findUnique: async () => opp,
        update: async ({ data }: any) => {
          updatedOpp = { ...opp, ...data };
          return updatedOpp;
        },
      },
      opportunitySource: {
        findUnique: async () => oppSource,
        update: async ({ data }: any) => {
          updatedOppSource = { ...oppSource, ...data };
          return updatedOppSource;
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
          const newLog = { id: `log-${logs.length + 1}`, ...data };
          logs.push(newLog);
          return newLog;
        },
      },
    };

    const mockPrisma = {
      $transaction: async (cb: any) => cb(mockTx),
      _getLogs: () => logs,
      _getUpdatedOpp: () => updatedOpp,
      _getUpdatedOppSource: () => updatedOppSource,
    };

    return mockPrisma;
  }

  it("successfully verifies and updates an opportunity from PENDING to ACTIVE", async () => {
    const mockPrisma = createMockPrisma();
    const manager = new OpportunityLifecycleManager(mockPrisma as any);
    const checkedAt = new Date("2026-11-15T10:00:00Z");

    const result: VerificationResult = {
      outcome: "AVAILABLE",
      checkedAt,
      evidence: "Found on Greenhouse board",
      evidenceType: "greenhouse_board_api",
      httpStatus: 200,
      responseTimeMs: 145,
    };

    const response = await manager.processResult({
      opportunityId: "opp-123",
      opportunitySourceId: "opp-src-456",
      sourceId: "src-789",
      result,
    });

    assert.equal(response.previousStatus, "PENDING");
    assert.equal(response.newStatus, "ACTIVE");
    assert.equal(response.outcome, "AVAILABLE");

    const updatedOpp = mockPrisma._getUpdatedOpp();
    assert.equal(updatedOpp.status, "ACTIVE");
    assert.equal(updatedOpp.lastVerificationOutcome, "AVAILABLE");
    assert.equal(updatedOpp.lastVerifiedAt.toISOString(), checkedAt.toISOString());

    const updatedSource = mockPrisma._getUpdatedOppSource();
    assert.equal(updatedSource.verificationStatus, "verified");

    const logs = mockPrisma._getLogs();
    assert.equal(logs.length, 1);
    assert.equal(logs[0].outcome, "AVAILABLE");
    assert.equal(logs[0].httpStatus, 200);
    assert.equal(logs[0].responseTimeMs, 145);
  });

  it("is idempotent: duplicate processResult call does not create duplicate logs or transitions", async () => {
    const mockPrisma = createMockPrisma();
    const manager = new OpportunityLifecycleManager(mockPrisma as any);
    const checkedAt = new Date("2026-11-15T10:00:00Z");

    const result: VerificationResult = {
      outcome: "AVAILABLE",
      checkedAt,
      evidence: "Found on board",
      evidenceType: "greenhouse_board_api",
      httpStatus: 200,
    };

    const firstCall = await manager.processResult({
      opportunityId: "opp-123",
      opportunitySourceId: "opp-src-456",
      sourceId: "src-789",
      result,
    });
    assert.equal(firstCall.idempotentSkip, undefined);

    const secondCall = await manager.processResult({
      opportunityId: "opp-123",
      opportunitySourceId: "opp-src-456",
      sourceId: "src-789",
      result,
    });

    assert.equal(secondCall.idempotentSkip, true);
    assert.equal(secondCall.logId, firstCall.logId);
    assert.equal(mockPrisma._getLogs().length, 1, "Logs must not be duplicated");
  });
});
