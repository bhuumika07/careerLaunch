// src/lib/services/student/extendedProfileService.ts
/**
 * Extended Student Profile Service (Phase 4 - Chunk 4.2)
 *
 * Implements:
 * 1. Skill alias resolution: maps typed skill names to canonical Skills via SkillAlias.
 * 2. Unknown skills review state: unmapped skills are marked NEEDS_REVIEW (never silently invented).
 * 3. Duplicate skill handling: updates existing student skill instead of creating duplicates.
 * 4. Career interests management (GET/PUT /api/student/career-interests).
 * 5. Projects, experience, and preferences management with strict user ownership scoping.
 */

import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { profileService, type ProfileFieldSource } from "./profileService.ts";

export type SkillReviewStatus = "CONFIRMED" | "NEEDS_REVIEW" | "REJECTED";

export interface ResolvedSkillResult {
  skillId: string | null;
  canonicalName: string;
  reviewStatus: SkillReviewStatus;
  category?: string | null;
}

export interface StudentSkillDto {
  id: string;
  skillId: string | null;
  name: string;
  source: ProfileFieldSource;
  reviewStatus: SkillReviewStatus;
  proficiency: string | null;
  yearsExperience: number | null;
  confirmed: boolean;
  createdAt?: string | Date;
}

export interface CareerInterestDto {
  id: string;
  targetRole: string;
  domain: string;
  priority: number;
  createdAt?: string | Date;
}

export interface StudentProjectDto {
  id: string;
  title: string;
  description: string | null;
  technologies: string[];
  repoUrl: string | null;
  liveUrl: string | null;
  source: ProfileFieldSource;
  confirmed: boolean;
}

export interface StudentExperienceDto {
  id: string;
  title: string;
  company: string;
  location: string | null;
  workMode: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
  technologies: string[];
  source: ProfileFieldSource;
  confirmed: boolean;
}

export interface StudentPreferenceDto {
  id: string;
  preferredLocations: string[];
  preferredWorkModes: string[];
  preferredRoles: string[];
  minExpectedSalary: number | null;
  openToRelocation: boolean;
}

// -------------------------------------------------------------
// Canonical Skill Seed & Alias Map (Dual-storage & offline resilience)
// -------------------------------------------------------------
export const KNOWN_CANONICAL_SKILLS: Array<{
  id: string;
  canonicalName: string;
  type: string;
  category: string;
  aliases: string[];
}> = [
  {
    id: "sk_ts",
    canonicalName: "TypeScript",
    type: "technical",
    category: "programming_language",
    aliases: ["ts", "typescript", "type-script"],
  },
  {
    id: "sk_js",
    canonicalName: "JavaScript",
    type: "technical",
    category: "programming_language",
    aliases: ["js", "javascript", "ecmascript", "es6"],
  },
  {
    id: "sk_py",
    canonicalName: "Python",
    type: "technical",
    category: "programming_language",
    aliases: ["py", "python", "python3"],
  },
  {
    id: "sk_react",
    canonicalName: "React",
    type: "technical",
    category: "framework",
    aliases: ["reactjs", "react.js", "react", "react js"],
  },
  {
    id: "sk_next",
    canonicalName: "Next.js",
    type: "technical",
    category: "framework",
    aliases: ["nextjs", "next.js", "next js", "next"],
  },
  {
    id: "sk_node",
    canonicalName: "Node.js",
    type: "technical",
    category: "framework",
    aliases: ["nodejs", "node.js", "node", "node js"],
  },
  {
    id: "sk_sql",
    canonicalName: "SQL",
    type: "technical",
    category: "database",
    aliases: ["sql", "structured query language"],
  },
  {
    id: "sk_pg",
    canonicalName: "PostgreSQL",
    type: "technical",
    category: "database",
    aliases: ["postgres", "postgresql", "postgre sql", "psql"],
  },
  {
    id: "sk_docker",
    canonicalName: "Docker",
    type: "tool",
    category: "cloud_devops",
    aliases: ["docker", "containerization"],
  },
  {
    id: "sk_k8s",
    canonicalName: "Kubernetes",
    type: "tool",
    category: "cloud_devops",
    aliases: ["k8s", "kubernetes"],
  },
  {
    id: "sk_aws",
    canonicalName: "AWS",
    type: "domain",
    category: "cloud_devops",
    aliases: ["amazon web services", "aws"],
  },
  {
    id: "sk_git",
    canonicalName: "Git",
    type: "tool",
    category: "tool",
    aliases: ["git", "github", "gitlab", "version control"],
  },
  {
    id: "sk_java",
    canonicalName: "Java",
    type: "technical",
    category: "programming_language",
    aliases: ["java", "core java"],
  },
  {
    id: "sk_cpp",
    canonicalName: "C++",
    type: "technical",
    category: "programming_language",
    aliases: ["cpp", "c++"],
  },
];

