// src/lib/services/verification/__tests__/workerReliability.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DirectUrlAvailabilityChecker,
  computeContentHash,
} from "../directUrlChecker.ts";
import { evaluateVerificationDecision } from "../decisionEngine.ts";
import { processVerifyOpportunityJob } from "../../../../workers/verificationWorker.ts";
import { ConnectorManager } from "../connectorManager.ts";
import { OpportunityLifecycleManager } from "../lifecycleManager.ts";
import type { SourceListingInfo, SourceConfig } from "../types.ts";

describe("Phase 2 Chunk 2.1: Worker Reliability and Verification Lifecycle", () => {
  const dummyConfig: SourceConfig = {
    id: "src_direct_web",
    name: "Direct Web Provider",
    baseUrl: "https://careers.example.com",
  };

  describe("1. Original Posting URL Verification & Closed/Removed Detection", () => {
    it("detects 404 on a single listing as CLOSED (removed page)", async () => {
      const mockFetch = async () =>
        new Response("404 Not Found", { status: 404 });

      const checker = new DirectUrlAvailabilityChecker({
        fetchFn: mockFetch as any,
      });
      const listing: SourceListingInfo = {
        opportunityId: "opp_404",
        sourceId: "src_direct_web",
        sourceUrl: "https://careers.example.com/job/123",
      };

      const result = await checker.checkAvailability(listing, dummyConfig);
      assert.strictEqual(result.outcome, "CLOSED");
      assert.strictEqual(result.httpStatus, 404);
      assert.ok(result.evidence.includes("HTTP 404"));

      // Verify Decision Engine sets status to CLOSED
      const decision = evaluateVerificationDecision({
        currentStatus: "ACTIVE",
        applicationDeadline: null,
        lastVerifiedAt: new Date(),
        consecutiveFailures: 0,
        result,
      });

      assert.strictEqual(decision.newStatus, "CLOSED");
      assert.ok(decision.closedAt);
    });

    it("detects 410 Gone as CLOSED", async () => {
      const mockFetch = async () => new Response("Gone", { status: 410 });
      const checker = new DirectUrlAvailabilityChecker({
        fetchFn: mockFetch as any,
      });
      const listing: SourceListingInfo = {
        opportunityId: "opp_410",
        sourceId: "src_direct_web",
        sourceUrl: "https://careers.example.com/job/gone",
      };

      const result = await checker.checkAvailability(listing, dummyConfig);
      assert.strictEqual(result.outcome, "CLOSED");
      assert.strictEqual(result.httpStatus, 410);
    });

    it("detects in-page closure phrases even on HTTP 200 OK as CLOSED", async () => {
      const html = `
        <html>
          <body>
            <h1>Senior Systems Engineer</h1>
            <div class="banner">This position has been filled. Applications are no longer accepted.</div>
          </body>
        </html>
      `;
      const mockFetch = async () => new Response(html, { status: 200 });
      const checker = new DirectUrlAvailabilityChecker({
        fetchFn: mockFetch as any,
      });
      const listing: SourceListingInfo = {
        opportunityId: "opp_closed_in_page",
        sourceId: "src_direct_web",
        sourceUrl: "https://careers.example.com/job/filled",
      };

      const result = await checker.checkAvailability(listing, dummyConfig);
      assert.strictEqual(result.outcome, "CLOSED");
      assert.strictEqual(result.httpStatus, 200);
      assert.ok(result.evidence.includes("position has been filled"));
    });
  });

  describe("2. Changed Description Detection via Content Hash", () => {
    const originalText = "Build cloud infrastructure using Kubernetes, Go, and Terraform.";
    const originalHash = computeContentHash(originalText);

    it("verifies as AVAILABLE when content hash matches stored hash", async () => {
      const mockFetch = async () =>
        new Response(originalText, { status: 200 });
      const checker = new DirectUrlAvailabilityChecker({
        fetchFn: mockFetch as any,
      });
      const listing: SourceListingInfo = {
        opportunityId: "opp_hash_match",
        sourceId: "src_direct_web",
        sourceUrl: "https://careers.example.com/job/infra",
        contentHash: originalHash,
      };

      const result = await checker.checkAvailability(listing, dummyConfig);
      assert.strictEqual(result.outcome, "AVAILABLE");
      assert.strictEqual(result.httpStatus, 200);
    });

    it("flags CONFLICT when description has materially changed", async () => {
      const modifiedText =
        "Build mobile apps using Swift, Kotlin, and Flutter. Infrastructure duties removed.";
      const mockFetch = async () =>
        new Response(modifiedText, { status: 200 });

      const checker = new DirectUrlAvailabilityChecker({
        fetchFn: mockFetch as any,
      });
      const listing: SourceListingInfo = {
        opportunityId: "opp_hash_diverged",
        sourceId: "src_direct_web",
        sourceUrl: "https://careers.example.com/job/infra",
        contentHash: originalHash, // Previous hash
      };

      const result = await checker.checkAvailability(listing, dummyConfig);
      assert.strictEqual(result.outcome, "CONFLICT");
      assert.ok(result.reason.includes("content hash mismatch"));

      // Verify Decision Engine flags opportunity for review
      const decision = evaluateVerificationDecision({
        currentStatus: "ACTIVE",
        applicationDeadline: null,
        lastVerifiedAt: new Date(),
        consecutiveFailures: 0,
        result,
      });

      assert.strictEqual(decision.newStatus, "REVIEW_REQUIRED");
      assert.strictEqual(decision.lastVerificationOutcome, "CONFLICT");
    });
  });

  describe("3. Source Failure Isolation (Source Down -> NO Status Change)", () => {
    it("treats HTTP 500 server error as UNKNOWN and NEVER marks opportunity closed", async () => {
      const mockFetch = async () =>
        new Response("Internal Server Error", { status: 500 });
      const checker = new DirectUrlAvailabilityChecker({
        fetchFn: mockFetch as any,
      });
      const listing: SourceListingInfo = {
        opportunityId: "opp_500",
        sourceId: "src_direct_web",
        sourceUrl: "https://careers.example.com/job/500",
      };

      const result = await checker.checkAvailability(listing, dummyConfig);
      assert.strictEqual(result.outcome, "UNKNOWN");
      assert.strictEqual(result.httpStatus, 500);

      // Core Invariant: Opportunity remains ACTIVE, never CLOSED!
      const lastVerified = new Date();
      const decision = evaluateVerificationDecision({
        currentStatus: "ACTIVE",
        applicationDeadline: null,
        lastVerifiedAt: lastVerified,
        consecutiveFailures: 1,
        result,
      });

      assert.strictEqual(decision.newStatus, "ACTIVE");
      assert.strictEqual(decision.closedAt, null);
      assert.strictEqual(decision.consecutiveFailures, 2);
      assert.ok(decision.nextVerificationAt > new Date());
    });

    it("treats connection timeout / network error as UNKNOWN and preserves status", async () => {
      const mockFetch = async () => {
        const err = new Error("Connection refused (ECONNREFUSED)");
        throw err;
      };
      const checker = new DirectUrlAvailabilityChecker({
        fetchFn: mockFetch as any,
      });
      const listing: SourceListingInfo = {
        opportunityId: "opp_timeout",
        sourceId: "src_direct_web",
        sourceUrl: "https://careers.example.com/job/timeout",
      };

      const result = await checker.checkAvailability(listing, dummyConfig);
      assert.strictEqual(result.outcome, "UNKNOWN");
      assert.ok(result.reason.includes("ECONNREFUSED"));

      const decision = evaluateVerificationDecision({
        currentStatus: "ACTIVE",
        applicationDeadline: null,
        lastVerifiedAt: new Date(),
        consecutiveFailures: 0,
        result,
      });

      assert.strictEqual(decision.newStatus, "ACTIVE");
      assert.strictEqual(decision.closedAt, null);
    });

    it("handles HTTP 429 rate limit with Retry-After header without closing opportunity", async () => {
      const headers = new Headers();
      headers.set("Retry-After", "120");
      const mockFetch = async () =>
        new Response("Too Many Requests", { status: 429, headers });

      const checker = new DirectUrlAvailabilityChecker({
        fetchFn: mockFetch as any,
      });
      const listing: SourceListingInfo = {
        opportunityId: "opp_429",
        sourceId: "src_direct_web",
        sourceUrl: "https://careers.example.com/job/429",
      };

      const result = await checker.checkAvailability(listing, dummyConfig);
      assert.strictEqual(result.outcome, "UNKNOWN");
      assert.strictEqual(result.httpStatus, 429);
      if (result.outcome === "UNKNOWN") {
        assert.strictEqual(result.retryAfterSeconds, 120);
      }

      const decision = evaluateVerificationDecision({
        currentStatus: "ACTIVE",
        applicationDeadline: null,
        lastVerifiedAt: new Date(),
        consecutiveFailures: 0,
        result,
      });

      assert.strictEqual(decision.newStatus, "ACTIVE");
      assert.strictEqual(decision.closedAt, null);
    });
  });

  describe("4. End-to-End Worker Lifecycle & History Preservation", () => {
    it("records complete verification history in logs when processing an opportunity", async () => {
      const mockOpportunity = {
        id: "opp_history_test",
        title: "Security Analyst",
        organizationName: "Cyber Defense",
        status: "ACTIVE",
        applicationDeadline: null,
        lastVerifiedAt: new Date(),
        consecutiveFailures: 0,
        source: {
          id: "src_web",
          name: "Direct Source",
          baseUrl: "https://example.com",
          config: { status: "active", complianceStatus: "permitted" },
          status: "active",
          complianceStatus: "permitted",
        },
        sourceUrl: "https://example.com/job/404",
      };

      const logs: any[] = [];
      let currentStatus = "ACTIVE";

      const mockPrisma = {
        opportunity: {
          findUnique: async () => mockOpportunity,
          update: async ({ data }: any) => {
            currentStatus = data.status;
            return { ...mockOpportunity, ...data };
          },
        },
        opportunitySource: {
          findUnique: async () => ({
            id: "opp_history_test",
            opportunityId: "opp_history_test",
            sourceId: "src_web",
            sourceUrl: "https://example.com/job/404",
          }),
          update: async ({ data }: any) => data,
        },
        verificationLog: {
          findFirst: async () => null,
          create: async ({ data }: any) => {
            logs.push({ id: `log_${logs.length + 1}`, ...data });
            return logs[logs.length - 1];
          },
        },
        $transaction: async (cb: any) => cb(mockPrisma),
      };

      const mock404Checker = {
        providerName: "direct_url",
        checkAvailability: async () => ({
          outcome: "CLOSED" as const,
          checkedAt: new Date(),
          evidence: "Listing removed: HTTP 404",
          evidenceType: "http_status_404",
          httpStatus: 404,
        }),
      };

      const connectorManager = new ConnectorManager();
      connectorManager.registerChecker("direct_url", mock404Checker);
      const lifecycleManager = new OpportunityLifecycleManager(mockPrisma as any);

      const jobResult = await processVerifyOpportunityJob(
        { data: { opportunityId: "opp_history_test" } },
        {
          prisma: mockPrisma as any,
          connectorManager,
          lifecycleManager,
        }
      );

      assert.strictEqual(jobResult.processedCount, 1);
      assert.strictEqual(jobResult.results[0].outcome, "CLOSED");
      assert.strictEqual(jobResult.results[0].newOpportunityStatus, "CLOSED");
      assert.strictEqual(currentStatus, "CLOSED");

      // Verify audit history was appended
      assert.strictEqual(logs.length, 1);
      assert.strictEqual(logs[0].opportunityId, "opp_history_test");
      assert.strictEqual(logs[0].outcome, "CLOSED");
      assert.strictEqual(logs[0].httpStatus, 404);
      assert.ok(logs[0].reason.includes("HTTP 404"));
    });
  });
});
