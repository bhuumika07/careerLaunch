// src/lib/services/verification/__tests__/fullFlowIntegration.test.ts
/**
 * Full Flow Integration Test for Opportunity Lifecycle & Verification
 *
 * Sequence:
 * 1. Ingest newly scraped opportunity -> status PENDING, nextVerificationAt = now
 * 2. Scheduler selects due opportunity, atomically leases it, and enqueues verification job
 * 3. BullMQ worker executes job -> queries Greenhouse checker (mocked)
 * 4. First check: Job is published on board -> AVAILABLE
 * 5. Lifecycle manager updates status PENDING -> ACTIVE, updates lastVerifiedAt, writes VerificationLog
 * 6. Student active feed query includes the opportunity as fresh and verified
 * 7. Later check: Job is removed from board -> CLOSED
 * 8. Lifecycle manager updates status ACTIVE -> CLOSED, records closedAt, writes second VerificationLog
 * 9. Student active feed query strictly excludes the opportunity
 * 10. Audit history reflects both lifecycle events accurately
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { OpportunityLifecycleManager } from "../lifecycleManager.ts";
import { GreenhouseAvailabilityChecker } from "../greenhouseChecker.ts";
import { ConnectorManager } from "../connectorManager.ts";
import { filterStudentActiveFeed } from "../studentFeedQuery.ts";
import { VerificationScheduler } from "../scheduler.ts";
import { getOpportunityVerificationHistory } from "../adminService.ts";

describe("Chunk 12: Full Flow Integration & Lifecycle Journey", () => {
  it("executes complete lifecycle: ingest -> schedule -> verify -> active -> disappear on close", async () => {
    const now = new Date("2026-11-15T12:00:00.000Z");

    // In-memory relational state simulating database
    const dbState = {
      opportunities: [] as any[],
      sources: [
        {
          id: "src_greenhouse_main",
          name: "greenhouse",
          type: "ATS",
          enabled: true,
          healthStatus: "HEALTHY",
          rateLimit: 60,
          baseUrl: "https://boards-api.greenhouse.io/v1/boards/samplecompany/jobs",
        },
      ],
      opportunitySources: [] as any[],
      verificationLogs: [] as any[],
    };

    // Step 1: Ingestion hook creates opportunity in PENDING with nextVerificationAt = now
    const oppId = "opp_journey_001";
    const sourceListingId = "src_listing_101";
    const externalJobId = "777";

    const newlyIngestedOpp = {
      id: oppId,
      title: "Senior Full Stack Engineer",
      employer: "SampleTech",
      location: "Remote",
      type: "FULL_TIME",
      category: "engineering",
      status: "PENDING",
      nextVerificationAt: new Date(now.getTime() - 1000), // Due now
      lastVerifiedAt: null,
      closedAt: null,
      consecutiveFailures: 0,
      createdAt: now,
      updatedAt: now,
      sources: [
        {
          id: sourceListingId,
          sourceId: "src_greenhouse_main",
          externalId: externalJobId,
          sourceUrl: "https://boards-api.greenhouse.io/v1/boards/samplecompany/jobs",
          applicationUrl: "https://boards.greenhouse.io/samplecompany/jobs/777",
          status: "PENDING",
          enabled: true,
        },
      ],
    };

    dbState.opportunities.push(newlyIngestedOpp);
    dbState.opportunitySources.push(newlyIngestedOpp.sources[0]);

    // Step 2: Scheduler claims due opportunity
    const enqueuedJobs: any[] = [];
    const mockQueue = {
      add: async (name: string, data: any, opts: any) => {
        enqueuedJobs.push({ name, data, opts });
        return { id: opts.jobId };
      },
      getJob: async () => null,
    };

    const mockPrismaForScheduler: any = {
      $transaction: async (fn: any) => fn(mockPrismaForScheduler),
      opportunity: {
        findMany: async (args: any) => {
          return dbState.opportunities
            .filter((o) => {
              const due = !o.nextVerificationAt || o.nextVerificationAt <= now;
              return due;
            })
            .map((o) => ({
              id: o.id,
              status: o.status,
              nextVerificationAt: o.nextVerificationAt,
              lastVerificationError: o.lastVerificationError || null,
            }));
        },
        update: async (args: any) => {
          const opp = dbState.opportunities.find((o) => o.id === args.where.id);
          if (opp) {
            Object.assign(opp, args.data);
          }
          return opp;
        },
      },
    };

    const scheduler = new VerificationScheduler(mockPrismaForScheduler, mockQueue as any);
    const passResult = await scheduler.runSchedulerPass(now);

    assert.equal(passResult.claimedCount, 1);
    assert.equal(passResult.enqueuedCount, 1);
    assert.equal(enqueuedJobs.length, 1);
    assert.equal(enqueuedJobs[0].opts.jobId, `verify-${oppId}`);

    // Step 3: Mock Greenhouse Connector with initial positive listing
    let boardResponseJobs: any[] = [
      {
        id: 777,
        title: "Senior Full Stack Engineer",
        absolute_url: "https://boards.greenhouse.io/samplecompany/jobs/777",
        updated_at: "2026-11-15T11:00:00Z",
      },
    ];

    const mockFetch = async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes("samplecompany")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ jobs: boardResponseJobs }),
          text: async () => JSON.stringify({ jobs: boardResponseJobs }),
        } as any;
      }
      return { ok: false, status: 404 } as any;
    };

    const greenhouseChecker = new GreenhouseAvailabilityChecker({ fetchFn: mockFetch });
    const connectorManager = new ConnectorManager();
    connectorManager.registerChecker("greenhouse", greenhouseChecker);

    // Step 4: Worker processes verification check -> AVAILABLE
    const sourceListing = dbState.opportunitySources[0];
    const sourceEntity = dbState.sources[0];
    const checkResult1 = await connectorManager.checkAvailability(sourceListing, sourceEntity);

    assert.equal(checkResult1.outcome, "AVAILABLE");

    // Step 5: Lifecycle Manager processes result
    const mockPrismaLifecycle: any = {
      $transaction: async (fn: any) => fn(mockPrismaLifecycle),
      opportunity: {
        findUnique: async (args: any) => dbState.opportunities.find((o) => o.id === args.where.id),
        update: async (args: any) => {
          const opp = dbState.opportunities.find((o) => o.id === args.where.id);
          Object.assign(opp, args.data);
          return opp;
        },
      },
      opportunitySource: {
        findUnique: async (args: any) => dbState.opportunitySources.find((s) => s.id === args.where.id),
        update: async (args: any) => {
          const s = dbState.opportunitySources.find((src) => src.id === args.where.id);
          Object.assign(s, args.data);
          return s;
        },
      },
      verificationLog: {
        findFirst: async (args: any) => {
          return dbState.verificationLogs.find(
            (l) =>
              l.opportunitySourceId === args.where.opportunitySourceId &&
              l.checkedAt === args.where.checkedAt
          );
        },
        create: async (args: any) => {
          const log = { id: `log_${Date.now()}_${Math.random()}`, ...args.data };
          dbState.verificationLogs.push(log);
          return log;
        },
      },
    };

    const lifecycleManager = new OpportunityLifecycleManager(mockPrismaLifecycle);
    const transition1 = await lifecycleManager.processResult({
      opportunityId: oppId,
      opportunitySourceId: sourceListingId,
      sourceId: "src_greenhouse_main",
      result: checkResult1,
    });

    assert.equal(transition1.newStatus, "ACTIVE");
    assert.equal(dbState.opportunities[0].status, "ACTIVE");
    assert.ok(dbState.opportunities[0].lastVerifiedAt instanceof Date);
    assert.equal(dbState.verificationLogs.length, 1);
    assert.equal(dbState.verificationLogs[0].outcome, "AVAILABLE");

    // Step 6: Verify Student Feed API returns this item as fresh & active
    const feed1 = filterStudentActiveFeed(dbState.opportunities, { now });
    assert.equal(feed1.totalCount, 1);
    assert.equal(feed1.opportunities[0].id, oppId);
    assert.equal(feed1.opportunities[0].isFresh, true);
    assert.equal(feed1.opportunities[0].title, "Senior Full Stack Engineer");

    // Step 7: Later time arrives, job is unlisted/closed on Greenhouse board
    const laterTime = new Date("2026-11-15T18:00:00.000Z");
    boardResponseJobs = []; // Job removed from board
    greenhouseChecker.clearCache(); // Fresh check

    // Check again -> CLOSED
    const checkResult2 = await connectorManager.checkAvailability(sourceListing, sourceEntity);
    assert.equal(checkResult2.outcome, "CLOSED");

    // Step 8: Lifecycle Manager updates to CLOSED
    const transition2 = await lifecycleManager.processResult({
      opportunityId: oppId,
      opportunitySourceId: sourceListingId,
      sourceId: "src_greenhouse_main",
      result: checkResult2,
    });
    assert.equal(transition2.newStatus, "CLOSED");
    assert.equal(dbState.opportunities[0].status, "CLOSED");
    assert.ok(dbState.opportunities[0].closedAt instanceof Date);
    assert.equal(dbState.verificationLogs.length, 2);
    assert.equal(dbState.verificationLogs[1].outcome, "CLOSED");

    // Step 9: Verify Student Feed strictly excludes the closed opportunity
    const feed2 = filterStudentActiveFeed(dbState.opportunities, { now: laterTime });
    assert.equal(feed2.totalCount, 0);

    // Step 10: Verify Admin audit history retains both events in descending order
    const history = getOpportunityVerificationHistory(dbState, oppId);
    assert.equal(history.length, 2);
    assert.equal(history[0].outcome, "CLOSED");
    assert.equal(history[1].outcome, "AVAILABLE");
  });
});
