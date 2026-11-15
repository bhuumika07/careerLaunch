// src/lib/services/student/__tests__/extendedProfile.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  ExtendedProfileService,
  CareerInterestsPayloadSchema,
  StudentSkillInputSchema,
} from "../extendedProfileService.ts";
import { ProfileService } from "../profileService.ts";

describe("Phase 4 Chunk 4.2: Skills, Interests, Projects, Experience, Preferences", () => {
  function createMockPrisma() {
    const skills = [
      { id: "sk_ts", canonicalName: "TypeScript", type: "technical", category: "programming_language" },
      { id: "sk_react", canonicalName: "React", type: "technical", category: "framework" },
      { id: "sk_pg", canonicalName: "PostgreSQL", type: "technical", category: "database" },
    ];
    const skillAliases = [
      { id: "ska_1", skillId: "sk_ts", alias: "ts" },
      { id: "ska_2", skillId: "sk_ts", alias: "typescript" },
      { id: "ska_3", skillId: "sk_react", alias: "reactjs" },
      { id: "ska_4", skillId: "sk_pg", alias: "postgres" },
    ];

    const profiles = [
      { id: "prof_alice", userId: "user_alice", fieldMetadata: {} },
      { id: "prof_bob", userId: "user_bob", fieldMetadata: {} },
    ];

    const studentSkills: any[] = [];
    const careerInterests: any[] = [];

    const mockPrisma: any = {
      skill: {
        findFirst: async ({ where }: any) => {
          return skills.find(
            (s) => s.canonicalName.toLowerCase() === where.canonicalName?.equals?.toLowerCase()
          ) || null;
        },
      },
      skillAlias: {
        findFirst: async ({ where }: any) => {
          const alias = skillAliases.find(
            (a) => a.alias.toLowerCase() === where.alias?.equals?.toLowerCase()
          );
          if (!alias) return null;
          const skill = skills.find((s) => s.id === alias.skillId);
          return { ...alias, skill };
        },
      },
      studentProfile: {
        findUnique: async ({ where }: any) => {
          return profiles.find((p) => p.userId === where.userId) || null;
        },
        create: async ({ data }: any) => {
          const newProf = { id: `prof_${profiles.length + 1}`, ...data };
          profiles.push(newProf);
          return newProf;
        },
      },
      studentSkill: {
        findFirst: async ({ where }: any) => {
          return studentSkills.find((ss) => {
            if (ss.studentProfileId !== where.studentProfileId) return false;
            if (where.skillId && ss.skillId === where.skillId) return true;
            if (where.rawSkillName?.equals && ss.rawSkillName?.toLowerCase() === where.rawSkillName.equals.toLowerCase()) return true;
            return false;
          }) || null;
        },
        create: async ({ data }: any) => {
          const rec = { id: `ss_${studentSkills.length + 1}`, ...data, createdAt: new Date() };
          studentSkills.push(rec);
          return rec;
        },
        update: async ({ where, data }: any) => {
          const idx = studentSkills.findIndex((ss) => ss.id === where.id);
          if (idx === -1) throw new Error("Not found");
          studentSkills[idx] = { ...studentSkills[idx], ...data, updatedAt: new Date() };
          return studentSkills[idx];
        },
        findMany: async ({ where }: any) => {
          return studentSkills.filter((ss) => ss.studentProfileId === where.studentProfileId);
        },
      },
      careerInterest: {
        findMany: async ({ where }: any) => {
          return careerInterests
            .filter((ci) => ci.studentProfileId === where.studentProfileId)
            .sort((a, b) => a.priority - b.priority);
        },
        deleteMany: async ({ where }: any) => {
          const before = careerInterests.length;
          const filtered = careerInterests.filter((ci) => ci.studentProfileId !== where.studentProfileId);
          careerInterests.length = 0;
          careerInterests.push(...filtered);
          return { count: before - filtered.length };
        },
        createMany: async ({ data }: any) => {
          for (const item of data) {
            careerInterests.push({ id: `ci_${careerInterests.length + 1}`, ...item, createdAt: new Date() });
          }
          return { count: data.length };
        },
      },
    };

    return mockPrisma;
  }

  describe("1. Skill Alias Resolution", () => {
    it("resolves canonical skills and aliases deterministically", async () => {
      const mockPrisma = createMockPrisma();
      const service = new ExtendedProfileService(mockPrisma);

      // Direct canonical name match
      const direct = await service.resolveSkill("TypeScript");
      assert.strictEqual(direct.reviewStatus, "CONFIRMED");
      assert.strictEqual(direct.canonicalName, "TypeScript");
      assert.strictEqual(direct.skillId, "sk_ts");

      // Alias match: 'ts' -> TypeScript
      const alias1 = await service.resolveSkill("ts");
      assert.strictEqual(alias1.reviewStatus, "CONFIRMED");
      assert.strictEqual(alias1.canonicalName, "TypeScript");
      assert.strictEqual(alias1.skillId, "sk_ts");

      // Alias match: 'reactjs' -> React
      const alias2 = await service.resolveSkill("reactjs");
      assert.strictEqual(alias2.reviewStatus, "CONFIRMED");
      assert.strictEqual(alias2.canonicalName, "React");

      // Alias match: 'postgres' -> PostgreSQL
      const alias3 = await service.resolveSkill("postgres");
      assert.strictEqual(alias3.reviewStatus, "CONFIRMED");
      assert.strictEqual(alias3.canonicalName, "PostgreSQL");
    });

    it("sends unknown skills to review state rather than silently creating fake canonical skills", async () => {
      const mockPrisma = createMockPrisma();
      const service = new ExtendedProfileService(mockPrisma);

      const unknown = await service.resolveSkill("ZeroKnowledgeProofSystems");
      assert.strictEqual(unknown.reviewStatus, "NEEDS_REVIEW");
      assert.strictEqual(unknown.skillId, null);
      assert.strictEqual(unknown.canonicalName, "ZeroKnowledgeProofSystems");
    });
  });

  describe("2. Duplicate Skill Handling", () => {
    it("updates existing skill instead of inserting a duplicate when adding alias", async () => {
      const mockPrisma = createMockPrisma();
      const service = new ExtendedProfileService(mockPrisma);

      // Add "TypeScript" initially
      const added1 = await service.addOrUpdateStudentSkill("user_alice", {
        name: "TypeScript",
        proficiency: "intermediate",
        yearsExperience: 1,
      });
      assert.strictEqual(added1.name, "TypeScript");
      assert.strictEqual(added1.proficiency, "intermediate");

      // Now add with alias "ts" and higher proficiency
      const updated = await service.addOrUpdateStudentSkill("user_alice", {
        name: "ts",
        proficiency: "advanced",
        yearsExperience: 2,
      });

      assert.strictEqual(updated.name, "TypeScript");
      assert.strictEqual(updated.proficiency, "advanced");
      assert.strictEqual(updated.yearsExperience, 2);

      // Verify no duplicate in list
      const allSkills = await service.getStudentSkills("user_alice");
      assert.strictEqual(allSkills.length, 1);
      assert.strictEqual(allSkills[0].proficiency, "advanced");
    });
  });

  describe("3. Ownership Checks & Career Interests", () => {
    it("isolates career interests between different student users", async () => {
      const mockPrisma = createMockPrisma();
      const service = new ExtendedProfileService(mockPrisma);

      // Alice updates her career interests
      await service.updateCareerInterests("user_alice", {
        interests: [
          { targetRole: "Fullstack Engineer", domain: "software", priority: 1 },
          { targetRole: "Frontend Developer", domain: "software", priority: 2 },
        ],
      });

      // Bob updates his career interests
      await service.updateCareerInterests("user_bob", {
        interests: [
          { targetRole: "Data Scientist", domain: "data_ai_ml", priority: 1 },
        ],
      });

      // Alice reads only her own
      const aliceInterests = await service.getCareerInterests("user_alice");
      assert.strictEqual(aliceInterests.length, 2);
      assert.strictEqual(aliceInterests[0].targetRole, "Fullstack Engineer");
      assert.strictEqual(aliceInterests[1].targetRole, "Frontend Developer");

      // Bob reads only his own
      const bobInterests = await service.getCareerInterests("user_bob");
      assert.strictEqual(bobInterests.length, 1);
      assert.strictEqual(bobInterests[0].targetRole, "Data Scientist");
    });

    it("validates career interest schema rejecting missing role or domain", () => {
      const valid = CareerInterestsPayloadSchema.safeParse({
        interests: [
          { targetRole: "DevOps Engineer", domain: "devops_cloud", priority: 1 },
        ],
      });
      assert.strictEqual(valid.success, true);

      const invalidMissingRole = CareerInterestsPayloadSchema.safeParse({
        interests: [
          { targetRole: "", domain: "software", priority: 1 },
        ],
      });
      assert.strictEqual(invalidMissingRole.success, false);
    });
  });
});
