// src/lib/services/student/profileService.ts
/**
 * StudentProfile Foundation Service (Phase 4 - Chunk 4.1)
 *
 * Invariants:
 * 1. Authenticated student ID from session only. Never trust client-supplied student IDs.
 * 2. Scoped: User A cannot read or write User B's profile.
 * 3. Partial save: Every field is optional at the API level. Unspecified fields are preserved.
 * 4. Provenance & Confirmation State:
 *    - Tracks per-field source ("STUDENT" | "RESUME") and confirmation state.
 *    - A resume-extracted value NEVER overwrites a student-confirmed value.
 */

import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";

export type ProfileFieldSource = "STUDENT" | "RESUME";

export interface FieldMetadataItem {
  source: ProfileFieldSource;
  confirmed: boolean;
  updatedAt: string;
}

export type FieldMetadataMap = Record<string, FieldMetadataItem>;

export interface StudentProfileEntity {
  id: string;
  userId: string;
  college: string | null;
  degree: string | null;
  branch: string | null;
  currentYear: number | null;
  graduationYear: number | null;
  cgpa: number | null;
  cgpaScale: number | null;
  backlogs: number | null;
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
  source: z.enum(["STUDENT", "RESUME"]).optional().default("STUDENT"),
  confirmed: z.boolean().optional(),
  // Optional explicit per-field confirmation map (e.g. when confirming parsed resume fields)
  fieldConfirmations: z.record(z.string(), z.boolean()).optional(),
});

export type StudentProfileInput = z.infer<typeof StudentProfileInputSchema>;

function readDbStore(): any {
  try {
    const dbPath = path.resolve(process.cwd(), "src/data/db.json");
    if (fs.existsSync(dbPath)) {
      return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    }
  } catch (err) {
    console.error("[profileService] Failed to read db.json:", err);
  }
  return { studentProfiles: [] };
}

function writeDbStore(data: any): void {
  try {
    const dbPath = path.resolve(process.cwd(), "src/data/db.json");
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[profileService] Failed to write db.json:", err);
  }
}

export class ProfileService {
  private prisma: any;

