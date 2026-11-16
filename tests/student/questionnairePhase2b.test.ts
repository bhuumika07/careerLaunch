// tests/student/questionnairePhase2b.test.ts
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  StudentProfileInputSchema,
  ProfileService,
} from "../../src/lib/services/student/profileService.ts";
import {
  CareerInterestsPayloadSchema,
  CareerInterestItemSchema,
  StudentPreferenceInputSchema,
  ExtendedProfileService,
} from "../../src/lib/services/student/extendedProfileService.ts";
import { ProfileCompletionService } from "../../src/lib/services/student/profileCompletionService.ts";
import { roleCatalogueService } from "../../src/lib/services/career-roles/roleCatalogueService.ts";

describe("Phase 2B: Questionnaire Steps 1 and 2 Validation & Persistence", () => {
  let mockPrisma: any;
  let profileDb: Record<string, any>;
  let interestsDb: any[];
  let skillsDb: any[];
  let preferencesDb: any[];

  beforeEach(() => {
    profileDb = {};
    interestsDb = [];
    skillsDb = [];
    preferencesDb = [];

    mockPrisma = {
      studentProfile: {
        findUnique: async ({ where }: any) => profileDb[where.userId] || null,
        create: async ({ data }: any) => {
          const record = {
            id: `prof_${Date.now()}`,
            onboardingStatus: "NOT_STARTED",
            onboardingStep: 1,
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
          const existing = profileDb[where.userId] || Object.values(profileDb).find((p) => p.id === where.id);
          if (!existing) throw new Error("Profile not found");

          let version = existing.profileVersion || 1;
          if (data.profileVersion?.increment) {
            version += data.profileVersion.increment;
          }

          const updated = {
            ...existing,
            ...data,
            profileVersion: version,
            updatedAt: new Date(),
          };
          profileDb[existing.userId] = updated;
          return updated;
        },
      },
      careerInterest: {
        findFirst: async ({ where }: any) => {
          return interestsDb.find((ci) => ci.studentProfileId === where.studentProfileId) || null;
        },
        findMany: async ({ where }: any) => {
          return interestsDb.filter((ci) => ci.studentProfileId === where.studentProfileId);
        },
        deleteMany: async ({ where }: any) => {
          interestsDb = interestsDb.filter((ci) => ci.studentProfileId !== where.studentProfileId);
          return { count: 0 };
        },
        createMany: async ({ data }: any) => {
          for (const item of data) {
            interestsDb.push({
              id: `ci_${Date.now()}_${Math.random()}`,
              ...item,
              createdAt: new Date(),
            });
          }
          return { count: data.length };
        },
      },
      studentSkill: {
        findFirst: async ({ where }: any) => {
          return skillsDb.find((sk) => sk.studentProfileId === where.studentProfileId) || null;
        },
        findMany: async () => skillsDb,
      },
      studentPreference: {
        findFirst: async () => preferencesDb[0] || null,
        upsert: async ({ create, update }: any) => {
          const rec = { id: "pref_1", ...create, ...update, updatedAt: new Date() };
          preferencesDb = [rec];
          return rec;
        },
      },
    };
  });

  // -------------------------------------------------------------------------
  // 1. Validation Tests
  // -------------------------------------------------------------------------
  describe("1. Schema Validations", () => {
    it("validates academic background fields and rejects invalid values", () => {
      // Valid input
      const valid = StudentProfileInputSchema.safeParse({
        college: "BITS Pilani",
        degree: "B.Tech",
        branch: "Computer Science",
        currentYear: 3,
        graduationYear: 2026,
        cgpa: 8.75,
        cgpaScale: 10.0,
        backlogs: 0,
        professionalStatus: "CURRENTLY_STUDYING",
      });
      assert.strictEqual(valid.success, true);

      // Rejects currentYear < 1 or > 6
      const invalidYear = StudentProfileInputSchema.safeParse({ currentYear: 7 });
      assert.strictEqual(invalidYear.success, false);

      // Rejects graduationYear < 2000
      const invalidGrad = StudentProfileInputSchema.safeParse({ graduationYear: 1995 });
      assert.strictEqual(invalidGrad.success, false);

      // Allows empty/unanswered fields on progressive save
      const emptyProgressive = StudentProfileInputSchema.safeParse({});
      assert.strictEqual(emptyProgressive.success, true);
    });

    it("enforces maximum 3 target roles and validates priority ordering", () => {
      // Valid 3 roles with priority 1..3
      const validInterests = CareerInterestsPayloadSchema.safeParse({
        interests: [
          { targetRole: "Backend Engineer", domain: "software", priority: 1, isPrimary: true },
          { targetRole: "Fullstack Engineer", domain: "software", priority: 2 },
          { targetRole: "DevOps Engineer", domain: "devops_cloud", priority: 3 },
        ],
      });
      assert.strictEqual(validInterests.success, true);

      // Rejects more than 3 target roles
      const tooMany = CareerInterestsPayloadSchema.safeParse({
        interests: [
          { targetRole: "Role 1", domain: "software", priority: 1 },
          { targetRole: "Role 2", domain: "software", priority: 2 },
          { targetRole: "Role 3", domain: "software", priority: 3 },
          { targetRole: "Role 4", domain: "software", priority: 4 },
        ],
      });
      assert.strictEqual(tooMany.success, false);

      // Rejects invalid priority > 3
      const invalidPriority = CareerInterestItemSchema.safeParse({
        targetRole: "Role",
        domain: "software",
        priority: 5,
      });
      assert.strictEqual(invalidPriority.success, false);
    });

    it("validates work preferences and opportunity types", () => {
      const validPrefs = StudentPreferenceInputSchema.safeParse({
        preferredLocations: ["Bengaluru", "Remote"],
        preferredWorkModes: ["remote", "hybrid"],
        opportunityTypes: ["internship", "job"],
        openToRelocation: true,
        minExpectedSalary: 800000,
        availabilityDate: "2026-06-01",
      });
      assert.strictEqual(validPrefs.success, true);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Status Transitions & Versioning Invariants
  // -------------------------------------------------------------------------
  describe("2. Status Transitions & Versioning Invariants", () => {
    it("starts at NOT_STARTED; visiting does not change status", async () => {
      const profileService = new ProfileService(mockPrisma);
      const profile = await profileService.getProfile("student_visiting");

      assert.strictEqual(profile.onboardingStatus, "NOT_STARTED");
      assert.strictEqual(profile.profileVersion, 1);

      // Fetch again -> still NOT_STARTED
      const profileAgain = await profileService.getProfile("student_visiting");
      assert.strictEqual(profileAgain.onboardingStatus, "NOT_STARTED");
      assert.strictEqual(profileAgain.profileVersion, 1);
    });

    it("transitions NOT_STARTED -> IN_PROGRESS on first saved data and increments profileVersion", async () => {
      const profileService = new ProfileService(mockPrisma);
      // Create initial profile
      await profileService.getProfile("student_1");

      const updateRes = await profileService.updateProfile("student_1", {
        college: "BITS Pilani",
        degree: "B.Tech",
        branch: "Computer Science",
        graduationYear: 2026,
      });

      assert.strictEqual(updateRes.profile.onboardingStatus, "IN_PROGRESS");
      assert.strictEqual(updateRes.profile.profileVersion, 2);

      // Second save bumps profileVersion again
      const updateRes2 = await profileService.updateProfile("student_1", {
        currentYear: 3,
      });
      assert.strictEqual(updateRes2.profile.onboardingStatus, "IN_PROGRESS");
      assert.strictEqual(updateRes2.profile.profileVersion, 3);
    });

    it("blocks transition to COMPLETED if minimum profile rule is not satisfied", async () => {
      const profileService = new ProfileService(mockPrisma);
      await profileService.getProfile("student_partial");

      // Save academics only (missing career interest and skill)
      await profileService.updateProfile("student_partial", {
        college: "IIT Bombay",
        degree: "B.Tech",
        graduationYear: 2025,
      });

      // Attempt to finalize
      const finalizeRes = await profileService.updateProfile("student_partial", {
        submitFinal: true,
      });

      assert.strictEqual(
        finalizeRes.profile.onboardingStatus,
        "IN_PROGRESS",
        "Profile without target role and skill must NOT become COMPLETED"
      );
      assert.strictEqual(finalizeRes.profile.lastCompletedAt, null);
    });

    it("transitions to COMPLETED when minimum profile rule passes on final submit", async () => {
      const profileService = new ProfileService(mockPrisma);
      const initialProfile = await profileService.getProfile("student_complete");

      // Save academics
      await profileService.updateProfile("student_complete", {
        college: "IIT Madras",
        degree: "B.Tech",
        branch: "Computer Science",
        graduationYear: 2026,
      });

      // Seed 1 target role and 1 skill in mock DB for this profile
      interestsDb.push({
        id: "ci_1",
        studentProfileId: initialProfile.id,
        targetRole: "Backend Engineer",
        domain: "software",
        priority: 1,
      });
      skillsDb.push({
        id: "sk_1",
        studentProfileId: initialProfile.id,
        rawSkillName: "TypeScript",
      });

      // Final submit
      const finalizeRes = await profileService.updateProfile("student_complete", {
        submitFinal: true,
      });

      assert.strictEqual(finalizeRes.profile.onboardingStatus, "COMPLETED");
      assert.ok(finalizeRes.profile.lastCompletedAt !== null);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Resume-From-Step (Determinism)
  // -------------------------------------------------------------------------
  describe("3. Resume-From-Step Calculations", () => {
    it("suggests Step 1 when academics are missing", async () => {
      const mockProfService = {
        getProfile: async () => ({ college: null, degree: null }),
      };
      const mockExtService = {
        getStudentSkills: async () => [],
        getCareerInterests: async () => [],
        getProjects: async () => [],
        getExperiences: async () => [],
        getPreferences: async () => null,
      };

      const compService = new ProfileCompletionService(mockProfService, mockExtService);
      const res = await compService.calculateCompletion("u1");

      assert.strictEqual(res.currentStep, 1);
      assert.ok(!res.completedSteps.includes(1));
    });

    it("suggests Step 2 when academics are complete but career interests are missing", async () => {
      const mockProfService = {
        getProfile: async () => ({
          college: "IIT Delhi",
          degree: "B.Tech",
          branch: "CSE",
          graduationYear: 2026,
        }),
      };
      const mockExtService = {
        getStudentSkills: async () => [],
        getCareerInterests: async () => [],
        getProjects: async () => [],
        getExperiences: async () => [],
        getPreferences: async () => null,
      };

      const compService = new ProfileCompletionService(mockProfService, mockExtService);
      const res = await compService.calculateCompletion("u1");

      assert.strictEqual(res.currentStep, 2);
      assert.ok(res.completedSteps.includes(1));
      assert.ok(!res.completedSteps.includes(2));
    });

    it("suggests Step 3 when academics and career interests are complete but skills are missing", async () => {
      const mockProfService = {
        getProfile: async () => ({
          college: "IIT Delhi",
          degree: "B.Tech",
          branch: "CSE",
          graduationYear: 2026,
        }),
      };
      const mockExtService = {
        getStudentSkills: async () => [],
        getCareerInterests: async () => [{ targetRole: "Backend Engineer", domain: "software" }],
        getProjects: async () => [],
        getExperiences: async () => [],
        getPreferences: async () => null,
      };

      const compService = new ProfileCompletionService(mockProfService, mockExtService);
      const res = await compService.calculateCompletion("u1");

      assert.strictEqual(res.currentStep, 3);
      assert.ok(res.completedSteps.includes(1));
      assert.ok(res.completedSteps.includes(2));
      assert.ok(!res.completedSteps.includes(3));
    });
  });

  // -------------------------------------------------------------------------
  // 4. Canonical Role Catalogue API Integration
  // -------------------------------------------------------------------------
  describe("4. Canonical Role Catalogue Integration", () => {
    it("returns canonical roles with distinct domains", async () => {
      const catalogue = await roleCatalogueService.getCatalogue();
      assert.ok(catalogue.length > 0);

      const domains = Array.from(new Set(catalogue.map((r) => r.domain)));
      assert.ok(domains.includes("software"));
      assert.ok(domains.includes("devops_cloud"));
      assert.ok(domains.includes("data_ai_ml"));

      const backendRole = catalogue.find((r) => r.canonicalName === "Backend Engineer");
      assert.ok(backendRole);
      assert.strictEqual(backendRole.domain, "software");
    });
  });
});
