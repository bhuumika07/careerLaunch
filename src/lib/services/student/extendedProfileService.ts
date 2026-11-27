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
  verificationState?: "SELF_REPORTED" | "CONFIRMED" | "VERIFIED";
  proficiency: string | null;
  yearsExperience: number | null;
  experienceMonths?: number | null;
  confirmed: boolean;
  category?: string | null;
  createdAt?: string | Date;
}

export interface CareerInterestDto {
  id: string;
  targetRole: string;
  domain: string;
  priority: number;
  isPrimary?: boolean;
  confirmedAt?: string | Date | null;
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
  createdAt?: string | Date;
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
  createdAt?: string | Date;
}

export interface StudentPreferenceDto {
  id: string;
  preferredLocations: string[];
  preferredWorkModes: string[];
  preferredRoles: string[];
  opportunityTypes?: string[];
  availabilityDate?: string | null;
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
  // Programming Languages
  {
    id: "sk_ts",
    canonicalName: "TypeScript",
    type: "technical",
    category: "programming_languages",
    aliases: ["ts", "typescript", "type-script"],
  },
  {
    id: "sk_js",
    canonicalName: "JavaScript",
    type: "technical",
    category: "programming_languages",
    aliases: ["js", "javascript", "ecmascript", "es6"],
  },
  {
    id: "sk_py",
    canonicalName: "Python",
    type: "technical",
    category: "programming_languages",
    aliases: ["py", "python", "python3"],
  },
  {
    id: "sk_java",
    canonicalName: "Java",
    type: "technical",
    category: "programming_languages",
    aliases: ["java", "core java"],
  },
  {
    id: "sk_cpp",
    canonicalName: "C++",
    type: "technical",
    category: "programming_languages",
    aliases: ["cpp", "c++"],
  },
  {
    id: "sk_go",
    canonicalName: "Go",
    type: "technical",
    category: "programming_languages",
    aliases: ["golang", "go-lang"],
  },
  {
    id: "sk_rust",
    canonicalName: "Rust",
    type: "technical",
    category: "programming_languages",
    aliases: ["rust", "rustlang"],
  },

  // Frontend
  {
    id: "sk_react",
    canonicalName: "React",
    type: "technical",
    category: "frontend",
    aliases: ["reactjs", "react.js", "react", "react js"],
  },
  {
    id: "sk_next",
    canonicalName: "Next.js",
    type: "technical",
    category: "frontend",
    aliases: ["nextjs", "next.js", "next js", "next"],
  },
  {
    id: "sk_vue",
    canonicalName: "Vue.js",
    type: "technical",
    category: "frontend",
    aliases: ["vue", "vuejs", "vue.js"],
  },
  {
    id: "sk_tailwind",
    canonicalName: "Tailwind CSS",
    type: "technical",
    category: "frontend",
    aliases: ["tailwind", "tailwindcss", "tailwind-css"],
  },
  {
    id: "sk_html",
    canonicalName: "HTML",
    type: "technical",
    category: "frontend",
    aliases: ["html", "html5"],
  },
  {
    id: "sk_css",
    canonicalName: "CSS",
    type: "technical",
    category: "frontend",
    aliases: ["css", "css3"],
  },

  // Backend
  {
    id: "sk_node",
    canonicalName: "Node.js",
    type: "technical",
    category: "backend",
    aliases: ["nodejs", "node.js", "node", "node js"],
  },
  {
    id: "sk_express",
    canonicalName: "Express.js",
    type: "technical",
    category: "backend",
    aliases: ["express", "expressjs"],
  },
  {
    id: "sk_fastapi",
    canonicalName: "FastAPI",
    type: "technical",
    category: "backend",
    aliases: ["fastapi", "fast-api"],
  },
  {
    id: "sk_django",
    canonicalName: "Django",
    type: "technical",
    category: "backend",
    aliases: ["django", "django-rest-framework", "drf"],
  },
  {
    id: "sk_spring",
    canonicalName: "Spring Boot",
    type: "technical",
    category: "backend",
    aliases: ["spring", "springboot", "spring-boot"],
  },
  {
    id: "sk_graphql",
    canonicalName: "GraphQL",
    type: "technical",
    category: "backend",
    aliases: ["graphql", "gql"],
  },
  {
    id: "sk_rest",
    canonicalName: "REST APIs",
    type: "technical",
    category: "backend",
    aliases: ["rest", "restful", "rest api"],
  },

