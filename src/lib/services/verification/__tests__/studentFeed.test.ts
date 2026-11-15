// src/lib/services/verification/__tests__/studentFeed.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { filterStudentActiveFeed } from "../studentFeedQuery.ts";

describe("Chunk 10: Student Active Feed & UI Contract", () => {
  const now = new Date("2026-11-15T12:00:00Z");

  it("status rule: strictly returns only ACTIVE opportunities and rejects all other statuses", () => {
    const rawOpps = [
      { id: "opp-active", title: "Active Role", status: "ACTIVE", lastVerifiedAt: now },
      { id: "opp-stale", title: "Stale Role", status: "STALE", lastVerifiedAt: now },
      { id: "opp-closed", title: "Closed Role", status: "CLOSED", lastVerifiedAt: now },
      { id: "opp-expired", title: "Expired Role", status: "EXPIRED", lastVerifiedAt: now },
      { id: "opp-invalid", title: "Invalid Role", status: "INVALID", lastVerifiedAt: now },
      { id: "opp-pending", title: "Pending Role", status: "PENDING", lastVerifiedAt: now },
      { id: "opp-review", title: "Review Role", status: "REVIEW_REQUIRED", lastVerifiedAt: now },
    ];

    const result = filterStudentActiveFeed(rawOpps, { now });

    assert.equal(result.totalCount, 1);
    assert.equal(result.opportunities[0].id, "opp-active");
  });

  it("freshness boundary: includes opportunities verified within window, excludes those beyond cutoff", () => {
    // 24 hours freshness cutoff
    const freshTime = new Date("2026-11-14T12:01:00Z"); // 23h 59m ago (< 24h)
    const staleTime = new Date("2026-11-14T11:59:00Z"); // 24h 01m ago (> 24h)

    const rawOpps = [
      {
        id: "opp-fresh",
        title: "Fresh Role",
        status: "ACTIVE",
        lastVerifiedAt: freshTime,
      },
      {
        id: "opp-past-cutoff",
        title: "Unfresh Role",
        status: "ACTIVE",
        lastVerifiedAt: staleTime,
      },
      {
        id: "opp-unverified",
        title: "No Verification Role",
        status: "ACTIVE",
        lastVerifiedAt: null,
      },
    ];

    const result = filterStudentActiveFeed(rawOpps, { now, freshnessThresholdHours: 24 });

    assert.equal(result.totalCount, 1);
    assert.equal(result.opportunities[0].id, "opp-fresh");
    assert.equal(result.opportunities[0].isFresh, true);
  });

  it("deadline rules: null and future deadlines are included; past deadlines are excluded", () => {
    const rawOpps = [
      {
        id: "opp-null-deadline",
        title: "No Deadline Specified",
        status: "ACTIVE",
        lastVerifiedAt: now,
        applicationDeadline: null,
      },
      {
        id: "opp-future-deadline",
        title: "Future Deadline",
        status: "ACTIVE",
        lastVerifiedAt: now,
        applicationDeadline: new Date("2026-11-20T00:00:00Z"),
      },
      {
        id: "opp-past-deadline",
        title: "Past Deadline",
        status: "ACTIVE",
        lastVerifiedAt: now,
        applicationDeadline: new Date("2026-11-14T00:00:00Z"),
      },
    ];

    const result = filterStudentActiveFeed(rawOpps, { now });

    assert.equal(result.totalCount, 2);
    const ids = result.opportunities.map((o) => o.id);
    assert.ok(ids.includes("opp-null-deadline"));
    assert.ok(ids.includes("opp-future-deadline"));
    assert.ok(!ids.includes("opp-past-deadline"));
  });

  it("pagination: slices correctly and preserves totalCount and page counts", () => {
    const rawOpps = Array.from({ length: 7 }, (_, i) => ({
      id: `opp-${i + 1}`,
      title: `Software Engineer ${i + 1}`,
      status: "ACTIVE",
      lastVerifiedAt: now,
    }));

    const page2 = filterStudentActiveFeed(rawOpps, { now, page: 2, limit: 3 });

    assert.equal(page2.totalCount, 7);
    assert.equal(page2.page, 2);
    assert.equal(page2.limit, 3);
    assert.equal(page2.totalPages, 3);
    assert.equal(page2.opportunities.length, 3);
    assert.equal(page2.opportunities[0].id, "opp-4");
    assert.equal(page2.opportunities[1].id, "opp-5");
    assert.equal(page2.opportunities[2].id, "opp-6");
  });

  it("payload contract: returns title, employer, location, type, sourceName, lastVerifiedAt, applicationUrl", () => {
    const rawOpps = [
      {
        id: "opp-complete-1",
        title: "Fullstack Intern",
        organizationName: "Vercel",
        location: "Remote - US",
        workMode: "remote",
        sourceName: "Greenhouse",
        sourceUrl: "https://boards.greenhouse.io/vercel/jobs/101",
        applicationUrl: "https://boards.greenhouse.io/vercel/jobs/101#apply",
        status: "ACTIVE",
        lastVerifiedAt: now,
      },
    ];

    const result = filterStudentActiveFeed(rawOpps, { now });
    const item = result.opportunities[0];

    assert.equal(item.id, "opp-complete-1");
    assert.equal(item.title, "Fullstack Intern");
    assert.equal(item.employer, "Vercel");
    assert.equal(item.location, "Remote - US");
    assert.equal(item.type, "remote");
    assert.equal(item.sourceName, "Greenhouse");
    assert.equal(item.lastVerifiedAt, now.toISOString());
    assert.equal(item.applicationUrl, "https://boards.greenhouse.io/vercel/jobs/101#apply");
    assert.equal(item.isFresh, true);
  });
});
