// src/lib/services/verification/__tests__/realGreenhouseE2E.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { GreenhouseAvailabilityChecker } from "../greenhouseChecker.ts";
import type { OpportunitySourceListing } from "../types.ts";

describe("Chunk 12: Real Greenhouse Board End-to-End Test", () => {
  it("verifies live public Greenhouse board when TEST_LIVE_GREENHOUSE=true", async (t) => {
    const isLiveEnabled = process.env.TEST_LIVE_GREENHOUSE === "true";

    if (!isLiveEnabled) {
      t.skip(
        "Skipping real Greenhouse E2E test by default. Enable with TEST_LIVE_GREENHOUSE=true"
      );
      return;
    }

    // Using real global fetch against approved Greenhouse public API domain
    const checker = new GreenhouseAvailabilityChecker(globalThis.fetch);

    // GitLab public Greenhouse board
    const boardUrl = "https://boards-api.greenhouse.io/v1/boards/gitlab/jobs";

    // 1. Fetch live board to obtain an actual published job ID
    const res = await globalThis.fetch(boardUrl);
    if (!res.ok) {
      t.skip(`Live Greenhouse board returned status ${res.status}; skipping E2E test.`);
      return;
    }

    const data = await res.json();
    if (!data.jobs || data.jobs.length === 0) {
      t.skip("No published jobs currently available on test board; skipping.");
      return;
    }

    const liveJob = data.jobs[0];
    const liveListing: OpportunitySourceListing = {
      id: "live_src_listing_1",
      opportunityId: "live_opp_1",
      sourceId: "src_greenhouse_live",
      sourceUrl: boardUrl,
      externalId: String(liveJob.id),
      applicationUrl: liveJob.absolute_url,
      storedTitle: liveJob.title,
    };

    // 2. Perform live check via checker
    const result = await checker.checkAvailability(liveListing);

    assert.equal(result.outcome, "AVAILABLE");
    assert.equal(result.httpStatus, 200);
    assert.ok(result.responseTimeMs! >= 0);

    // 3. Test check for a non-existent job ID on the same board -> must return CLOSED
    const nonExistentListing: OpportunitySourceListing = {
      id: "live_src_listing_fake",
      opportunityId: "live_opp_fake",
      sourceId: "src_greenhouse_live",
      sourceUrl: boardUrl,
      externalId: "non_existent_job_id_9999999999",
      applicationUrl: "https://boards.greenhouse.io/gitlab/jobs/9999999999",
      storedTitle: "Non Existent Role",
    };

    const closedResult = await checker.checkAvailability(nonExistentListing);
    assert.equal(closedResult.outcome, "CLOSED");
  });
});