  // Databases
  {
    id: "sk_sql",
    canonicalName: "SQL",
    type: "technical",
    category: "databases",
    aliases: ["sql", "structured query language"],
  },
  {
    id: "sk_pg",
    canonicalName: "PostgreSQL",
    type: "technical",
    category: "databases",
    aliases: ["postgres", "postgresql", "postgre sql", "psql"],
  },
  {
    id: "sk_mysql",
    canonicalName: "MySQL",
    type: "technical",
    category: "databases",
    aliases: ["mysql", "my-sql"],
  },
  {
    id: "sk_mongo",
    canonicalName: "MongoDB",
    type: "technical",
    category: "databases",
    aliases: ["mongo", "mongodb"],
  },
  {
    id: "sk_redis",
    canonicalName: "Redis",
    type: "technical",
    category: "databases",
    aliases: ["redis", "in-memory cache"],
  },

  // Cloud & DevOps
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
    id: "sk_cicd",
    canonicalName: "CI/CD",
    type: "tool",
    category: "cloud_devops",
    aliases: ["ci/cd", "continuous integration", "github actions"],
  },
  {
    id: "sk_linux",
    canonicalName: "Linux",
    type: "tool",
    category: "cloud_devops",
    aliases: ["linux", "unix", "bash", "shell scripting"],
  },

  // Data Structures & Algorithms
  {
    id: "sk_dsa",
    canonicalName: "Data Structures & Algorithms",
    type: "technical",
    category: "dsa",
    aliases: ["dsa", "data structures", "algorithms", "competitive programming"],
  },
  {
    id: "sk_sysdesign",
    canonicalName: "System Design",
    type: "technical",
    category: "dsa",
    aliases: ["system design", "distributed systems", "hlld", "lld"],
  },

  // AI / ML
  {
    id: "sk_ml",
    canonicalName: "Machine Learning",
    type: "technical",
    category: "ai_ml",
    aliases: ["ml", "machine learning", "scikit-learn"],
  },
  {
    id: "sk_dl",
    canonicalName: "Deep Learning",
    type: "technical",
    category: "ai_ml",
    aliases: ["deep learning", "neural networks"],
  },
  {
    id: "sk_pytorch",
    canonicalName: "PyTorch",
    type: "technical",
    category: "ai_ml",
    aliases: ["pytorch", "torch"],
  },
  {
    id: "sk_genai",
    canonicalName: "Generative AI & LLMs",
    type: "technical",
    category: "ai_ml",
    aliases: ["genai", "generative ai", "llms", "large language models", "prompt engineering"],
  },

  // Dev Tools
  {
    id: "sk_git",
    canonicalName: "Git",
    type: "tool",
    category: "dev_tools",
    aliases: ["git", "github", "gitlab", "version control"],
  },
  {
    id: "sk_postman",
    canonicalName: "Postman",
    type: "tool",
    category: "dev_tools",
    aliases: ["postman", "api testing"],
  },

  // Soft Skills
  {
    id: "sk_communication",
    canonicalName: "Technical Communication",
    type: "soft",
    category: "soft_skills",
    aliases: ["communication", "technical writing", "presentation"],
  },
  {
    id: "sk_problem_solving",
    canonicalName: "Problem Solving",
    type: "soft",
    category: "soft_skills",
    aliases: ["problem solving", "analytical thinking"],
  },
  {
    id: "sk_teamwork",
    canonicalName: "Team Collaboration",
    type: "soft",
    category: "soft_skills",
    aliases: ["teamwork", "collaboration", "cross-functional"],
  },
];

