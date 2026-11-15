// src/lib/services/student/__tests__/studentProfile.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  ProfileService,
  StudentProfileInputSchema,
} from "../profileService.ts";

describe("Phase 4 Chunk 4.1: StudentProfile Foundation", () => {
  function createMockPrisma() {
    const profiles: any[] = [];

    const mockPrisma: any = {
      studentProfile: {
        findUnique: async ({ where }: any) => {
          return profiles.find((p) => p.userId === where.userId) || null;
        },
        create: async ({ data }: any) => {
          const record = { id: `prof_${profiles.length + 1}`, ...data, createdAt: new Date(), updatedAt: new Date() };
          profiles.push(record);
          return record;
        },
        update: async ({ where, data }: any) => {
          const index = profiles.findIndex((p) => p.userId === where.userId);
          if (index === -1) throw new Error("Not found");
          profiles[index] = { ...profiles[index], ...data, updatedAt: new Date() };
          return profiles[index];
        },
      },
      _getProfiles: () => profiles,
    };

    return mockPrisma;
  }

  describe("1. Zod Validation & Partial Inputs", () => {
    it("validates empty object successfully (all fields optional for progressive save)", () => {
      const parsed = StudentProfileInputSchema.safeParse({});
      assert.strictEqual(parsed.success, true);
    });

    it("validates partial academic data", () => {
      const parsed = StudentProfileInputSchema.safeParse({
        college: "BITS Pilani",
        degree: "B.Tech",
        branch: "Computer Science",
        graduationYear: 2026,
        cgpa: 8.85,
      });
      assert.strictEqual(parsed.success, true);
      assert.strictEqual(parsed.data?.college, "BITS Pilani");
      assert.strictEqual(parsed.data?.cgpa, 8.85);
    });

    it("rejects invalid CGPA (> 10) and negative backlogs", () => {
      const invalidCgpa = StudentProfileInputSchema.safeParse({ cgpa: 11.5 });
      assert.strictEqual(invalidCgpa.success, false);

      const invalidBacklogs = StudentProfileInputSchema.safeParse({ backlogs: -2 });
      assert.strictEqual(invalidBacklogs.success, false);
    });
  });

  describe("2. User Scoping & Isolation", () => {
    it("isolates profiles between User A and User B", async () => {
      const mockPrisma = createMockPrisma();
      const service = new ProfileService(mockPrisma);

      // Create profile for User A
      await service.updateProfile("user_alice_001", {
        college: "IIT Bombay",
        degree: "B.Tech",
        branch: "CSE",
        cgpa: 9.4,
      });

      // Create profile for User B
      await service.updateProfile("user_bob_002", {
        college: "NIT Trichy",
        degree: "B.Tech",
        branch: "ECE",
        cgpa: 8.2,
      });

      // User A can read only User A
      const aliceProfile = await service.getProfile("user_alice_001");
      assert.strictEqual(aliceProfile.userId, "user_alice_001");
      assert.strictEqual(aliceProfile.college, "IIT Bombay");
      assert.strictEqual(aliceProfile.cgpa, 9.4);

      // User B can read only User B
      const bobProfile = await service.getProfile("user_bob_002");
      assert.strictEqual(bobProfile.userId, "user_bob_002");
      assert.strictEqual(bobProfile.college, "NIT Trichy");
      assert.strictEqual(bobProfile.cgpa, 8.2);

      // Verify User A's update cannot alter User B's profile
      await service.updateProfile("user_alice_001", {
        cgpa: 9.6,
      });

      const bobProfileAfter = await service.getProfile("user_bob_002");
      assert.strictEqual(bobProfileAfter.cgpa, 8.2); // Untouched
    });
  });

  describe("3. Partial Save Invariant", () => {
    it("preserves previously saved fields when saving partial updates", async () => {
      const mockPrisma = createMockPrisma();
      const service = new ProfileService(mockPrisma);

      // Step 1: Save college and degree
      await service.updateProfile("user_carol_003", {
        college: "Delhi University",
        degree: "B.Sc",
      });

      let profile = await service.getProfile("user_carol_003");
      assert.strictEqual(profile.college, "Delhi University");
      assert.strictEqual(profile.degree, "B.Sc");
      assert.strictEqual(profile.cgpa, null);

      // Step 2: Save CGPA and graduation year only
      const res = await service.updateProfile("user_carol_003", {
        cgpa: 8.7,
        graduationYear: 2025,
      });

      assert.strictEqual(res.updatedFields.includes("cgpa"), true);
      assert.strictEqual(res.updatedFields.includes("graduationYear"), true);

      // Verify college and degree were preserved
      profile = await service.getProfile("user_carol_003");
      assert.strictEqual(profile.college, "Delhi University");
      assert.strictEqual(profile.degree, "B.Sc");
      assert.strictEqual(profile.cgpa, 8.7);
      assert.strictEqual(profile.graduationYear, 2025);
    });
  });

  describe("4. Provenance Tracking & Overwrite Protection", () => {
    it("preserves student-confirmed value when resume extraction attempts to overwrite it", async () => {
      const mockPrisma = createMockPrisma();
      const service = new ProfileService(mockPrisma);

      // Student confirms their college and CGPA
      await service.updateProfile("user_dave_004", {
        college: "IIT Madras",
        cgpa: 9.2,
        source: "STUDENT",
        confirmed: true,
      });

      const initial = await service.getProfile("user_dave_004");
      assert.strictEqual(initial.college, "IIT Madras");
      assert.strictEqual(initial.cgpa, 9.2);
      assert.strictEqual(initial.fieldMetadata.college?.confirmed, true);
      assert.strictEqual(initial.fieldMetadata.cgpa?.confirmed, true);

      // Subsequent resume re-extraction detects a different CGPA and college
      const resumeUpdateResult = await service.updateProfile("user_dave_004", {
        college: "Unknown College",
        cgpa: 7.0,
        branch: "Computer Science", // New field not previously set
        source: "RESUME",
        confirmed: false,
      });

      // Confirmed fields must be protected and skipped
      assert.strictEqual(resumeUpdateResult.skippedFields.includes("college"), true);
      assert.strictEqual(resumeUpdateResult.skippedFields.includes("cgpa"), true);
      assert.strictEqual(resumeUpdateResult.updatedFields.includes("branch"), true);

      // Verify student's values remained 100% intact
      const preserved = await service.getProfile("user_dave_004");
      assert.strictEqual(preserved.college, "IIT Madras");
      assert.strictEqual(preserved.cgpa, 9.2);
      assert.strictEqual(preserved.branch, "Computer Science"); // Non-conflicting field was added
    });

    it("allows student to overwrite and confirm a previously resume-extracted value", async () => {
      const mockPrisma = createMockPrisma();
      const service = new ProfileService(mockPrisma);

      // Resume extraction initially populates unconfirmed college
      await service.updateProfile("user_eve_005", {
        college: "Parsed Engineering College",
        source: "RESUME",
        confirmed: false,
      });

      let profile = await service.getProfile("user_eve_005");
      assert.strictEqual(profile.college, "Parsed Engineering College");
      assert.strictEqual(profile.fieldMetadata.college?.confirmed, false);
      assert.strictEqual(profile.fieldMetadata.college?.source, "RESUME");

      // Student corrects and confirms the college
      const studentCorrection = await service.updateProfile("user_eve_005", {
        college: "SRM Institute of Science and Technology",
        source: "STUDENT",
        confirmed: true,
      });

      assert.strictEqual(studentCorrection.updatedFields.includes("college"), true);
      assert.strictEqual(studentCorrection.skippedFields.length, 0);

      profile = await service.getProfile("user_eve_005");
      assert.strictEqual(profile.college, "SRM Institute of Science and Technology");
      assert.strictEqual(profile.fieldMetadata.college?.confirmed, true);
      assert.strictEqual(profile.fieldMetadata.college?.source, "STUDENT");
    });
  });
});
