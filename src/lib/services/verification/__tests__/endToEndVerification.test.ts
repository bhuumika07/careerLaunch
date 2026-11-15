// src/lib/services/verification/__tests__/endToEndVerification.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GreenhouseAvailabilityChecker } from "../greenhouseChecker.ts";
import { OpportunityLifecycleManager } from "../lifecycleManager.ts";
import type { SourceConfig, SourceListingInfo } from "../types.ts";

describe("Milestone 2.1 Gate: End-to-End Opportunity Verification", () => {
  it("executes end-to-end journey: connector check -> decision evaluation -> DB update -> log row", async () => {
    // 1. Initial database state
    const opportunityRecord = {
      id: "opp-e2e-001",
      title: "Frontend Engineer",
      status: "PENDING",
      applicationDeadline: null,
      lastVerifiedAt: null,
      consecutiveFailures: 0,
      lastVerificationOutcome: null,
    };

    const opportunitySourceRecord = {
      id: "opp-src-001",
      opportunityId: "opp-e2e-001",
      sourceId: "src-gh-001",
      sourceUrl: "https://boards.greenhouse.io/acme/jobs/4242",
      externalId: "4242",
      verificationStatus: "pending",
    };

    const persistedLogs: any[] = [];
    let updatedOpp = { ...opportunityRecord };
    let updatedOppSource = { ...opportunitySourceRecord };

    const mockPrisma = {
      $transaction: async (cb: any) => {
        const tx = {
          opportunity: {
            findUnique: async () => updatedOpp,
            update: async ({ data }: any) => {
              updatedOpp = { ...updatedOpp, ...data };
              return updatedOpp;
            },
          },
          opportunitySource: {
            findUnique: async () => updatedOppSource,
            update: async ({ data }: any) => {
              updatedOppSource = { ...updatedOppSource, ...data };
              return updatedOppSource;
            },
          },
          verificationLog: {
            findFirst: async () => null,
            create: async ({ data }: any) => {
              const logEntry = { id: `log-${persistedLogs.length + 1}`, ...data };
              persistedLogs.push(logEntry);
              return logEntry;
            },
          },
        };
        return cb(tx);
      },
    };

    // 2. Setup Greenhouse Mock API
    const mockBoardJobs = [
      {
        id: 4242,
        title: "Frontend Engineer",
        absolute_url: "https://boards.greenhouse.io/acme/jobs/4242",
      },
    ];

    const mockFetch = async () =>
      new Response(JSON.stringify({ jobs: mockBoardJobs }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    const connector = new GreenhouseAvailabilityChecker({
      fetchFn: mockFetch as any,
    });
    const lifecycleManager = new OpportunityLifecycleManager(mockPrisma as any);

    const sourceConfig: SourceConfig = {
      id: "src-gh-001",
      name: "Acme Careers",
      baseUrl: "https://boards-api.greenhouse.io/v1/boards/acme/jobs",
      boardToken: "acme",
      verificationTimeoutSec: 10,
    };

    const listing: SourceListingInfo = {
      opportunityId: opportunityRecord.id,
      sourceId: sourceConfig.id,
      sourceUrl: opportunitySourceRecord.sourceUrl,
      externalId: opportunitySourceRecord.externalId,
      title: opportunityRecord.title,
    };

    // 3. STEP A: Check availability with connector
    const verificationResult = await connector.checkAvailability(
      listing,
      sourceConfig
    );

    assert.equal(verificationResult.outcome, "AVAILABLE");
    assert.equal(verificationResult.httpStatus, 200);

    // 4. STEP B: Process decision and persist atomically
    const response = await lifecycleManager.processResult({
      opportunityId: opportunityRecord.id,
      opportunitySourceId: opportunitySourceRecord.id,
      sourceId: sourceConfig.id,
      result: verificationResult,
    });

    // 5. STEP C: Verify end-to-end outcome
    assert.equal(response.previousStatus, "PENDING");
    assert.equal(response.newStatus, "ACTIVE");
    assert.equal(response.outcome, "AVAILABLE");

    // Canonical Opportunity updated
    assert.equal(updatedOpp.status, "ACTIVE");
    assert.equal(updatedOpp.lastVerificationOutcome, "AVAILABLE");
    assert.ok(updatedOpp.lastVerifiedAt instanceof Date);

    // Individual OpportunitySource updated
    assert.equal(updatedOppSource.verificationStatus, "verified");

    // VerificationLog created
    assert.equal(persistedLogs.length, 1);
    assert.equal(persistedLogs[0].opportunityId, "opp-e2e-001");
    assert.equal(persistedLogs[0].opportunitySourceId, "opp-src-001");
    assert.equal(persistedLogs[0].outcome, "AVAILABLE");
    assert.equal(persistedLogs[0].httpStatus, 200);
  });
});
