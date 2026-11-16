// tests/student/skillsAndExperiencePhase2c.test.ts
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  ExtendedProfileService,
  StudentSkillInputSchema,
  KNOWN_CANONICAL_SKILLS,
} from "../../src/lib/services/student/extendedProfileService.ts";
import {
  ProfileCompletionService,
} from "../../src/lib/services/student/profileCompletionService.ts";
import {
  StudentProfileInputSchema,
  ProfileService,
} from "../../src/lib/services/student/profileService.ts";

describe("Phase 2C: Skills, Projects, and Experience (Steps 3 & 4)", () => {
  let mockPrisma: any;
  let profileDb: Record<string, any>;
  let interestsDb: any[];
  let skillsDb: any[];
  let canonicalSkillsDb: any[];
  let skillAliasesDb: any[];
  let projectsDb: any[];
  let experienceDb: any[];
  let extendedProfileService: ExtendedProfileService;

  beforeEach(() => {
    profileDb = {};
    interestsDb = [];
    skillsDb = [];
    projectsDb = [];
    experienceDb = [];

    // Prepopulate some canonical skills and aliases in mock database
    canonicalSkillsDb = [
      { id: "c-node", name: "Node.js", category: "backend" },
      { id: "c-react", name: "React", category: "frontend" },
      { id: "c-python", name: "Python", category: "programming_languages" },
      { id: "c-postgres", name: "PostgreSQL", category: "databases" },
      { id: "c-docker", name: "Docker", category: "cloud_devops" },
    ];

    skillAliasesDb = [
      { id: "a1", alias: "node", skillId: "c-node" },
      { id: "a2", alias: "nodejs", skillId: "c-node" },
      { id: "a3", alias: "node.js", skillId: "c-node" },
      { id: "a4", alias: "reactjs", skillId: "c-react" },
      { id: "a5", alias: "postgres", skillId: "c-postgres" },
    ];

    mockPrisma = {
      studentProfile: {
        findUnique: async ({ where }: any) => {
          if (where.userId) return profileDb[where.userId] || null;
          if (where.id) return Object.values(profileDb).find((p: any) => p.id === where.id) || null;
          return null;
        },
        create: async ({ data }: any) => {
          const record = {
            id: `prof_${Date.now()}`,
            onboardingStatus: "IN_PROGRESS",
            onboardingStep: 3,
            profileVersion: 1,
            lastCompletedAt: null,
            lastUpdatedBy: "STUDENT",
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          profileDb[data.userId] = record;
          return record;
        },
        update: async ({ where, data }: any) => {
          const profile = profileDb[where.userId] || Object.values(profileDb).find((p: any) => p.id === where.id);
          if (!profile) throw new Error("Profile not found");
          Object.assign(profile, data, { updatedAt: new Date() });
          return profile;
        },
      },
      skill: {
        findFirst: async ({ where }: any) => {
          const name = where.name?.equals?.toLowerCase() || where.name?.toLowerCase();
          return canonicalSkillsDb.find((s) => s.name.toLowerCase() === name) || null;
        },
        findMany: async ({ where }: any) => {
          if (where?.category) {
            return canonicalSkillsDb.filter((s) => s.category === where.category);
          }
          return canonicalSkillsDb;
        },
        create: async ({ data }: any) => {
          // Track any unauthorized creation
          const record = { id: `c_${Date.now()}`, ...data };
          canonicalSkillsDb.push(record);
          return record;
        },
      },
      skillAlias: {
        findFirst: async ({ where, include }: any) => {
          const alias = where.alias?.equals?.toLowerCase() || where.alias?.toLowerCase();
          const match = skillAliasesDb.find((a) => a.alias.toLowerCase() === alias);
          if (!match) return null;
          if (include?.skill) {
            return {
              ...match,
              skill: canonicalSkillsDb.find((s) => s.id === match.skillId),
            };
          }
          return match;
        },
      },
      studentSkill: {
        findFirst: async ({ where }: any) => {
          return skillsDb.find(
            (s) =>
              s.studentProfileId === where.studentProfileId &&
              (s.skillId === where.skillId ||
                (where.rawSkillName && s.rawSkillName?.toLowerCase() === where.rawSkillName.toLowerCase()))
          ) || null;
        },
        findMany: async ({ where }: any) => {
          return skillsDb.filter((s) => s.studentProfileId === where.studentProfileId);
        },
        create: async ({ data }: any) => {
          const record = { id: `ss_${Date.now()}_${Math.random()}`, ...data };
          skillsDb.push(record);
          return record;
        },
        update: async ({ where, data }: any) => {
          const idx = skillsDb.findIndex((s) => s.id === where.id);
          if (idx === -1) throw new Error("StudentSkill not found");
          skillsDb[idx] = { ...skillsDb[idx], ...data };
          return skillsDb[idx];
        },
        delete: async ({ where }: any) => {
          const idx = skillsDb.findIndex((s) => s.id === where.id);
          if (idx !== -1) skillsDb.splice(idx, 1);
          return { id: where.id };
        },
        deleteMany: async ({ where }: any) => {
          const initialLen = skillsDb.length;
          skillsDb = skillsDb.filter((s) => s.studentProfileId !== where.studentProfileId);
          return { count: initialLen - skillsDb.length };
        },
      },
      careerInterest: {
        findMany: async ({ where }: any) => interestsDb.filter((i) => i.studentProfileId === where.studentProfileId),
      },
    };

    extendedProfileService = new ExtendedProfileService(mockPrisma);
  });

  describe("1. Canonical Skill & Alias Resolution", () => {
    it("resolves canonical skill and known aliases correctly", async () => {
      const p1 = await extendedProfileService.resolveSkill("NodeJS");
      assert.strictEqual(p1.skillId, "c-node");
      assert.strictEqual(p1.canonicalName, "Node.js");
      assert.strictEqual(p1.reviewStatus, "AUTO_RESOLVED");

      const p2 = await extendedProfileService.resolveSkill("node.js");
      assert.strictEqual(p2.skillId, "c-node");
      assert.strictEqual(p2.canonicalName, "Node.js");

      const p3 = await extendedProfileService.resolveSkill("ReactJS");
      assert.strictEqual(p3.skillId, "c-react");
      assert.strictEqual(p3.canonicalName, "React");
    });

    it("resolves built-in fallback canonical skills when DB aliases are missing", async () => {
      const p = await extendedProfileService.resolveSkill("py");
      assert.strictEqual(p.canonicalName, "Python");
      assert.strictEqual(p.category, "programming_languages");
    });

    it("handles free-text unmatched skills as NEEDS_REVIEW without creating canonical rows", async () => {
      const initialCanonicalCount = canonicalSkillsDb.length;

      const unmatched = await extendedProfileService.resolveSkill("CustomProprietaryTechX");
      assert.strictEqual(unmatched.skillId, null);
      assert.strictEqual(unmatched.canonicalName, null);
      assert.strictEqual(unmatched.rawSkillName, "CustomProprietaryTechX");
      assert.strictEqual(unmatched.reviewStatus, "NEEDS_REVIEW");

      // Invariant: No new canonical Skill entry created silently
      assert.strictEqual(canonicalSkillsDb.length, initialCanonicalCount);
    });
  });

  describe("2. Verification State Invariants (Self-reported NEVER becomes verified)", () => {
    it("forces verificationState to CONFIRMED or SELF_REPORTED even if VERIFIED was submitted", async () => {
      // Create student profile first
      profileDb["user_skill_1"] = {
        id: "prof_skill_1",
        userId: "user_skill_1",
        onboardingStatus: "IN_PROGRESS",
        profileVersion: 1,
      };

      const result = await extendedProfileService.addOrUpdateStudentSkill("user_skill_1", {
        skillName: "Node.js",
        proficiency: "EXPERT",
        experienceYears: 3,
        // Attempting to inject VERIFIED maliciously or via student form:
        verificationState: "VERIFIED" as any,
        source: "STUDENT_ENTERED",
      });

      assert.notStrictEqual(result.verificationState, "VERIFIED");
      assert.strictEqual(result.verificationState, "CONFIRMED");
      assert.strictEqual(result.source, "STUDENT_ENTERED");
      assert.strictEqual(result.experienceMonths, 36);

      // Verify stored record in skillsDb
      const stored = skillsDb.find((s) => s.id === result.id);
      assert.ok(stored);
      assert.strictEqual(stored.verificationState, "CONFIRMED");
    });

    it("allows VERIFIED state ONLY if source is ASSESSMENT_VERIFIED", async () => {
      profileDb["user_skill_2"] = {
        id: "prof_skill_2",
        userId: "user_skill_2",
        onboardingStatus: "IN_PROGRESS",
        profileVersion: 1,
      };

      const result = await extendedProfileService.addOrUpdateStudentSkill("user_skill_2", {
        skillName: "Python",
        proficiency: "ADVANCED",
        verificationState: "VERIFIED",
        source: "ASSESSMENT_VERIFIED",
      });

      assert.strictEqual(result.verificationState, "VERIFIED");
      assert.strictEqual(result.source, "ASSESSMENT_VERIFIED");
    });

    it("bumps profileVersion when a skill is added or removed", async () => {
      profileDb["user_skill_ver"] = {
        id: "prof_skill_ver",
        userId: "user_skill_ver",
        onboardingStatus: "IN_PROGRESS",
        profileVersion: 1,
      };

      await extendedProfileService.addOrUpdateStudentSkill("user_skill_ver", {
        skillName: "Docker",
        proficiency: "INTERMEDIATE",
      });

      assert.strictEqual(profileDb["user_skill_ver"].profileVersion, 2);

      const added = skillsDb[skillsDb.length - 1];
      await extendedProfileService.removeStudentSkill("user_skill_ver", added.id);
      assert.strictEqual(profileDb["user_skill_ver"].profileVersion, 3);
    });
  });

  describe("3. Category Grouping (9 Canonical Categories)", () => {
    it("contains entries across all 9 requested categories in KNOWN_CANONICAL_SKILLS", () => {
      const expectedCategories = [
        "programming_languages",
        "frontend",
        "backend",
        "databases",
        "cloud_devops",
        "dsa",
        "ai_ml",
        "dev_tools",
        "soft_skills",
      ];

      const foundCategories = new Set(KNOWN_CANONICAL_SKILLS.map((s) => s.category));

      for (const cat of expectedCategories) {
        assert.ok(foundCategories.has(cat), `Expected category '${cat}' in canonical catalogue`);
      }
    });
  });

  describe("4. Optional Projects & Experience and Profile Completion Rules", () => {
    it("validates that a student with Academics + Target Role + Skill but NO projects or experience achieves COMPLETED", async () => {
      const profile = {
        id: "prof_complete",
        userId: "user_complete",
        college: "BITS Pilani",
        degree: "B.Tech",
        branch: "Computer Science",
        currentYear: 4,
        graduationYear: 2026,
        onboardingStatus: "IN_PROGRESS",
        profileVersion: 1,
      };

      const careerInterests = [
        {
          id: "ci_1",
          studentProfileId: "prof_complete",
          roleId: "software_engineer",
          roleTitle: "Software Engineer",
          priority: 1,
          isPrimary: true,
        },
      ];

      const skills = [
        {
          id: "sk_1",
          studentProfileId: "prof_complete",
          skillName: "Node.js",
          proficiency: "INTERMEDIATE",
          verificationState: "CONFIRMED",
        },
      ];

      const projects: any[] = []; // zero projects
      const experience: any[] = []; // zero experience
      const resume: any = null; // no resume

      const completion = ProfileCompletionService.calculateCompletion(
        profile,
        careerInterests,
        skills,
        projects,
        experience,
        resume
      );

      // Verify minimum profile is met
      assert.strictEqual(completion.isMinimumProfileComplete, true);
      assert.strictEqual(completion.breakdown.projects.isComplete, false);
      assert.strictEqual(completion.breakdown.experience.isComplete, false);
      assert.strictEqual(completion.level, "SKILLS_INVENTORY");
      assert.ok(completion.completionPercentage >= 50);

      // Verify profile completion service submitFinal allows completion
      const profileService = new ProfileService(mockPrisma);
      profileDb["user_complete"] = profile;
      interestsDb.push(careerInterests[0]);
      skillsDb.push(skills[0]);

      const finalized = await profileService.submitFinal("user_complete");
      assert.strictEqual(finalized.onboardingStatus, "COMPLETED");
      assert.strictEqual(finalized.onboardingStep, 4);
      assert.ok(finalized.lastCompletedAt instanceof Date);
    });

    it("elevates completion level to ENRICHED and COMPREHENSIVE when projects, experience and resume are added", () => {
      const profile = {
        college: "IIT Bombay",
        degree: "B.Tech",
        branch: "CSE",
        currentYear: 4,
        graduationYear: 2026,
      };
      const careerInterests = [{ roleId: "backend_dev", priority: 1, isPrimary: true }];
      const skills = [{ skillName: "Go", proficiency: "INTERMEDIATE" }];
      const projects = [{ id: "p1", title: "Distributed Cache", technologies: ["Go", "Redis"] }];
      const experience = [{ id: "e1", company: "Acme Corp", title: "Backend Intern" }];
      const resume = { id: "res_1", parsedData: {} };

      const enriched = ProfileCompletionService.calculateCompletion(
        profile,
        careerInterests,
        skills,
        projects,
        [],
        null
      );
      assert.strictEqual(enriched.level, "ENRICHED");

      const comprehensive = ProfileCompletionService.calculateCompletion(
        profile,
        careerInterests,
        skills,
        projects,
        experience,
        resume
      );
      assert.strictEqual(comprehensive.level, "COMPREHENSIVE");
      assert.strictEqual(comprehensive.completionPercentage, 100);
    });

    it("rejects final submission if minimum profile is NOT met (e.g. 0 skills)", async () => {
      const profileService = new ProfileService(mockPrisma);
      profileDb["user_incomplete"] = {
        id: "prof_incomplete",
        userId: "user_incomplete",
        college: "IIT Delhi",
        degree: "B.Tech",
        graduationYear: 2026,
        onboardingStatus: "IN_PROGRESS",
      };
      interestsDb.push({
        id: "ci_inc",
        studentProfileId: "prof_incomplete",
        roleId: "data_engineer",
        priority: 1,
      });
      // 0 skills in skillsDb!

      await assert.rejects(
        async () => {
          await profileService.submitFinal("user_incomplete");
        },
        (err: any) => {
          return err.message.includes("Minimum profile incomplete");
        }
      );
    });
  });
});