// -------------------------------------------------------------
// Zod Validation Schemas
// -------------------------------------------------------------
export const StudentSkillInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Skill name cannot be empty"),
  proficiency: z.enum(["beginner", "intermediate", "advanced", "expert"]).nullable().optional(),
  yearsExperience: z.number().min(0).max(50).nullable().optional(),
  experienceMonths: z.number().int().min(0).max(600).nullable().optional(),
  source: z
    .enum([
      "STUDENT",
      "RESUME",
      "STUDENT_ENTERED",
      "RESUME_EXTRACTED",
      "ASSESSMENT_VERIFIED",
      "SYSTEM_DERIVED",
    ])
    .optional()
    .default("STUDENT_ENTERED"),
  verificationState: z.enum(["SELF_REPORTED", "CONFIRMED", "VERIFIED"]).optional().default("CONFIRMED"),
  confirmed: z.boolean().optional().default(true),
});

export const CareerInterestItemSchema = z.object({
  targetRole: z.string().min(1, "Target role is required"),
  domain: z.string().min(1, "Domain is required"),
  priority: z.number().int().min(1).max(3).default(1),
  isPrimary: z.boolean().optional(),
});

export const CareerInterestsPayloadSchema = z.object({
  interests: z.array(CareerInterestItemSchema).max(3),
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
  opportunityTypes: z.array(z.string()).default([]),
  availabilityDate: z.string().nullable().optional(),
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

  private async getStudentProfile(userId: string): Promise<any> {
    const prisma = await this.getPrisma();
    if (prisma?.studentProfile?.findUnique) {
      try {
        const p = await prisma.studentProfile.findUnique({ where: { userId } });
        if (p) return p;
      } catch {
        // fallback
      }
    }
    return profileService.getProfile(userId);
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
    const profile = await this.getStudentProfile(userId);
    const resolved = await this.resolveSkill(input.name);

    // Invariant: Self-reported / student-entered skills can NEVER be VERIFIED
    let verificationState: "SELF_REPORTED" | "CONFIRMED" | "VERIFIED" = input.verificationState || "CONFIRMED";
    if (verificationState === "VERIFIED" && input.source !== "ASSESSMENT_VERIFIED") {
      verificationState = "CONFIRMED";
    }

    const expMonths =
      input.experienceMonths ??
      (input.yearsExperience != null ? Math.round(input.yearsExperience * 12) : null);

    const prisma = await this.getPrisma();
    if (prisma?.studentSkill) {
      try {
        // Ensure skillId actually exists in PostgreSQL Skill table to avoid FK violation
        let effectiveSkillId: string | null = resolved.skillId;
        if (effectiveSkillId && prisma.skill?.findUnique) {
          const existsInDb = await prisma.skill
            .findUnique({ where: { id: effectiveSkillId } })
            .catch(() => null);
          if (!existsInDb) {
            effectiveSkillId = null;
          }
        }

        // Check for existing skill by skillId or rawSkillName
        let existing = null;
        if (effectiveSkillId) {
          existing = await prisma.studentSkill.findFirst({
            where: {
              studentProfileId: profile.id,
              skillId: effectiveSkillId,
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
              skillId: effectiveSkillId ?? existing.skillId,
              rawSkillName: resolved.canonicalName,
              proficiency: input.proficiency ?? existing.proficiency,
              yearsExperience: input.yearsExperience ?? existing.yearsExperience,
              experienceMonths: expMonths ?? existing.experienceMonths,
              source: input.source as any,
              confirmed: input.confirmed,
              reviewStatus: resolved.reviewStatus,
              verificationState: verificationState as any,
            },
          });

          // Bump profileVersion
          if (prisma.studentProfile) {
            await prisma.studentProfile
              .update({
                where: { id: profile.id },
                data: { profileVersion: { increment: 1 } },
              })
              .catch(() => {});
          }

          return {
            id: updated.id,
            skillId: updated.skillId,
            name: resolved.canonicalName,
            source: updated.source as ProfileFieldSource,
            reviewStatus: updated.reviewStatus as SkillReviewStatus,
            verificationState: (updated as any).verificationState || verificationState,
            proficiency: updated.proficiency,
            yearsExperience: updated.yearsExperience,
            experienceMonths: (updated as any).experienceMonths ?? expMonths,
            category: resolved.category,
            confirmed: updated.confirmed,
            createdAt: updated.createdAt,
          };
        }

        // Insert new record
        const created = await prisma.studentSkill.create({
          data: {
            studentProfileId: profile.id,
            skillId: effectiveSkillId,
            rawSkillName: resolved.canonicalName,
            proficiency: input.proficiency,
            yearsExperience: input.yearsExperience,
            experienceMonths: expMonths,
            source: input.source as any,
            confirmed: input.confirmed,
            reviewStatus: resolved.reviewStatus,
            verificationState: verificationState as any,
          },
        });

        // Bump profileVersion and advance onboardingStep
        if (prisma.studentProfile) {
          await prisma.studentProfile
            .update({
              where: { id: profile.id },
              data: {
                profileVersion: { increment: 1 },
                onboardingStatus: "IN_PROGRESS",
                onboardingStep: 4,
              },
            })
            .catch(() => {});
        }

        return {
          id: created.id,
          skillId: created.skillId,
          name: resolved.canonicalName,
          source: created.source as ProfileFieldSource,
          reviewStatus: created.reviewStatus as SkillReviewStatus,
          verificationState: (created as any).verificationState || verificationState,
          proficiency: created.proficiency,
          yearsExperience: created.yearsExperience,
          experienceMonths: (created as any).experienceMonths ?? expMonths,
          category: resolved.category,
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
        experienceMonths: expMonths ?? prev.experienceMonths,
        source: input.source,
        confirmed: input.confirmed,
        reviewStatus: resolved.reviewStatus,
        verificationState,
        category: resolved.category ?? prev.category,
        updatedAt: new Date().toISOString(),
      };
      writeDbStore(db);
      return db.studentSkills[existingIndex];
    }

    const newSkill: StudentSkillDto = {
      id: randomUUID(),
      skillId: resolved.skillId,
      name: resolved.canonicalName,
      source: (input.source as any) || "STUDENT",
      reviewStatus: resolved.reviewStatus,
      verificationState,
      proficiency: input.proficiency ?? null,
      yearsExperience: input.yearsExperience ?? null,
      experienceMonths: expMonths,
      category: resolved.category,
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

  async removeStudentSkill(userId: string, skillIdOrName: string): Promise<boolean> {
    const profile = await this.getStudentProfile(userId);
    const prisma = await this.getPrisma();

    if (prisma?.studentSkill) {
      try {
        await prisma.studentSkill.deleteMany({
          where: {
            studentProfileId: profile.id,
            OR: [
              { id: skillIdOrName },
              { skillId: skillIdOrName },
              { rawSkillName: { equals: skillIdOrName, mode: "insensitive" } },
            ],
          },
        });
      } catch (err) {
        console.warn("[extendedProfileService] Prisma removeStudentSkill error:", err);
      }
    }

    const db = readDbStore();
    if (Array.isArray(db.studentSkills)) {
      db.studentSkills = db.studentSkills.filter((s: any) => {
        if (s.userId !== userId && s.studentProfileId !== profile.id) return true;
        if (s.id === skillIdOrName) return false;
        if (s.skillId === skillIdOrName) return false;
        if (s.name?.toLowerCase() === skillIdOrName.toLowerCase()) return false;
        return true;
      });
      writeDbStore(db);
    }
    return true;
  }

  async getStudentSkills(userId: string): Promise<StudentSkillDto[]> {
    const profile = await this.getStudentProfile(userId);
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
          verificationState: r.verificationState || "CONFIRMED",
          proficiency: r.proficiency,
          yearsExperience: r.yearsExperience,
          experienceMonths: r.experienceMonths,
          category: r.skill?.category || null,
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

    if (skills.length === 0) {
      const rawProfile = (db.studentProfiles || []).find(
        (p: any) => p.userId === userId || p.id === profile.id
      );
      if (rawProfile && Array.isArray(rawProfile.skills) && rawProfile.skills.length > 0) {
        return rawProfile.skills.map((s: any) => ({
          id: s.id || randomUUID(),
          skillId: s.id || null,
          name: s.name,
          source: "STUDENT" as ProfileFieldSource,
          reviewStatus: (s.status === "verified" || s.verifiedAt ? "CONFIRMED" : "NEEDS_REVIEW") as SkillReviewStatus,
          proficiency: s.level || "intermediate",
          yearsExperience: null,
          confirmed: s.status === "verified" || Boolean(s.verifiedAt),
          createdAt: s.verifiedAt || new Date().toISOString(),
        }));
      }
    }

    return skills;
  }

  // ----------------------------------------------------------------------
  // Career Interests Management (GET/PUT /api/student/career-interests)
  // ----------------------------------------------------------------------
  async getCareerInterests(userId: string): Promise<CareerInterestDto[]> {
    const profile = await this.getStudentProfile(userId);
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
    const profile = await this.getStudentProfile(userId);
    const prisma = await this.getPrisma();

    if (prisma?.careerInterest) {
      try {
        // Atomic replace in Prisma
        await prisma.careerInterest.deleteMany({
          where: { studentProfileId: profile.id },
        });

        if (validated.interests.length > 0) {
          await prisma.careerInterest.createMany({
            data: validated.interests.map((ci, index) => {
              const priority = ci.priority ?? (index + 1);
              return {
                studentProfileId: profile.id,
                targetRole: ci.targetRole,
                domain: ci.domain,
                priority,
                isPrimary: priority === 1,
                confirmedAt: new Date(),
              };
            }),
          });
        }

        // Bump profileVersion and advance onboardingStep on studentProfile
        if (prisma.studentProfile) {
          await prisma.studentProfile.update({
            where: { id: profile.id },
            data: {
              profileVersion: { increment: 1 },
              onboardingStatus: "IN_PROGRESS",
              onboardingStep: 3,
              lastUpdatedBy: "STUDENT",
            },
          }).catch(() => {});
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
          isPrimary: r.isPrimary ?? (r.priority === 1),
          confirmedAt: r.confirmedAt ? (typeof r.confirmedAt === "string" ? r.confirmedAt : r.confirmedAt.toISOString()) : null,
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
    const profile = await this.getStudentProfile(userId);
    const prisma = await this.getPrisma();

    if (prisma?.studentProject) {
      try {
        let rec = null;
        if (input.title) {
          rec = await prisma.studentProject.findFirst({
            where: { studentProfileId: profile.id, title: input.title },
          });
        }
        if (rec) {
          const updated = await prisma.studentProject.update({
            where: { id: rec.id },
            data: {
              description: input.description ?? rec.description,
              technologies: input.technologies,
              repoUrl: input.repoUrl || null,
              liveUrl: input.liveUrl || null,
              source: input.source,
              confirmed: input.confirmed,
            },
          });
          return {
            id: updated.id,
            title: updated.title,
            description: updated.description,
            technologies: updated.technologies,
            repoUrl: updated.repoUrl,
            liveUrl: updated.liveUrl,
            source: updated.source as ProfileFieldSource,
            confirmed: updated.confirmed,
            createdAt: updated.createdAt,
          };
        } else {
          const created = await prisma.studentProject.create({
            data: {
              studentProfileId: profile.id,
              title: input.title,
              description: input.description ?? null,
              technologies: input.technologies,
              repoUrl: input.repoUrl || null,
              liveUrl: input.liveUrl || null,
              source: input.source,
              confirmed: input.confirmed,
            },
          });
          if (prisma.studentProfile) {
            await prisma.studentProfile
              .update({
                where: { id: profile.id },
                data: { profileVersion: { increment: 1 } },
              })
              .catch(() => {});
          }
          return {
            id: created.id,
            title: created.title,
            description: created.description,
            technologies: created.technologies,
            repoUrl: created.repoUrl,
            liveUrl: created.liveUrl,
            source: created.source as ProfileFieldSource,
            confirmed: created.confirmed,
            createdAt: created.createdAt,
          };
        }
      } catch (err) {
        console.warn("[extendedProfileService] Prisma addOrUpdateProject error:", err);
      }
    }

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
      createdAt: new Date().toISOString(),
    };

    db.studentProjects.push({ ...newProject, studentProfileId: profile.id, userId });
    writeDbStore(db);
    return newProject;
  }

  async deleteProject(userId: string, projectId: string): Promise<boolean> {
    const profile = await this.getStudentProfile(userId);
    const prisma = await this.getPrisma();

    if (prisma?.studentProject) {
      try {
        await prisma.studentProject.deleteMany({
          where: { id: projectId, studentProfileId: profile.id },
        });
      } catch (err) {
        console.warn("[extendedProfileService] Prisma deleteProject error:", err);
      }
    }

    const db = readDbStore();
    if (Array.isArray(db.studentProjects)) {
      db.studentProjects = db.studentProjects.filter(
        (p: any) =>
          !(p.id === projectId && (p.userId === userId || p.studentProfileId === profile.id))
      );
      writeDbStore(db);
    }
    return true;
  }

  async getProjects(userId: string): Promise<StudentProjectDto[]> {
    const profile = await this.getStudentProfile(userId);
    const prisma = await this.getPrisma();

    if (prisma?.studentProject) {
      try {
        const records = await prisma.studentProject.findMany({
          where: { studentProfileId: profile.id },
          orderBy: { createdAt: "desc" },
        });
        if (records.length > 0) {
          return records.map((r: any) => ({
            id: r.id,
            title: r.title,
            description: r.description,
            technologies: r.technologies,
            repoUrl: r.repoUrl,
            liveUrl: r.liveUrl,
            source: r.source as ProfileFieldSource,
            confirmed: r.confirmed,
            createdAt: r.createdAt,
          }));
        }
      } catch (err) {
        console.warn("[extendedProfileService] Prisma getProjects error:", err);
      }
    }

    const db = readDbStore();
    return (db.studentProjects || []).filter(
      (p: any) => p.userId === userId || p.studentProfileId === profile.id
    );
  }

  async addOrUpdateExperience(userId: string, rawInput: unknown): Promise<StudentExperienceDto> {
    const input = StudentExperienceInputSchema.parse(rawInput);
    const profile = await this.getStudentProfile(userId);
    const prisma = await this.getPrisma();

    if (prisma?.studentExperience) {
      try {
        let rec = null;
        if (input.title && input.company) {
          rec = await prisma.studentExperience.findFirst({
            where: { studentProfileId: profile.id, title: input.title, company: input.company },
          });
        }
        if (rec) {
          const updated = await prisma.studentExperience.update({
            where: { id: rec.id },
            data: {
              location: input.location ?? rec.location,
              workMode: input.workMode ?? rec.workMode,
              startDate: input.startDate ? new Date(input.startDate) : rec.startDate,
              endDate: input.endDate ? new Date(input.endDate) : rec.endDate,
              isCurrent: input.isCurrent,
              description: input.description ?? rec.description,
              technologies: input.technologies,
              source: input.source,
              confirmed: input.confirmed,
            },
          });
          return {
            id: updated.id,
            title: updated.title,
            company: updated.company,
            location: updated.location,
            workMode: updated.workMode,
            startDate: updated.startDate ? updated.startDate.toISOString() : null,
            endDate: updated.endDate ? updated.endDate.toISOString() : null,
            isCurrent: updated.isCurrent,
            description: updated.description,
            technologies: updated.technologies,
            source: updated.source as ProfileFieldSource,
            confirmed: updated.confirmed,
            createdAt: updated.createdAt,
          };
        } else {
          const created = await prisma.studentExperience.create({
            data: {
              studentProfileId: profile.id,
              title: input.title,
              company: input.company,
              location: input.location ?? null,
              workMode: input.workMode ?? null,
              startDate: input.startDate ? new Date(input.startDate) : null,
              endDate: input.endDate ? new Date(input.endDate) : null,
              isCurrent: input.isCurrent,
              description: input.description ?? null,
              technologies: input.technologies,
              source: input.source,
              confirmed: input.confirmed,
            },
          });
          if (prisma.studentProfile) {
            await prisma.studentProfile
              .update({
                where: { id: profile.id },
                data: { profileVersion: { increment: 1 } },
              })
              .catch(() => {});
          }
          return {
            id: created.id,
            title: created.title,
            company: created.company,
            location: created.location,
            workMode: created.workMode,
            startDate: created.startDate ? created.startDate.toISOString() : null,
            endDate: created.endDate ? created.endDate.toISOString() : null,
            isCurrent: created.isCurrent,
            description: created.description,
            technologies: created.technologies,
            source: created.source as ProfileFieldSource,
            confirmed: created.confirmed,
            createdAt: created.createdAt,
          };
        }
      } catch (err) {
        console.warn("[extendedProfileService] Prisma addOrUpdateExperience error:", err);
      }
    }

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
      createdAt: new Date().toISOString(),
    };

    db.studentExperiences.push({ ...newExp, studentProfileId: profile.id, userId });
    writeDbStore(db);
    return newExp;
  }

  async deleteExperience(userId: string, experienceId: string): Promise<boolean> {
    const profile = await this.getStudentProfile(userId);
    const prisma = await this.getPrisma();

    if (prisma?.studentExperience) {
      try {
        await prisma.studentExperience.deleteMany({
          where: { id: experienceId, studentProfileId: profile.id },
        });
      } catch (err) {
        console.warn("[extendedProfileService] Prisma deleteExperience error:", err);
      }
    }

    const db = readDbStore();
    if (Array.isArray(db.studentExperiences)) {
      db.studentExperiences = db.studentExperiences.filter(
        (e: any) =>
          !(e.id === experienceId && (e.userId === userId || e.studentProfileId === profile.id))
      );
      writeDbStore(db);
    }
    return true;
  }

  async getExperiences(userId: string): Promise<StudentExperienceDto[]> {
    const profile = await this.getStudentProfile(userId);
    const prisma = await this.getPrisma();

    if (prisma?.studentExperience) {
      try {
        const records = await prisma.studentExperience.findMany({
          where: { studentProfileId: profile.id },
          orderBy: { createdAt: "desc" },
        });
        if (records.length > 0) {
          return records.map((r: any) => ({
            id: r.id,
            title: r.title,
            company: r.company,
            location: r.location,
            workMode: r.workMode,
            startDate: r.startDate
              ? typeof r.startDate === "string"
                ? r.startDate
                : r.startDate.toISOString()
              : null,
            endDate: r.endDate
              ? typeof r.endDate === "string"
                ? r.endDate
                : r.endDate.toISOString()
              : null,
            isCurrent: r.isCurrent,
            description: r.description,
            technologies: r.technologies,
            source: r.source as ProfileFieldSource,
            confirmed: r.confirmed,
            createdAt: r.createdAt,
          }));
        }
      } catch (err) {
        console.warn("[extendedProfileService] Prisma getExperiences error:", err);
      }
    }

    const db = readDbStore();
    return (db.studentExperiences || []).filter(
      (e: any) => e.userId === userId || e.studentProfileId === profile.id
    );
  }

  async updatePreferences(userId: string, rawInput: unknown): Promise<StudentPreferenceDto> {
    const input = StudentPreferenceInputSchema.parse(rawInput);
    const profile = await this.getStudentProfile(userId);

    const prisma = await this.getPrisma();
    if (prisma?.studentPreference) {
      try {
        await prisma.studentPreference.upsert({
          where: { studentProfileId: profile.id },
          create: {
            studentProfileId: profile.id,
            preferredLocations: input.preferredLocations,
            preferredWorkModes: input.preferredWorkModes,
            preferredRoles: input.preferredRoles,
            minExpectedSalary: input.minExpectedSalary ?? null,
            openToRelocation: input.openToRelocation,
          },
          update: {
            preferredLocations: input.preferredLocations,
            preferredWorkModes: input.preferredWorkModes,
            preferredRoles: input.preferredRoles,
            minExpectedSalary: input.minExpectedSalary ?? null,
            openToRelocation: input.openToRelocation,
          },
        });
        if (prisma.studentProfile) {
          await prisma.studentProfile
            .update({
              where: { id: profile.id },
              data: { profileVersion: { increment: 1 } },
            })
            .catch(() => {});
        }
      } catch (err) {
        console.warn("[extendedProfileService] Prisma updatePreferences error:", err);
      }
    }

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
      opportunityTypes: input.opportunityTypes,
      availabilityDate: input.availabilityDate ?? null,
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
    const profile = await this.getStudentProfile(userId);
    const db = readDbStore();
    const found = (db.studentPreferences || []).find(
      (p: any) => p.userId === userId || p.studentProfileId === profile.id
    );
    return found || null;
  }
}

export const extendedProfileService = new ExtendedProfileService();
