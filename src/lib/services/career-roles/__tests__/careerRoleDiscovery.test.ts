// src/lib/services/career-roles/__tests__/careerRoleDiscovery.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { CareerRoleService } from "../careerRoleService.ts";
import { RoleCatalogueService, OBSERVED_CAREER_ROLES } from "../roleCatalogueService.ts";

describe("Phase 5 Chunk 5.2: Career Role Discovery Service", () => {
  function createMockEnvironment() {
    const studentProfiles: any[] = [
      {
        id: "prof_student_1",
        userId: "student_tech",
        college: "BITS Pilani",
        degree: "B.Tech",
        branch: "Computer Science",
        graduationYear: 2026,
        cgpa: 9.1,
      },
      {
        id: "prof_student_2",
        userId: "student_empty",
        college: null,
        degree: null,
        branch: null,
      },
    ];

    const studentSkills: any[] = [
      {
        id: "sk_1",
        userId: "student_tech",
        name: "Python",
        confirmed: true,
        reviewStatus: "CONFIRMED",
      },
      {
        id: "sk_2",
        userId: "student_tech",
        name: "SQL",
        confirmed: true,
        reviewStatus: "CONFIRMED",
      },
      {
        id: "sk_3",
        userId: "student_tech",
        name: "PostgreSQL",
        confirmed: true,
        reviewStatus: "CONFIRMED",
      },
      {
        id: "sk_4",
        userId: "student_tech",
        name: "Node.js",
        confirmed: true,
        reviewStatus: "CONFIRMED",
      },
      {
        id: "sk_unconfirmed",
        userId: "student_tech",
        name: "Kubernetes",
        confirmed: false,
        reviewStatus: "NEEDS_REVIEW",
      },
    ];

    let careerInterests: any[] = [
      {
        id: "ci_1",
        userId: "student_tech",
        targetRole: "Backend Engineer",
        domain: "software",
        priority: 1,
      },
    ];

    const projects: any[] = [
      {
        id: "proj_1",
        userId: "student_tech",
        title: "High Throughput REST API",
        technologies: ["Node.js", "PostgreSQL", "Redis"],
      },
    ];

    // Opportunities: Some roles have active openings, one role has zero
    const opportunities: any[] = [
      { id: "opp_1", title: "Backend Engineer", status: "ACTIVE", careerRoleId: "role_backend_eng" },
      { id: "opp_2", title: "Senior Software Engineer, Backend", status: "ACTIVE", careerRoleId: "role_backend_eng" },
      { id: "opp_3", title: "Fullstack Engineer", status: "ACTIVE", careerRoleId: "role_fullstack_eng" },
      { id: "opp_4", title: "AI Engineer, Internal Tools", status: "ACTIVE", careerRoleId: "role_ai_ml_eng" },
      { id: "opp_5", title: "Data Scientist", status: "ACTIVE", careerRoleId: "role_data_scientist" },
      { id: "opp_6", title: "Security Engineer", status: "ACTIVE", careerRoleId: "role_security_eng" },
      // Note: role_devops_cloud has ZERO active opportunities
    ];

    const mockProfileService: any = {
      getProfile: async (userId: string) => {
        const found = studentProfiles.find((p) => p.userId === userId);
        if (!found) throw new Error("Profile not found");
        return found;
      },
    };

    const mockExtProfileService: any = {
      getStudentSkills: async (userId: string) => studentSkills.filter((s) => s.userId === userId),
      getCareerInterests: async (userId: string) => careerInterests.filter((ci) => ci.userId === userId),
      getProjects: async (userId: string) => projects.filter((p) => p.userId === userId),
      updateCareerInterests: async (userId: string, payload: any) => {
        careerInterests = payload.interests.map((ci: any, idx: number) => ({
          id: `ci_${idx + 1}`,
          userId,
          targetRole: ci.targetRole,
          domain: ci.domain,
          priority: ci.priority,
        }));
        return careerInterests;
      },
    };

    const mockCatalogueService: any = {
      getCatalogue: async () => OBSERVED_CAREER_ROLES,
    };

    const mockPrisma: any = {
      opportunity: {
        findMany: async () => opportunities,
      },
    };

    const service = new CareerRoleService(
      mockPrisma,
      mockCatalogueService,
      mockProfileService,
      mockExtProfileService
    );

    return {
      service,
      opportunities,
      careerInterests,
    };
  }

  describe("1. Scoring and Recommendations", () => {
    it("scores roles based on confirmed skills, academics, projects, and expressed interest", async () => {
      const { service } = createMockEnvironment();

      const res = await service.getRecommendations("student_tech");

      assert.ok(res.recommendations.length > 0);
      const topRole = res.recommendations[0];

      // Top recommendation should be Backend Engineer due to 4/4 required skills matched + project + interest
      assert.strictEqual(topRole.canonicalName, "Backend Engineer");
      assert.strictEqual(topRole.roleId, "role_backend_eng");
      assert.ok(topRole.matchScore >= 80, `Expected matchScore >= 80, got ${topRole.matchScore}`);
      assert.strictEqual(topRole.isSelected, true);

      // Verifies matched skills contain confirmed skills
      assert.ok(topRole.matchedSkills.includes("Node.js"));
      assert.ok(topRole.matchedSkills.includes("PostgreSQL"));
      assert.ok(topRole.matchedSkills.includes("Python"));
      assert.ok(topRole.matchedSkills.includes("SQL"));

      // Unconfirmed skill (Kubernetes) must not be counted as matched
      assert.strictEqual(topRole.matchedSkills.includes("Kubernetes"), false);

      // Verifies reasons explain the match truthfully
      assert.ok(topRole.reasons.some((r) => r.includes("confirmed skills")));
      assert.ok(topRole.reasons.some((r) => r.includes("Backend Engineer")));
      assert.ok(topRole.reasons.some((r) => r.includes("Computer Science")));
      assert.ok(topRole.reasons.some((r) => r.includes("project work")));
      assert.ok(topRole.reasons.some((r) => r.includes("2 verified active openings")));
    });

    it("provides baseline recommendations for a student with an empty profile", async () => {
      const { service } = createMockEnvironment();

      const res = await service.getRecommendations("student_empty");
      assert.ok(res.recommendations.length > 0);

      // All returned roles should have active openings
      for (const rec of res.recommendations) {
        assert.ok(rec.activeOpportunityCount > 0);
      }
    });
  });

  describe("2. Strict Invariant: Zero Active Opportunities Exclusion", () => {
    it("never recommends roles that have zero active opportunities", async () => {
      const { service } = createMockEnvironment();

      const res = await service.getRecommendations("student_tech");

      // In the mock environment, role_devops_cloud has zero active opportunities
      const devopsRec = res.recommendations.find(
        (r) => r.roleId === "role_devops_cloud" || r.canonicalName.includes("DevOps")
      );
      assert.strictEqual(
        devopsRec,
        undefined,
        "Role with zero active opportunities must be excluded from recommendations"
      );

      // Verify every single recommendation has activeOpportunityCount > 0
      for (const rec of res.recommendations) {
        assert.ok(
          rec.activeOpportunityCount > 0,
          `Role ${rec.canonicalName} has invalid opportunity count ${rec.activeOpportunityCount}`
        );
      }
    });
  });

  describe("3. Active Opportunity Count Accuracy", () => {
    it("accurately reports the number of verified active opportunities for each recommended role", async () => {
      const { service } = createMockEnvironment();

      const res = await service.getRecommendations("student_tech");

      const backendRole = res.recommendations.find((r) => r.roleId === "role_backend_eng");
      assert.ok(backendRole);
      // In mock environment: 2 backend openings
      assert.strictEqual(backendRole.activeOpportunityCount, 2);

      const aiRole = res.recommendations.find((r) => r.roleId === "role_ai_ml_eng");
      assert.ok(aiRole);
      // In mock environment: 1 AI opening
      assert.strictEqual(aiRole.activeOpportunityCount, 1);
    });
  });

  describe("4. Target Role Selection & Persistence", () => {
    it("toggles target role selection and updates career interests", async () => {
      const { service } = createMockEnvironment();

      // Student targets Fullstack Engineer
      const updated = await service.setRoleTarget("student_tech", "role_fullstack_eng", true);
      assert.ok(updated.some((ci) => ci.targetRole === "Fullstack Engineer"));

      // Verify recommendations reflect isSelected = true for Fullstack Engineer
      const res = await service.getRecommendations("student_tech");
      const fullstackRole = res.recommendations.find((r) => r.roleId === "role_fullstack_eng");
      assert.ok(fullstackRole);
      assert.strictEqual(fullstackRole.isSelected, true);

      // Student untargets Fullstack Engineer
      const untargeted = await service.setRoleTarget("student_tech", "role_fullstack_eng", false);
      assert.strictEqual(untargeted.some((ci) => ci.targetRole === "Fullstack Engineer"), false);

      const resAfter = await service.getRecommendations("student_tech");
      const fullstackAfter = resAfter.recommendations.find((r) => r.roleId === "role_fullstack_eng");
      assert.ok(fullstackAfter);
      assert.strictEqual(fullstackAfter.isSelected, false);
    });
  });

  describe("5. Filters (Domain & MinScore)", () => {
    it("filters recommendations by domain", async () => {
      const { service } = createMockEnvironment();

      const resSoftware = await service.getRecommendations("student_tech", { domain: "software" });
      for (const rec of resSoftware.recommendations) {
        assert.strictEqual(rec.domain, "software");
      }

      const resData = await service.getRecommendations("student_tech", { domain: "data_ai_ml" });
      for (const rec of resData.recommendations) {
        assert.strictEqual(rec.domain, "data_ai_ml");
      }
    });

    it("filters recommendations by minScore", async () => {
      const { service } = createMockEnvironment();

      const res = await service.getRecommendations("student_tech", { minScore: 60 });
      for (const rec of res.recommendations) {
        assert.ok(rec.matchScore >= 60);
      }
    });
  });
});
