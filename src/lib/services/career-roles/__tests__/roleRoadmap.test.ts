// src/lib/services/career-roles/__tests__/roleRoadmap.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { RoleRoadmapService } from "../roleRoadmapService.ts";
import { RoleCatalogueService, OBSERVED_CAREER_ROLES } from "../roleCatalogueService.ts";

describe("Phase 5 Chunk 5.4: Role-Specific Learning Roadmap Service", () => {
  function createMockEnvironment() {
    const studentSkillsMap: Record<string, any[]> = {
      // student_with_be_basics: has Node.js, Python, REST APIs confirmed
      student_with_be_basics: [
        { id: "sk_1", userId: "student_with_be_basics", name: "Node.js", confirmed: true, reviewStatus: "CONFIRMED" },
        { id: "sk_2", userId: "student_with_be_basics", name: "Python", confirmed: true, reviewStatus: "CONFIRMED" },
        { id: "sk_3", userId: "student_with_be_basics", name: "REST APIs", confirmed: true, reviewStatus: "CONFIRMED" },
      ],
      // student_unconfirmed: has Node.js confirmed, but Python unconfirmed
      student_unconfirmed: [
        { id: "sk_u1", userId: "student_unconfirmed", name: "Node.js", confirmed: true, reviewStatus: "CONFIRMED" },
        { id: "sk_u2", userId: "student_unconfirmed", name: "Python", confirmed: false, reviewStatus: "NEEDS_REVIEW" },
        { id: "sk_u3", userId: "student_unconfirmed", name: "REST APIs", confirmed: true, reviewStatus: "CONFIRMED" },
      ],
      // student_empty: no skills
      student_empty: [],
    };

    const studentInterestsMap: Record<string, any[]> = {
      student_with_be_basics: [
        { id: "ci_1", userId: "student_with_be_basics", targetRole: "Backend Engineer", domain: "software", priority: 1 },
      ],
      student_unconfirmed: [
        { id: "ci_2", userId: "student_unconfirmed", targetRole: "Backend Engineer", domain: "software", priority: 1 },
      ],
      student_empty: [],
    };

    const mockCatalogueService: any = {
      getCatalogue: async () => OBSERVED_CAREER_ROLES,
    };

    const mockExtProfileService: any = {
      getStudentSkills: async (userId: string) => studentSkillsMap[userId] || [],
      getCareerInterests: async (userId: string) => studentInterestsMap[userId] || [],
    };

    const mockDbStore = { roadmaps: [] };

    const service = new RoleRoadmapService(
      mockCatalogueService,
      mockExtProfileService,
      mockDbStore
    );

    return { service, studentSkillsMap, studentInterestsMap };
  }

  describe("1. Role-Specific Curriculum & Milestones", () => {
    it("generates structured sequenced milestones tailored for Backend Engineer", async () => {
      const { service } = createMockEnvironment();

      const { roadmap } = await service.getUserRoadmap("student_empty", "role_backend_eng");

      assert.strictEqual(roadmap.careerRoleId, "role_backend_eng");
      assert.strictEqual(roadmap.careerRoleTitle, "Backend Engineer");
      assert.strictEqual(roadmap.modules.length, 4);

      // Verify module 1 covers Node.js, Python, REST APIs
      const mod1 = roadmap.modules[0];
      assert.strictEqual(mod1.order, 1);
      assert.ok(mod1.skillsCovered.includes("Node.js"));
      assert.ok(mod1.skillsCovered.includes("Python"));
      assert.ok(mod1.project.technologies.includes("Node.js"));

      // Verify module 2 covers SQL, PostgreSQL
      const mod2 = roadmap.modules[1];
      assert.strictEqual(mod2.order, 2);
      assert.ok(mod2.skillsCovered.includes("SQL"));
      assert.ok(mod2.skillsCovered.includes("PostgreSQL"));
    });

    it("generates structured milestones tailored for Fullstack Engineer", async () => {
      const { service } = createMockEnvironment();

      const { roadmap } = await service.getUserRoadmap("student_empty", "role_fullstack_eng");

      assert.strictEqual(roadmap.careerRoleId, "role_fullstack_eng");
      assert.strictEqual(roadmap.careerRoleTitle, "Fullstack Engineer");
      assert.ok(roadmap.modules.length >= 3);

      const mod1 = roadmap.modules[0];
      assert.ok(mod1.skillsCovered.includes("React"));
      assert.ok(mod1.skillsCovered.includes("TypeScript"));
    });
  });

  describe("2. Dynamic Milestone Completion from Verified Student Skills", () => {
    it("automatically completes module 1 when student has verified all covered skills", async () => {
      const { service } = createMockEnvironment();

      const { roadmap, adjustments } = await service.getUserRoadmap(
        "student_with_be_basics",
        "role_backend_eng"
      );

      const mod1 = roadmap.modules[0];
      assert.strictEqual(mod1.status, "completed");
      assert.strictEqual(mod1.autoCompleted, true);

      // Subsequent module 2 should now be "ongoing"
      const mod2 = roadmap.modules[1];
      assert.strictEqual(mod2.status, "ongoing");

      // Verify milestone stats updated
      assert.strictEqual(roadmap.milestonesCompleted, 1);
      assert.strictEqual(roadmap.progressPercentage, 25); // 1 of 4 modules = 25%

      // Verify adjustment notice was issued
      assert.ok(adjustments.length > 0);
      assert.ok(adjustments.some((adj) => adj.moduleId === mod1.id && adj.newStatus === "completed"));
    });

    it("strict invariant: unconfirmed skills do NOT trigger auto-completion", async () => {
      const { service } = createMockEnvironment();

      const { roadmap } = await service.getUserRoadmap(
        "student_unconfirmed",
        "role_backend_eng"
      );

      // Python is unconfirmed (NEEDS_REVIEW), so module 1 should NOT be completed
      const mod1 = roadmap.modules[0];
      assert.strictEqual(mod1.status, "ongoing");
      assert.strictEqual(mod1.autoCompleted, undefined);
      assert.strictEqual(roadmap.milestonesCompleted, 0);
      assert.strictEqual(roadmap.progressPercentage, 0);
    });
  });

  describe("3. Target Role Selection & Default Fallback", () => {
    it("defaults to student's top target role when roleId is omitted", async () => {
      const { service } = createMockEnvironment();

      // student_with_be_basics has targetRole: "Backend Engineer"
      const { roadmap } = await service.getUserRoadmap("student_with_be_basics", null);

      assert.ok(roadmap);
      assert.strictEqual(roadmap.careerRoleId, "role_backend_eng");
      assert.strictEqual(roadmap.careerRoleTitle, "Backend Engineer");
    });

    it("returns null roadmap when student has no target role and roleId is omitted (never invents default role)", async () => {
      const { service } = createMockEnvironment();

      // student_empty has no target role
      const { roadmap, availableRoles } = await service.getUserRoadmap("student_empty", null);

      assert.strictEqual(roadmap, null);
      assert.ok(availableRoles.length > 0);
    });
  });

  describe("4. Manual Milestone Status Updates & Project Deliverables", () => {
    it("updates module status manually and provides project details for portfolio", async () => {
      const { service } = createMockEnvironment();

      // Initialize roadmap for student
      await service.getUserRoadmap("student_empty", "role_backend_eng");

      const updateResult = await service.updateModuleStatus(
        "student_empty",
        "be_mod_1",
        "completed"
      );

      assert.strictEqual(updateResult.roadmap.milestonesCompleted, 1);
      assert.strictEqual(updateResult.roadmap.progressPercentage, 25);
      assert.ok(updateResult.completedProject);
      assert.strictEqual(updateResult.completedProject?.id, "be_proj_1");
      assert.ok(updateResult.completedProject?.deliverables.includes("Git repository"));
    });
  });
});
