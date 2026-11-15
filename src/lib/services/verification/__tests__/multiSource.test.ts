// src/lib/services/verification/__tests__/multiSource.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  aggregateCanonicalOpportunityStatus,
  type SourceListingContext,
  type CanonicalOpportunityContext,
} from "../multiSourceAggregator.ts";
import { validateApplicationUrl } from "../urlValidator.ts";

describe("Chunk 9: Canonical Opportunity Across Multiple Sources", () => {
  const now = new Date("2026-11-15T12:00:00Z");

  it("Greenhouse removes job (CLOSED) but career portal still lists (AVAILABLE) -> stays ACTIVE", () => {
    const opp: CanonicalOpportunityContext = {
      id: "opp-multi-1",
      status: "ACTIVE",
      lastVerifiedAt: new Date("2026-11-15T08:00:00Z"),
    };

    const sources: SourceListingContext[] = [
      {
        id: "os-gh",
        sourceId: "src-gh",
        sourceUrl: "https://boards.greenhouse.io/acme/jobs/1",
        verificationStatus: "rejected",
        lastVerificationOutcome: "CLOSED",
        lastVerificationAt: new Date("2026-11-15T11:00:00Z"),
        source: {
          id: "src-gh",
          name: "Greenhouse API",
          status: "active",
          healthStatus: "HEALTHY",
          complianceStatus: "permitted",
        },
      },
      {
        id: "os-portal",
        sourceId: "src-portal",
        sourceUrl: "https://acme.com/careers/jobs/1",
        verificationStatus: "verified",
        lastVerificationOutcome: "AVAILABLE",
        lastVerificationAt: new Date("2026-11-15T11:30:00Z"),
        source: {
          id: "src-portal",
          name: "Acme Careers Portal",
          status: "active",
          healthStatus: "HEALTHY",
          complianceStatus: "permitted",
        },
      },
    ];

    const result = aggregateCanonicalOpportunityStatus(opp, sources, () => false, now);

    assert.equal(result.newStatus, "ACTIVE");
    assert.equal(result.lastVerificationOutcome, "AVAILABLE");
    // Canonical lastVerifiedAt updated to latest positive verification
    assert.equal(
      result.lastVerifiedAt?.toISOString(),
      new Date("2026-11-15T11:30:00Z").toISOString()
    );
  });

  it("all enabled authoritative sources closed -> canonical status transitions to CLOSED", () => {
    const opp: CanonicalOpportunityContext = {
      id: "opp-multi-2",
      status: "ACTIVE",
      lastVerifiedAt: new Date("2026-11-14T00:00:00Z"),
    };

    const sources: SourceListingContext[] = [
      {
        id: "os-1",
        sourceId: "src-1",
        sourceUrl: "https://boards.greenhouse.io/acme/jobs/1",
        verificationStatus: "rejected",
        lastVerificationOutcome: "CLOSED",
        lastVerificationAt: now,
        source: {
          id: "src-1",
          name: "Source 1",
          status: "active",
          healthStatus: "HEALTHY",
          complianceStatus: "permitted",
        },
      },
      {
        id: "os-2",
        sourceId: "src-2",
        sourceUrl: "https://acme.com/careers/1",
        verificationStatus: "rejected",
        lastVerificationOutcome: "CLOSED",
        lastVerificationAt: now,
        source: {
          id: "src-2",
          name: "Source 2",
          status: "active",
          healthStatus: "HEALTHY",
          complianceStatus: "permitted",
        },
      },
    ];

    const result = aggregateCanonicalOpportunityStatus(opp, sources, () => false, now);

    assert.equal(result.newStatus, "CLOSED");
    assert.equal(result.lastVerificationOutcome, "CLOSED");
    assert.ok(result.closedAt);
  });

  it("disabled or failing sources are excluded and do NOT cause opportunity closure", () => {
    const opp: CanonicalOpportunityContext = {
      id: "opp-multi-3",
      status: "ACTIVE",
      lastVerifiedAt: new Date("2026-11-14T00:00:00Z"),
    };

    const sources: SourceListingContext[] = [
      {
        id: "os-disabled",
        sourceId: "src-disabled",
        sourceUrl: "https://boards.greenhouse.io/acme/jobs/1",
        verificationStatus: "rejected",
        lastVerificationOutcome: "CLOSED",
        source: {
          id: "src-disabled",
          name: "Disabled Source",
          status: "disabled", // Disabled!
          healthStatus: "HEALTHY",
          complianceStatus: "permitted",
        },
      },
      {
        id: "os-failing",
        sourceId: "src-failing",
        sourceUrl: "https://failing-source.com/jobs/1",
        verificationStatus: "pending",
        lastVerificationOutcome: "UNKNOWN",
        source: {
          id: "src-failing",
          name: "Failing Source",
          status: "active",
          healthStatus: "FAILING", // Failing health!
          complianceStatus: "permitted",
        },
      },
    ];

    const result = aggregateCanonicalOpportunityStatus(opp, sources, () => false, now);

    // Because all available sources are excluded, it never infers CLOSED
    assert.notEqual(result.newStatus, "CLOSED");
  });

  it("reopening policy: CLOSED job with new AVAILABLE evidence is subject to policy check", () => {
    const opp: CanonicalOpportunityContext = {
      id: "opp-closed-1",
      status: "CLOSED",
      lastVerifiedAt: new Date("2026-11-01T00:00:00Z"),
      closedAt: new Date("2026-11-05T00:00:00Z"),
    };

    const sources: SourceListingContext[] = [
      {
        id: "os-reopen",
        sourceId: "src-1",
        sourceUrl: "https://boards.greenhouse.io/acme/jobs/1",
        verificationStatus: "verified",
        lastVerificationOutcome: "AVAILABLE",
        lastVerificationAt: now,
        source: {
          id: "src-1",
          name: "Source 1",
          status: "active",
          healthStatus: "HEALTHY",
          complianceStatus: "permitted",
        },
      },
    ];

    // Policy 1: Default disallowed -> REVIEW_REQUIRED
    const blockedRes = aggregateCanonicalOpportunityStatus(opp, sources, () => false, now);
    assert.equal(blockedRes.newStatus, "REVIEW_REQUIRED");
    assert.equal(blockedRes.reopenAllowed, false);

    // Policy 2: Explicitly approved -> ACTIVE
    const allowedRes = aggregateCanonicalOpportunityStatus(opp, sources, () => true, now);
    assert.equal(allowedRes.newStatus, "ACTIVE");
    assert.equal(allowedRes.reopenAllowed, true);
    assert.equal(allowedRes.closedAt, null);
  });

  it("url validation: approved redirect accepted, unknown destination triggers review without marking INVALID", async () => {
    // 1. Approved redirect
    const mockFetchApproved = async () =>
      new Response(null, {
        status: 302,
        headers: { Location: "https://boards.greenhouse.io/acme/jobs/123" },
      });

    const resApproved = await validateApplicationUrl(
      "https://short.link/apply",
      ["greenhouse.io"],
      mockFetchApproved as any
    );

    assert.equal(resApproved.isValid, true);
    assert.equal(resApproved.isRedirect, true);
    assert.equal(resApproved.requiresReview, undefined);

    // 2. Redirect to third-party / unknown domain: MUST NOT AUTO-INVALIDATE
    const mockFetchExternal = async () =>
      new Response(null, {
        status: 301,
        headers: { Location: "https://unregistered-aggregator.com/apply" },
      });

    const resExternal = await validateApplicationUrl(
      "https://short.link/apply-2",
      ["greenhouse.io"],
      mockFetchExternal as any
    );

    // Strict rule: Redirects must NOT auto-mark invalid
    assert.equal(resExternal.isValid, true);
    assert.equal(resExternal.isRedirect, true);
    assert.equal(resExternal.requiresReview, true);
  });
});
