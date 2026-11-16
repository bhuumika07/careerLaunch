// src/lib/services/student/profileService.ts
/**
 * StudentProfile Foundation Service
 *
 * Invariants:
 * 1. Authenticated student ID from session only. Never trust client-supplied student IDs.
 * 2. Scoped: User A cannot read or write User B's profile.
 * 3. Partial save: Every field is optional at the API level. Unspecified fields are preserved.
 * 4. Provenance & Confirmation State:
 *    - Tracks per-field source ("STUDENT" | "RESUME") and confirmation state.
 *    - A resume-extracted value NEVER overwrites a student-confirmed value.
 * 5. Single Source of Truth: Exclusively backed by PostgreSQL via Prisma.
 *    Zero fallback to JSON files. On database failure: log + throw typed error.
 */

import { z } from "zod";
import { PrismaClient, Prisma } from "@prisma/client";
import { prisma as defaultPrisma } from "../../prisma.ts";

export class DatabaseServiceError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number = 503, code: string = "DB_UNAVAILABLE") {
    super(message);
    this.name = "DatabaseServiceError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export type ProfileFieldSource = "STUDENT" | "RESUME";

export interface FieldMetadataItem {
  source: ProfileFieldSource;
  confirmed: boolean;
  updatedAt: string;
}

export type FieldMetadataMap = Record<string, FieldMetadataItem>;

export type OnboardingStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export interface StudentProfileEntity {
  id: string;
  userId: string;
  onboardingStatus: OnboardingStatus;
  onboardingStep: number | null;
  profileVersion: number;
  lastCompletedAt: string | Date | null;
  lastUpdatedBy: string | null;
  professionalStatus?: string | null;
  college: string | null;
  degree: string | null;
  branch: string | null;
  currentYear: number | null;
  graduationYear: number | null;
  cgpa: number | null;
  cgpaScale: number | null;
  backlogs: number | null;
  phone?: string | null;
  bio?: string | null;
  location?: string | null;
  portfolioUrl?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  fieldMetadata: FieldMetadataMap;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * Zod validation schema for student profile inputs (all fields optional for progressive save)
 */
export const StudentProfileInputSchema = z.object({
  college: z.string().trim().nullable().optional(),
  degree: z.string().trim().nullable().optional(),
  branch: z.string().trim().nullable().optional(),
  currentYear: z.number().int().min(1).max(6).nullable().optional(),
  graduationYear: z.number().int().min(2000).max(2040).nullable().optional(),
  cgpa: z.number().min(0).max(10).nullable().optional(),
  cgpaScale: z.number().positive().max(100).nullable().optional(),
  backlogs: z.number().int().min(0).nullable().optional(),
  professionalStatus: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  bio: z.string().trim().nullable().optional(),
  location: z.string().trim().nullable().optional(),
  portfolioUrl: z.string().url().trim().nullable().optional().or(z.literal("")),
  githubUrl: z.string().url().trim().nullable().optional().or(z.literal("")),
  linkedinUrl: z.string().url().trim().nullable().optional().or(z.literal("")),
  source: z.enum(["STUDENT", "RESUME"]).optional().default("STUDENT"),
  confirmed: z.boolean().optional(),
  onboardingStep: z.number().int().min(1).max(5).optional(),
  onboardingStatus: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]).optional(),
  submitFinal: z.boolean().optional(),
  // Optional explicit per-field confirmation map
  fieldConfirmations: z.record(z.string(), z.boolean()).optional(),
});

export type StudentProfileInput = z.infer<typeof StudentProfileInputSchema>;

