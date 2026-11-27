// src/lib/services/__tests__/multiTenantPersonalization.test.ts
/**
 * Multi-Tenant Isolation & True Personalization Verification Test Suite
 *
 * Verifies the core invariant:
 * "Every student sees career recommendations, skill gaps, opportunity matches and roadmaps
 * derived ONLY from their own saved profile. Two students logging in must see two different platforms."
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { RoleCatalogueService, OBSERVED_CAREER_ROLES } from "../career-roles/roleCatalogueService.ts";
import { MatchingService } from "../matching/matchingService.ts";
import { ApplicationTrackingService } from "../applications/applicationTrackingService.ts";
import { ResumeSyncService } from "../student/resumeSyncService.ts";
import { ProfileService } from "../student/profileService.ts";

describe("Phase 3: Multi-Tenant Personalization & Isolation Invariants", () => {
  function setupMultiTenantEnvironment() {
    // -------------------------------------------------------------
    // Two distinct student profiles with distinct skills and targets
    // -------------------------------------------------------------
    // Student A: Frontend Developer, Class of 2026, 8.8 CGPA
    const studentAId = "student_alpha_frontend";
    // Student B: Data Scientist, Class of 2025, 9.2 CGPA
    const studentBId = "student_beta_data_science";
    // Student C: Uncalibrated (new user, no skills or target roles)
    const studentCId = "student_gamma_uncalibrated";

    const studentProfiles: Record<string, any> = {
      [studentAId]: {
        id: "prof_alpha",
        userId: studentAId,
        college: "BITS Pilani",
        degree: "B.Tech in Computer Science",
        branch: "Computer Science",
        graduationYear: 2026,
        cgpa: 8.8,
        fieldMetadata: {
          college: { source: "STUDENT", confirmed: true, updatedAt: new Date().toISOString() },
          cgpa: { source: "STUDENT", confirmed: true, updatedAt: new Date().toISOString() },
        },
      },
      [studentBId]: {
        id: "prof_beta",
        userId: studentBId,
        college: "IIT Delhi",
        degree: "B.Tech in Mathematics & Computing",
        branch: "Mathematics & Computing",
        graduationYear: 2025,
        cgpa: 9.2,
        fieldMetadata: {
          college: { source: "STUDENT", confirmed: true, updatedAt: new Date().toISOString() },
          cgpa: { source: "STUDENT", confirmed: true, updatedAt: new Date().toISOString() },
        },
      },
      [studentCId]: {
        id: "prof_gamma",
        userId: studentCId,
        college: null,
        degree: null,
        branch: null,
        graduationYear: null,
        cgpa: null,
        fieldMetadata: {},
      },
    };

    const studentSkills: Record<string, any[]> = {
      [studentAId]: [
        { id: "sk_a1", userId: studentAId, name: "React", confirmed: true, reviewStatus: "CONFIRMED", proficiency: "advanced" },
        { id: "sk_a2", userId: studentAId, name: "TypeScript", confirmed: true, reviewStatus: "CONFIRMED", proficiency: "advanced" },
        { id: "sk_a3", userId: studentAId, name: "Next.js", confirmed: true, reviewStatus: "CONFIRMED", proficiency: "intermediate" },
        { id: "sk_a4", userId: studentAId, name: "Git", confirmed: true, reviewStatus: "CONFIRMED", proficiency: "advanced" },
      ],
      [studentBId]: [
        { id: "sk_b1", userId: studentBId, name: "Python", confirmed: true, reviewStatus: "CONFIRMED", proficiency: "advanced" },
        { id: "sk_b2", userId: studentBId, name: "SQL", confirmed: true, reviewStatus: "CONFIRMED", proficiency: "advanced" },
        { id: "sk_b3", userId: studentBId, name: "PostgreSQL", confirmed: true, reviewStatus: "CONFIRMED", proficiency: "intermediate" },
        { id: "sk_b4", userId: studentBId, name: "Git", confirmed: true, reviewStatus: "CONFIRMED", proficiency: "intermediate" },
      ],
      [studentCId]: [],
    };

    const studentInterests: Record<string, any[]> = {
      [studentAId]: [
        { id: "ci_a1", userId: studentAId, targetRole: "Fullstack Engineer", domain: "software", priority: 1 },
      ],
      [studentBId]: [
        { id: "ci_b1", userId: studentBId, targetRole: "Data Scientist", domain: "data", priority: 1 },
      ],
      [studentCId]: [],
    };

    const studentPreferences: Record<string, any> = {
      [studentAId]: {
        userId: studentAId,
        preferredLocations: ["Bengaluru", "Remote"],
        preferredWorkModes: ["remote", "hybrid"],
        openToRelocation: true,
      },
      [studentBId]: {
        userId: studentBId,
        preferredLocations: ["Hyderabad"],
        preferredWorkModes: ["onsite"],
        openToRelocation: false,
      },
      [studentCId]: {
        userId: studentCId,
        preferredLocations: [],
        preferredWorkModes: [],
        openToRelocation: true,
      },
    };

    // -------------------------------------------------------------
    // Mock Catalog and Active Opportunities
    // -------------------------------------------------------------
    const activeCounts: Record<string, number> = {
      role_fullstack_eng: 12,
      role_backend_eng: 15,
      role_data_scientist: 8,
      role_software_eng: 20,
    };

    const mockCatalogueService: any = {
      getCatalogue: async () => OBSERVED_CAREER_ROLES,
    };

    const mockExtProfileService: any = {
      getStudentSkills: async (userId: string) => studentSkills[userId] || [],
      getCareerInterests: async (userId: string) => studentInterests[userId] || [],
      getPreferences: async (userId: string) => studentPreferences[userId] || null,
      getProjects: async () => [],
      getExperiences: async () => [],
      addOrUpdateStudentSkill: async (userId: string, skill: any) => {
        const list = studentSkills[userId] || [];
        const existingIdx = list.findIndex((s) => s.name.toLowerCase() === skill.name.toLowerCase());
        const entry = { id: `sk_${Date.now()}`, userId, ...skill, reviewStatus: skill.confirmed ? "CONFIRMED" : "NEEDS_REVIEW" };
        if (existingIdx !== -1) {
          list[existingIdx] = entry;
        } else {
          list.push(entry);
        }
        studentSkills[userId] = list;
        return entry;
      },
      addOrUpdateProject: async () => ({ id: "proj_1" }),
    };

    const mockProfileService: any = {
      getProfile: async (userId: string) => {
        const p = studentProfiles[userId];
        if (!p) throw new Error("Profile not found");
        return p;
      },
      updateProfile: async (userId: string, updates: any) => {
        const p = studentProfiles[userId];
        if (!p) throw new Error("Profile not found");
        Object.assign(p, updates);
        return { profile: p, skippedFields: [], updatedFields: Object.keys(updates) };
      },
      markDownstreamSnapshotsStale: async (userId: string, reason: string) => {
        const p = studentProfiles[userId];
        if (p) {
          const currentMeta = p.fieldMetadata || {};
          const currentSnapshots = currentMeta._downstreamSnapshots || {};
          p.fieldMetadata = {
            ...currentMeta,
            _downstreamSnapshots: {
              isStale: true,
              staleSince: new Date().toISOString(),
              version: (currentSnapshots.version || 0) + 1,
              reason,
            },
          };
        }
      },
    };

    // Active Opportunities for Matching
    const opportunities: any[] = [
      {
        id: "opp_frontend_2026",
        title: "Frontend Engineer Intern",
        employer: "Acme Cloud",
        location: "Bengaluru",
        workplaceType: "hybrid",
        status: "ACTIVE",
        careerRoleId: "role_fullstack_eng",
        requiredSkills: ["React", "TypeScript"],
        preferredSkills: ["Next.js", "Git"],
        eligibility: {
          graduationYears: [2026],
          degrees: ["bachelors", "btech"],
          minCgpa: 7.5,
        },
        verifiedAt: new Date(),
        lastVerifiedAt: new Date(),
        applicationUrl: "https://acme.example.com/apply/frontend",
      },
      {
        id: "opp_data_science_2025",
        title: "Associate Data Scientist",
        employer: "Quantum Analytics",
        location: "Hyderabad",
        workplaceType: "onsite",
        status: "ACTIVE",
        careerRoleId: "role_data_scientist",
        requiredSkills: ["Python", "SQL"],
        preferredSkills: ["PostgreSQL", "Git"],
        eligibility: {
          graduationYears: [2025],
          degrees: ["bachelors", "btech"],
          minCgpa: 8.5,
        },
        verifiedAt: new Date(),
        lastVerifiedAt: new Date(),
        applicationUrl: "https://quantum.example.com/apply/ds",
      },
    ];

    const syncLogs: any[] = [];
    const mockPrisma: any = {
      opportunity: {
        findMany: async () => opportunities,
      },
      studentProfile: {
        findUnique: async ({ where }: any) => studentProfiles[where.userId] || null,
        update: async ({ where, data }: any) => {
          const p = studentProfiles[where.userId];
          if (p) Object.assign(p, data);
          return p;
        },
      },
      profileSyncLog: {
        create: async ({ data }: any) => {
          syncLogs.push(data);
          return data;
        },
      },
    };

    const matchingStore = { matchFeedbacks: [] };
    const mockMatchingService = new MatchingService(
      mockPrisma,
      mockProfileService,
      mockExtProfileService,
      mockCatalogueService,
      matchingStore
    );

    const applicationsStore = { applications: [], opportunities };
    const mockApplicationTrackingService = new ApplicationTrackingService(applicationsStore);

    const mockResumeSyncService = new ResumeSyncService(
      mockPrisma,
      mockProfileService,
      mockExtProfileService
    );

    return {
      studentAId,
      studentBId,
      studentCId,
      studentProfiles,
      studentSkills,
      studentInterests,
      opportunities,
      mockMatchingService,
      mockApplicationTrackingService,
      mockResumeSyncService,
      syncLogs,
    };
  }

  // =========================================================================
  // 1. Opportunity Matching & Eligibility Invariants
  // =========================================================================
  describe("4. Opportunity Matching & Hard Eligibility Isolation", () => {
    it("matches Student A with Frontend opportunity (ELIGIBLE) and flags Student B as INELIGIBLE", async () => {
      const { studentAId, studentBId, opportunities, mockMatchingService } = setupMultiTenantEnvironment();
      const oppFrontend = opportunities.find((o) => o.id === "opp_frontend_2026");

      // Direct hard gate check: Student A (2026 grad, CS) is ELIGIBLE
      const matchA = await mockMatchingService.matchOpportunity(studentAId, oppFrontend);
      assert.strictEqual(matchA.isEligible, true);
      assert.ok(matchA.overallScore >= 70);

      // Student B (2025 grad) is INELIGIBLE
      const matchB = await mockMatchingService.matchOpportunity(studentBId, oppFrontend);
      assert.strictEqual(matchB.isEligible, false);
      assert.strictEqual(matchB.overallScore, 0);
      assert.strictEqual(matchB.matchBand, "INELIGIBLE");
      assert.ok(matchB.hardEligibility.ineligibilityReasons.some((r) => r.includes("2026")));

      // Feed check: Student A's feed includes the opportunity; Student B's feed strictly excludes it
      const feedA = await mockMatchingService.getRecommendedFeed(studentAId);
      assert.ok(feedA.items.some((m) => m.opportunityId === "opp_frontend_2026"));

      const feedB = await mockMatchingService.getRecommendedFeed(studentBId);
      assert.ok(!feedB.items.some((m) => m.opportunityId === "opp_frontend_2026"));
    });

    it("matches Student B with Data Science opportunity (ELIGIBLE) and flags Student A as INELIGIBLE", async () => {
      const { studentAId, studentBId, opportunities, mockMatchingService } = setupMultiTenantEnvironment();
      const oppDS = opportunities.find((o) => o.id === "opp_data_science_2025");

      // Direct hard gate check: Student B (2025 grad, Math/Computing) is ELIGIBLE
      const matchB = await mockMatchingService.matchOpportunity(studentBId, oppDS);
      assert.strictEqual(matchB.isEligible, true);
      assert.ok(matchB.overallScore >= 70);

      // Student A (2026 grad) is INELIGIBLE
      const matchA = await mockMatchingService.matchOpportunity(studentAId, oppDS);
      assert.strictEqual(matchA.isEligible, false);
      assert.strictEqual(matchA.overallScore, 0);
      assert.strictEqual(matchA.matchBand, "INELIGIBLE");

      // Feed check: Student B's feed includes the opportunity; Student A's feed strictly excludes it
      const feedB = await mockMatchingService.getRecommendedFeed(studentBId);
      assert.ok(feedB.items.some((m) => m.opportunityId === "opp_data_science_2025"));

      const feedA = await mockMatchingService.getRecommendedFeed(studentAId);
      assert.ok(!feedA.items.some((m) => m.opportunityId === "opp_data_science_2025"));
    });
  });

  // =========================================================================
  // 5. Application Tracking: Multi-Tenant Data Isolation
  // =========================================================================
  describe("5. Application Tracking Multi-Tenant Isolation", () => {
    it("isolates applications so Student B cannot access or mutate Student A's application", async () => {
      const { studentAId, studentBId, mockApplicationTrackingService } = setupMultiTenantEnvironment();

      // Student A submits an application
      const appA = await mockApplicationTrackingService.submitApplication(
        studentAId,
        "opp_frontend_2026",
        { coverNote: "Excited for this role!" }
      );
      assert.strictEqual(appA.studentId, studentAId);

      // Student B queries their applications -> sees zero
      const appsB = await mockApplicationTrackingService.getStudentApplications(studentBId);
      assert.strictEqual(appsB.length, 0);

      // Student B tries to retrieve Student A's application by ID -> returns null
      const stolenApp = await mockApplicationTrackingService.getApplicationById(studentBId, appA.id);
      assert.strictEqual(stolenApp, null);

      // Student B tries to update Student A's application -> rejected with error
      await assert.rejects(
        async () => {
          await mockApplicationTrackingService.updateApplicationStatus(
            studentBId,
            appA.id,
            "WITHDRAWN"
          );
        },
        /not found for authenticated student/
      );

      // Verify Student A's application remains SUBMITTED and untouched
      const appsA = await mockApplicationTrackingService.getStudentApplications(studentAId);
      assert.strictEqual(appsA.length, 1);
      assert.strictEqual(appsA[0].status, "SUBMITTED");
    });
  });

  // =========================================================================
  // 6. Resume Sync: Protection Rules & Downstream Stale Marking
  // =========================================================================
  describe("6. Resume Sync Protection & Invalidation Invariants", () => {
    it("protects confirmed student profile values and invalidates downstream snapshots", async () => {
      const { studentAId, studentProfiles, mockResumeSyncService, syncLogs } = setupMultiTenantEnvironment();

      const initialVersion = studentProfiles[studentAId].fieldMetadata._downstreamSnapshots?.version || 0;

      // Resume re-extraction attempts to overwrite student-confirmed college and CGPA
      const syncResult = await mockResumeSyncService.syncConfirmedFields({
        studentId: studentAId,
        resumeVersionId: "ver_alpha_resume_2",
        reviews: [
          {
            fieldPath: "college",
            originalValue: "Random Fake College",
            status: "accepted",
          },
          {
            fieldPath: "cgpa",
            originalValue: "6.5",
            status: "accepted",
          },
          {
            fieldPath: "skills.Tailwind CSS",
            originalValue: "Tailwind CSS",
            status: "accepted",
          },
        ],
      });

      // Invariant: Student-confirmed fields were skipped
      assert.strictEqual(syncResult.fieldsSkipped.length, 2);
      assert.ok(syncResult.fieldsSkipped.some((s) => s.fieldPath === "college"));
      assert.ok(syncResult.fieldsSkipped.some((s) => s.fieldPath === "cgpa"));

      // Profile preserved original confirmed values
      const profile = studentProfiles[studentAId];
      assert.strictEqual(profile.college, "BITS Pilani");
      assert.strictEqual(profile.cgpa, 8.8);

      // Invariant: Audit log recorded
      assert.strictEqual(syncLogs.length, 1);
      assert.strictEqual(syncLogs[0].studentId, studentAId);

      // Invariant: Downstream snapshots marked stale with version incremented
      assert.strictEqual(profile.fieldMetadata._downstreamSnapshots.isStale, true);
      assert.ok(profile.fieldMetadata._downstreamSnapshots.version > initialVersion);
    });
  });
});
