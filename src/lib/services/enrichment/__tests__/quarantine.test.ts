// src/lib/services/enrichment/__tests__/quarantine.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { filterEnrichedStudentFeed } from "../studentEnrichmentQuery.ts";
import {
  auditOpportunityForSyntheticData,
  CANNED_SALARY_FALLBACKS,
} from "../../../../../scripts/quarantine_synthetic_data.ts";
import { extractSalaryText } from "../../../../../scripts/ingest_real_jobs.ts";

describe("Phase 1 Chunk 1.1: Quarantine Synthetic Values and Grounded Ingestion", () => {
  const now = new Date("2026-11-16T12:00:00.000Z");
  const recentVerified = new Date(now.getTime() - 2 * 3600 * 1000).toISOString();

  describe("1. Factual Ingestion & Extraction (Zero Synthetic Fallbacks)", () => {
    it("extracts salary when explicitly present in description text", () => {
      const text = "Compensation: Base salary range is $145,000 - $180,000 USD plus equity.";
      const salary = extractSalaryText(text);
      assert.ok(salary);
      assert.match(salary, /\$145,000/);
    });

    it("returns null for salary when absent; NEVER yields canned synthetic fallback", () => {
      const text = "We are seeking a talented systems engineer to work on distributed infrastructure.";
      const salary = extractSalaryText(text);
      assert.strictEqual(salary, null, "Missing salary must strictly return null");
      assert.ok(!CANNED_SALARY_FALLBACKS.includes(salary as any));
    });

    it("ensures hourly compensation is extracted if present", () => {
      const text = "Interns receive $55/hr compensation alongside housing stipends.";
      const salary = extractSalaryText(text);
      assert.ok(salary);
      assert.match(salary, /\$55/);
    });
  });

  describe("2. Synthetic Data Audit & Quarantine Detection", () => {
    it("flags records with canned synthetic salary fallbacks", () => {
      const opp = {
        id: "opp_canned_salary",
        title: "Frontend Intern",
        description: "Join our frontend engineering team.",
        stipendSalary: "$45 - $65 / hour",
        status: "active",
      };

      const audit = auditOpportunityForSyntheticData(opp);
      assert.strictEqual(audit.isQuarantined, true);
      assert.ok(audit.quarantineReasons.includes("SYNTHETIC_SALARY_FALLBACK"));
      assert.strictEqual(audit.flaggedFields.salary, "$45 - $65 / hour");
      assert.ok(audit.dataQualityScore < 1.0);
    });

    it("flags records with ungrounded blanket degree fallbacks", () => {
      const opp = {
        id: "opp_canned_degrees",
        title: "Backend Engineer",
        description: "We build APIs with Go and PostgreSQL. No mention of formal university schooling.",
        eligibility: {
          degrees: ["Bachelors", "Masters"],
        },
        status: "active",
      };

      const audit = auditOpportunityForSyntheticData(opp);
      assert.strictEqual(audit.isQuarantined, true);
      assert.ok(audit.quarantineReasons.includes("SYNTHETIC_DEGREE_FALLBACK"));
    });

    it("does NOT flag degrees when explicitly cited in listing text", () => {
      const opp = {
        id: "opp_grounded_degrees",
        title: "Software Engineering Intern",
        description: "Must be currently enrolled in an accredited Bachelor's or Master's program in Computer Science.",
        eligibility: {
          degrees: ["Bachelors", "Masters"],
        },
        status: "active",
      };

      const audit = auditOpportunityForSyntheticData(opp);
      assert.ok(!audit.quarantineReasons.includes("SYNTHETIC_DEGREE_FALLBACK"));
    });

    it("flags ungrounded hardcoded minimum CGPA (7.0)", () => {
      const opp = {
        id: "opp_fake_cgpa",
        title: "Data Analyst",
        description: "Analyze business metrics and build SQL dashboards.",
        eligibility: {
          minCgpa: 7.0,
        },
        status: "active",
      };

      const audit = auditOpportunityForSyntheticData(opp);
      assert.strictEqual(audit.isQuarantined, true);
      assert.ok(audit.quarantineReasons.includes("SYNTHETIC_CGPA_FALLBACK"));
    });

    it("flags randomized future deadlines unsupported by listing text", () => {
      const opp = {
        id: "opp_fake_deadline",
        title: "Cloud Architect",
        description: "Design multi-region AWS architectures.",
        deadline: new Date(now.getTime() + 25 * 86400000).toISOString(),
        status: "active",
      };

      const audit = auditOpportunityForSyntheticData(opp);
      assert.strictEqual(audit.isQuarantined, true);
      assert.ok(audit.quarantineReasons.includes("SYNTHETIC_DEADLINE_FALLBACK"));
    });

    it("passes completely clean record with null salary and null deadline", () => {
      const opp = {
        id: "opp_clean",
        title: "Staff Engineer",
        description: "Lead distributed systems development at scale.",
        stipendSalary: null,
        deadline: null,
        eligibility: {
          degrees: [],
          graduationYears: [],
          minCgpa: null,
        },
        status: "active",
      };

      const audit = auditOpportunityForSyntheticData(opp);
      assert.strictEqual(audit.isQuarantined, false);
      assert.strictEqual(audit.quarantineReasons.length, 0);
      assert.strictEqual(audit.dataQualityScore, 1.0);
    });
  });

  describe("3. Student Feed Exclusion of Quarantined Opportunities", () => {
    it("excludes quarantined opportunities from the student feed", () => {
      const opportunities = [
        {
          id: "opp_grounded_1",
          title: "Legitimate Grounded Opportunity",
          organizationName: "Valid Corp",
          description: "A genuine software role with grounded requirements.",
          status: "ACTIVE",
          lastVerifiedAt: recentVerified,
          deadline: null, // Null deadline is completely valid
          stipendSalary: null,
          isQuarantined: false,
          quarantineReasons: [],
        },
        {
          id: "opp_quarantined_1",
          title: "Synthetic Fabricated Opportunity",
          organizationName: "Fake Corp",
          description: "Had synthetic fallbacks applied.",
          status: "ACTIVE",
          lastVerifiedAt: recentVerified,
          deadline: new Date(now.getTime() + 10 * 86400000).toISOString(),
          stipendSalary: "$45 - $65 / hour",
          isQuarantined: true,
          quarantineReasons: ["SYNTHETIC_SALARY_FALLBACK", "SYNTHETIC_CGPA_FALLBACK"],
        },
      ];

      const result = filterEnrichedStudentFeed(opportunities, { now });
      assert.strictEqual(result.totalCount, 1);
      assert.strictEqual(result.opportunities.length, 1);
      assert.strictEqual(result.opportunities[0].id, "opp_grounded_1");
    });

    it("allows null salary and null deadline in student feed without penalization", () => {
      const cleanOpp = {
        id: "opp_no_deadline_salary",
        title: "Security Researcher",
        organizationName: "Defense Lab",
        description: "Conduct research in vulnerability analysis and exploitation mitigation.",
        status: "ACTIVE",
        lastVerifiedAt: recentVerified,
        deadline: null,
        stipendSalary: null,
        isQuarantined: false,
      };

      const result = filterEnrichedStudentFeed([cleanOpp], { now });
      assert.strictEqual(result.totalCount, 1);
      assert.strictEqual(result.opportunities[0].id, "opp_no_deadline_salary");
      assert.strictEqual(result.opportunities[0].deadline, null);
      assert.strictEqual(result.opportunities[0].stipendSalary, null);
    });

    it("permits admin inspection of quarantined opportunities when allowQuarantined is true", () => {
      const quarantinedOpp = {
        id: "opp_quarantined_inspect",
        title: "Flagged Listing",
        organizationName: "Flagged Co",
        description: "Contains synthetic elements.",
        status: "ACTIVE",
        lastVerifiedAt: recentVerified,
        isQuarantined: true,
        quarantineReasons: ["SYNTHETIC_SALARY_FALLBACK"],
        dataQualityScore: 0.8,
      };

      // Default: excluded
      const studentView = filterEnrichedStudentFeed([quarantinedOpp], { now });
      assert.strictEqual(studentView.totalCount, 0);

      // Admin view with allowQuarantined: true
      const adminView = filterEnrichedStudentFeed([quarantinedOpp], {
        now,
        allowQuarantined: true,
      });
      assert.strictEqual(adminView.totalCount, 1);
      assert.strictEqual(adminView.opportunities[0].id, "opp_quarantined_inspect");
      assert.strictEqual(adminView.opportunities[0].isQuarantined, true);
    });
  });
});