export class ProfileService {
  private prisma: PrismaClient | null = null;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
  }

  private getPrisma(): PrismaClient {
    return this.prisma || defaultPrisma;
  }

  /**
   * Retrieves or creates a default StudentProfile entity for a given student userId.
   * Exclusively queries PostgreSQL via Prisma.
   */
  async getProfile(userId: string): Promise<StudentProfileEntity> {
    if (!userId || typeof userId !== "string") {
      throw new Error("Invalid student userId provided");
    }

    const prisma = this.getPrisma();
    if (!prisma?.studentProfile) {
      console.error("[profileService] Prisma client is unavailable.");
      throw new DatabaseServiceError("Database service unavailable.", 503, "DB_UNAVAILABLE");
    }

    try {
      let profile = await prisma.studentProfile.findUnique({
        where: { userId },
      });

      if (!profile) {
        profile = await prisma.studentProfile.create({
          data: {
            userId,
            college: null,
            degree: null,
            branch: null,
            currentYear: null,
            graduationYear: null,
            cgpa: null,
            cgpaScale: 10.0,
            backlogs: 0,
            fieldMetadata: {},
            onboardingStatus: "NOT_STARTED",
            onboardingStep: 1,
            profileVersion: 1,
          },
        });
      }

      const meta = ((profile.fieldMetadata as unknown) as FieldMetadataMap) || {};
      const professionalStatus =
        (profile as any).professionalStatus || (meta as any).professionalStatus?.value || null;

      return {
        id: profile.id,
        userId: profile.userId,
        onboardingStatus: (profile as any).onboardingStatus || "NOT_STARTED",
        onboardingStep: (profile as any).onboardingStep ?? 1,
        profileVersion: (profile as any).profileVersion ?? 1,
        lastCompletedAt: (profile as any).lastCompletedAt ?? null,
        lastUpdatedBy: (profile as any).lastUpdatedBy ?? "STUDENT",
        professionalStatus,
        college: profile.college,
        degree: profile.degree,
        branch: profile.branch,
        currentYear: profile.currentYear,
        graduationYear: profile.graduationYear,
        cgpa: profile.cgpa,
        cgpaScale: profile.cgpaScale ?? 10.0,
        backlogs: profile.backlogs ?? 0,
        phone: profile.phone ?? null,
        bio: profile.bio ?? null,
        location: profile.location ?? null,
        portfolioUrl: profile.portfolioUrl ?? null,
        githubUrl: profile.githubUrl ?? null,
        linkedinUrl: profile.linkedinUrl ?? null,
        fieldMetadata: meta,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[profileService] Prisma getProfile error:", err);
      throw new DatabaseServiceError(`Failed to retrieve profile: ${message}`, 500, "DB_ERROR");
    }
  }

  /**
   * Updates a student profile with partial data.
   *
   * Enforces:
   * 1. Partial save: Only provided fields are updated; unspecified fields are untouched.
   * 2. Overwrite Protection: If source === 'RESUME' and a field is already confirmed by the student,
   *    the resume-extracted value is rejected/skipped, preserving the student's confirmed value.
   * 3. Provenance tracking: updates fieldMetadata with source and confirmation status.
   * 4. Exclusively updates PostgreSQL via Prisma.
   */
  async updateProfile(
    userId: string,
    rawInput: unknown
  ): Promise<{
    profile: StudentProfileEntity;
    skippedFields: string[];
    updatedFields: string[];
  }> {
    if (!userId || typeof userId !== "string") {
      throw new Error("Invalid student userId provided");
    }

    const validated = StudentProfileInputSchema.parse(rawInput);
    const existing = await this.getProfile(userId);

    const source: ProfileFieldSource = validated.source || "STUDENT";
    const defaultConfirmed = validated.confirmed ?? (source === "STUDENT");

    const updatableKeys = [
      "college",
      "degree",
      "branch",
      "currentYear",
      "graduationYear",
      "cgpa",
      "cgpaScale",
      "backlogs",
      "phone",
      "bio",
      "location",
      "portfolioUrl",
      "githubUrl",
      "linkedinUrl",
    ] as const;

    const skippedFields: string[] = [];
    const updatedFields: string[] = [];

    const newFieldMetadata: FieldMetadataMap = { ...(existing.fieldMetadata || {}) };
    const updates: Partial<StudentProfileEntity> = {};

    const nowIso = new Date().toISOString();

    const recordVal = validated as Record<string, unknown>;
    const recordUpdates = updates as Record<string, unknown>;

    for (const key of updatableKeys) {
      if (key in validated && recordVal[key] !== undefined) {
        const incomingVal = recordVal[key];
        const existingMeta = newFieldMetadata[key];

        // Protection Rule: A resume-extracted value never overwrites a student-confirmed value
        if (source === "RESUME" && existingMeta?.confirmed === true) {
          skippedFields.push(key);
          continue;
        }

        // Apply field update
        recordUpdates[key] = incomingVal;
        updatedFields.push(key);

        // Record provenance
        const isExplicitlyConfirmed =
          validated.fieldConfirmations && key in validated.fieldConfirmations
            ? validated.fieldConfirmations[key]
            : defaultConfirmed;

        newFieldMetadata[key] = {
          source,
          confirmed: isExplicitlyConfirmed,
          updatedAt: nowIso,
        };
      }
    }

    // Handle professionalStatus in fieldMetadata
    if (validated.professionalStatus !== undefined) {
      (newFieldMetadata as any).professionalStatus = {
        value: validated.professionalStatus,
        source,
        confirmed: true,
        updatedAt: nowIso,
      };
      updatedFields.push("professionalStatus");
    }

    const prisma = this.getPrisma();
    if (!prisma?.studentProfile) {
      console.error("[profileService] Prisma client is unavailable for update.");
      throw new DatabaseServiceError("Database service unavailable.", 503, "DB_UNAVAILABLE");
    }

    // Determine onboarding status transition
    let targetOnboardingStatus = validated.onboardingStatus || existing.onboardingStatus;
    if (existing.onboardingStatus === "NOT_STARTED" && (updatedFields.length > 0 || validated.onboardingStep)) {
      targetOnboardingStatus = "IN_PROGRESS";
    }

    let lastCompletedAt: Date | null = existing.lastCompletedAt ? new Date(existing.lastCompletedAt) : null;

    // Minimum Profile Rule check for COMPLETED status
    if (validated.submitFinal) {
      const mergedCollege = updates.college !== undefined ? updates.college : existing.college;
      const mergedDegree = updates.degree !== undefined ? updates.degree : existing.degree;
      const mergedGradYear = updates.graduationYear !== undefined ? updates.graduationYear : existing.graduationYear;

      const hasAcademics = !!(
        mergedCollege &&
        mergedCollege.trim() &&
        mergedDegree &&
        mergedDegree.trim() &&
        mergedGradYear &&
        mergedGradYear >= 2000
      );

      let hasInterests = false;
      let hasSkills = false;

      if (prisma.careerInterest) {
        const ci = await prisma.careerInterest.findFirst({
          where: { studentProfileId: existing.id },
        });
        hasInterests = !!ci;
      }
      if (prisma.studentSkill) {
        const sk = await prisma.studentSkill.findFirst({
          where: { studentProfileId: existing.id },
        });
        hasSkills = !!sk;
      }

      if (hasAcademics && hasInterests && hasSkills) {
        targetOnboardingStatus = "COMPLETED";
        lastCompletedAt = new Date();
      } else {
        targetOnboardingStatus = "IN_PROGRESS";
      }
    }

    const nextStep =
      validated.onboardingStep !== undefined
        ? validated.onboardingStep
        : Math.max(existing.onboardingStep || 1, 1);

    try {
      const updated = await prisma.studentProfile.update({
        where: { userId },
        data: {
          ...updates,
          fieldMetadata: newFieldMetadata as unknown as Prisma.InputJsonValue,
          profileVersion: { increment: 1 },
          onboardingStatus: targetOnboardingStatus as any,
          onboardingStep: nextStep,
          lastCompletedAt,
          lastUpdatedBy: "STUDENT",
        },
      });

      if (updatedFields.length > 0) {
        await this.markDownstreamSnapshotsStale(userId, "profile_fields_updated");
      }

      const updatedMeta = ((updated.fieldMetadata as unknown) as FieldMetadataMap) || {};
      const professionalStatus =
        (updated as any).professionalStatus || (updatedMeta as any).professionalStatus?.value || null;

      return {
        profile: {
          id: updated.id,
          userId: updated.userId,
          onboardingStatus: (updated as any).onboardingStatus || "NOT_STARTED",
          onboardingStep: (updated as any).onboardingStep ?? nextStep,
          profileVersion: (updated as any).profileVersion ?? (existing.profileVersion + 1),
          lastCompletedAt: (updated as any).lastCompletedAt ?? lastCompletedAt,
          lastUpdatedBy: (updated as any).lastUpdatedBy ?? "STUDENT",
          professionalStatus,
          college: updated.college,
          degree: updated.degree,
          branch: updated.branch,
          currentYear: updated.currentYear,
          graduationYear: updated.graduationYear,
          cgpa: updated.cgpa,
          cgpaScale: updated.cgpaScale ?? 10.0,
          backlogs: updated.backlogs ?? 0,
          phone: updated.phone ?? null,
          bio: updated.bio ?? null,
          location: updated.location ?? null,
          portfolioUrl: updated.portfolioUrl ?? null,
          githubUrl: updated.githubUrl ?? null,
          linkedinUrl: updated.linkedinUrl ?? null,
          fieldMetadata: updatedMeta,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        },
        skippedFields,
        updatedFields,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[profileService] Prisma update failed:", err);
      throw new DatabaseServiceError(`Failed to update profile: ${message}`, 500, "DB_ERROR");
    }
  }

  /**
   * Marks downstream snapshots (matches, eligibility, recommendations) as stale for a student.
   * Increments the snapshot version counter so cached recommendations know to recompute.
   */
  async markDownstreamSnapshotsStale(userId: string, reason: string = "profile_updated"): Promise<void> {
    const prisma = this.prisma;
    if (!prisma) return;
    try {
      const existing = await prisma.studentProfile.findUnique({
        where: { userId },
        select: { fieldMetadata: true },
      });
      if (!existing) return;

      const currentMeta = ((existing.fieldMetadata as unknown) as Record<string, unknown>) || {};
      const currentSnapshots = (currentMeta._downstreamSnapshots as Record<string, unknown>) || {};
      const currentVersion = typeof currentSnapshots.version === "number" ? currentSnapshots.version : 0;

      const updatedMeta = {
        ...currentMeta,
        _downstreamSnapshots: {
          isStale: true,
          staleSince: new Date().toISOString(),
          version: currentVersion + 1,
          reason,
        },
      };

      await prisma.studentProfile.update({
        where: { userId },
        data: { fieldMetadata: updatedMeta as unknown as Prisma.InputJsonValue },
      });
    } catch (err: unknown) {
      console.warn("[profileService] Failed to mark downstream snapshots stale:", err);
    }
  }
}

export const profileService = new ProfileService();