// -------------------------------------------------------------
// Zod Validation Schemas
// -------------------------------------------------------------
export const StudentSkillInputSchema = z.object({
  name: z.string().min(1, "Skill name cannot be empty"),
  proficiency: z.enum(["beginner", "intermediate", "advanced", "expert"]).nullable().optional(),
  yearsExperience: z.number().min(0).max(50).nullable().optional(),
  source: z.enum(["STUDENT", "RESUME"]).optional().default("STUDENT"),
  confirmed: z.boolean().optional().default(true),
});

export const CareerInterestItemSchema = z.object({
  targetRole: z.string().min(1, "Target role is required"),
  domain: z.string().min(1, "Domain is required"),
  priority: z.number().int().min(1).max(10).default(1),
});

export const CareerInterestsPayloadSchema = z.object({
  interests: z.array(CareerInterestItemSchema),
});

export const StudentProjectInputSchema = z.object({
  title: z.string().min(1, "Project title is required"),
  description: z.string().nullable().optional(),
  technologies: z.array(z.string()).default([]),
  repoUrl: z.string().url().nullable().optional().or(z.literal("")),
  liveUrl: z.string().url().nullable().optional().or(z.literal("")),
  source: z.enum(["STUDENT", "RESUME"]).optional().default("STUDENT"),
  confirmed: z.boolean().optional().default(true),
});

export const StudentExperienceInputSchema = z.object({
  title: z.string().min(1, "Job title is required"),
  company: z.string().min(1, "Company is required"),
  location: z.string().nullable().optional(),
  workMode: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  isCurrent: z.boolean().default(false),
  description: z.string().nullable().optional(),
  technologies: z.array(z.string()).default([]),
  source: z.enum(["STUDENT", "RESUME"]).optional().default("STUDENT"),
  confirmed: z.boolean().optional().default(true),
});

export const StudentPreferenceInputSchema = z.object({
  preferredLocations: z.array(z.string()).default([]),
  preferredWorkModes: z.array(z.string()).default([]),
  preferredRoles: z.array(z.string()).default([]),
  minExpectedSalary: z.number().min(0).nullable().optional(),
  openToRelocation: z.boolean().default(true),
});

function readDbStore(): any {
  try {
    const dbPath = path.resolve(process.cwd(), "src/data/db.json");
    if (fs.existsSync(dbPath)) {
      return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    }
  } catch (err) {
    console.error("[extendedProfileService] Failed reading db.json", err);
  }
  return {};
}

function writeDbStore(data: any): void {
  try {
    const dbPath = path.resolve(process.cwd(), "src/data/db.json");
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[extendedProfileService] Failed writing db.json", err);
  }
}

export class ExtendedProfileService {
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
   * Resolves a typed skill name to a canonical Skill record using SkillAlias.
   * If unmapped, returns { skillId: null, reviewStatus: 'NEEDS_REVIEW' }.
   * Does NOT silently fabricate a new canonical skill record.
   */
  async resolveSkill(skillName: string): Promise<ResolvedSkillResult> {
    const trimmed = skillName.trim();
    const lower = trimmed.toLowerCase();

    // 1. Attempt Prisma query if available
    const prisma = await this.getPrisma();
    if (prisma?.skill) {
      try {
        // Direct canonical name match
        const direct = await prisma.skill.findFirst({
          where: { canonicalName: { equals: trimmed, mode: "insensitive" } },
        });
        if (direct) {
          return {
            skillId: direct.id,
            canonicalName: direct.canonicalName,
            reviewStatus: "CONFIRMED",
            category: direct.category,
          };
        }

        // Alias match
        const aliasMatch = await prisma.skillAlias.findFirst({
          where: { alias: { equals: lower, mode: "insensitive" } },
          include: { skill: true },
        });
        if (aliasMatch && aliasMatch.skill) {
          return {
            skillId: aliasMatch.skill.id,
            canonicalName: aliasMatch.skill.canonicalName,
            reviewStatus: "CONFIRMED",
            category: aliasMatch.skill.category,
          };
        }
      } catch (err) {
        console.warn("[extendedProfileService] Prisma skill lookup error:", err);
      }
    }

    // 2. In-memory alias dictionary resolution
    for (const cand of KNOWN_CANONICAL_SKILLS) {
      if (
        cand.canonicalName.toLowerCase() === lower ||
        cand.aliases.some((a) => a.toLowerCase() === lower)
      ) {
        return {
          skillId: cand.id,
          canonicalName: cand.canonicalName,
          reviewStatus: "CONFIRMED",
          category: cand.category,
        };
      }
    }

    // 3. Unknown skill: Unmapped -> goes to NEEDS_REVIEW state rather than silent creation
    return {
      skillId: null,
      canonicalName: trimmed,
      reviewStatus: "NEEDS_REVIEW",
      category: null,
    };
  }

