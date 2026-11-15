// src/lib/services/career-roles/__tests__/skillGap.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { SkillGapService } from "../skillGapService.ts";
import { RoleCatalogueService, OBSERVED_CAREER_ROLES } from "../roleCatalogueService.ts";

describe("Phase 5 Chunk 5.3: Skill Gap Analysis Service", () => {
  function createMockEnvironment() {
    const studentSkillsMap: Record<string, any[]> = {
      // student_full: all 4 required backend skills + 1 related
      student_full: [
        { id: "sk_1", userId: "student_full", name: "Node.js", confirmed: true, reviewStatus: "CONFIRMED", proficiency: "advanced" },
        { id: "sk_2", userId: "student_full", name: "Python", confirmed: true, reviewStatus: "CONFIRMED", proficiency: "intermediate" },
        { id: "sk_3", userId: "student_full", name: "SQL", confirmed: true, reviewStatus: "CONFIRMED", proficiency: "advanced" },
        { id: "sk_4", userId: "student_full", name: "PostgreSQL", confirmed: true, reviewStatus: "CONFIRMED", proficiency: "intermediate" },
        { id: "sk_5", userId: "student_full", name: "Docker", confirmed: true, reviewStatus: "CONFIRMED", proficiency: "beginner" },
      ],
      // student_partial: 2 of 4 required backend skills
      student_partial: [
        { id: "sk_p1", userId: "student_partial", name: "Python", confirmed: true, reviewStatus: "CONFIRMED", proficiency: "intermediate" },
        { id: "sk_p2", userId: "student_partial", name: "SQL", confirmed: true, reviewStatus: "CONFIRMED", proficiency: "beginner" },
      ],
      // student_empty: no skills
      student_empty: [],
      // student_unconfirmed: skills exist but are unconfirmed or rejected
      student_unconfirmed: [
        { id: "sk_u1", userId: "student_unconfirmed", name: "Node.js", confirmed: true, reviewStatus: "CONFIRMED", proficiency: "intermediate" },
        { id: "sk_u2", userId: "student_unconfirmed", name: "Python", confirmed: false, reviewStatus: "NEEDS_REVIEW", proficiency: null },
        { id: "sk_u3", userId: "student_unconfirmed", name: "SQL", confirmed: false, reviewStatus: "REJECTED", proficiency: null },
      ],
    };

    const studentInterestsMap: Record<string, any[]> = {
      student_full: [
        { id: "ci_1", userId: "student_full", targetRole: "Backend Engineer", domain: "software", priority: 1 },
      ],
      student_partial: [
        { id: "ci_2", userId: "student_partial", targetRole: "Backend Engineer", domain: "software", priority: 1 },
      ],
      student_empty: [],
      student_unconfirmed: [],
    };

    const mockCatalogueService: any = {
      getCatalogue: async () => OBSERVED_CAREER_ROLES,
    };

    const mockCareerRoleService: any = {
      getActiveOpportunityCounts: async () => ({
        role_backend_eng: 6,
        role_fullstack_eng: 3,
        role_software_eng: 25,
        role_ai_ml_eng: 2,
        role_data_eng: 1,
        role_data_scientist: 1,
        role_security_eng: 1,
        role_devops_cloud: 0,
      }),
    };

    const mockExtProfileService: any = {
      getStudentSkills: async (userId: string) => studentSkillsMap[userId] || [],
      getCareerInterests: async (userId: string) => studentInterestsMap[userId] || [],
    };

    const service = new SkillGapService(
      mockCatalogueService,
      mockCareerRoleService,
      mockExtProfileService
    );

    return { service, studentSkillsMap, studentInterestsMap };
  }

  describe("1. Full Skill Match (100% Readiness)", () => {
    it("reports 100% readiness and zero missing prerequisites when all core skills are verified", async () => {
      const { service } = createMockEnvironment();

      const result = await service.analyzeSkillGap("student_full", "role_backend_eng");

      assert.strictEqual(result.roleId, "role_backend_eng");
      assert.strictEqual(result.roleTitle, "Backend Engineer");
      assert.strictEqual(result.summary.readinessPercentage, 100);
      assert.strictEqual(result.summary.totalRequired, 4);
      assert.strictEqual(result.summary.acquiredPrerequisitesCount, 4);
      assert.strictEqual(result.missingPrerequisites.length, 0);

      // Verify all 4 required skills are in acquiredSkills
      const acquiredNames = result.acquiredSkills.map((s) => s.skillName);
      assert.ok(acquiredNames.includes("Node.js"));
      assert.ok(acquiredNames.includes("Python"));
      assert.ok(acquiredNames.includes("SQL"));
      assert.ok(acquiredNames.includes("PostgreSQL"));

      // Verify related skill Docker is also recognized as acquired competitive skill
      assert.ok(acquiredNames.includes("Docker"));
      const dockerItem = result.acquiredSkills.find((s) => s.skillName === "Docker");
      assert.strictEqual(dockerItem?.category, "Competitive");

      // Verify action plan encourages applying to openings since prerequisites are met
      assert.ok(result.actionPlan.some((act) => act.id === "act_ready_apply"));
    });
  });

  describe("2. Partial Skill Match", () => {
    it("reports 50% readiness and precisely isolates acquired vs missing prerequisites", async () => {
      const { service } = createMockEnvironment();

      const result = await service.analyzeSkillGap("student_partial", "role_backend_eng");

      assert.strictEqual(result.roleId, "role_backend_eng");
      assert.strictEqual(result.summary.totalRequired, 4);
      assert.strictEqual(result.summary.acquiredPrerequisitesCount, 2);
      assert.strictEqual(result.summary.missingPrerequisitesCount, 2);
      assert.strictEqual(result.summary.readinessPercentage, 50);

      // Acquired prerequisites: Python, SQL
      const acquiredNames = result.acquiredSkills.map((s) => s.skillName);
      assert.ok(acquiredNames.includes("Python"));
      assert.ok(acquiredNames.includes("SQL"));

      // Missing prerequisites: Node.js, PostgreSQL
      const missingNames = result.missingPrerequisites.map((s) => s.skillName);
      assert.ok(missingNames.includes("Node.js"));
      assert.ok(missingNames.includes("PostgreSQL"));

      // Action plan prioritizes missing prerequisites
      assert.ok(result.actionPlan.some((act) => act.type === "assessment" && act.priority === "Immediate"));
      assert.ok(result.actionPlan.some((act) => act.type === "project"));
    });
  });

  describe("3. Zero Skill Match (Empty Profile)", () => {
    it("reports 0% readiness and marks all prerequisites as missing with bridge steps", async () => {
      const { service } = createMockEnvironment();

      const result = await service.analyzeSkillGap("student_empty", "role_backend_eng");

      assert.strictEqual(result.summary.readinessPercentage, 0);
      assert.strictEqual(result.summary.acquiredPrerequisitesCount, 0);
      assert.strictEqual(result.summary.missingPrerequisitesCount, 4);
      assert.strictEqual(result.acquiredSkills.length, 0);
      assert.strictEqual(result.missingPrerequisites.length, 4);
    });
  });

  describe("4. Strict Invariant: Unconfirmed & Rejected Skills Exclusion", () => {
    it("never counts unconfirmed (NEEDS_REVIEW) or REJECTED skills as acquired competencies", async () => {
      const { service } = createMockEnvironment();

      // student_unconfirmed has Node.js (CONFIRMED), Python (NEEDS_REVIEW), SQL (REJECTED)
      const result = await service.analyzeSkillGap("student_unconfirmed", "role_backend_eng");

      // Only Node.js is confirmed -> 1 out of 4 = 25% readiness
      assert.strictEqual(result.summary.acquiredPrerequisitesCount, 1);
      assert.strictEqual(result.summary.readinessPercentage, 25);

      const acquired = result.acquiredSkills.map((s) => s.skillName);
      assert.deepStrictEqual(acquired, ["Node.js"]);

      // Python and SQL must be treated as missing prerequisites despite existing in profile
      const missing = result.missingPrerequisites.map((s) => s.skillName);
      assert.ok(missing.includes("Python"), "Unconfirmed skill must be classified as missing prerequisite");
      assert.ok(missing.includes("SQL"), "Rejected skill must be classified as missing prerequisite");
      assert.ok(missing.includes("PostgreSQL"));
    });
  });

  describe("5. Target Role Fallback & Selection", () => {
    it("defaults to student's top target role when roleId is omitted", async () => {
      const { service } = createMockEnvironment();

      // student_full has targetRole: "Backend Engineer"
      const result = await service.analyzeSkillGap("student_full", null);

      assert.strictEqual(result.roleId, "role_backend_eng");
      assert.strictEqual(result.roleTitle, "Backend Engineer");
      assert.strictEqual(result.isStudentTargetRole, true);
    });

    it("resolves role by canonical title string case-insensitively", async () => {
      const { service } = createMockEnvironment();

      const result = await service.analyzeSkillGap("student_full", "Fullstack Engineer");

      assert.strictEqual(result.roleId, "role_fullstack_eng");
      assert.strictEqual(result.roleTitle, "Fullstack Engineer");
    });
  });

  describe("6. Available Target Roles Listing", () => {
    it("returns active roles with accurate targeting indicator and active counts", async () => {
      const { service } = createMockEnvironment();

      const available = await service.getAvailableTargetRoles("student_full");

      assert.ok(available.length > 0);
      const backend = available.find((r) => r.id === "role_backend_eng");
      assert.ok(backend);
      assert.strictEqual(backend.isTargeted, true);
      assert.strictEqual(backend.activeOpportunityCount, 6);

      const fullstack = available.find((r) => r.id === "role_fullstack_eng");
      assert.ok(fullstack);
      assert.strictEqual(fullstack.isTargeted, false);
      assert.strictEqual(fullstack.activeOpportunityCount, 3);
    });
  });
});
