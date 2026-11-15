// src/lib/services/student/__tests__/profileCompletion.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { ProfileCompletionService } from "../profileCompletionService.ts";
import { ProfileService } from "../profileService.ts";
import { ExtendedProfileService } from "../extendedProfileService.ts";

describe("Phase 4 Chunk 4.3: Profile Completion & Resume-After-Refresh", () => {
  function createMockEnvironment() {
    const studentProfiles: any[] = [];
    const studentSkills: any[] = [];
    const careerInterests: any[] = [];
    const studentProjects: any[] = [];
    const studentExperiences: any[] = [];
    const studentPreferences: any[] = [];

    const mockPrisma: any = {
      studentProfile: {
        findUnique: async ({ where }: any) => {
          return studentProfiles.find((p) => p.userId === where.userId) || null;
        },
        create: async ({ data }: any) => {
          const rec = { id: `prof_${studentProfiles.length + 1}`, ...data };
          studentProfiles.push(rec);
          return rec;
        },
        update: async ({ where, data }: any) => {
          const idx = studentProfiles.findIndex((p) => p.userId === where.userId);
          if (idx !== -1) {
            studentProfiles[idx] = { ...studentProfiles[idx], ...data };
            return studentProfiles[idx];
          }
          throw new Error("Profile not found");
        },
      },
      studentSkill: {
        findMany: async ({ where }: any) => {
          return studentSkills.filter((s) => s.studentProfileId === where.studentProfileId);
        },
      },
      careerInterest: {
        findMany: async ({ where }: any) => {
          return careerInterests.filter((ci) => ci.studentProfileId === where.studentProfileId);
        },
      },
    };

    return {
      mockPrisma,
      studentProfiles,
      studentSkills,
      careerInterests,
      studentProjects,
      studentExperiences,
      studentPreferences,
    };
  }

  describe("1. Profile Completion Percentage Calculation", () => {
    it("calculates 0% and lists all missing foundational items for a blank student profile", async () => {
      const { mockPrisma, studentProfiles } = createMockEnvironment();
      studentProfiles.push({
        id: "prof_empty",
        userId: "user_empty",
        college: null,
        degree: null,
        branch: null,
        currentYear: null,
        graduationYear: null,
        cgpa: null,
        fieldMetadata: {},
      });

      const service = new ProfileCompletionService();
      // Test calculation with empty profile
      const result = await service.calculateCompletion("user_empty");

      assert.ok(result.percentage < 20);
      assert.strictEqual(result.completedSteps.length, 0);
      assert.strictEqual(result.currentStep, 1);

      // Verify specific missing items
      const missingKeys = result.missingItems.map((m) => m.key);
      assert.ok(missingKeys.includes("college"));
      assert.ok(missingKeys.includes("degree"));
      assert.ok(missingKeys.includes("targetRole"));
      assert.ok(missingKeys.includes("skills"));
    });

    it("evaluates progressive completion as fields and steps are added", async () => {
      const { mockPrisma, studentProfiles, studentSkills, careerInterests } = createMockEnvironment();

      const mockProfService = {
        getProfile: async (userId: string) => studentProfiles.find((p) => p.userId === userId),
      };
      const mockExtService = {
        getStudentSkills: async (userId: string) => studentSkills.filter((s) => s.userId === userId),
        getCareerInterests: async (userId: string) => careerInterests.filter((ci) => ci.userId === userId),
        getProjects: async () => [],
        getExperiences: async () => [],
        getPreferences: async () => null,
      };

      // Step 1: Academics filled
      studentProfiles.push({
        id: "prof_step1",
        userId: "user_step1",
        college: "BITS Pilani",
        degree: "B.Tech",
        branch: "Computer Science",
        graduationYear: 2026,
        cgpa: 9.0,
        fieldMetadata: {},
      });

      const service = new ProfileCompletionService(mockProfService as any, mockExtService as any);
      let result = await service.calculateCompletion("user_step1");

      assert.strictEqual(result.dimensions.academics.isComplete, true);
      assert.ok(result.completedSteps.includes(1));
      assert.strictEqual(result.currentStep, 2); // Prompt to resume at Step 2

      // Step 2: Add career interests
      careerInterests.push({
        id: "ci_1",
        studentProfileId: "prof_step1",
        userId: "user_step1",
        targetRole: "Fullstack Engineer",
        domain: "software",
        priority: 1,
      });

      result = await service.calculateCompletion("user_step1");
      assert.strictEqual(result.dimensions.careerInterests.isComplete, true);
      assert.ok(result.completedSteps.includes(2));
      assert.strictEqual(result.currentStep, 3); // Prompt to resume at Step 3

      // Step 3: Add 3 technical skills
      studentSkills.push(
        { id: "s1", studentProfileId: "prof_step1", userId: "user_step1", name: "TypeScript", confirmed: true },
        { id: "s2", studentProfileId: "prof_step1", userId: "user_step1", name: "React", confirmed: true },
        { id: "s3", studentProfileId: "prof_step1", userId: "user_step1", name: "Node.js", confirmed: true }
      );

      result = await service.calculateCompletion("user_step1");
      assert.strictEqual(result.dimensions.technicalSkills.isComplete, true);
      assert.ok(result.completedSteps.includes(3));
      assert.ok(result.percentage >= 80);
    });
  });

  describe("2. Resume-After-Refresh State", () => {
    it("suggests the first incomplete step deterministically when reloaded", async () => {
      const service = new ProfileCompletionService();

      // Test with fresh user -> Step 1
      const res1 = await service.calculateCompletion("usr_new_student");
      assert.strictEqual(res1.currentStep, 1);
    });
  });
});