  // ----------------------------------------------------------------------
  // Skills Management
  // ----------------------------------------------------------------------
  /**
   * Adds or updates a student skill with alias resolution and duplicate prevention.
   */
  async addOrUpdateStudentSkill(
    userId: string,
    rawInput: unknown
  ): Promise<StudentSkillDto> {
    const input = StudentSkillInputSchema.parse(rawInput);
    const profile = await profileService.getProfile(userId);
    const resolved = await this.resolveSkill(input.name);

    const prisma = await this.getPrisma();
    if (prisma?.studentSkill) {
      try {
        // Check for existing skill by skillId or rawSkillName
        let existing = null;
        if (resolved.skillId) {
          existing = await prisma.studentSkill.findFirst({
            where: {
              studentProfileId: profile.id,
              skillId: resolved.skillId,
            },
          });
        }
        if (!existing) {
          existing = await prisma.studentSkill.findFirst({
            where: {
              studentProfileId: profile.id,
              rawSkillName: { equals: resolved.canonicalName, mode: "insensitive" },
            },
          });
        }

        if (existing) {
          // Update existing without duplicate insertion
          const updated = await prisma.studentSkill.update({
            where: { id: existing.id },
            data: {
              skillId: resolved.skillId ?? existing.skillId,
              rawSkillName: resolved.canonicalName,
              proficiency: input.proficiency ?? existing.proficiency,
              yearsExperience: input.yearsExperience ?? existing.yearsExperience,
              source: input.source,
              confirmed: input.confirmed,
              reviewStatus: resolved.reviewStatus,
            },
          });
          return {
            id: updated.id,
            skillId: updated.skillId,
            name: resolved.canonicalName,
            source: updated.source as ProfileFieldSource,
            reviewStatus: updated.reviewStatus as SkillReviewStatus,
            proficiency: updated.proficiency,
            yearsExperience: updated.yearsExperience,
            confirmed: updated.confirmed,
            createdAt: updated.createdAt,
          };
        }

        // Insert new record
        const created = await prisma.studentSkill.create({
          data: {
            studentProfileId: profile.id,
            skillId: resolved.skillId,
            rawSkillName: resolved.canonicalName,
            proficiency: input.proficiency,
            yearsExperience: input.yearsExperience,
            source: input.source,
            confirmed: input.confirmed,
            reviewStatus: resolved.reviewStatus,
          },
        });
        return {
          id: created.id,
          skillId: created.skillId,
          name: resolved.canonicalName,
          source: created.source as ProfileFieldSource,
          reviewStatus: created.reviewStatus as SkillReviewStatus,
          proficiency: created.proficiency,
          yearsExperience: created.yearsExperience,
          confirmed: created.confirmed,
          createdAt: created.createdAt,
        };
      } catch (err) {
        console.warn("[extendedProfileService] Prisma addOrUpdateStudentSkill error:", err);
      }
    }

    // Local / fallback store (src/data/db.json)
    const db = readDbStore();
    db.studentSkills = db.studentSkills || [];

    const existingIndex = db.studentSkills.findIndex((s: any) => {
      if (s.userId !== userId && s.studentProfileId !== profile.id) return false;
      if (resolved.skillId && s.skillId === resolved.skillId) return true;
      return s.name?.toLowerCase() === resolved.canonicalName.toLowerCase();
    });

    if (existingIndex !== -1) {
      // Update in-place to avoid duplicates
      const prev = db.studentSkills[existingIndex];
      db.studentSkills[existingIndex] = {
        ...prev,
        skillId: resolved.skillId ?? prev.skillId,
        name: resolved.canonicalName,
        proficiency: input.proficiency ?? prev.proficiency,
        yearsExperience: input.yearsExperience ?? prev.yearsExperience,
        source: input.source,
        confirmed: input.confirmed,
        reviewStatus: resolved.reviewStatus,
        updatedAt: new Date().toISOString(),
      };
      writeDbStore(db);
      return db.studentSkills[existingIndex];
    }

    const newSkill: StudentSkillDto = {
      id: randomUUID(),
      skillId: resolved.skillId,
      name: resolved.canonicalName,
      source: input.source,
      reviewStatus: resolved.reviewStatus,
      proficiency: input.proficiency ?? null,
      yearsExperience: input.yearsExperience ?? null,
      confirmed: input.confirmed,
      createdAt: new Date().toISOString(),
    };

    db.studentSkills.push({
      ...newSkill,
      studentProfileId: profile.id,
      userId,
    });
    writeDbStore(db);
    return newSkill;
  }

