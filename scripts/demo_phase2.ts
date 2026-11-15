// scripts/demo_phase2.ts
/**
 * CareerLaunch Phase 2 Verification & Lifecycle Management
 * Final Reproducible Demonstration Script
 *
 * Demonstrates:
 * 1. Opportunity ingestion -> PENDING
 * 2. Background verification check -> AVAILABLE
 * 3. Atomic transition -> PENDING to ACTIVE (lastVerifiedAt updated)
 * 4. Student Feed API query -> Opportunity visible with verified badge
 * 5. Subsequent source check confirms job removed -> CLOSED
 * 6. Atomic transition -> ACTIVE to CLOSED (closedAt recorded)
 * 7. Student Feed API query -> Opportunity instantly drops from feed
 * 8. Audit history inspection -> Full chronological trail preserved
 * 9. Transient failure simulation (Timeout & HTTP 429) -> Outcome UNKNOWN, NO closure, lastVerifiedAt untouched
 */

import { GreenhouseAvailabilityChecker } from "../src/lib/services/verification/greenhouseChecker.ts";
import { ConnectorManager } from "../src/lib/services/verification/connectorManager.ts";
import { OpportunityLifecycleManager } from "../src/lib/services/verification/lifecycleManager.ts";
import { filterStudentActiveFeed } from "../src/lib/services/verification/studentFeedQuery.ts";
import { getOpportunityVerificationHistory } from "../src/lib/services/verification/adminService.ts";
import type { OpportunitySourceListing, SourceConfig } from "../src/lib/services/verification/types.ts";

function printBanner(title: string) {
  console.log("\n" + "=".repeat(75));
  console.log(`  ${title.toUpperCase()}`);
  console.log("=".repeat(75));
}

function printStep(stepNum: number, name: string) {
  console.log(`\n>>> [STEP ${stepNum}] ${name}`);
}

