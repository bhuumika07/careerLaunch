// src/lib/services/career-roles/careerRoleService.ts
/**
 * Career Role Discovery Service (Phase 5 - Chunk 5.2)
 *
 * Rules:
 * 1. Score roles deterministically from student's interests, confirmed skills, academics, and projects.
 * 2. Each result includes transparent reasons[] and real active opportunity count.
 * 3. Strict Invariant: Roles with ZERO active opportunities are NEVER recommended.
 * 4. Zero fabricated data: missing values are null; real counts reflect verified active opportunities.
 * 5. Role selection persists cleanly through career-interests API.
 */

import {
  roleCatalogueService,
  RoleCatalogueService,
  normalizeTitleToRole,
  type CareerRoleEntity,
} from "./roleCatalogueService.ts";
import { profileService, ProfileService } from "../student/profileService.ts";
import {
  extendedProfileService,
  ExtendedProfileService,
  type StudentSkillDto,
  type CareerInterestDto,
  type StudentProjectDto,
} from "../student/extendedProfileService.ts";
import * as fs from "node:fs";
import * as path from "node:path";

export interface RoleRecommendation {
  roleId: string;
  canonicalName: string;
  description: string;
  domain: string;
  matchScore: number; // 0 - 100
  matchedSkills: string[];
  missingSkills: string[];
  activeOpportunityCount: number;
  reasons: string[];
  isSelected: boolean;
  requiredSkills: string[];
  relatedSkills: string[];
}

export interface CareerProfilesResponse {
  recommendations: RoleRecommendation[];
  totalActiveRoles: number;
  studentTargetRoles: string[];
}

export interface RecommendationFilterOptions {
  domain?: string | null;
  minScore?: number;
}

function readDbStore(): any {
  try {
    const dbPath = path.resolve(process.cwd(), "src/data/db.json");
    if (fs.existsSync(dbPath)) {
      return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    }
  } catch (err) {
    console.error("[careerRoleService] Failed reading db.json", err);
  }
  return {};
}

export class CareerRoleService {
  private prisma: any;
  private catalogueSvc: RoleCatalogueService;
  private profService: ProfileService;
  private extProfService: ExtendedProfileService;

  constructor(
    prismaClient?: any,
    catalogueServiceInstance?: RoleCatalogueService,
    profileServiceInstance?: ProfileService,
    extProfileServiceInstance?: ExtendedProfileService
  ) {
    this.prisma = prismaClient;
    this.catalogueSvc = catalogueServiceInstance || roleCatalogueService;
    this.profService = profileServiceInstance || profileService;
    this.extProfService = extProfileServiceInstance || extendedProfileService;
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
   * Counts active verified opportunities in the system mapped to each career role.
   */
  async getActiveOpportunityCounts(catalogue: CareerRoleEntity[]): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    for (const role of catalogue) {
      counts[role.id] = 0;
    }

    const prisma = await this.getPrisma();
    if (prisma?.opportunity) {
      try {
        const activeOpps = await prisma.opportunity.findMany({
          where: {
            status: "ACTIVE",
          },
          select: {
            id: true,
            title: true,
            careerRoleId: true,
          },
        });

        for (const opp of activeOpps) {
          let roleId = opp.careerRoleId;
          if (!roleId) {
            const normalized = normalizeTitleToRole(opp.title, catalogue);
            roleId = normalized.roleId;
          }
          if (roleId && counts[roleId] !== undefined) {
            counts[roleId]++;
          }
        }
        return counts;
      } catch (err) {
        console.warn("[careerRoleService] Prisma active count error, falling back to dbStore:", err);
      }
    }

    // Fallback store
    const db = readDbStore();
    const opportunities: any[] = Array.isArray(db.opportunities) ? db.opportunities : [];

    for (const opp of opportunities) {
      // Must be active and not closed
      const isActive = !opp.status || opp.status === "ACTIVE";
      if (!isActive) continue;

      let roleId = opp.careerRoleId;
      if (!roleId) {
        const normalized = normalizeTitleToRole(opp.title, catalogue);
        roleId = normalized.roleId;
      }

      if (roleId && counts[roleId] !== undefined) {
        counts[roleId]++;
      }
    }

    return counts;
  }