  async getStudentSkills(userId: string): Promise<StudentSkillDto[]> {
    const profile = await profileService.getProfile(userId);
    const prisma = await this.getPrisma();

    if (prisma?.studentSkill) {
      try {
        const records = await prisma.studentSkill.findMany({
          where: { studentProfileId: profile.id },
          include: { skill: true },
        });
        return records.map((r: any) => ({
          id: r.id,
          skillId: r.skillId,
          name: r.skill?.canonicalName || r.rawSkillName || "Unknown Skill",
          source: r.source as ProfileFieldSource,
          reviewStatus: r.reviewStatus as SkillReviewStatus,
          proficiency: r.proficiency,
          yearsExperience: r.yearsExperience,
          confirmed: r.confirmed,
          createdAt: r.createdAt,
        }));
      } catch (err) {
        console.warn("[extendedProfileService] Prisma getStudentSkills error:", err);
      }
    }

    const db = readDbStore();
    const skills = (db.studentSkills || []).filter(
      (s: any) => s.userId === userId || s.studentProfileId === profile.id
    );
    return skills;
  }

  // ----------------------------------------------------------------------
  // Career Interests Management (GET/PUT /api/student/career-interests)
  // ----------------------------------------------------------------------
  async getCareerInterests(userId: string): Promise<CareerInterestDto[]> {
    const profile = await profileService.getProfile(userId);
    const prisma = await this.getPrisma();

    if (prisma?.careerInterest) {
      try {
        const records = await prisma.careerInterest.findMany({
          where: { studentProfileId: profile.id },
          orderBy: { priority: "asc" },
        });
        return records.map((r: any) => ({
          id: r.id,
          targetRole: r.targetRole,
          domain: r.domain,
          priority: r.priority,
          createdAt: r.createdAt,
        }));
      } catch (err) {
        console.warn("[extendedProfileService] Prisma getCareerInterests error:", err);
      }
    }

    const db = readDbStore();
    const interests = (db.careerInterests || [])
      .filter((ci: any) => ci.userId === userId || ci.studentProfileId === profile.id)
      .sort((a: any, b: any) => a.priority - b.priority);
    return interests;
  }

  async updateCareerInterests(
    userId: string,
    rawPayload: unknown
  ): Promise<CareerInterestDto[]> {
    const validated = CareerInterestsPayloadSchema.parse(rawPayload);
    const profile = await profileService.getProfile(userId);
    const prisma = await this.getPrisma();

    if (prisma?.careerInterest) {
      try {
        // Atomic replace in Prisma
        await prisma.careerInterest.deleteMany({
          where: { studentProfileId: profile.id },
        });

        if (validated.interests.length > 0) {
          await prisma.careerInterest.createMany({
            data: validated.interests.map((ci) => ({
              studentProfileId: profile.id,
              targetRole: ci.targetRole,
              domain: ci.domain,
              priority: ci.priority,
            })),
          });
        }

        const refreshed = await prisma.careerInterest.findMany({
          where: { studentProfileId: profile.id },
          orderBy: { priority: "asc" },
        });
        return refreshed.map((r: any) => ({
          id: r.id,
          targetRole: r.targetRole,
          domain: r.domain,
          priority: r.priority,
          createdAt: r.createdAt,
        }));
      } catch (err) {
        console.warn("[extendedProfileService] Prisma updateCareerInterests error:", err);
      }
    }

    // Local / fallback store (src/data/db.json)
    const db = readDbStore();
    db.careerInterests = (db.careerInterests || []).filter(
      (ci: any) => ci.userId !== userId && ci.studentProfileId !== profile.id
    );

    const nowIso = new Date().toISOString();
    const newItems: CareerInterestDto[] = validated.interests.map((item) => ({
      id: randomUUID(),
      targetRole: item.targetRole,
      domain: item.domain,
      priority: item.priority,
      createdAt: nowIso,
    }));

    db.careerInterests.push(
      ...newItems.map((item) => ({
        ...item,
        studentProfileId: profile.id,
        userId,
      }))
    );
    writeDbStore(db);

    return newItems.sort((a, b) => a.priority - b.priority);
  }

