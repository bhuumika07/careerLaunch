// src/lib/services/student/__tests__/resumeSync.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { ResumeSyncService } from "../resumeSyncService.ts";
import { ProfileService } from "../profileService.ts";

describe("Phase 4 Chunk 4.4: Resume Pipeline Sync & Protection Rules", () => {
  function createMockEnvironment() {
    const studentProfiles: any[] = [];
    const profileSyncLogs: any[] = [];

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
      profileSyncLog: {
        create: async ({ data }: any) => {
          profileSyncLogs.push({ ...data });
          return data;
        },
        findMany: async ({ where }: any) => {
          return profileSyncLogs.filter((l) => l.studentId === where.studentId);
        },
      },
      _getProfiles: () => studentProfiles,
      _getSyncLogs: () => profileSyncLogs,
    };

    return { mockPrisma, studentProfiles, profileSyncLogs };
  }

  describe("1. Protection Rule: Uncertain re-extraction can't overwrite confirmed data", () => {
    it("protects student-confirmed fields from being overwritten by resume extractions", async () => {
      const { mockPrisma, studentProfiles } = createMockEnvironment();

      // Student previously confirmed college and CGPA
      studentProfiles.push({
        id: "prof_student_01",
        userId: "student_alice",
        college: "IIT Bombay",
        degree: "B.Tech",
        branch: "Computer Science",
        cgpa: 9.3,
        fieldMetadata: {
          college: { source: "STUDENT", confirmed: true, updatedAt: new Date().toISOString() },
          cgpa: { source: "STUDENT", confirmed: true, updatedAt: new Date().toISOString() },
        },
      });

      const syncService = new ResumeSyncService(mockPrisma);

      // Incoming resume extraction tries to overwrite college and CGPA with unconfirmed/different values
      const result = await syncService.syncConfirmedFields({
        studentId: "student_alice",
        resumeVersionId: "ver_resume_001",
        reviews: [
          {
            fieldPath: "college",
            originalValue: "Unknown Technical Institute",
            status: "accepted", // Even if student clicked accept on resume review, student-confirmed takes precedence
          },
          {
            fieldPath: "cgpa",
            originalValue: "7.2",
            status: "accepted",
          },
          {
            fieldPath: "branch",
            originalValue: "Computer Science and Engineering",
            status: "accepted", // Not previously locked with source STUDENT
          },
        ],
      });

      // Verify confirmed fields were skipped
      const skippedPaths = result.fieldsSkipped.map((s) => s.fieldPath);
      assert.ok(skippedPaths.includes("college"));
      assert.ok(skippedPaths.includes("cgpa"));

      // Verify the student profile preserved original confirmed values
      const profile = studentProfiles[0];
      assert.strictEqual(profile.college, "IIT Bombay");
      assert.strictEqual(profile.cgpa, 9.3);
    });

    it("rejects unconfirmed/pending field reviews from being treated as verified", async () => {
      const { mockPrisma, studentProfiles } = createMockEnvironment();

      studentProfiles.push({
        id: "prof_student_02",
        userId: "student_bob",
        college: null,
        degree: null,
        branch: null,
        cgpa: null,
        fieldMetadata: {},
      });

      const syncService = new ResumeSyncService(mockPrisma);

      const result = await syncService.syncConfirmedFields({
        studentId: "student_bob",
        resumeVersionId: "ver_resume_002",
        reviews: [
          {
            fieldPath: "college",
            originalValue: "MIT",
            status: "pending", // Still pending review -> must NOT be applied
          },
          {
            fieldPath: "cgpa",
            originalValue: "8.5",
            status: "rejected", // Rejected by student -> must NOT be applied
          },
        ],
      });

      assert.strictEqual(result.fieldsApplied.length, 0);
      assert.strictEqual(result.fieldsSkipped.length, 2);

      // Verify nothing was written to the profile
      const profile = studentProfiles[0];
      assert.strictEqual(profile.college, null);
      assert.strictEqual(profile.cgpa, null);
    });
  });

  describe("2. Audit Log & Downstream Staleness", () => {
    it("persists a permanent sync audit log entry in ProfileSyncLog", async () => {
      const { mockPrisma, studentProfiles, profileSyncLogs } = createMockEnvironment();

      studentProfiles.push({
        id: "prof_student_03",
        userId: "student_carol",
        college: null,
        degree: null,
        branch: null,
        cgpa: null,
        fieldMetadata: {},
      });

      const syncService = new ResumeSyncService(mockPrisma);

      const result = await syncService.syncConfirmedFields({
        studentId: "student_carol",
        resumeVersionId: "ver_resume_003",
        reviews: [
          {
            fieldPath: "college",
            originalValue: "Stanford University",
            status: "accepted",
          },
          {
            fieldPath: "skills.TypeScript",
            originalValue: "TypeScript",
            status: "accepted",
          },
        ],
      });

      assert.strictEqual(result.success, true);
      assert.ok(result.syncLogId);

      // Verify audit log in ProfileSyncLog
      assert.strictEqual(profileSyncLogs.length, 1);
      const log = profileSyncLogs[0];
      assert.strictEqual(log.studentId, "student_carol");
      assert.strictEqual(log.resumeVersionId, "ver_resume_003");
      assert.strictEqual(log.fieldsApplied.length, 2);

      // Verify downstream snapshots marked stale
      assert.strictEqual(result.snapshotsMarkedStale, true);
      const profile = studentProfiles[0];
      assert.strictEqual(profile.fieldMetadata?._downstreamSnapshots?.isStale, true);
      assert.ok(profile.fieldMetadata?._downstreamSnapshots?.version >= 1);
    });
  });
});
