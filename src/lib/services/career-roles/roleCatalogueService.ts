// src/lib/services/career-roles/roleCatalogueService.ts
/**
 * Career Role Discovery: Role Catalogue & Deterministic Title Normalizer (Phase 5 - Chunk 5.1)
 *
 * Rules:
 * 1. Role catalogue seeded strictly from real opportunities and skills observed in production.
 * 2. Deterministic title normalizer: maps synonymous titles to one canonical role.
 * 3. Invariant: unmapped titles are left unmapped (null), NEVER guessed or hallucinated.
 * 4. Opportunity-to-role mapping keeps the original opportunity title intact.
 */

import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";

export interface CareerRoleEntity {
  id: string;
  canonicalName: string;
  description: string;
  domain: string;
  aliases: string[];
  requiredSkillIds: string[];
  relatedSkillIds: string[];
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface TitleNormalizationResult {
  canonicalName: string | null;
  roleId: string | null;
  domain: string | null;
  confidence: number;
  matchedAlias?: string | null;
}

/**
 * Verified Canonical Roles Catalogue: Seeded strictly from real opportunities
 * and skills observed in CareerLaunch dataset.
 */
export const OBSERVED_CAREER_ROLES: CareerRoleEntity[] = [
  {
    id: "role_backend_eng",
    canonicalName: "Backend Engineer",
    description: "Designs, builds, and maintains server-side services, databases, APIs, and scalable distributed business logic.",
    domain: "software",
    aliases: [
      "backend engineer",
      "backend developer",
      "back end developer",
      "back-end developer",
      "software engineer, backend",
      "software engineer - backend",
      "software engineer (backend)",
      "server engineer",
      "api engineer",
    ],
    requiredSkillIds: ["Node.js", "Python", "SQL", "PostgreSQL"],
    relatedSkillIds: ["REST APIs", "Go", "Docker", "Redis"],
    isActive: true,
  },
  {
    id: "role_fullstack_eng",
    canonicalName: "Fullstack Engineer",
    description: "Builds comprehensive web applications across client-facing interfaces and backend services.",
    domain: "software",
    aliases: [
      "fullstack engineer",
      "full stack engineer",
      "fullstack developer",
      "full stack developer",
      "full-stack developer",
      "software engineer, fullstack",
      "software engineer, full stack",
      "software engineer - fullstack",
      "software engineer - full stack",
      "software engineer ii, full stack",
      "senior fullstack software engineer",
    ],
    requiredSkillIds: ["TypeScript", "React", "Node.js", "SQL"],
    relatedSkillIds: ["Next.js", "PostgreSQL", "GraphQL", "Git"],
    isActive: true,
  },
  {
    id: "role_software_eng",
    canonicalName: "Software Engineer",
    description: "Generalist software engineering building core product features, systems architecture, and production services.",
    domain: "software",
    aliases: [
      "software engineer",
      "software developer",
      "software engineering intern",
      "software engineer intern",
      "software development engineer",
      "sde",
      "member of technical staff",
      "mts",
    ],
    requiredSkillIds: ["Data Structures", "Algorithms", "Git"],
    relatedSkillIds: ["TypeScript", "Python", "Java", "C++"],
    isActive: true,
  },
  {
    id: "role_ai_ml_eng",
    canonicalName: "Machine Learning & AI Engineer",
    description: "Develops machine learning models, neural architectures, data pipelines, and agentic systems.",
    domain: "data_ai_ml",
    aliases: [
      "ai engineer",
      "machine learning engineer",
      "ml engineer",
      "ai/ml engineer",
      "applied scientist",
      "ai applied scientist",
      "machine learning scientist",
      "ai research intern",
    ],
    requiredSkillIds: ["Python", "Machine Learning"],
    relatedSkillIds: ["PyTorch", "TensorFlow", "Deep Learning", "SQL"],
    isActive: true,
  },
  {
    id: "role_data_eng",
    canonicalName: "Data Engineer",
    description: "Constructs robust data extraction, storage, and transformation pipelines supporting analytics and modeling.",
    domain: "data_ai_ml",
    aliases: [
      "data engineer",
      "data engineer intern",
      "data engineering intern",
      "analytics engineer",
      "big data engineer",
      "etl developer",
    ],
    requiredSkillIds: ["Python", "SQL"],
    relatedSkillIds: ["PostgreSQL", "AWS", "Spark", "Kafka"],
    isActive: true,
  },
  {
    id: "role_data_scientist",
    canonicalName: "Data Scientist",
    description: "Applies statistical modeling, exploratory analysis, and predictive mathematics to solve complex domain questions.",
    domain: "data_ai_ml",
    aliases: [
      "data scientist",
      "data science",
      "data science intern",
      "applied data scientist",
      "decision scientist",
      "quantitative analyst",
    ],
    requiredSkillIds: ["Python", "SQL", "Pandas"],
    relatedSkillIds: ["Statistics", "R", "Scikit-Learn", "Machine Learning"],
    isActive: true,
  },
  {
    id: "role_security_eng",
    canonicalName: "Security Engineer",
    description: "Safeguards application infrastructure, cryptographic protocols, cloud perimeters, and vulnerability postures.",
    domain: "security",
    aliases: [
      "security engineer",
      "security engineer intern",
      "cybersecurity engineer",
      "information security engineer",
      "appsec engineer",
      "security analyst",
    ],
    requiredSkillIds: ["Linux", "Git", "Security"],
    relatedSkillIds: ["AWS", "Go", "Python", "Cryptography"],
    isActive: true,
  },
  {
    id: "role_devops_cloud",
    canonicalName: "Cloud & Platform / DevOps Engineer",
    description: "Maintains cloud infrastructure, CI/CD deployment pipelines, cluster orchestration, and site reliability.",
    domain: "devops_cloud",
    aliases: [
      "cloud engineer",
      "devops engineer",
      "platform engineer",
      "site reliability engineer",
      "sre",
      "infrastructure engineer",
      "systems engineer",
    ],
    requiredSkillIds: ["Docker", "Kubernetes", "Linux"],
    relatedSkillIds: ["AWS", "CI/CD", "Git", "Terraform"],
    isActive: true,
  },
];

/**
 * Standard title cleaner: removes seniority levels, cohorts, locations, and parenthetical noise.
 */
export function cleanRawTitle(rawTitle: string): string {
  if (!rawTitle) return "";

  let cleaned = rawTitle
    // Remove emojis
    .replace(/[\u{1F300}-\u{1F6FF}|[\u{2600}-\u{26FF}]/gu, "")
    // Remove seniority / grade / education prefixes
    .replace(/\b(senior|staff|principal|lead|junior|associate|director|vp|head of|phd|undergrad|undergraduate|graduate|co-op|coop)\b/gi, "")
    // Remove roman numerals / level numbers: "Engineer II", "Engineer I", "Engineer 2"
    .replace(/\b(iii|ii|i|iv|v|1|2|3|4)\b/gi, "")
    // Remove internship season/year markers: "(Summer 2027)", "(Winter 2026)", "(Early Careers)"
    .replace(/\((?:summer|winter|fall|spring|early careers|graduating|class of|\d{4})[^)]*\)/gi, "")
    // Remove team prefixes: "People Team: ", "Fintech - "
    .replace(/^[a-z0-9\s&,-]+:\s*/i, "")
    // Replace punctuation with single spaces
    .replace(/[-–—/|,:]/g, " ")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  return cleaned;
}

/**
 * Deterministic title normalizer using aliases.
 *
 * Invariant: Unmapped titles are strictly returned as null, NEVER guessed or hallucinated.
 */
export function normalizeTitleToRole(
  rawTitle: string,
  catalogue: CareerRoleEntity[] = OBSERVED_CAREER_ROLES
): TitleNormalizationResult {
  if (!rawTitle || !rawTitle.trim()) {
    return { canonicalName: null, roleId: null, domain: null, confidence: 0 };
  }

  const rawLower = rawTitle.toLowerCase().trim();
  const cleaned = cleanRawTitle(rawTitle);

  // 1. Exact match on canonical name or exact alias
  for (const role of catalogue) {
    if (!role.isActive) continue;

    if (rawLower === role.canonicalName.toLowerCase()) {
      return {
        canonicalName: role.canonicalName,
        roleId: role.id,
        domain: role.domain,
        confidence: 1.0,
        matchedAlias: role.canonicalName,
      };
    }

    for (const alias of role.aliases) {
      if (rawLower === alias.toLowerCase()) {
        return {
          canonicalName: role.canonicalName,
          roleId: role.id,
          domain: role.domain,
          confidence: 1.0,
          matchedAlias: alias,
        };
      }
    }
  }

  // 2. Cleaned title match on aliases
  for (const role of catalogue) {
    if (!role.isActive) continue;

    if (cleaned === role.canonicalName.toLowerCase()) {
      return {
        canonicalName: role.canonicalName,
        roleId: role.id,
        domain: role.domain,
        confidence: 0.95,
        matchedAlias: role.canonicalName,
      };
    }

    for (const alias of role.aliases) {
      if (cleaned === alias.toLowerCase()) {
        return {
          canonicalName: role.canonicalName,
          roleId: role.id,
          domain: role.domain,
          confidence: 0.95,
          matchedAlias: alias,
        };
      }
    }
  }

  // 3. Substring boundary match on specific aliases (ordered by length descending to match most specific first)
  const sortedAliases: Array<{ role: CareerRoleEntity; alias: string }> = [];
  for (const role of catalogue) {
    if (!role.isActive) continue;
    for (const alias of role.aliases) {
      sortedAliases.push({ role, alias });
    }
  }
  // Sort longest alias first so "full stack engineer" matches before "software engineer"
  sortedAliases.sort((a, b) => b.alias.length - a.alias.length);

  for (const item of sortedAliases) {
    const aliasLower = item.alias.toLowerCase();
    // Word boundary regex
    const regex = new RegExp(`\\b${aliasLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (regex.test(rawLower) || regex.test(cleaned)) {
      return {
        canonicalName: item.role.canonicalName,
        roleId: item.role.id,
        domain: item.role.domain,
        confidence: 0.9,
        matchedAlias: item.alias,
      };
    }
  }

  // Strict Invariant: Unmapped titles are strictly left unmapped, NEVER guessed.
  return {
    canonicalName: null,
    roleId: null,
    domain: null,
    confidence: 0,
    matchedAlias: null,
  };
}

function readDbStore(): any {
  try {
    const dbPath = path.resolve(process.cwd(), "src/data/db.json");
    if (fs.existsSync(dbPath)) {
      return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    }
  } catch (err) {
    console.error("[roleCatalogueService] Failed reading db.json", err);
  }
  return {};
}

function writeDbStore(data: any): void {
  try {
    const dbPath = path.resolve(process.cwd(), "src/data/db.json");
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[roleCatalogueService] Failed writing db.json", err);
  }
}

export class RoleCatalogueService {
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
   * Retrieves the active career role catalogue.
   */
  async getCatalogue(): Promise<CareerRoleEntity[]> {
    const prisma = await this.getPrisma();
    if (prisma?.careerRole) {
      try {
        const records = await prisma.careerRole.findMany({
          where: { isActive: true },
          orderBy: { canonicalName: "asc" },
        });
        if (records.length > 0) return records;
      } catch (err) {
        console.warn("[roleCatalogueService] Prisma getCatalogue failed, falling back to observed:", err);
      }
    }

    const db = readDbStore();
    if (Array.isArray(db.careerRoles) && db.careerRoles.length > 0) {
      return db.careerRoles.filter((r: any) => r.isActive !== false);
    }

    return OBSERVED_CAREER_ROLES;
  }

  /**
   * Seeds the catalogue into database or db.json.
   */
  async seedCatalogue(): Promise<number> {
    const prisma = await this.getPrisma();
    let count = 0;

    if (prisma?.careerRole) {
      try {
        for (const role of OBSERVED_CAREER_ROLES) {
          await prisma.careerRole.upsert({
            where: { canonicalName: role.canonicalName },
            update: {
              description: role.description,
              domain: role.domain,
              aliases: role.aliases,
              requiredSkillIds: role.requiredSkillIds,
              relatedSkillIds: role.relatedSkillIds,
              isActive: role.isActive,
            },
            create: {
              id: role.id,
              canonicalName: role.canonicalName,
              description: role.description,
              domain: role.domain,
              aliases: role.aliases,
              requiredSkillIds: role.requiredSkillIds,
              relatedSkillIds: role.relatedSkillIds,
              isActive: role.isActive,
            },
          });
          count++;
        }
        return count;
      } catch (err) {
        console.warn("[roleCatalogueService] Prisma seedCatalogue error:", err);
      }
    }

    const db = readDbStore();
    db.careerRoles = OBSERVED_CAREER_ROLES;
    writeDbStore(db);
    return OBSERVED_CAREER_ROLES.length;
  }

  /**
   * Maps an opportunity to a canonical CareerRole while keeping the original title untouched.
   */
  async mapOpportunityToRole(
    opportunityId: string,
    rawTitle: string
  ): Promise<{ opportunityId: string; originalTitle: string; roleId: string | null; canonicalName: string | null }> {
    const catalogue = await this.getCatalogue();
    const normalized = normalizeTitleToRole(rawTitle, catalogue);

    const prisma = await this.getPrisma();
    if (prisma?.opportunity) {
      try {
        await prisma.opportunity.update({
          where: { id: opportunityId },
          data: { careerRoleId: normalized.roleId },
        });
      } catch (err) {
        console.warn("[roleCatalogueService] Prisma mapOpportunity update error:", err);
      }
    }

    const db = readDbStore();
    if (Array.isArray(db.opportunities)) {
      const opp = db.opportunities.find((o: any) => o.id === opportunityId);
      if (opp) {
        opp.careerRoleId = normalized.roleId;
        writeDbStore(db);
      }
    }

    return {
      opportunityId,
      originalTitle: rawTitle,
      roleId: normalized.roleId,
      canonicalName: normalized.canonicalName,
    };
  }
}

export const roleCatalogueService = new RoleCatalogueService();