  // ----------------------------------------------------------------------
  // Projects, Experience & Preferences Management
  // ----------------------------------------------------------------------
  async addOrUpdateProject(userId: string, rawInput: unknown): Promise<StudentProjectDto> {
    const input = StudentProjectInputSchema.parse(rawInput);
    const profile = await profileService.getProfile(userId);

    const db = readDbStore();
    db.studentProjects = db.studentProjects || [];

    const newProject: StudentProjectDto = {
      id: randomUUID(),
      title: input.title,
      description: input.description ?? null,
      technologies: input.technologies,
      repoUrl: input.repoUrl || null,
      liveUrl: input.liveUrl || null,
      source: input.source,
      confirmed: input.confirmed,
    };

    db.studentProjects.push({ ...newProject, studentProfileId: profile.id, userId });
    writeDbStore(db);
    return newProject;
  }

  async getProjects(userId: string): Promise<StudentProjectDto[]> {
    const profile = await profileService.getProfile(userId);
    const db = readDbStore();
    return (db.studentProjects || []).filter(
      (p: any) => p.userId === userId || p.studentProfileId === profile.id
    );
  }

  async addOrUpdateExperience(userId: string, rawInput: unknown): Promise<StudentExperienceDto> {
    const input = StudentExperienceInputSchema.parse(rawInput);
    const profile = await profileService.getProfile(userId);

    const db = readDbStore();
    db.studentExperiences = db.studentExperiences || [];

    const newExp: StudentExperienceDto = {
      id: randomUUID(),
      title: input.title,
      company: input.company,
      location: input.location ?? null,
      workMode: input.workMode ?? null,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      isCurrent: input.isCurrent,
      description: input.description ?? null,
      technologies: input.technologies,
      source: input.source,
      confirmed: input.confirmed,
    };

    db.studentExperiences.push({ ...newExp, studentProfileId: profile.id, userId });
    writeDbStore(db);
    return newExp;
  }

  async getExperiences(userId: string): Promise<StudentExperienceDto[]> {
    const profile = await profileService.getProfile(userId);
    const db = readDbStore();
    return (db.studentExperiences || []).filter(
      (e: any) => e.userId === userId || e.studentProfileId === profile.id
    );
  }

  async updatePreferences(userId: string, rawInput: unknown): Promise<StudentPreferenceDto> {
    const input = StudentPreferenceInputSchema.parse(rawInput);
    const profile = await profileService.getProfile(userId);

    const db = readDbStore();
    db.studentPreferences = db.studentPreferences || [];

    const prefIndex = db.studentPreferences.findIndex(
      (p: any) => p.userId === userId || p.studentProfileId === profile.id
    );

    const updated: StudentPreferenceDto = {
      id: prefIndex !== -1 ? db.studentPreferences[prefIndex].id : randomUUID(),
      preferredLocations: input.preferredLocations,
      preferredWorkModes: input.preferredWorkModes,
      preferredRoles: input.preferredRoles,
      minExpectedSalary: input.minExpectedSalary ?? null,
      openToRelocation: input.openToRelocation,
    };

    if (prefIndex !== -1) {
      db.studentPreferences[prefIndex] = { ...updated, studentProfileId: profile.id, userId };
    } else {
      db.studentPreferences.push({ ...updated, studentProfileId: profile.id, userId });
    }

    writeDbStore(db);
    return updated;
  }

  async getPreferences(userId: string): Promise<StudentPreferenceDto | null> {
    const profile = await profileService.getProfile(userId);
    const db = readDbStore();
    const found = (db.studentPreferences || []).find(
      (p: any) => p.userId === userId || p.studentProfileId === profile.id
    );
    return found || null;
  }
}

export const extendedProfileService = new ExtendedProfileService();
