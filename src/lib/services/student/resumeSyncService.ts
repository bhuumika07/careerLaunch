// src/lib/services/student/resumeSyncService.ts
/**
 * Resume Pipeline Sync Service (Phase 4 - Chunk 4.4)
 *
 * Implements:
 * 1. ParsedFieldReview -> student confirmation -> sync into StudentProfile.
 * 2. Writes an audit record in ProfileSyncLog.
 * 3. Invariant: Unconfirmed extracted fields must NOT be treated as verified.
 * 4. Protection Rule: Uncertain re-extraction CANNOT overwrite confirmed data.
 * 5. Marks affected downstream snapshots as stale (version bump / stale flag for Phase 9).
 */

import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { profileService, ProfileService } from "./profileService.ts";
import { extendedProfileService } from "./extendedProfileService.ts";

export type ReviewStatus = "pending" | "accepted" | "edited" | "rejected";

export interface ParsedFieldReviewItem {
  id?: string;
  fieldPath: string; // e.g. "academics.cgpa", "skills.TypeScript", "academics.college", "projects.0"
  originalValue: string | any;
  correctedValue?: string | any | null;
  status: ReviewStatus;
}

export interface SyncResumeFieldsParams {
  studentId: string;
  resumeVersionId: string;
  reviews: ParsedFieldReviewItem[];
}

export interface SyncResumeResult {
  success: boolean;
  studentId: string;
  resumeVersionId: string;
  fieldsApplied: Array<{ fieldPath: string; value: any; status: string }>;
  fieldsSkipped: Array<{ fieldPath: string; reason: string }>;
  syncLogId: string;
  snapshotsMarkedStale: boolean;
}

function readDbStore(): any {
  try {
    const dbPath = path.resolve(process.cwd(), "src/data/db.json");
    if (fs.existsSync(dbPath)) {
      return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    }
  } catch (err) {
    console.error("[resumeSyncService] Failed reading db.json", err);
  }
  return {};
}

function writeDbStore(data: any): void {
  try {
    const dbPath = path.resolve(process.cwd(), "src/data/db.json");
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[resumeSyncService] Failed writing db.json", err);
  }
}

export class ResumeSyncService {
  private prisma: any;
  private profService: any;

  constructor(prismaClient?: any, profService?: any) {
    this.prisma = prismaClient;
    this.profService = profService || (prismaClient ? new ProfileService(prismaClient) : profileService);
  }

