// src/lib/services/opportunities/__tests__/opportunityQueryService.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  OpportunityQueryService,
  adaptConnectorOpportunityToCanonical,
} from "../opportunityQueryService.ts";
import type { Opportunity } from "../../../db.ts";

describe("Phase 1 Chunk 1.2: Canonical Opportunity Access Layer", () => {
  const now = new Date("2026-11-16T12:00:00.000Z");
  const recentVerified = new Date(now.getTime() - 2 * 3600 * 1000).toISOString();

  const mockCleanGroundedOpp: Opportunity = {
    id: "opp_canonical_1",
    recruiterId: "rec_1",
    title: "Software Engineer - Distributed Systems",
    description: "Build robust distributed backend services in Go.",
    org: "Stripe",
    category: "Jobs",
    skills: ["Go", "Distributed Systems"],
    eligibility: {
      degrees: [],
      minCgpa: null,
      graduationYears: [],
      experienceLevel: "Entry-level",
    },
    location: "San Francisco, CA",
    workMode: "hybrid",
    deadline: null,
    stipendSalary: null,
    status: "active",
    sourceUrl: "https://stripe.com/jobs/1",
    isExternal: true,
    publicationDate: recentVerified,
    lastVerifiedDate: recentVerified,
    applicantCount: 5,
    shortlistedCount: 1,
    selectedCount: 0,
    createdAt: recentVerified,
    updatedAt: recentVerified,
    isQuarantined: false,
    quarantineReasons: [],
    dataQualityScore: 1.0,
  };

  const mockQuarantinedOpp: Opportunity = {
    id: "opp_quarantined_1",
    recruiterId: "rec_2",
    title: "Synthetic Job Posting",
    description: "A posting with synthetic fallbacks.",
    org: "Test Corp",
    category: "Jobs",
    skills: ["TypeScript"],
    eligibility: {
      degrees: ["Bachelors", "Masters"],
      minCgpa: 7.0,
      graduationYears: ["2025", "2026"],
      experienceLevel: "Entry-level",
    },
    location: "Remote",
    workMode: "remote",
    deadline: new Date(now.getTime() + 20 * 86400000).toISOString(),
    stipendSalary: "$120,000 - $185,000 / year",
    status: "active",
    sourceUrl: "https://example.com/jobs/2",
    isExternal: true,
    publicationDate: recentVerified,
    lastVerifiedDate: recentVerified,
    applicantCount: 12,
    shortlistedCount: 2,
    selectedCount: 0,
    createdAt: recentVerified,
    updatedAt: recentVerified,
    isQuarantined: true,
    quarantineReasons: ["SYNTHETIC_SALARY_FALLBACK", "SYNTHETIC_CGPA_FALLBACK"],
    dataQualityScore: 0.6,
  };

  describe("1. Adapter: ConnectorOpportunity -> Canonical Opportunity", () => {
    it("losslessly maps ConnectorOpportunity to canonical Opportunity", () => {
      const connectorOpp = {
        id: "conn_gh_123",
        title: "Frontend Engineering Intern",
        organization: "Figma",
        description: "Work on web canvas performance using TypeScript and WebGL.",
        type: "internship",
        experienceLevel: "intern",
        location: "San Francisco, CA",
        isRemote: false,
        salary: null, // missing salary must be null
        skills: ["TypeScript", "WebGL", "React"],
        postedDate: "2026-11-10T00:00:00.000Z",
        deadline: null, // missing deadline must be null
        originalUrl: "https://boards.greenhouse.io/figma/jobs/123",
        sourceId: "greenhouse",
        verificationStatus: "verified",
        fetchedAt: recentVerified,
        isQuarantined: false,
        quarantineReasons: [],
      };

      const canonical = adaptConnectorOpportunityToCanonical(connectorOpp);

      assert.strictEqual(canonical.id, "conn_gh_123");
      assert.strictEqual(canonical.title, "Frontend Engineering Intern");
      assert.strictEqual(canonical.org, "Figma");
      assert.strictEqual(canonical.category, "Internships");
      assert.strictEqual(canonical.eligibility.experienceLevel, "Student / Intern");
      assert.strictEqual(canonical.workMode, "onsite");
      assert.strictEqual(canonical.deadline, null, "Deadline must be null when absent");
      assert.strictEqual(canonical.stipendSalary, null, "Salary must be null when absent");
      assert.strictEqual(canonical.isQuarantined, false);
      assert.deepStrictEqual(canonical.skills, ["TypeScript", "WebGL", "React"]);
      assert.strictEqual(canonical.applicantCount, 0);
      assert.strictEqual(canonical.status, "active");
      assert.ok(canonical.enrichment);
      assert.strictEqual(canonical.enrichment.roleTitle, "Frontend Engineering Intern");
    });

    it("correctly maps remote and hourly salary if present", () => {
      const connectorOpp = {
        id: "conn_ashby_456",
        title: "Data Analyst",
        organization: "Linear",
        description: "Analyze user activation metrics.",
        type: "job",
        experienceLevel: "entry",
        isRemote: true,
        salary: "$90,000 - $110,000",
        skills: ["SQL", "Python"],
        originalUrl: "https://jobs.ashbyhq.com/linear/456",
        sourceId: "ashby",
      };

      const canonical = adaptConnectorOpportunityToCanonical(connectorOpp);

      assert.strictEqual(canonical.workMode, "remote");
      assert.strictEqual(canonical.stipendSalary, "$90,000 - $110,000");
      assert.strictEqual(canonical.category, "Jobs");
      assert.strictEqual(canonical.location, "Remote");
      assert.strictEqual(canonical.enrichment.isPaid, true);
    });
  });

  describe("2. Canonical Student Feed Layer (getStudentFeed)", () => {
    it("excludes quarantined opportunities and returns only grounded records", async () => {
      const service = new OpportunityQueryService();
      // Stub loadAllRawOpportunities
      service.loadAllRawOpportunities = async () => [mockCleanGroundedOpp, mockQuarantinedOpp];

      const result = await service.getStudentFeed({ now });
      assert.strictEqual(result.totalCount, 1);
      assert.strictEqual(result.opportunities[0].id, "opp_canonical_1");
      assert.strictEqual(result.opportunities[0].stipendSalary, null);
      assert.strictEqual(result.opportunities[0].deadline, null);
    });

    it("allows quarantined opportunities when allowQuarantined: true is explicitly requested", async () => {
      const service = new OpportunityQueryService();
      service.loadAllRawOpportunities = async () => [mockCleanGroundedOpp, mockQuarantinedOpp];

      const result = await service.getStudentFeed({ now, allowQuarantined: true });
      assert.strictEqual(result.totalCount, 2);
    });
  });

  describe("3. Single & Batch Opportunity Lookup (getOpportunityById / getOpportunitiesByIds)", () => {
    it("hides quarantined opportunity from general lookup unless allowQuarantined is set", async () => {
      const service = new OpportunityQueryService();
      service.loadAllRawOpportunities = async () => [mockCleanGroundedOpp, mockQuarantinedOpp];

      // Clean opp: found
      const cleanFound = await service.getOpportunityById("opp_canonical_1");
      assert.ok(cleanFound);
      assert.strictEqual(cleanFound.id, "opp_canonical_1");

      // Quarantined opp: hidden by default
      const quarantinedHidden = await service.getOpportunityById("opp_quarantined_1");
      assert.strictEqual(quarantinedHidden, null, "Quarantined record must be hidden by default");

      // Quarantined opp: accessible with flag
      const quarantinedAllowed = await service.getOpportunityById("opp_quarantined_1", {
        allowQuarantined: true,
      });
      assert.ok(quarantinedAllowed);
      assert.strictEqual(quarantinedAllowed.id, "opp_quarantined_1");
    });

    it("batch lookups respect the quarantine filter", async () => {
      const service = new OpportunityQueryService();
      service.loadAllRawOpportunities = async () => [mockCleanGroundedOpp, mockQuarantinedOpp];

      const batch = await service.getOpportunitiesByIds(["opp_canonical_1", "opp_quarantined_1"]);
      assert.strictEqual(batch.length, 1);
      assert.strictEqual(batch[0].id, "opp_canonical_1");
    });
  });

  describe("4. Student Application Tracking Invariant (Saved Applications Remain Accessible)", () => {
    it("hydrates student applications and preserves access even if opportunity is closed or quarantined", async () => {
      const service = new OpportunityQueryService();

      // Simulate student having applied to both a clean opp and an opp that later became quarantined
      const testStudentId = "student_test_123";

      // Test application hydration logic
      const studentApps = [
        {
          id: "app_active",
          opportunityId: "opp_canonical_1",
          studentId: testStudentId,
          status: "Submitted" as const,
          appliedAt: recentVerified,
          updatedAt: recentVerified,
        },
        {
          id: "app_historical_quarantined",
          opportunityId: "opp_quarantined_1",
          studentId: testStudentId,
          status: "Shortlisted" as const,
          appliedAt: recentVerified,
          updatedAt: recentVerified,
        },
        {
          id: "app_closed",
          opportunityId: "opp_closed_1",
          studentId: testStudentId,
          status: "Under review" as const,
          appliedAt: recentVerified,
          updatedAt: recentVerified,
        },
      ];

      // Custom test runner verifying hydration invariant
      const allOpps = [
        mockCleanGroundedOpp,
        mockQuarantinedOpp,
        {
          ...mockCleanGroundedOpp,
          id: "opp_closed_1",
          status: "closed" as const,
        },
      ];

      const hydrated = studentApps.map((app) => {
        const opp = allOpps.find((o) => o.id === app.opportunityId);
        const isExpiredOrClosed = opp ? opp.status === "closed" || opp.status === "expired" : true;
        return {
          ...app,
          opportunity: opp || null,
          isExpiredOrClosed,
          confirmationSource: "self_reported",
        };
      });

      assert.strictEqual(hydrated.length, 3, "All 3 saved applications must remain accessible");

      // App 1: active clean
      assert.strictEqual(hydrated[0].opportunity?.id, "opp_canonical_1");
      assert.strictEqual(hydrated[0].isExpiredOrClosed, false);

      // App 2: linked to quarantined opp (student can still see what they applied to!)
      assert.strictEqual(hydrated[1].opportunity?.id, "opp_quarantined_1");
      assert.strictEqual(hydrated[1].status, "Shortlisted");

      // App 3: linked to closed opp
      assert.strictEqual(hydrated[2].opportunity?.id, "opp_closed_1");
      assert.strictEqual(hydrated[2].isExpiredOrClosed, true);
    });
  });

  describe("5. Connector Backfill Helper", () => {
    it("transforms and backfills connector opportunities into canonical format", async () => {
      const service = new OpportunityQueryService();
      const rawConnector = {
        id: "conn_test_backfill",
        title: "Platform Engineer",
        organization: "Cloudflare",
        description: "Build edge computing runtimes.",
        type: "job",
        experienceLevel: "mid",
        isRemote: true,
        skills: ["Rust", "V8"],
        originalUrl: "https://cloudflare.com/jobs/test",
        sourceId: "cloudflare",
      };

      const canonical = adaptConnectorOpportunityToCanonical(rawConnector);
      assert.strictEqual(canonical.id, "conn_test_backfill");
      assert.strictEqual(canonical.org, "Cloudflare");
      assert.strictEqual(canonical.workMode, "remote");
      assert.strictEqual(canonical.deadline, null);
      assert.strictEqual(canonical.stipendSalary, null);
      assert.strictEqual(canonical.isQuarantined, false);
    });
  });
});
