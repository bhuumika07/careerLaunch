// src/lib/services/verification/__tests__/verificationWorker.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { processVerifyOpportunityJob } from "../../../../workers/verificationWorker.ts";
import { ConnectorManager } from "../connectorManager.ts";
import { OpportunityLifecycleManager } from "../lifecycleManager.ts";
import type { OpportunityAvailabilityChecker } from "../checker.ts";
import type { SourceConfig, SourceListingInfo, VerificationResult } from "../types.ts";

describe("Verification Worker Job Processing", () => {
  it("processes enabled sources, skips disabled sources, updates DB, and writes logs", async () => {
    // 1. Mock Opportunity with 2 sources: 1 enabled Greenhouse, 1 disabled
    const mockOpportunity = {
      id: "opp-worker-001",
      title: "Fullstack Developer",
      organizationName: "TechCorp",
      status: "PENDING",
      applicationDeadline: null,
      lastVerifiedAt: null,
      consecutiveFailures: 0,
      opportunitySources: [
        {
          id: "opp-src-active",
          opportunityId: "opp-worker-001",
          sourceId: "src-active",
          sourceUrl: "https://boards.greenhouse.io/techcorp/jobs/111",
          externalId: "111",
          applicationUrl: "https://boards.greenhouse.io/techcorp/jobs/111",
          source: {
            id: "src-active",
            name: "TechCorp Greenhouse",
            baseUrl: "https://boards-api.greenhouse.io/v1/boards/techcorp/jobs",
            config: { provider: "greenhouse", status: "active", complianceStatus: "permitted" },
            status: "active",
            complianceStatus: "permitted",
          },
        },
        {
          id: "opp-src-disabled",
          opportunityId: "opp-worker-001",
          sourceId: "src-disabled",
          sourceUrl: "https://boards.greenhouse.io/techcorp/jobs/222",
          externalId: "222",
          source: {
            id: "src-disabled",
            name: "Disabled Source",
            baseUrl: "https://boards-api.greenhouse.io/v1/boards/techcorp/jobs",
            config: { provider: "greenhouse", status: "disabled" },
            status: "disabled",
            complianceStatus: "unreviewed",
          },
        },
      ],
    };

    const persistedLogs: any[] = [];
    let updatedOpp = { ...mockOpportunity };
    let updatedOppSource: any = null;

    const mockPrisma = {
      opportunity: {
        findUnique: async () => mockOpportunity,
        update: async ({ data }: any) => {
          updatedOpp = { ...updatedOpp, ...data };
          return updatedOpp;
        },
      },
      opportunitySource: {
        findUnique: async () => mockOpportunity.opportunitySources[0],
        update: async ({ data }: any) => {
          updatedOppSource = data;
          return data;
        },
      },
      verificationLog: {
        findFirst: async () => null,
        create: async ({ data }: any) => {
          const log = { id: `log-${persistedLogs.length + 1}`, ...data };
          persistedLogs.push(log);
          return log;
        },
      },
      $transaction: async (cb: any) => {
        return cb(mockPrisma);
      },
    };

    // 2. Custom mock checker registered into ConnectorManager
    const mockChecker: OpportunityAvailabilityChecker = {
      providerName: "greenhouse",
      checkAvailability: async (listing: SourceListingInfo): Promise<VerificationResult> => {
        return {
          outcome: "AVAILABLE",
          checkedAt: new Date("2026-11-15T15:00:00Z"),
          evidence: `Job ${listing.externalId} confirmed on board`,
          evidenceType: "mock_check",
          httpStatus: 200,
          responseTimeMs: 80,
        };
      },
    };

    const connectorManager = new ConnectorManager();
    connectorManager.registerChecker("greenhouse", mockChecker);
    const lifecycleManager = new OpportunityLifecycleManager(mockPrisma as any);

    // 3. Execute Worker Job
    const jobResult = await processVerifyOpportunityJob(
      { data: { opportunityId: "opp-worker-001" } },
      {
        prisma: mockPrisma as any,
        connectorManager,
        lifecycleManager,
      }
    );

    // 4. Assert Worker Structured Output
    assert.equal(jobResult.opportunityId, "opp-worker-001");
    assert.equal(jobResult.processedCount, 1, "Only 1 active source should be verified");
    assert.equal(jobResult.skippedCount, 1, "1 disabled source should be skipped");

    // First listing was verified
    const verifiedResult = jobResult.results.find((r) => r.opportunitySourceId === "opp-src-active");
    assert.ok(verifiedResult);
    assert.equal(verifiedResult.status, "verified");
    assert.equal(verifiedResult.outcome, "AVAILABLE");
    assert.equal(verifiedResult.newOpportunityStatus, "ACTIVE");

    // Second listing was skipped
    const skippedResult = jobResult.results.find((r) => r.opportunitySourceId === "opp-src-disabled");
    assert.ok(skippedResult);
    assert.equal(skippedResult.status, "skipped");
    assert.ok(skippedResult.skipReason?.includes("disabled"));

    // 5. Assert Database Updates & Log Persistence
    assert.equal(updatedOpp.status, "ACTIVE");
    assert.equal(updatedOpp.lastVerificationOutcome, "AVAILABLE");
    assert.equal(updatedOppSource.verificationStatus, "verified");

    assert.equal(persistedLogs.length, 1);
    assert.equal(persistedLogs[0].opportunityId, "opp-worker-001");
    assert.equal(persistedLogs[0].outcome, "AVAILABLE");
    assert.equal(persistedLogs[0].httpStatus, 200);
  });
});