  private async getPrisma(): Promise<any> {
    if (this.prisma) return this.prisma;
    if (process.env.DATABASE_URL) {
      try {
        const { prisma } = await import("@/lib/prisma");
        return prisma;
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Syncs student-confirmed ParsedFieldReview entries into the StudentProfile
   * and writes an audit log to ProfileSyncLog.
   */
  async syncConfirmedFields(params: SyncResumeFieldsParams): Promise<SyncResumeResult> {
    const { studentId, resumeVersionId, reviews } = params;

    if (!studentId || !resumeVersionId) {
      throw new Error("studentId and resumeVersionId are required for profile sync");
    }

    const currentProfile = await this.profService.getProfile(studentId);
    const fieldsApplied: Array<{ fieldPath: string; value: any; status: string }> = [];
    const fieldsSkipped: Array<{ fieldPath: string; reason: string }> = [];

    const nowIso = new Date().toISOString();

    for (const review of reviews) {
      // Invariant 1: Unconfirmed extracted fields must NOT be treated as verified
      if (review.status !== "accepted" && review.status !== "edited") {
        fieldsSkipped.push({
          fieldPath: review.fieldPath,
          reason: `Field review status is "${review.status}" (must be "accepted" or "edited" by student)`,
        });
        continue;
      }

      const effectiveValue = review.status === "edited" && review.correctedValue !== undefined
        ? review.correctedValue
        : review.originalValue;

      // Invariant 2: Protection Rule - If student already has a confirmed value, resume extraction cannot overwrite it
      const baseField = review.fieldPath.split(".")[0];
      const existingMeta = currentProfile.fieldMetadata[baseField];

      if (existingMeta && existingMeta.source === "STUDENT" && existingMeta.confirmed) {
        fieldsSkipped.push({
          fieldPath: review.fieldPath,
          reason: `Field "${baseField}" is already student-confirmed; resume re-extraction cannot overwrite it`,
        });
        continue;
      }

      // Apply based on field category
      try {
        if (review.fieldPath === "college" || review.fieldPath === "academics.college") {
          await this.profService.updateProfile(studentId, {
            college: String(effectiveValue),
            source: "RESUME",
            confirmed: true, // Student accepted this review
          });
          fieldsApplied.push({ fieldPath: review.fieldPath, value: effectiveValue, status: review.status });
        } else if (review.fieldPath === "degree" || review.fieldPath === "academics.degree") {
          await this.profService.updateProfile(studentId, {
            degree: String(effectiveValue),
            source: "RESUME",
            confirmed: true,
          });
          fieldsApplied.push({ fieldPath: review.fieldPath, value: effectiveValue, status: review.status });
        } else if (review.fieldPath === "branch" || review.fieldPath === "academics.branch") {
          await this.profService.updateProfile(studentId, {
            branch: String(effectiveValue),
            source: "RESUME",
            confirmed: true,
          });
          fieldsApplied.push({ fieldPath: review.fieldPath, value: effectiveValue, status: review.status });
        } else if (review.fieldPath === "cgpa" || review.fieldPath === "academics.cgpa") {
          const numCgpa = parseFloat(effectiveValue);
          if (!isNaN(numCgpa)) {
            await this.profService.updateProfile(studentId, {
              cgpa: numCgpa,
              source: "RESUME",
              confirmed: true,
            });
            fieldsApplied.push({ fieldPath: review.fieldPath, value: numCgpa, status: review.status });
          }
        } else if (review.fieldPath === "graduationYear" || review.fieldPath === "academics.graduationYear") {
          const numYear = parseInt(effectiveValue, 10);
          if (!isNaN(numYear)) {
            await this.profService.updateProfile(studentId, {
              graduationYear: numYear,
              source: "RESUME",
              confirmed: true,
            });
            fieldsApplied.push({ fieldPath: review.fieldPath, value: numYear, status: review.status });
          }
        } else if (review.fieldPath.startsWith("skills.") || review.fieldPath === "skill") {
          const skillName = typeof effectiveValue === "object" ? effectiveValue.name : String(effectiveValue);
          await extendedProfileService.addOrUpdateStudentSkill(studentId, {
            name: skillName,
            proficiency: "intermediate",
            source: "RESUME",
            confirmed: true, // Student accepted this review
          });
          fieldsApplied.push({ fieldPath: review.fieldPath, value: skillName, status: review.status });
        } else if (review.fieldPath.startsWith("projects.") || review.fieldPath === "project") {
          const proj = typeof effectiveValue === "object" ? effectiveValue : { title: String(effectiveValue) };
          await extendedProfileService.addOrUpdateProject(studentId, {
            title: proj.title || "Project",
            description: proj.description || null,
            technologies: proj.technologies || [],
            repoUrl: proj.repoUrl || null,
            liveUrl: proj.liveUrl || null,
            source: "RESUME",
            confirmed: true,
          });
          fieldsApplied.push({ fieldPath: review.fieldPath, value: proj.title, status: review.status });
        } else {
          fieldsSkipped.push({
            fieldPath: review.fieldPath,
            reason: `Unsupported field path "${review.fieldPath}"`,
          });
        }
      } catch (err: any) {
        fieldsSkipped.push({
          fieldPath: review.fieldPath,
          reason: `Failed to apply field: ${err.message}`,
        });
      }
    }

    // Invariant 3: Mark affected downstream snapshots as stale (version bump flag for Phase 9)
    await this.markDownstreamSnapshotsStale(studentId);

    // Invariant 4: Persist sync audit log in ProfileSyncLog
    const syncLogId = randomUUID();
    await this.recordSyncAuditLog({
      id: syncLogId,
      studentId,
      resumeVersionId,
      fieldsApplied,
      appliedAt: nowIso,
    });

    return {
      success: true,
      studentId,
      resumeVersionId,
      fieldsApplied,
      fieldsSkipped,
      syncLogId,
      snapshotsMarkedStale: true,
    };
  }

  /**
   * Records audit log in ProfileSyncLog (Prisma or db.json)
   */
  private async recordSyncAuditLog(entry: {
    id: string;
    studentId: string;
    resumeVersionId: string;
    fieldsApplied: any;
    appliedAt: string;
  }): Promise<void> {
    const prisma = await this.getPrisma();
    if (prisma?.profileSyncLog) {
      try {
        await prisma.profileSyncLog.create({
          data: {
            id: entry.id,
            studentId: entry.studentId,
            resumeVersionId: entry.resumeVersionId,
            fieldsApplied: entry.fieldsApplied,
            appliedAt: new Date(entry.appliedAt),
          },
        });
        return;
      } catch (err) {
        console.warn("[resumeSyncService] Prisma ProfileSyncLog create error:", err);
      }
    }

    // Fallback store
    const db = readDbStore();
    db.profileSyncLogs = db.profileSyncLogs || [];
    db.profileSyncLogs.push(entry);
    writeDbStore(db);
  }

  /**
   * Marks downstream snapshots (matches, eligibility vectors, recommendations) as stale.
   */
  private async markDownstreamSnapshotsStale(studentId: string): Promise<void> {
    const profile = await this.profService.getProfile(studentId);
    const updatedMeta = {
      ...(profile.fieldMetadata || {}),
      _downstreamSnapshots: {
        isStale: true,
        staleSince: new Date().toISOString(),
        version: ((profile.fieldMetadata?._downstreamSnapshots as any)?.version || 1) + 1,
        reason: "resume_sync",
      },
    };

    const prisma = await this.getPrisma();
    if (prisma?.studentProfile) {
      try {
        await prisma.studentProfile.update({
          where: { userId: studentId },
          data: { fieldMetadata: updatedMeta },
        });
        return;
      } catch {
        // Fallback below
      }
    }

    const db = readDbStore();
    db.studentProfiles = db.studentProfiles || [];
    const index = db.studentProfiles.findIndex((p: any) => p.userId === studentId);
    if (index !== -1) {
      db.studentProfiles[index].fieldMetadata = updatedMeta;
      writeDbStore(db);
    }
  }

  /**
   * Retrieves sync audit logs for a student
   */
  async getSyncLogs(studentId: string): Promise<any[]> {
    const prisma = await this.getPrisma();
    if (prisma?.profileSyncLog) {
      try {
        return await prisma.profileSyncLog.findMany({
          where: { studentId },
          orderBy: { appliedAt: "desc" },
        });
      } catch {
        // Fallback below
      }
    }

    const db = readDbStore();
    return (db.profileSyncLogs || []).filter((log: any) => log.studentId === studentId);
  }
}

export const resumeSyncService = new ResumeSyncService();