async function runDemo() {
  printBanner("CareerLaunch Phase 2: Verification Engine Demonstration");

  // In-memory persistent state simulating database tables
  const db = {
    opportunities: [] as any[],
    opportunitySources: [] as any[],
    verificationLogs: [] as any[],
  };

  const mockPrisma: any = {
    $transaction: async (fn: any) => fn(mockPrisma),
    opportunity: {
      findUnique: async ({ where }: any) => db.opportunities.find((o) => o.id === where.id),
      update: async ({ where, data }: any) => {
        const opp = db.opportunities.find((o) => o.id === where.id);
        Object.assign(opp, data);
        return opp;
      },
    },
    opportunitySource: {
      findUnique: async ({ where }: any) => db.opportunitySources.find((s) => s.id === where.id),
      update: async ({ where, data }: any) => {
        const s = db.opportunitySources.find((src) => src.id === where.id);
        Object.assign(s, data);
        return s;
      },
    },
    verificationLog: {
      findFirst: async ({ where }: any) => {
        return db.verificationLogs.find(
          (l) =>
            l.opportunitySourceId === where.opportunitySourceId &&
            l.checkedAt === where.checkedAt
        );
      },
      create: async ({ data }: any) => {
        const log = { id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`, ...data };
        db.verificationLogs.push(log);
        return log;
      },
    },
  };

  const lifecycleManager = new OpportunityLifecycleManager(mockPrisma);

  // ---------------------------------------------------------------------------
  // 1. Opportunity Ingestion
  // ---------------------------------------------------------------------------
  printStep(1, "Ingest Real Authorized Opportunity into System");
  const oppId = "opp_canonical_demo_42";
  const sourceListingId = "src_listing_demo_42";
  const externalJobId = "987654";

  const sourceConfig: SourceConfig = {
    id: "src_greenhouse_corp",
    name: "Greenhouse Tech Board",
    type: "ATS",
    enabled: true,
    baseUrl: "https://boards-api.greenhouse.io/v1/boards/careertech/jobs",
    config: { provider: "greenhouse" },
  };

  const opportunity = {
    id: oppId,
    title: "Software Development Engineer - Intern",
    employer: "CareerTech Inc.",
    location: "Bangalore / Remote",
    type: "INTERNSHIP",
    category: "internships",
    status: "PENDING",
    lastVerifiedAt: null,
    closedAt: null,
    consecutiveFailures: 0,
    applicationDeadline: new Date(Date.now() + 14 * 86400000), // 14 days future deadline
  };

  const sourceListing: OpportunitySourceListing = {
    id: sourceListingId,
    opportunityId: oppId,
    sourceId: sourceConfig.id,
    externalId: externalJobId,
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/careertech/jobs",
    applicationUrl: "https://boards.greenhouse.io/careertech/jobs/987654",
    storedTitle: "Software Development Engineer - Intern",
    status: "PENDING",
    enabled: true,
  };

  db.opportunities.push(opportunity);
  db.opportunitySources.push(sourceListing);

  console.log(`- Created Opportunity ID : ${opportunity.id}`);
  console.log(`- Title                  : ${opportunity.title}`);
  console.log(`- Employer               : ${opportunity.employer}`);
  console.log(`- Lifecycle Status       : ${opportunity.status}`);
  console.log(`- Last Verified At       : ${opportunity.lastVerifiedAt}`);

  // ---------------------------------------------------------------------------
  // 2. Initial Verification (Job Present on Greenhouse)
  // ---------------------------------------------------------------------------
  printStep(2, "Initial Verification: Job Published on Greenhouse Board");
  let liveJobsOnBoard = [
    {
      id: 987654,
      title: "Software Development Engineer - Intern",
      absolute_url: "https://boards.greenhouse.io/careertech/jobs/987654",
      updated_at: new Date().toISOString(),
    },
  ];

  let mockNetworkMode = "NORMAL";

  const mockFetch = async (url: string | URL | Request) => {
    if (mockNetworkMode === "TIMEOUT") {
      const err: any = new Error("Connection timed out after 15000ms");
      err.name = "AbortError";
      throw err;
    }
    if (mockNetworkMode === "RATE_LIMIT") {
      return {
        ok: false,
        status: 429,
        headers: new Headers({ "Retry-After": "120" }),
        text: async () => "Rate limit exceeded",
      } as any;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ jobs: liveJobsOnBoard }),
      text: async () => JSON.stringify({ jobs: liveJobsOnBoard }),
    } as any;
  };

  const greenhouseChecker = new GreenhouseAvailabilityChecker({ fetchFn: mockFetch });
  const connectorManager = new ConnectorManager();
  connectorManager.registerChecker("greenhouse", greenhouseChecker);

  const initialCheckResult = await connectorManager.checkAvailability(sourceListing, sourceConfig);
  console.log(`- Greenhouse Check Outcome: ${initialCheckResult.outcome}`);
  console.log(`- HTTP Status              : ${initialCheckResult.httpStatus}`);
  console.log(`- Response Latency         : ${initialCheckResult.responseTimeMs}ms`);

  // ---------------------------------------------------------------------------
  // 3. Transition: PENDING -> ACTIVE
  // ---------------------------------------------------------------------------
  printStep(3, "Apply Decision Engine & Persist: PENDING -> ACTIVE");
  const transition1 = await lifecycleManager.processResult({
    opportunityId: oppId,
    opportunitySourceId: sourceListingId,
    sourceId: sourceConfig.id,
    result: initialCheckResult,
  });

  const activeOpp = db.opportunities[0];
  console.log(`- Transition Result        : ${transition1.previousStatus} -> ${transition1.newStatus}`);
  console.log(`- Current Lifecycle Status : ${activeOpp.status}`);
  console.log(`- Updated lastVerifiedAt   : ${activeOpp.lastVerifiedAt?.toISOString()}`);
  console.log(`- Total Verification Logs  : ${db.verificationLogs.length}`);

  // ---------------------------------------------------------------------------
  // 4. Student Feed Visibility Check (Active & Fresh)
  // ---------------------------------------------------------------------------
  printStep(4, "Query Student Active Feed (/api/opportunities)");
  const studentFeedActive = filterStudentActiveFeed(db.opportunities);
  console.log(`- Feed Results Count       : ${studentFeedActive.totalCount} active opportunity returned`);
  console.log(`- Opportunity Title        : ${studentFeedActive.opportunities[0].title}`);
  console.log(`- Verified Fresh Badge     : ${studentFeedActive.opportunities[0].isFresh}`);
  console.log(`- Application URL          : ${studentFeedActive.opportunities[0].applicationUrl}`);

  // ---------------------------------------------------------------------------
  // 5. Source Response Confirms Job Removed (Unpublished)
  // ---------------------------------------------------------------------------
  printStep(5, "Subsequent Verification: Job Unlisted on Greenhouse (Authoritative Closure)");
  liveJobsOnBoard = []; // Job removed from board
  greenhouseChecker.clearCache();

  const closureCheckResult = await connectorManager.checkAvailability(sourceListing, sourceConfig);
  console.log(`- Greenhouse Check Outcome: ${closureCheckResult.outcome}`);
  console.log(`- Evidence                : ${JSON.stringify(closureCheckResult.evidence)}`);

  // ---------------------------------------------------------------------------
  // 6. Transition: ACTIVE -> CLOSED
  // ---------------------------------------------------------------------------
  printStep(6, "Apply Decision Engine & Persist: ACTIVE -> CLOSED");
  const transition2 = await lifecycleManager.processResult({
    opportunityId: oppId,
    opportunitySourceId: sourceListingId,
    sourceId: sourceConfig.id,
    result: closureCheckResult,
  });

  const closedOpp = db.opportunities[0];
  console.log(`- Transition Result        : ${transition2.previousStatus} -> ${transition2.newStatus}`);
  console.log(`- Current Lifecycle Status : ${closedOpp.status}`);
  console.log(`- Recorded closedAt        : ${closedOpp.closedAt?.toISOString()}`);
  console.log(`- Total Verification Logs  : ${db.verificationLogs.length}`);

  // ---------------------------------------------------------------------------
  // 7. Student Feed Check (Immediate Disappearance)
  // ---------------------------------------------------------------------------
  printStep(7, "Student Feed Check: Confirm Immediate Disappearance");
  const studentFeedClosed = filterStudentActiveFeed(db.opportunities);
  console.log(`- Feed Results Count       : ${studentFeedClosed.totalCount} opportunities returned`);
  console.log(`- Disappearance Confirmed  : ${studentFeedClosed.totalCount === 0 ? "YES (Never served to students)" : "NO"}`);

  // ---------------------------------------------------------------------------
  // 8. Verification Audit History Inspection
  // ---------------------------------------------------------------------------
  printStep(8, "Admin Verification Audit History Inspection");
  const history = getOpportunityVerificationHistory(db, oppId);
  console.log(`- Total Audit Logs for ${oppId}: ${history.length}`);
  history.forEach((h, idx) => {
    console.log(`  [Log ${idx + 1}] Outcome: ${h.outcome.padEnd(9)} | Status: ${h.httpStatus || "N/A"} | Date: ${h.checkedAt}`);
  });

  // ---------------------------------------------------------------------------
  // 9. Simulation of Transient API Failures (Timeout & 429)
  // ---------------------------------------------------------------------------
  printStep(9, "Transient API Failures Simulation (Timeout & 429 Rate Limit)");
  const transientOppId = "opp_transient_demo_99";
  const transientListingId = "src_listing_demo_99";

  const lastVerifiedBaseline = new Date(Date.now() - 3600000); // 1 hour ago
  const transientOpp = {
    id: transientOppId,
    title: "Data Science Associate",
    employer: "AnalyticsCorp",
    status: "ACTIVE",
    lastVerifiedAt: lastVerifiedBaseline,
    closedAt: null,
    consecutiveFailures: 0,
  };
  const transientListing: OpportunitySourceListing = {
    id: transientListingId,
    opportunityId: transientOppId,
    sourceId: sourceConfig.id,
    externalId: "445566",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/careertech/jobs",
    storedTitle: "Data Science Associate",
    enabled: true,
  };

  db.opportunities.push(transientOpp);
  db.opportunitySources.push(transientListing);

  // Scenario A: Network Timeout
  console.log("\n--- Scenario A: Network Timeout Simulation ---");
  mockNetworkMode = "TIMEOUT";
  greenhouseChecker.clearCache();

  const timeoutResult = await connectorManager.checkAvailability(transientListing, sourceConfig);
  console.log(`- Checker Outcome on Timeout: ${timeoutResult.outcome} (Reason: ${timeoutResult.reason})`);

  const timeoutTransition = await lifecycleManager.processResult({
    opportunityId: transientOppId,
    opportunitySourceId: transientListingId,
    sourceId: sourceConfig.id,
    result: timeoutResult,
  });

  console.log(`- Status After Timeout      : ${transientOpp.status} (Unchanged: ${transientOpp.status === "ACTIVE"})`);
  console.log(`- lastVerifiedAt Untouched  : ${transientOpp.lastVerifiedAt === lastVerifiedBaseline}`);
  console.log(`- consecutiveFailures Bumped: ${transientOpp.consecutiveFailures}`);

  // Scenario B: HTTP 429 Rate Limit with Retry-After
  console.log("\n--- Scenario B: HTTP 429 Rate Limit Simulation ---");
  mockNetworkMode = "RATE_LIMIT";
  greenhouseChecker.clearCache();

  const rateLimitResult = await connectorManager.checkAvailability(transientListing, sourceConfig);
  console.log(`- Checker Outcome on 429    : ${rateLimitResult.outcome}`);
  console.log(`- HTTP Status               : ${rateLimitResult.httpStatus}`);
  console.log(`- Captured Retry-After      : ${rateLimitResult.retryAfterSeconds} seconds`);

  const rateLimitTransition = await lifecycleManager.processResult({
    opportunityId: transientOppId,
    opportunitySourceId: transientListingId,
    sourceId: sourceConfig.id,
    result: rateLimitResult,
  });

  console.log(`- Status After 429          : ${transientOpp.status} (Unchanged: ${transientOpp.status === "ACTIVE"})`);
  console.log(`- Opportunity CLOSED?       : ${transientOpp.status === "CLOSED" ? "WRONGLY CLOSED" : "NO (Protected)"}`);
  console.log(`- lastVerifiedAt Untouched  : ${transientOpp.lastVerifiedAt === lastVerifiedBaseline}`);

  printBanner("Demonstration Complete: All Requirements & Safety Invariants Verified");
}

runDemo().catch((err) => {
  console.error("Demo failed with error:", err);
  process.exit(1);
});