  /**
   * Generates scored career role recommendations for a student.
   *
   * Invariants:
   * - Strict Invariant: Roles with 0 active opportunities are excluded.
   * - Missing fields are null; scores are explainable via reasons[].
   */
  async getRecommendations(
    userId: string,
    filters?: RecommendationFilterOptions
  ): Promise<CareerProfilesResponse> {
    if (!userId) {
      throw new Error("Student userId is required for career role recommendations.");
    }

    const catalogue = await this.catalogueSvc.getCatalogue();
    const activeCounts = await this.getActiveOpportunityCounts(catalogue);

    // Retrieve student profile dimensions
    let profile: any = null;
    let studentSkills: StudentSkillDto[] = [];
    let careerInterests: CareerInterestDto[] = [];
    let projects: StudentProjectDto[] = [];

    try {
      profile = await this.profService.getProfile(userId);
    } catch {
      profile = null;
    }

    try {
      studentSkills = await this.extProfService.getStudentSkills(userId);
    } catch {
      studentSkills = [];
    }

    try {
      careerInterests = await this.extProfService.getCareerInterests(userId);
    } catch {
      careerInterests = [];
    }

    try {
      projects = await this.extProfService.getProjects(userId);
    } catch {
      projects = [];
    }

    // Filter confirmed skills
    const confirmedSkills = studentSkills.filter(
      (s) => s.confirmed === true || s.reviewStatus === "CONFIRMED"
    );
    const confirmedSkillNames = new Set(
      confirmedSkills.map((s) => s.name.toLowerCase().trim())
    );

    const studentTargetRoleNames = careerInterests.map((ci) => ci.targetRole);

    const scoredRecommendations: RoleRecommendation[] = [];

    for (const role of catalogue) {
      if (!role.isActive) continue;

      const activeOppCount = activeCounts[role.id] || 0;

      // STRICT INVARIANT: A role with 0 active opportunities is NEVER recommended.
      if (activeOppCount <= 0) {
        continue;
      }

      // Optional domain filter
      if (filters?.domain && filters.domain !== "all") {
        if (role.domain.toLowerCase() !== filters.domain.toLowerCase()) {
          continue;
        }
      }

      // Check if student has marked this role as a target interest
      const isSelected = studentTargetRoleNames.some((target) => {
        const norm = normalizeTitleToRole(target, catalogue);
        return norm.roleId === role.id || target.toLowerCase() === role.canonicalName.toLowerCase();
      });

      // 1. Confirmed Skills Match (up to 50 pts)
      const matchedRequired: string[] = [];
      const missingRequired: string[] = [];

      for (const reqSkill of role.requiredSkillIds) {
        const reqLower = reqSkill.toLowerCase();
        // Check direct match or substring in confirmed skills
        const found = Array.from(confirmedSkillNames).some(
          (cs) => cs === reqLower || cs.includes(reqLower) || reqLower.includes(cs)
        );
        if (found) {
          matchedRequired.push(reqSkill);
        } else {
          missingRequired.push(reqSkill);
        }
      }

      const matchedRelated: string[] = [];
      for (const relSkill of role.relatedSkillIds) {
        const relLower = relSkill.toLowerCase();
        const found = Array.from(confirmedSkillNames).some(
          (cs) => cs === relLower || cs.includes(relLower) || relLower.includes(cs)
        );
        if (found) {
          matchedRelated.push(relSkill);
        }
      }

      const totalRequired = Math.max(1, role.requiredSkillIds.length);
      const totalRelated = Math.max(1, role.relatedSkillIds.length);

      const requiredRatio = matchedRequired.length / totalRequired;
      const relatedRatio = matchedRelated.length / totalRelated;

      const skillsScore = Math.round(requiredRatio * 35 + relatedRatio * 15);
      const allMatchedSkills = [...matchedRequired, ...matchedRelated];

      // 2. Target Interests / Domain Match (up to 25 pts)
      let interestScore = 0;
      let matchedInterestText: string | null = null;

      for (const ci of careerInterests) {
        const normInterest = normalizeTitleToRole(ci.targetRole, catalogue);
        if (
          normInterest.roleId === role.id ||
          ci.targetRole.toLowerCase() === role.canonicalName.toLowerCase()
        ) {
          interestScore = 25;
          matchedInterestText = ci.targetRole;
          break;
        }
        if (ci.domain && ci.domain.toLowerCase() === role.domain.toLowerCase()) {
          interestScore = Math.max(interestScore, 18);
          matchedInterestText = ci.domain;
        }
      }

      // 3. Academic Background Match (up to 15 pts)
      let academicScore = 0;
      let academicReason: string | null = null;
      if (profile?.branch) {
        const branchLower = profile.branch.toLowerCase();
        const techBranches = ["computer", "software", "information", "data", "ai", "artificial", "electrical", "electronics"];
        const isTechBranch = techBranches.some((tb) => branchLower.includes(tb));

        if (isTechBranch) {
          academicScore = 15;
          academicReason = `Complements your academic background in ${profile.branch}`;
        } else if (profile.branch) {
          academicScore = 5;
          academicReason = `Technical transition path for your degree in ${profile.branch}`;
        }
      }

      // 4. Projects Match (up to 10 pts)
      let projectScore = 0;
      const matchingProjects: string[] = [];

      for (const proj of projects) {
        const projTech = proj.technologies.map((t) => t.toLowerCase());
        const hasTechOverlap = role.requiredSkillIds.some((rs) =>
          projTech.includes(rs.toLowerCase())
        ) || role.relatedSkillIds.some((rs) =>
          projTech.includes(rs.toLowerCase())
        );

        if (hasTechOverlap) {
          matchingProjects.push(proj.title);
          projectScore = 10;
        }
      }

      // Compute total score (0 to 100)
      let totalScore = skillsScore + interestScore + academicScore + projectScore;

      // Base confidence if student is starting out (minimum 10 if active opportunities exist)
      if (totalScore === 0 && activeOppCount > 0) {
        totalScore = 10;
      }
      totalScore = Math.min(100, Math.max(0, totalScore));

      // Check minScore filter
      if (filters?.minScore && totalScore < filters.minScore) {
        continue;
      }

      // Construct transparent reasons
      const reasons: string[] = [];

      if (allMatchedSkills.length > 0) {
        reasons.push(
          `Matches ${allMatchedSkills.length} of your confirmed skills: ${allMatchedSkills.slice(0, 3).join(", ")}${
            allMatchedSkills.length > 3 ? ` +${allMatchedSkills.length - 3} more` : ""
          }`
        );
      }

      if (matchedInterestText) {
        reasons.push(`Directly aligns with your career target: "${matchedInterestText}"`);
      }

      if (academicReason) {
        reasons.push(academicReason);
      }

      if (matchingProjects.length > 0) {
        reasons.push(
          `Supported by your project work: ${matchingProjects.slice(0, 2).join(", ")}`
        );
      }

      reasons.push(
        `${activeOppCount} verified active opening${activeOppCount === 1 ? "" : "s"} currently hiring`
      );

      scoredRecommendations.push({
        roleId: role.id,
        canonicalName: role.canonicalName,
        description: role.description,
        domain: role.domain,
        matchScore: totalScore,
        matchedSkills: allMatchedSkills,
        missingSkills: missingRequired,
        activeOpportunityCount: activeOppCount,
        reasons,
        isSelected,
        requiredSkills: role.requiredSkillIds,
        relatedSkills: role.relatedSkillIds,
      });
    }

    // Sort by matchScore desc, then activeOpportunityCount desc, then canonicalName asc
    scoredRecommendations.sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      if (b.activeOpportunityCount !== a.activeOpportunityCount) {
        return b.activeOpportunityCount - a.activeOpportunityCount;
      }
      return a.canonicalName.localeCompare(b.canonicalName);
    });

    return {
      recommendations: scoredRecommendations,
      totalActiveRoles: scoredRecommendations.length,
      studentTargetRoles: studentTargetRoleNames,
    };
  }

  /**
   * Toggles role targeting for the student and persists it in CareerInterests.
   */
  async setRoleTarget(
    userId: string,
    roleId: string,
    selected: boolean
  ): Promise<CareerInterestDto[]> {
    const catalogue = await this.catalogueSvc.getCatalogue();
    const role = catalogue.find((r) => r.id === roleId);
    if (!role) {
      throw new Error(`CareerRole with id '${roleId}' not found in catalogue.`);
    }

    const currentInterests = await this.extProfService.getCareerInterests(userId);

    let updatedInterests: Array<{ targetRole: string; domain: string; priority: number }>;

    if (selected) {
      // Add if not already present
      const alreadyPresent = currentInterests.some(
        (ci) =>
          normalizeTitleToRole(ci.targetRole, catalogue).roleId === roleId ||
          ci.targetRole.toLowerCase() === role.canonicalName.toLowerCase()
      );

      if (alreadyPresent) {
        return currentInterests;
      }

      const nextPriority = currentInterests.length + 1;
      updatedInterests = [
        ...currentInterests.map((ci) => ({
          targetRole: ci.targetRole,
          domain: ci.domain,
          priority: ci.priority,
        })),
        {
          targetRole: role.canonicalName,
          domain: role.domain,
          priority: nextPriority,
        },
      ];
    } else {
      // Remove
      updatedInterests = currentInterests
        .filter(
          (ci) =>
            normalizeTitleToRole(ci.targetRole, catalogue).roleId !== roleId &&
            ci.targetRole.toLowerCase() !== role.canonicalName.toLowerCase()
        )
        .map((ci, idx) => ({
          targetRole: ci.targetRole,
          domain: ci.domain,
          priority: idx + 1,
        }));
    }

    return await this.extProfService.updateCareerInterests(userId, {
      interests: updatedInterests,
    });
  }
}

export const careerRoleService = new CareerRoleService();