  constructor(prismaClient?: any) {
    this.prisma = prismaClient;
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
   * Retrieves or creates a default StudentProfile entity for a given student userId.
   */
  async getProfile(userId: string): Promise<StudentProfileEntity> {
    if (!userId || typeof userId !== "string") {
      throw new Error("Invalid student userId provided");
    }

    const prisma = await this.getPrisma();
    if (prisma?.studentProfile) {
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
            },
          });
        }

        return {
          id: profile.id,
          userId: profile.userId,
          college: profile.college,
          degree: profile.degree,
          branch: profile.branch,
          currentYear: profile.currentYear,
          graduationYear: profile.graduationYear,
          cgpa: profile.cgpa,
          cgpaScale: profile.cgpaScale ?? 10.0,
          backlogs: profile.backlogs ?? 0,
          fieldMetadata: (profile.fieldMetadata as FieldMetadataMap) || {},
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        };
      } catch (err) {
        console.warn("[profileService] Prisma getProfile error, falling back to local store:", err);
      }
    }

    // Local / fallback storage (src/data/db.json)
    const db = readDbStore();
    db.studentProfiles = db.studentProfiles || [];

    let entry = db.studentProfiles.find((p: any) => p.userId === userId);
    if (!entry) {
      entry = {
        id: randomUUID(),
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.studentProfiles.push(entry);
      writeDbStore(db);
    }

    return {
      id: entry.id || randomUUID(),
      userId: entry.userId,
      college: entry.college ?? entry.institution ?? null,
      degree: entry.degree ?? null,
      branch: entry.branch ?? entry.department ?? null,
      currentYear: entry.currentYear ?? null,
      graduationYear: entry.graduationYear ? Number(entry.graduationYear) : null,
      cgpa: entry.cgpa != null ? Number(entry.cgpa) : null,
      cgpaScale: entry.cgpaScale != null ? Number(entry.cgpaScale) : 10.0,
      backlogs: entry.backlogs != null ? Number(entry.backlogs) : 0,
      fieldMetadata: entry.fieldMetadata || {},
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  /**
   * Updates a student profile with partial data.
   *
   * Enforces:
   * 1. Partial save: Only provided fields are updated; unspecified fields are untouched.
   * 2. Overwrite Protection: If source === 'RESUME' and a field is already confirmed by the student,
   *    the resume-extracted value is rejected/skipped, preserving the student's confirmed value.
   * 3. Provenance tracking: updates fieldMetadata with source and confirmation status.
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
    ] as const;

    const skippedFields: string[] = [];
    const updatedFields: string[] = [];

    const newFieldMetadata: FieldMetadataMap = { ...(existing.fieldMetadata || {}) };
    const updates: Partial<StudentProfileEntity> = {};

    const nowIso = new Date().toISOString();

    for (const key of updatableKeys) {
      if (key in validated && (validated as any)[key] !== undefined) {
        const incomingVal = (validated as any)[key];
        const existingMeta = newFieldMetadata[key];

        // Protection Rule: A resume-extracted value never overwrites a student-confirmed value
        if (source === "RESUME" && existingMeta?.confirmed === true) {
          skippedFields.push(key);
          continue;
        }

        // Apply field update
        (updates as any)[key] = incomingVal;
        updatedFields.push(key);

        const isFieldConfirmed = validated.fieldConfirmations?.[key] ?? defaultConfirmed;

        newFieldMetadata[key] = {
          source,
          confirmed: isFieldConfirmed,
          updatedAt: nowIso,
        };
      }
    }

    updates.fieldMetadata = newFieldMetadata;
    updates.updatedAt = new Date();

    const prisma = await this.getPrisma();
    if (prisma?.studentProfile) {
      try {
        const updated = await prisma.studentProfile.update({
          where: { userId },
          data: {
            ...updates,
            updatedAt: new Date(),
          },
        });

        return {
          profile: {
            id: updated.id,
            userId: updated.userId,
            college: updated.college,
            degree: updated.degree,
            branch: updated.branch,
            currentYear: updated.currentYear,
            graduationYear: updated.graduationYear,
            cgpa: updated.cgpa,
            cgpaScale: updated.cgpaScale ?? 10.0,
            backlogs: updated.backlogs ?? 0,
            fieldMetadata: (updated.fieldMetadata as FieldMetadataMap) || {},
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
          },
          skippedFields,
          updatedFields,
        };
      } catch (err) {
        console.warn("[profileService] Prisma update failed, falling back to local store:", err);
      }
    }

    // Local / fallback store update (src/data/db.json)
    const db = readDbStore();
    db.studentProfiles = db.studentProfiles || [];

    let index = db.studentProfiles.findIndex((p: any) => p.userId === userId);
    if (index === -1) {
      const newEntry = {
        id: randomUUID(),
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
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      db.studentProfiles.push(newEntry);
      index = db.studentProfiles.length - 1;
    }

    const merged = {
      ...db.studentProfiles[index],
      ...updates,
      updatedAt: nowIso,
    };

    // Also mirror to legacy aliases if present
    if (updates.college !== undefined) merged.institution = updates.college;
    if (updates.branch !== undefined) merged.department = updates.branch;

    db.studentProfiles[index] = merged;
    writeDbStore(db);

    return {
      profile: {
        id: merged.id || randomUUID(),
        userId: merged.userId,
        college: merged.college,
        degree: merged.degree,
        branch: merged.branch,
        currentYear: merged.currentYear,
        graduationYear: merged.graduationYear,
        cgpa: merged.cgpa,
        cgpaScale: merged.cgpaScale ?? 10.0,
        backlogs: merged.backlogs ?? 0,
        fieldMetadata: merged.fieldMetadata,
        createdAt: merged.createdAt,
        updatedAt: merged.updatedAt,
      },
      skippedFields,
      updatedFields,
    };
  }
}

export const profileService = new ProfileService();
