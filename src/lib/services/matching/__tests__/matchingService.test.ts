// src/lib/services/matching/__tests__/matchingService.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { MatchingService } from "../matchingService.ts";
import { OBSERVED_CAREER_ROLES } from "../../career-roles/roleCatalogueService.ts";

describe("Phase 6 Chunk 6.1: Opportunity Matching & Hard Eligibility Gates", () => {
  function createMockEnvironment() {
    const studentProfiles: Record<string, any> = {
      // student_eligible_2026: B.Tech CS, 2026 grad, 8.8 CGPA
      student_eligible_2026: {
        id: "prof_1",
        userId: "student_eligible_2026",
        college: "BITS Pilani",
        degree: "B.Tech in Computer Science",
        branch: "Computer Science",
        graduationYear: 2026,
        cgpa: 8.8,
      },
      // student_2025: Class of 2025 (graduated)
      student_2025: {
        id: "prof_2",
        userId: "student_2025",
        degree: "B.Tech",
        branch: "Computer Science",
        graduationYear: 2025,
        cgpa: 8.5,
      },
      // student_low_cgpa: CGPA 6.8
      student_low_cgpa: {
        id: "prof_3",
        userId: "student_low_cgpa",
        degree: "B.Tech",
        branch: "Computer Science",
        graduationYear: 2026,
        cgpa: 6.8,
      },
      // student_non_tech: BA English
      student_non_tech: {
        id: "prof_4",
        userId: "student_non_tech",
        degree: "Bachelor of Arts in Literature",
        branch: "English",
        graduationYear: 2026,
        cgpa: 9.0,
      },
    };

    const studentSkills: Record<string, any[]> = {
      student_eligible_2026: [
        { id: "sk_1", userId: "student_eligible_2026", name: "Python", confirmed: true, reviewStatus: "CONFIRMED" },
        { id: "sk_2", userId: "student_eligible_2026", name: "SQL", confirmed: true, reviewStatus: "CONFIRMED" },
        { id: "sk_3", userId: "student_eligible_2026", name: "PostgreSQL", confirmed: true, reviewStatus: "CONFIRMED" },
        { id: "sk_4", userId: "student_eligible_2026", name: "Docker", confirmed: true, reviewStatus: "CONFIRMED" },
      ],
      student_2025: [],
      student_low_cgpa: [],
      student_non_tech: [],
    };

    const studentInterests: Record<string, any[]> = {
      student_eligible_2026: [
        { id: "ci_1", userId: "student_eligible_2026", targetRole: "Backend Engineer", domain: "software", priority: 1 },
      ],
      student_2025: [],
      student_low_cgpa: [],
      student_non_tech: [],
    };

    const studentPreferences: Record<string, any> = {
      student_eligible_2026: {
        preferredWorkModes: ["REMOTE", "HYBRID"],
        preferredLocations: ["Bangalore", "San Francisco"],
        openToRelocation: true,
      },
    };

    const mockProfileService: any = {
      getProfile: async (userId: string) => studentProfiles[userId] || null,
    };

    const mockExtProfileService: any = {
      getStudentSkills: async (userId: string) => studentSkills[userId] || [],
      getCareerInterests: async (userId: string) => studentInterests[userId] || [],
      getPreferences: async (userId: string) => studentPreferences[userId] || null,
    };

    const mockCatalogueService: any = {
      getCatalogue: async () => OBSERVED_CAREER_ROLES,
    };

    const service = new MatchingService(
      null,
      mockProfileService,
      mockExtProfileService,
      mockCatalogueService
    );

    return { service, studentProfiles };
  }

  describe("1. Hard Eligibility Gate: Status & Freshness Invariant", () => {
    it("strictly marks CLOSED opportunities as ineligible with overallScore = 0", async () => {
      const { service } = createMockEnvironment();

      const closedOpp = {
        id: "opp_closed",
        title: "Backend Engineer",
        employer: "GitLab",
        status: "CLOSED",
        location: "Remote",
        requiredSkills: ["Python", "SQL"],
        eligibility: { graduationYears: [2026] },
      };

      const result = await service.matchOpportunity("student_eligible_2026", closedOpp);

      assert.strictEqual(result.isEligible, false);
      assert.strictEqual(result.overallScore, 0);
      assert.strictEqual(result.matchBand, "INELIGIBLE");
      assert.ok(result.hardEligibility.ineligibilityReasons.some((r) => r.includes("closed")));
    });

    it("strictly marks EXPIRED opportunities (past deadline) as ineligible", async () => {
      const { service } = createMockEnvironment();

      const expiredOpp = {
        id: "opp_expired",
        title: "Backend Engineer",
        status: "ACTIVE",
        deadline: "2020-01-01T00:00:00Z", // Past deadline
        location: "Remote",
      };

      const result = await service.matchOpportunity("student_eligible_2026", expiredOpp);

      assert.strictEqual(result.isEligible, false);
      assert.strictEqual(result.overallScore, 0);
      assert.strictEqual(result.matchBand, "INELIGIBLE");
      assert.ok(result.hardEligibility.ineligibilityReasons.some((r) => r.includes("deadline")));
    });
  });

  describe("2. Hard Eligibility Gate: Graduation Year Restriction", () => {
    it("rejects student whose graduation year does not match designated batch", async () => {
      const { service } = createMockEnvironment();

      const intern2027Opp = {
        id: "opp_intern_2027",
        title: "Software Engineering Intern (Summer 2027)",
        employer: "Cloudflare",
        status: "ACTIVE",
        eligibility: { graduationYears: [2027] },
      };

      // student_eligible_2026 is graduating in 2026, not 2027
      const result = await service.matchOpportunity("student_eligible_2026", intern2027Opp);

      assert.strictEqual(result.isEligible, false);
      assert.strictEqual(result.overallScore, 0);
      assert.strictEqual(result.matchBand, "INELIGIBLE");
      assert.ok(
        result.hardEligibility.ineligibilityReasons.some((r) => r.includes("2027")),
        "Ineligibility reasons must cite designated graduation cohort"
      );
    });

    it("accepts student whose graduation year matches designated batch", async () => {
      const { service } = createMockEnvironment();

      const batch2026Opp = {
        id: "opp_grad_2026",
        title: "Graduate Software Engineer (2026)",
        employer: "Stripe",
        status: "ACTIVE",
        eligibility: { graduationYears: [2026] },
        requiredSkills: ["Python"],
      };

      const result = await service.matchOpportunity("student_eligible_2026", batch2026Opp);

      assert.strictEqual(result.isEligible, true);
      assert.ok(result.overallScore > 0);
      assert.notStrictEqual(result.matchBand, "INELIGIBLE");
    });
  });

  describe("3. Hard Eligibility Gate: Degree & Major Restriction", () => {
    it("rejects student whose degree does not satisfy technical degree criteria", async () => {
      const { service } = createMockEnvironment();

      const techDegreeOpp = {
        id: "opp_tech_only",
        title: "Systems Engineer",
        status: "ACTIVE",
        eligibility: { degrees: ["B.Tech", "B.E.", "BS in Computer Science"] },
      };

      // student_non_tech has BA in Literature
      const result = await service.matchOpportunity("student_non_tech", techDegreeOpp);

      assert.strictEqual(result.isEligible, false);
      assert.strictEqual(result.overallScore, 0);
      assert.strictEqual(result.matchBand, "INELIGIBLE");
      assert.ok(result.hardEligibility.ineligibilityReasons.some((r) => r.includes("B.Tech")));
    });
  });

  describe("4. Hard Eligibility Gate: Minimum CGPA Cutoff", () => {
    it("rejects student whose confirmed CGPA is below the mandatory threshold", async () => {
      const { service } = createMockEnvironment();

      const highCgpaOpp = {
        id: "opp_cgpa_cutoff",
        title: "Research Engineer",
        status: "ACTIVE",
        eligibility: { minCgpa: 8.0 },
      };

      // student_low_cgpa has 6.8 CGPA
      const result = await service.matchOpportunity("student_low_cgpa", highCgpaOpp);

      assert.strictEqual(result.isEligible, false);
      assert.strictEqual(result.overallScore, 0);
      assert.strictEqual(result.matchBand, "INELIGIBLE");
      assert.ok(result.hardEligibility.ineligibilityReasons.some((r) => r.includes("8.00")));
    });
  });

  describe("5. Soft Scoring & Explainability (When Fully Eligible)", () => {
    it("computes transparent multi-factor compatibility score with explicit reasons", async () => {
      const { service } = createMockEnvironment();

      const opp = {
        id: "opp_backend_live",
        title: "Backend Engineer",
        employer: "GitLab",
        status: "ACTIVE",
        workplaceType: "REMOTE",
        location: "Bangalore",
        careerRoleId: "role_backend_eng",
        requiredSkills: ["Python", "SQL", "PostgreSQL"],
        preferredSkills: ["Docker"],
        eligibility: {
          graduationYears: [2026],
          degrees: ["B.Tech", "B.E."],
          minCgpa: 7.5,
        },
      };

      const result = await service.matchOpportunity("student_eligible_2026", opp);

      assert.strictEqual(result.isEligible, true);
      assert.ok(result.overallScore >= 75, `Expected score >= 75, got ${result.overallScore}`);
      assert.strictEqual(result.matchBand, "STRONG_MATCH");

      // Verify breakdown components
      assert.ok(result.breakdown.skillsScore >= 30);
      assert.strictEqual(result.breakdown.roleInterestScore, 30); // Target role matches Backend Engineer
      assert.strictEqual(result.breakdown.academicFitScore, 15); // Computer Science branch
      assert.ok(result.breakdown.preferencesScore >= 10); // Remote work mode matched

      // Verify transparent reasons
      assert.ok(result.reasons.some((r) => r.includes("required skills")));
      assert.ok(result.reasons.some((r) => r.includes("Backend Engineer")));
      assert.ok(result.reasons.some((r) => r.includes("Computer Science")));
      assert.ok(result.reasons.some((r) => r.includes("preferences")));
    });
  });
});
