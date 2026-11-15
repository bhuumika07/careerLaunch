// src/lib/services/enrichment/__tests__/studentEnrichmentFeed.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  filterEnrichedStudentFeed,
  extractEnrichmentData,
} from "../studentEnrichmentQuery.ts";

describe("Student Discovery Feed with AI Enrichment (Chunk 6)", () => {
  const now = new Date("2026-11-15T12:00:00.000Z");
  const recentVerified = new Date(now.getTime() - 2 * 3600 * 1000).toISOString(); // 2 hours ago
  const staleVerified = new Date(now.getTime() - 48 * 3600 * 1000).toISOString(); // 48 hours ago
  const futureDeadline = new Date(now.getTime() + 14 * 24 * 3600 * 1000).toISOString(); // 14 days future
  const pastDeadline = new Date(now.getTime() - 1 * 24 * 3600 * 1000).toISOString(); // 1 day past

  const mockEnrichedInternship = {
    id: "opp_ai_1",
    title: "Software Engineering Intern",
    organizationName: "Apex Dynamics",
    description: "Original raw description text.",
    status: "ACTIVE",
    lastVerifiedAt: recentVerified,
    applicationDeadline: futureDeadline,
    workMode: "remote",
    category: "Internships",
    skills: ["General Software"],
    enrichment: {
      status: "succeeded",
      roleTitle: "Software Engineering Intern (Summer 2027)",
      descriptionSummary: "Summer backend systems engineering internship focusing on Go and Kubernetes.",
      opportunityType: "internship",
      workMode: "remote",
      requiredSkills: ["Go", "Distributed Systems", "SQL"],
      preferredSkills: ["Kubernetes", "Docker", "gRPC"],
      inferredSkills: ["CI/CD", "Linux"],
      degreeLevels: ["Bachelors", "Masters"],
      branches: ["Computer Science", "Information Technology"],
      graduationYears: [2026, 2027],
      minCgpa: 7.0,
      experienceLevel: "entry",
      isPaid: true,
      compensation: {
        currency: "USD",
        minAmount: 8000,
        maxAmount: 10000,
        interval: "monthly",
        textVerbatim: "$8,000 - $10,000 / month",
      },
    },
  };

  const mockEnrichedFullTime = {
    id: "opp_ai_2",
    title: "Full Stack Developer",
    organizationName: "Stripe",
    description: "Building payment infrastructure and UI.",
    status: "ACTIVE",
    lastVerifiedAt: recentVerified,
    applicationDeadline: futureDeadline,
    workMode: "hybrid",
    category: "Jobs",
    skills: ["Web Dev"],
    enrichment: {
      status: "succeeded",
      roleTitle: "Full Stack Engineer",
      descriptionSummary: "Building high-scale dashboard applications in React and Node.js.",
      opportunityType: "full_time",
      workMode: "hybrid",
      requiredSkills: ["React", "TypeScript", "Node.js"],
      preferredSkills: ["GraphQL", "PostgreSQL"],
      inferredSkills: ["System Design"],
      degreeLevels: ["Bachelors"],
      branches: ["Computer Science", "Electrical Engineering"],
      graduationYears: [2024, 2025],
      minCgpa: 7.5,
      experienceLevel: "mid",
      isPaid: true,
      compensation: {
        currency: "USD",
        minAmount: 140000,
        maxAmount: 160000,
        interval: "yearly",
        textVerbatim: "$140,000 - $160,000 / year",
      },
    },
  };

  const mockUnEnrichedActive = {
    id: "opp_legacy_1",
    title: "Machine Learning Researcher",
    organizationName: "Open Research Lab",
    description: "Researching multimodal foundation models.",
    status: "ACTIVE",
    lastVerifiedAt: recentVerified,
    applicationDeadline: futureDeadline,
    workMode: "onsite",
    category: "Research fellowships",
    skills: ["Python", "PyTorch"],
    eligibility: {
      degrees: ["Masters", "PhD"],
      graduationYears: ["2025"],
      minCgpa: 8.0,
      experienceLevel: "Entry-level",
    },
    enrichment: null,
  };

  const sampleDataset = [mockEnrichedInternship, mockEnrichedFullTime, mockUnEnrichedActive];

  describe("Phase 2 Invariant Preservation", () => {
    it("excludes non-ACTIVE opportunities regardless of enrichment", () => {
      const inactiveOpp = {
        ...mockEnrichedInternship,
        id: "inactive_1",
        status: "CLOSED",
      };
      const result = filterEnrichedStudentFeed([inactiveOpp], { now });
      assert.equal(result.totalCount, 0);
      assert.equal(result.opportunities.length, 0);
    });

    it("excludes stale opportunities exceeding freshness window", () => {
      const staleOpp = {
        ...mockEnrichedInternship,
        id: "stale_1",
        lastVerifiedAt: staleVerified,
      };
      const result = filterEnrichedStudentFeed([staleOpp], {
        now,
        freshnessThresholdHours: 24,
      });
      assert.equal(result.totalCount, 0);
    });

    it("excludes opportunities with past deadlines", () => {
      const expiredOpp = {
        ...mockEnrichedInternship,
        id: "expired_1",
        applicationDeadline: pastDeadline,
      };
      const result = filterEnrichedStudentFeed([expiredOpp], { now });
      assert.equal(result.totalCount, 0);
    });

    it("returns active opportunities when no special filters are applied", () => {
      const result = filterEnrichedStudentFeed(sampleDataset, { now });
      assert.equal(result.totalCount, 3);
      assert.equal(result.opportunities.length, 3);
    });
  });

  describe("Phase 3 Filter: Opportunity Type", () => {
    it("filters accurately for internships", () => {
      const result = filterEnrichedStudentFeed(sampleDataset, {
        now,
        opportunityType: "internship",
      });
      assert.equal(result.totalCount, 1);
      assert.equal(result.opportunities[0].id, "opp_ai_1");
      assert.equal(result.opportunities[0].type, "internship");
    });

    it("filters accurately for full_time roles", () => {
      const result = filterEnrichedStudentFeed(sampleDataset, {
        now,
        opportunityType: "full_time",
      });
      assert.equal(result.totalCount, 1);
      assert.equal(result.opportunities[0].id, "opp_ai_2");
      assert.equal(result.opportunities[0].type, "full_time");
    });
  });

  describe("Phase 3 Filter: Work Mode", () => {
    it("filters for remote opportunities using enriched work_mode", () => {
      const result = filterEnrichedStudentFeed(sampleDataset, {
        now,
        workMode: "remote",
      });
      assert.equal(result.totalCount, 1);
      assert.equal(result.opportunities[0].id, "opp_ai_1");
    });

    it("filters for hybrid opportunities", () => {
      const result = filterEnrichedStudentFeed(sampleDataset, {
        now,
        workMode: "hybrid",
      });
      assert.equal(result.totalCount, 1);
      assert.equal(result.opportunities[0].id, "opp_ai_2");
    });

    it("falls back to base workMode for un-enriched opportunities", () => {
      const result = filterEnrichedStudentFeed(sampleDataset, {
        now,
        workMode: "onsite",
      });
      assert.equal(result.totalCount, 1);
      assert.equal(result.opportunities[0].id, "opp_legacy_1");
    });
  });

  describe("Phase 3 Filter: Skills Discovery", () => {
    it("matches required skills extracted by AI", () => {
      const result = filterEnrichedStudentFeed(sampleDataset, {
        now,
        skills: ["Go"],
      });
      assert.equal(result.totalCount, 1);
      assert.equal(result.opportunities[0].id, "opp_ai_1");
    });

    it("matches preferred skills extracted by AI", () => {
      const result = filterEnrichedStudentFeed(sampleDataset, {
        now,
        skills: ["Docker"],
      });
      assert.equal(result.totalCount, 1);
      assert.equal(result.opportunities[0].id, "opp_ai_1");
    });

    it("matches base opportunity skills when un-enriched", () => {
      const result = filterEnrichedStudentFeed(sampleDataset, {
        now,
        skills: ["PyTorch"],
      });
      assert.equal(result.totalCount, 1);
      assert.equal(result.opportunities[0].id, "opp_legacy_1");
    });

    it("returns zero results when skill is not present in any tier", () => {
      const result = filterEnrichedStudentFeed(sampleDataset, {
        now,
        skills: ["RustLangNonExistent"],
      });
      assert.equal(result.totalCount, 0);
    });
  });

  describe("Phase 3 Filter: Degree Levels & Qualifications", () => {
    it("matches opportunities requiring Bachelors", () => {
      const result = filterEnrichedStudentFeed(sampleDataset, {
        now,
        degreeLevels: ["Bachelors"],
      });
      // Both opp_ai_1 and opp_ai_2 accept Bachelors
      assert.equal(result.totalCount, 2);
      const ids = result.opportunities.map((o) => o.id);
      assert.ok(ids.includes("opp_ai_1"));
      assert.ok(ids.includes("opp_ai_2"));
    });

    it("matches opportunities requiring PhD", () => {
      const result = filterEnrichedStudentFeed(sampleDataset, {
        now,
        degreeLevels: ["PhD"],
      });
      assert.equal(result.totalCount, 1);
      assert.equal(result.opportunities[0].id, "opp_legacy_1");
    });
  });

  describe("Phase 3 Filter: Graduation Years", () => {
    it("matches opportunities targeting 2027 graduates", () => {
      const result = filterEnrichedStudentFeed(sampleDataset, {
        now,
        graduationYears: [2027],
      });
      assert.equal(result.totalCount, 1);
      assert.equal(result.opportunities[0].id, "opp_ai_1");
    });

    it("matches opportunities targeting 2024 graduates", () => {
      const result = filterEnrichedStudentFeed(sampleDataset, {
        now,
        graduationYears: [2024],
      });
      assert.equal(result.totalCount, 1);
      assert.equal(result.opportunities[0].id, "opp_ai_2");
    });
  });

  describe("Phase 3 Filter: Minimum CGPA Eligibility", () => {
    it("includes opportunities when candidate CGPA satisfies requirement", () => {
      const result = filterEnrichedStudentFeed(sampleDataset, {
        now,
        minCgpa: 8.5, // Candidate has 8.5, satisfies all cutoffs (7.0, 7.5, 8.0)
      });
      assert.equal(result.totalCount, 3);
    });

    it("excludes opportunities when candidate CGPA is below cutoff", () => {
      const result = filterEnrichedStudentFeed(sampleDataset, {
        now,
        minCgpa: 7.2, // Candidate has 7.2: qualifies for 7.0, fails 7.5 and 8.0
      });
      assert.equal(result.totalCount, 1);
      assert.equal(result.opportunities[0].id, "opp_ai_1");
    });
  });

  describe("Combined Filter & Rich Output Payload", () => {
    it("handles complex multi-dimensional filter", () => {
      const result = filterEnrichedStudentFeed(sampleDataset, {
        now,
        workMode: "remote",
        opportunityType: "internship",
        skills: ["Go"],
        degreeLevels: ["Bachelors"],
        graduationYears: [2027],
        minCgpa: 7.5,
      });

      assert.equal(result.totalCount, 1);
      const item = result.opportunities[0];
      assert.equal(item.id, "opp_ai_1");
      assert.ok(item.enrichment != null);
      assert.equal(item.enrichment?.roleTitle, "Software Engineering Intern (Summer 2027)");
      assert.deepEqual(item.enrichment?.requiredSkills, ["Go", "Distributed Systems", "SQL"]);
      assert.deepEqual(item.enrichment?.preferredSkills, ["Kubernetes", "Docker", "gRPC"]);
      assert.deepEqual(item.enrichment?.inferredSkills, ["CI/CD", "Linux"]);
      assert.equal(item.stipendSalary, "$8,000 - $10,000 / month");
      assert.equal(item.isFresh, true);
      assert.equal(item.status, "ACTIVE");
    });

    it("extracts contract payload format cleanly", () => {
      const rawContractPayload = {
        basic: {
          role_title: "AI Research Fellow",
          company: "DeepMind",
          description_summary: "Research fellowship in RL.",
        },
        opportunity_type: { primary_type: "internship" },
        skills: {
          required_skills: [{ name: "Python" }],
          preferred_skills: [{ name: "JAX" }],
          inferred_skills: [{ name: "Linear Algebra" }],
        },
        qualifications: {
          degree_levels: ["PhD"],
          branches: ["CS"],
          graduation_years: [2025],
          min_cgpa: 3.8,
        },
        location: { work_mode: "onsite" },
      };

      const extracted = extractEnrichmentData({ enrichment: rawContractPayload });
      assert.ok(extracted != null);
      assert.equal(extracted?.roleTitle, "AI Research Fellow");
      assert.equal(extracted?.opportunityType, "internship");
      assert.deepEqual(extracted?.requiredSkills, ["Python"]);
      assert.deepEqual(extracted?.preferredSkills, ["JAX"]);
      assert.deepEqual(extracted?.inferredSkills, ["Linear Algebra"]);
      assert.deepEqual(extracted?.degreeLevels, ["PhD"]);
    });
  });

  describe("Milestone 3.5: API Integration & Visibility Contract", () => {
    it("preserves backward compatibility: original description is always still available", () => {
      const result = filterEnrichedStudentFeed(sampleDataset, { now });
      const enrichedItem = result.opportunities.find((o) => o.id === "opp_ai_1")!;
      const unEnrichedItem = result.opportunities.find((o) => o.id === "opp_legacy_1")!;

      // Original description is preserved
      assert.equal(enrichedItem.description, "Original raw description text.");
      assert.equal(enrichedItem.rawDescription, "Original raw description text.");
      assert.equal(unEnrichedItem.description, "Researching multimodal foundation models.");

      // Enriched summary is in separate field
      assert.ok(enrichedItem.summary?.includes("Summer backend systems engineering"));
      assert.equal(unEnrichedItem.summary, null);
    });

    it("keeps required_skills and preferred_skills strictly separated without merging", () => {
      const result = filterEnrichedStudentFeed(sampleDataset, { now });
      const item = result.opportunities.find((o) => o.id === "opp_ai_1")!;

      assert.ok(Array.isArray(item.required_skills));
      assert.ok(Array.isArray(item.preferred_skills));
      assert.deepEqual(item.required_skills, ["Go", "Distributed Systems", "SQL"]);
      assert.deepEqual(item.preferred_skills, ["Kubernetes", "Docker", "gRPC"]);

      // Verify no intersection between required and preferred
      const intersection = item.required_skills.filter((s) => item.preferred_skills.includes(s));
      assert.equal(intersection.length, 0);
    });

    it("allows un-enriched opportunities to appear normally in the student feed", () => {
      const result = filterEnrichedStudentFeed(sampleDataset, { now });
      const unEnrichedItem = result.opportunities.find((o) => o.id === "opp_legacy_1")!;

      assert.ok(unEnrichedItem);
      assert.equal(unEnrichedItem.title, "Machine Learning Researcher");
      assert.equal(unEnrichedItem.enrichment, null);
      assert.deepEqual(unEnrichedItem.required_skills, []);
      assert.deepEqual(unEnrichedItem.preferred_skills, []);
      assert.deepEqual(unEnrichedItem.skills, ["Python", "PyTorch"]);
    });

    it("hides review-state enrichments from students by default", () => {
      const oppWithReviewState = {
        id: "opp_review_1",
        title: "Platform Engineer",
        organizationName: "HashiCorp",
        description: "Core infrastructure engineering.",
        status: "ACTIVE",
        lastVerifiedAt: recentVerified,
        applicationDeadline: futureDeadline,
        workMode: "remote",
        category: "Jobs",
        skills: ["Terraform"],
        enrichment: {
          status: "needs_review", // Not yet approved by admin!
          roleTitle: "Platform Engineer (Candidate)",
          requiredSkills: ["Terraform", "Go"],
          preferredSkills: ["Consul"],
        },
      };

      // 1. Student query (default allowReviewState: false)
      const studentResult = filterEnrichedStudentFeed([oppWithReviewState], { now });
      assert.equal(studentResult.totalCount, 1);
      const studentItem = studentResult.opportunities[0];
      assert.equal(studentItem.id, "opp_review_1");
      // Enrichment must be hidden from student!
      assert.equal(studentItem.enrichment, null);
      assert.deepEqual(studentItem.required_skills, []);

      // 2. Admin query (allowReviewState: true)
      const adminResult = filterEnrichedStudentFeed([oppWithReviewState], {
        now,
        allowReviewState: true,
      });
      assert.equal(adminResult.totalCount, 1);
      const adminItem = adminResult.opportunities[0];
      // Visible in admin context
      assert.ok(adminItem.enrichment != null);
      assert.equal(adminItem.enrichment?.status, "needs_review");
      assert.deepEqual(adminItem.required_skills, ["Terraform", "Go"]);
    });

    it("filters accurately by location and deadline", () => {
      // Filter by location
      const locResult = filterEnrichedStudentFeed(sampleDataset, {
        now,
        location: "remote",
      });
      assert.ok(locResult.totalCount >= 1);
      assert.ok(locResult.opportunities.every((o) => o.location.toLowerCase().includes("remote") || o.workMode === "remote"));

      // Filter by deadline before 20 days in future
      const targetDeadline = new Date(now.getTime() + 20 * 24 * 3600 * 1000);
      const deadlineResult = filterEnrichedStudentFeed(sampleDataset, {
        now,
        deadline: targetDeadline,
      });
      assert.ok(deadlineResult.totalCount >= 1);
    });
  });
});
