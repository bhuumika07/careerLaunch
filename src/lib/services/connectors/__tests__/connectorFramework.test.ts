// src/lib/services/connectors/__tests__/connectorFramework.test.ts
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { MockConnector, type MockRawJob } from "../framework/mockConnector.ts";
import { RateLimiter } from "../framework/rateLimiter.ts";
import { CircuitBreaker, CircuitBreakerOpenError } from "../framework/circuitBreaker.ts";
import { RawPayloadStore } from "../framework/rawPayloadStore.ts";

describe("Chunk 3: Connector Framework", () => {
  let rawStore: RawPayloadStore;

  const sampleJobs: MockRawJob[] = [
    {
      id: "job_01",
      jobTitle: "Junior Fullstack Engineer",
      company: "InnovateTech",
      desc: "Develop modern web applications using React, Node.js, and PostgreSQL.",
      isRemote: true,
      employmentType: "job",
      experience: "entry",
      location: "Remote - India",
      skillsList: ["React", "Node.js", "TypeScript", "SQL"],
      url: "https://innovatetech.example.com/jobs/01",
      salaryText: "₹8 - ₹12 LPA",
    },
    {
      id: "job_02",
      jobTitle: "AI/ML Research Intern (Summer 2027)",
      company: "InnovateTech",
      desc: "Research foundation models and agentic workflows.",
      isRemote: false,
      employmentType: "internship",
      experience: "fresher",
      location: "Bengaluru, India",
      skillsList: ["Python", "PyTorch", "Transformers"],
      url: "https://innovatetech.example.com/jobs/02",
      salaryText: "₹50,000 / month",
    },
  ];

  beforeEach(() => {
    rawStore = RawPayloadStore.getInstance();
    rawStore.clear();
  });

  describe("1. Connector Contract & Pipeline Execution", () => {
    it("executes healthcheck, fetch, parse, and to_normalized successfully", async () => {
      const connector = new MockConnector("mock_provider");
      connector.setMockItems(sampleJobs);

      // 1. Healthcheck
      const health = await connector.healthcheck();
      assert.equal(health.healthy, true);
      assert.equal(health.status, "healthy");

      // 2. Fetch
      const fetched = await connector.fetch({ runId: "run_test_1", sourceId: "mock_provider" });
      assert.equal(fetched.rawItems.length, 2);

      // 3. Parse
      const parsed0 = connector.parse(fetched.rawItems[0]);
      assert.equal(parsed0.title, "Junior Fullstack Engineer");
      assert.equal(parsed0.organization, "InnovateTech");

      // 4. Normalize
      const normalized0 = connector.to_normalized(parsed0, "raw://mock_provider/job_01.json");
      assert.ok(normalized0);
      assert.equal(normalized0.id, "opp_mock_provider_job_01");
      assert.equal(normalized0.type, "job");
      assert.equal(normalized0.isRemote, true);
      assert.deepEqual(normalized0.skills, ["React", "Node.js", "TypeScript", "SQL"]);
      assert.equal(normalized0.rawPayloadRef, "raw://mock_provider/job_01.json");

      // Normalized intern
      const parsed1 = connector.parse(fetched.rawItems[1]);
      const normalized1 = connector.to_normalized(parsed1, "raw://mock_provider/job_02.json");
      assert.equal(normalized1?.type, "internship");
      assert.equal(normalized1?.isRemote, false);
    });

    it("runs complete end-to-end pipeline via execute()", async () => {
      const connector = new MockConnector("mock_greenhouse");
      connector.setMockItems(sampleJobs);

      const result = await connector.execute({
        runId: "run_e2e_1",
        sourceId: "mock_greenhouse",
      });

      assert.equal(result.success, true);
      assert.equal(result.fetchedCount, 2);
      assert.equal(result.normalizedCount, 2);
      assert.equal(result.rejectedCount, 0);
      assert.equal(result.opportunities.length, 2);
      assert.equal(result.circuitState, "CLOSED");
      assert.ok(result.durationMs >= 0);

      // Verify raw payloads were isolated and stored
      assert.equal(rawStore.count(), 2);
      const firstOpp = result.opportunities[0];
      assert.ok(firstOpp.rawPayloadRef?.startsWith("raw://mock_greenhouse/"));

      const retrievedPayload = await rawStore.get(firstOpp.rawPayloadRef!);
      assert.ok(retrievedPayload);
      assert.equal(retrievedPayload?.externalId, "job_01");
      assert.match(retrievedPayload?.payload || "", /Junior Fullstack Engineer/);
    });
  });

  describe("2. Rate Limiting & Sleep Controls", () => {
    it("enforces minimum interval between consecutive requests", async () => {
      const limiter = new RateLimiter({ minIntervalMs: 25, maxRequestsPerMinute: 100 });
      const start = performance.now();

      await limiter.acquire();
      await limiter.acquire();
      await limiter.acquire();

      const elapsed = performance.now() - start;
      // 3 calls with 25ms minimum interval must take at least ~50ms
      assert.ok(elapsed >= 40, `Elapsed ${elapsed}ms should respect min interval`);
    });

    it("handles abort signal cancellation during rate limit wait", async () => {
      const limiter = new RateLimiter({ minIntervalMs: 500, maxRequestsPerMinute: 10 });
      const controller = new AbortController();

      await limiter.acquire();

      // Trigger abort immediately
      controller.abort();

      await assert.rejects(
        async () => {
          await limiter.acquire(controller.signal);
        },
        /aborted/i
      );
    });
  });

  describe("3. Per-Source Enable/Disable Switch", () => {
    it("skips execution cleanly when connector is disabled", async () => {
      const connector = new MockConnector("disabled_source", { enabled: false });
      connector.setMockItems(sampleJobs);

      const result = await connector.execute({
        runId: "run_disabled_1",
        sourceId: "disabled_source",
      });

      assert.equal(result.success, true);
      assert.equal(result.fetchedCount, 0);
      assert.equal(result.normalizedCount, 0);
      assert.equal(result.opportunities.length, 0);
      assert.ok(result.errors[0].includes("disabled via configuration switch"));
    });
  });

  describe("4. Circuit Breaker & Fault Isolation", () => {
    it("trips from CLOSED to OPEN after reaching failure threshold and short-circuits", async () => {
      const breaker = new CircuitBreaker("flaky_source", {
        failureThreshold: 3,
        recoveryTimeMs: 1000,
      });

      assert.equal(breaker.getState(), "CLOSED");

      // Failure 1 & 2
      await assert.rejects(async () => {
        await breaker.execute(async () => {
          throw new Error("HTTP 500 Internal Error");
        });
      });
      assert.equal(breaker.getState(), "CLOSED");

      await assert.rejects(async () => {
        await breaker.execute(async () => {
          throw new Error("HTTP 502 Bad Gateway");
        });
      });
      assert.equal(breaker.getState(), "CLOSED");

      // Failure 3: Reaches threshold -> trips to OPEN
      await assert.rejects(async () => {
        await breaker.execute(async () => {
          throw new Error("HTTP 503 Service Unavailable");
        });
      });
      assert.equal(breaker.getState(), "OPEN");

      // Subsequent call should immediately fail with CircuitBreakerOpenError without invoking inner function
      let innerCalled = false;
      await assert.rejects(
        async () => {
          await breaker.execute(async () => {
            innerCalled = true;
            return "should not run";
          });
        },
        (err: any) => {
          assert.equal(err.name, "CircuitBreakerOpenError");
          return true;
        }
      );
      assert.equal(innerCalled, false, "Inner task must not execute when breaker is OPEN");
    });

    it("recovers from OPEN to HALF_OPEN to CLOSED upon successful probe", async () => {
      const breaker = new CircuitBreaker("recovering_source", {
        failureThreshold: 2,
        recoveryTimeMs: 50, // Short cooldown for testing
      });

      // Trip the breaker
      breaker.recordFailure();
      breaker.recordFailure();
      assert.equal(breaker.getState(), "OPEN");

      // Wait for recovery timeout
      await new Promise((r) => setTimeout(r, 60));
      assert.equal(breaker.getState(), "HALF_OPEN");

      // Execute probe successfully
      const result = await breaker.execute(async () => "probe_success");
      assert.equal(result, "probe_success");
      assert.equal(breaker.getState(), "CLOSED");
      assert.equal(breaker.getConsecutiveFailures(), 0);
    });

    it("guarantees fault isolation: failing source does not affect other healthy sources", async () => {
      const failingConnector = new MockConnector("failing_source", {
        circuitBreaker: { failureThreshold: 2, recoveryTimeMs: 1000 },
      });
      failingConnector.simulateTransientFailures(10); // always fail

      const healthyConnector = new MockConnector("healthy_source");
      healthyConnector.setMockItems(sampleJobs);

      // Run failing connector twice to trip its circuit
      await failingConnector.execute({ runId: "run_fail_1", sourceId: "failing_source" });
      await failingConnector.execute({ runId: "run_fail_2", sourceId: "failing_source" });

      assert.equal(failingConnector.circuitBreaker.getState(), "OPEN");

      // Healthy connector should run without any impairment
      const healthyResult = await healthyConnector.execute({
        runId: "run_healthy_1",
        sourceId: "healthy_source",
      });

      assert.equal(healthyResult.success, true);
      assert.equal(healthyResult.normalizedCount, 2);
      assert.equal(healthyConnector.circuitBreaker.getState(), "CLOSED");
    });
  });

  describe("5. Raw Payload Isolation & Content Hashing", () => {
    it("computes deterministic SHA-256 hash and stores raw payload separately", async () => {
      const samplePayload = { title: "DevOps Engineer", location: "Delhi" };
      const record = await rawStore.save({
        sourceId: "test_ats",
        payload: samplePayload,
        externalId: "ext_456",
      });

      assert.ok(record.ref.startsWith("raw://test_ats/ext_456_"));
      assert.ok(record.contentHash.length === 64, "SHA-256 hash must be 64 hex characters");

      // Idempotent hash verification
      const expectedHash = rawStore.computeHash(JSON.stringify(samplePayload));
      assert.equal(record.contentHash, expectedHash);

      // Retrieval
      const fetched = await rawStore.get(record.ref);
      assert.equal(fetched?.contentHash, record.contentHash);
      assert.deepEqual(JSON.parse(fetched?.payload || "{}"), samplePayload);
    });
  });
});
