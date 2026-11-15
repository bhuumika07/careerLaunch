// src/lib/services/verification/__tests__/greenhouseChecker.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GreenhouseAvailabilityChecker } from "../greenhouseChecker.ts";
import type { SourceListingInfo, SourceConfig } from "../types.ts";

describe("GreenhouseAvailabilityChecker", () => {
  const dummySourceConfig: SourceConfig = {
    id: "src-1",
    name: "Acme Corp Greenhouse",
    baseUrl: "https://boards-api.greenhouse.io/v1/boards/acme/jobs",
    boardToken: "acme",
    verificationTimeoutSec: 5,
  };

  const sampleJobs = [
    {
      id: 101,
      title: "Software Engineer Intern",
      absolute_url: "https://boards.greenhouse.io/acme/jobs/101",
    },
    {
      id: 102,
      title: "Data Analyst",
      absolute_url: "https://boards.greenhouse.io/acme/jobs/102",
    },
  ];

  it("should return AVAILABLE when job is present on active board", async () => {
    const mockFetch = async () =>
      new Response(JSON.stringify({ jobs: sampleJobs }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    const checker = new GreenhouseAvailabilityChecker({ fetchFn: mockFetch as any });
    const listing: SourceListingInfo = {
      opportunityId: "opp-1",
      sourceId: "src-1",
      sourceUrl: "https://boards.greenhouse.io/acme/jobs/101",
      externalId: "101",
      title: "Software Engineer Intern",
      applicationUrl: "https://boards.greenhouse.io/acme/jobs/101",
    };

    const result = await checker.checkAvailability(listing, dummySourceConfig);

    assert.equal(result.outcome, "AVAILABLE");
    if (result.outcome === "AVAILABLE") {
      assert.ok(result.evidence.includes("101"));
      assert.equal(result.evidenceType, "greenhouse_board_api");
      assert.equal(result.httpStatus, 200);
      assert.ok(typeof result.responseTimeMs === "number");
    }
  });

  it("should return CLOSED when job is absent from a complete 200 OK board response", async () => {
    const mockFetch = async () =>
      new Response(JSON.stringify({ jobs: sampleJobs }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    const checker = new GreenhouseAvailabilityChecker({ fetchFn: mockFetch as any });
    const listing: SourceListingInfo = {
      opportunityId: "opp-2",
      sourceId: "src-1",
      sourceUrl: "https://boards.greenhouse.io/acme/jobs/999",
      externalId: "999",
      title: "Old Closed Position",
    };

    const result = await checker.checkAvailability(listing, dummySourceConfig);

    assert.equal(result.outcome, "CLOSED");
    if (result.outcome === "CLOSED") {
      assert.ok(result.evidence.includes("absent"));
      assert.equal(result.evidenceType, "greenhouse_board_api");
      assert.equal(result.httpStatus, 200);
    }
  });

  it("should return CONFLICT when job is present but title has materially diverged", async () => {
    const mockFetch = async () =>
      new Response(JSON.stringify({ jobs: sampleJobs }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    const checker = new GreenhouseAvailabilityChecker({ fetchFn: mockFetch as any });
    const listing: SourceListingInfo = {
      opportunityId: "opp-1",
      sourceId: "src-1",
      sourceUrl: "https://boards.greenhouse.io/acme/jobs/101",
      externalId: "101",
      title: "Completely Different Title Marketing Manager",
    };

    const result = await checker.checkAvailability(listing, dummySourceConfig);

    assert.equal(result.outcome, "CONFLICT");
    if (result.outcome === "CONFLICT") {
      assert.ok(result.reason.includes("Stored title"));
    }
  });

  it("should return CONFLICT when job is present but application URL points to a different job", async () => {
    const mockFetch = async () =>
      new Response(JSON.stringify({ jobs: sampleJobs }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    const checker = new GreenhouseAvailabilityChecker({ fetchFn: mockFetch as any });
    const listing: SourceListingInfo = {
      opportunityId: "opp-1",
      sourceId: "src-1",
      sourceUrl: "https://boards.greenhouse.io/acme/jobs/101",
      externalId: "101",
      title: "Software Engineer Intern",
      applicationUrl: "https://boards.greenhouse.io/acme/jobs/555-other",
    };

    const result = await checker.checkAvailability(listing, dummySourceConfig);

    assert.equal(result.outcome, "CONFLICT");
    if (result.outcome === "CONFLICT") {
      assert.ok(result.reason.includes("application URL"));
    }
  });

  it("should return UNKNOWN on HTTP 429 and capture Retry-After", async () => {
    const mockFetch = async () =>
      new Response("Too Many Requests", {
        status: 429,
        headers: { "Retry-After": "30" },
      });

    const checker = new GreenhouseAvailabilityChecker({ fetchFn: mockFetch as any });
    const listing: SourceListingInfo = {
      opportunityId: "opp-1",
      sourceId: "src-1",
      sourceUrl: "https://boards.greenhouse.io/acme/jobs/101",
      externalId: "101",
    };

    const result = await checker.checkAvailability(listing, dummySourceConfig);

    assert.equal(result.outcome, "UNKNOWN");
    if (result.outcome === "UNKNOWN") {
      assert.equal(result.httpStatus, 429);
      assert.equal(result.retryAfterSeconds, 30);
      assert.ok(result.reason.includes("rate limit"));
    }
  });

  it("should return UNKNOWN on HTTP 500 server error", async () => {
    const mockFetch = async () =>
      new Response("Internal Server Error", {
        status: 500,
      });

    const checker = new GreenhouseAvailabilityChecker({ fetchFn: mockFetch as any });
    const listing: SourceListingInfo = {
      opportunityId: "opp-1",
      sourceId: "src-1",
      sourceUrl: "https://boards.greenhouse.io/acme/jobs/101",
      externalId: "101",
    };

    const result = await checker.checkAvailability(listing, dummySourceConfig);

    assert.equal(result.outcome, "UNKNOWN");
    if (result.outcome === "UNKNOWN") {
      assert.equal(result.httpStatus, 500);
      assert.ok(result.reason.includes("500"));
    }
  });

  it("should return UNKNOWN on HTTP 401/403 authorization error", async () => {
    const mockFetch = async () =>
      new Response("Forbidden", {
        status: 403,
      });

    const checker = new GreenhouseAvailabilityChecker({ fetchFn: mockFetch as any });
    const listing: SourceListingInfo = {
      opportunityId: "opp-1",
      sourceId: "src-1",
      sourceUrl: "https://boards.greenhouse.io/acme/jobs/101",
      externalId: "101",
    };

    const result = await checker.checkAvailability(listing, dummySourceConfig);

    assert.equal(result.outcome, "UNKNOWN");
    if (result.outcome === "UNKNOWN") {
      assert.equal(result.httpStatus, 403);
      assert.ok(result.reason.includes("forbidden"));
    }
  });

  it("should return UNKNOWN on network failure or abort timeout", async () => {
    const mockFetch = async () => {
      const err = new Error("Connection reset by peer");
      throw err;
    };

    const checker = new GreenhouseAvailabilityChecker({ fetchFn: mockFetch as any });
    const listing: SourceListingInfo = {
      opportunityId: "opp-1",
      sourceId: "src-1",
      sourceUrl: "https://boards.greenhouse.io/acme/jobs/101",
      externalId: "101",
    };

    const result = await checker.checkAvailability(listing, dummySourceConfig);

    assert.equal(result.outcome, "UNKNOWN");
    if (result.outcome === "UNKNOWN") {
      assert.ok(result.reason.includes("Connection reset"));
    }
  });

  it("should return UNKNOWN on malformed response body", async () => {
    const mockFetch = async () =>
      new Response("<html><body>Bad Gateway</body></html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });

    const checker = new GreenhouseAvailabilityChecker({ fetchFn: mockFetch as any });
    const listing: SourceListingInfo = {
      opportunityId: "opp-1",
      sourceId: "src-1",
      sourceUrl: "https://boards.greenhouse.io/acme/jobs/101",
      externalId: "101",
    };

    const result = await checker.checkAvailability(listing, dummySourceConfig);

    assert.equal(result.outcome, "UNKNOWN");
    if (result.outcome === "UNKNOWN") {
      assert.ok(result.reason.includes("JSON") || result.reason.includes("malformed"));
    }
  });

  it("should cache board response across multiple listings on the same board", async () => {
    let fetchCount = 0;
    const mockFetch = async () => {
      fetchCount++;
      return new Response(JSON.stringify({ jobs: sampleJobs }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const checker = new GreenhouseAvailabilityChecker({
      cacheTtlMs: 5000,
      fetchFn: mockFetch as any,
    });

    const listing1: SourceListingInfo = {
      opportunityId: "opp-1",
      sourceId: "src-1",
      sourceUrl: "https://boards.greenhouse.io/acme/jobs/101",
      externalId: "101",
      title: "Software Engineer Intern",
    };

    const listing2: SourceListingInfo = {
      opportunityId: "opp-2",
      sourceId: "src-1",
      sourceUrl: "https://boards.greenhouse.io/acme/jobs/102",
      externalId: "102",
      title: "Data Analyst",
    };

    const res1 = await checker.checkAvailability(listing1, dummySourceConfig);
    const res2 = await checker.checkAvailability(listing2, dummySourceConfig);

    assert.equal(res1.outcome, "AVAILABLE");
    assert.equal(res2.outcome, "AVAILABLE");
    assert.equal(fetchCount, 1, "Expected only 1 fetch call due to caching");
  });

  it("should reject unapproved domains with an SSRF protection error", async () => {
    const checker = new GreenhouseAvailabilityChecker();
    const maliciousConfig: SourceConfig = {
      id: "src-bad",
      name: "Malicious Source",
      baseUrl: "https://evil-attacker.com/fake-board",
      boardToken: "evil",
    };
    const listing: SourceListingInfo = {
      opportunityId: "opp-bad",
      sourceId: "src-bad",
      sourceUrl: "https://evil-attacker.com/jobs/1",
      externalId: "1",
    };

    // Attempting to validateUrl directly on non-allowlisted domain
    assert.throws(
      () => {
        (checker as any).validateUrl("https://evil-attacker.com/v1/jobs");
      },
      {
        message: /SSRF Protection/,
      }
    );
  });
});
