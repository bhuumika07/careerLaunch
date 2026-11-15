// src/lib/services/career-roles/skillGapService.ts
/**
 * Career Role Skill Gap Analysis Service (Phase 5 - Chunk 5.3)
 *
 * Rules & Invariants:
 * 1. Evaluates student's verified and confirmed skills against canonical CareerRole prerequisites.
 * 2. Unconfirmed or unverified skills (confirmed: false, reviewStatus: 'NEEDS_REVIEW' | 'REJECTED')
 *    are NEVER treated as acquired skills.
 * 3. Classifies competencies strictly into:
 *    - Prerequisite / Core skills (requiredSkillIds)
 *    - Competitive / Recommended skills (relatedSkillIds)
 * 4. Readiness percentage is computed deterministically from verified prerequisites.
 * 5. Role selection defaults to student's top target role when roleId is omitted.
 * 6. Zero hallucinated metrics; missing values are explicitly null.
 */

import {
  roleCatalogueService,
  RoleCatalogueService,
  normalizeTitleToRole,
  type CareerRoleEntity,
} from "./roleCatalogueService.ts";
import {
  careerRoleService,
  CareerRoleService,
} from "./careerRoleService.ts";
import {
  extendedProfileService,
  ExtendedProfileService,
  type StudentSkillDto,
  type CareerInterestDto,
} from "../student/extendedProfileService.ts";

export interface SkillGapItem {
  skillName: string;
  category: "Prerequisite" | "Competitive";
  priority: "Essential" | "Recommended";
  isAcquired: boolean;
  proficiency: string | null;
  yearsExperience: number | null;
  status: "Verified" | "Missing";
  recommendation: string;
  actionType: "assessment" | "course" | "project";
  actionLink: string;
}

export interface SkillGapSummary {
  totalRequired: number;
  totalRelated: number;
  acquiredPrerequisitesCount: number;
  acquiredRelatedCount: number;
  missingPrerequisitesCount: number;
  missingRelatedCount: number;
  readinessPercentage: number;
  overallMatchScore: number;
}

export interface SkillGapActionPlanItem {
  id: string;
  title: string;
  description: string;
  type: "assessment" | "course" | "project";
  priority: "Immediate" | "Recommended" | "Next Step";
  link: string;
  skillName: string;
}

export interface SkillGapAnalysisResult {
  roleId: string;
  roleTitle: string;
  roleDescription: string;
  domain: string;
  isStudentTargetRole: boolean;
  activeOpportunityCount: number;
  summary: SkillGapSummary;
  acquiredSkills: SkillGapItem[];
  missingPrerequisites: SkillGapItem[];
  missingRelated: SkillGapItem[];
  table: SkillGapItem[];
  actionPlan: SkillGapActionPlanItem[];
}

export interface AvailableTargetRoleDto {
  id: string;
  title: string;
  domain: string;
  isTargeted: boolean;
  activeOpportunityCount: number;
}

export class SkillGapService {
  private catalogueSvc: RoleCatalogueService;
  private roleSvc: CareerRoleService;
  private extProfService: ExtendedProfileService;

  constructor(
    catalogueServiceInstance?: RoleCatalogueService,
    careerRoleServiceInstance?: CareerRoleService,
    extProfileServiceInstance?: ExtendedProfileService
  ) {
    this.catalogueSvc = catalogueServiceInstance || roleCatalogueService;
    this.roleSvc = careerRoleServiceInstance || careerRoleService;
    this.extProfService = extProfileServiceInstance || extendedProfileService;
  }

  /**
   * Retrieves available target roles with student's targeting status and active opportunity counts.
   */
  async getAvailableTargetRoles(userId: string): Promise<AvailableTargetRoleDto[]> {
    const catalogue = await this.catalogueSvc.getCatalogue();
    const activeCounts = await this.roleSvc.getActiveOpportunityCounts(catalogue);
    let interests: CareerInterestDto[] = [];

    try {
      interests = await this.extProfService.getCareerInterests(userId);
    } catch {
      interests = [];
    }

    return catalogue
      .filter((r) => r.isActive)
      .map((role) => {
        const isTargeted = interests.some((ci) => {
          const norm = normalizeTitleToRole(ci.targetRole, catalogue);
          return norm.roleId === role.id || ci.targetRole.toLowerCase() === role.canonicalName.toLowerCase();
        });

        return {
          id: role.id,
          title: role.canonicalName,
          domain: role.domain,
          isTargeted,
          activeOpportunityCount: activeCounts[role.id] || 0,
        };
      });
  }

  /**
   * Performs deep skill gap analysis for a student against a target career role.
   */
  async analyzeSkillGap(
    userId: string,
    targetRoleIdOrTitle?: string | null
  ): Promise<SkillGapAnalysisResult> {
    if (!userId) {
      throw new Error("Student userId is required for skill gap analysis.");
    }

    const catalogue = await this.catalogueSvc.getCatalogue();
    const activeCounts = await this.roleSvc.getActiveOpportunityCounts(catalogue);

    // Retrieve student's confirmed skills and interests
    let studentSkills: StudentSkillDto[] = [];
    let careerInterests: CareerInterestDto[] = [];

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

    // STRICT INVARIANT: Only confirmed/verified skills count towards acquired competencies.
    const confirmedSkills = studentSkills.filter(
      (s) => s.confirmed === true || s.reviewStatus === "CONFIRMED"
    );

    // Resolve target role
    let targetRole: CareerRoleEntity | undefined;

    if (targetRoleIdOrTitle && targetRoleIdOrTitle.trim()) {
      targetRole = catalogue.find(
        (r) =>
          r.id === targetRoleIdOrTitle ||
          r.canonicalName.toLowerCase() === targetRoleIdOrTitle.toLowerCase()
      );
      if (!targetRole) {
        const norm = normalizeTitleToRole(targetRoleIdOrTitle, catalogue);
        if (norm.roleId) {
          targetRole = catalogue.find((r) => r.id === norm.roleId);
        }
      }
    }

    // Fallback: If no role provided, pick student's top target role, or the first active role in catalogue
    if (!targetRole && careerInterests.length > 0) {
      const topInterest = careerInterests[0];
      const norm = normalizeTitleToRole(topInterest.targetRole, catalogue);
      if (norm.roleId) {
        targetRole = catalogue.find((r) => r.id === norm.roleId);
      } else {
        targetRole = catalogue.find(
          (r) => r.canonicalName.toLowerCase() === topInterest.targetRole.toLowerCase()
        );
      }
    }

    if (!targetRole) {
      // Pick first active role with opportunities if possible, or first active role
      targetRole =
        catalogue.find((r) => r.isActive && (activeCounts[r.id] || 0) > 0) ||
        catalogue.find((r) => r.isActive) ||
        catalogue[0];
    }

    if (!targetRole) {
      throw new Error("No career roles available in catalogue for skill gap analysis.");
    }

    const isStudentTargetRole = careerInterests.some((ci) => {
      const norm = normalizeTitleToRole(ci.targetRole, catalogue);
      return norm.roleId === targetRole!.id || ci.targetRole.toLowerCase() === targetRole!.canonicalName.toLowerCase();
    });

    const activeOppCount = activeCounts[targetRole.id] || 0;

    // Helper to find matching confirmed skill without false substring overlaps (e.g. SQL != PostgreSQL)
    const findStudentSkill = (roleSkill: string): StudentSkillDto | undefined => {
      const lower = roleSkill.toLowerCase().trim();
      const lowerBase = lower.replace(/\.js$/, "");
      return confirmedSkills.find((cs) => {
        const csLower = cs.name.toLowerCase().trim();
        const csBase = csLower.replace(/\.js$/, "");
        return csLower === lower || csBase === lowerBase;
      });
    };

    const acquiredSkills: SkillGapItem[] = [];
    const missingPrerequisites: SkillGapItem[] = [];
    const missingRelated: SkillGapItem[] = [];
    const table: SkillGapItem[] = [];

    // 1. Process Core / Prerequisite Skills (requiredSkillIds)
    for (const reqSkill of targetRole.requiredSkillIds) {
      const matched = findStudentSkill(reqSkill);
      if (matched) {
        const item: SkillGapItem = {
          skillName: reqSkill,
          category: "Prerequisite",
          priority: "Essential",
          isAcquired: true,
          proficiency: matched.proficiency || "Verified",
          yearsExperience: matched.yearsExperience ?? null,
          status: "Verified",
          recommendation: "Prerequisite verified. Keep sharp through projects.",
          actionType: "project",
          actionLink: `/student/profile`,
        };
        acquiredSkills.push(item);
        table.push(item);
      } else {
        const item: SkillGapItem = {
          skillName: reqSkill,
          category: "Prerequisite",
          priority: "Essential",
          isAcquired: false,
          proficiency: null,
          yearsExperience: null,
          status: "Missing",
          recommendation: `High-priority prerequisite for ${targetRole.canonicalName}. Verify competency or build a showcase project.`,
          actionType: "assessment",
          actionLink: `/student/assessments`,
        };
        missingPrerequisites.push(item);
        table.push(item);
      }
    }

    // 2. Process Competitive / Recommended Skills (relatedSkillIds)
    for (const relSkill of targetRole.relatedSkillIds) {
      const matched = findStudentSkill(relSkill);
      if (matched) {
        const item: SkillGapItem = {
          skillName: relSkill,
          category: "Competitive",
          priority: "Recommended",
          isAcquired: true,
          proficiency: matched.proficiency || "Verified",
          yearsExperience: matched.yearsExperience ?? null,
          status: "Verified",
          recommendation: "Competitive advantage confirmed.",
          actionType: "project",
          actionLink: `/student/profile`,
        };
        acquiredSkills.push(item);
        table.push(item);
      } else {
        const item: SkillGapItem = {
          skillName: relSkill,
          category: "Competitive",
          priority: "Recommended",
          isAcquired: false,
          proficiency: null,
          yearsExperience: null,
          status: "Missing",
          recommendation: `Differentiator skill for ${targetRole.canonicalName}. Review module in learning roadmap.`,
          actionType: "course",
          actionLink: `/student/roadmap`,
        };
        missingRelated.push(item);
        table.push(item);
      }
    }

    const totalRequired = targetRole.requiredSkillIds.length;
    const totalRelated = targetRole.relatedSkillIds.length;
    const acquiredPrereqCount = acquiredSkills.filter((i) => i.category === "Prerequisite").length;
    const acquiredRelatedCount = acquiredSkills.filter((i) => i.category === "Competitive").length;

    const readinessPercentage =
      totalRequired > 0 ? Math.round((acquiredPrereqCount / totalRequired) * 100) : 100;

    const overallMatchScore = Math.round(
      (acquiredPrereqCount / Math.max(1, totalRequired)) * 70 +
        (acquiredRelatedCount / Math.max(1, totalRelated)) * 30
    );

    // 3. Generate actionable bridge plan
    const actionPlan: SkillGapActionPlanItem[] = [];

    // If all core prerequisites are met, prioritize application CTA
    if (missingPrerequisites.length === 0) {
      actionPlan.push({
        id: "act_ready_apply",
        title: "All Core Prerequisites Met — Apply to Live Openings",
        description: `You have verified all core prerequisites for ${targetRole.canonicalName}. Explore and apply to verified active job openings.`,
        type: "project",
        priority: "Immediate",
        link: `/opportunities?q=${encodeURIComponent(targetRole.canonicalName)}`,
        skillName: targetRole.canonicalName,
      });
    } else {
      // Immediate action: First missing core prerequisite
      const topMissing = missingPrerequisites[0];
      actionPlan.push({
        id: `act_prereq_${topMissing.skillName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
        title: `Validate Core Competency: ${topMissing.skillName}`,
        description: `Complete a diagnostic benchmark assessment to confirm and verify your ${topMissing.skillName} foundation for ${targetRole.canonicalName}.`,
        type: "assessment",
        priority: "Immediate",
        link: "/student/assessments",
        skillName: topMissing.skillName,
      });

      if (missingPrerequisites.length > 1) {
        const secondMissing = missingPrerequisites[1];
        actionPlan.push({
          id: `act_proj_${secondMissing.skillName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
          title: `Build Portfolio Project Featuring ${secondMissing.skillName}`,
          description: `Add an end-to-end repository demonstrating practical usage of ${secondMissing.skillName} to satisfy recruiter screening prerequisites.`,
          type: "project",
          priority: "Recommended",
          link: "/student/profile",
          skillName: secondMissing.skillName,
        });
      }
    }

    // Recommended action: First missing competitive differentiator
    if (missingRelated.length > 0) {
      const topRelated = missingRelated[0];
      actionPlan.push({
        id: `act_comp_${topRelated.skillName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
        title: `Explore Roadmap Module: ${topRelated.skillName}`,
        description: `Review structured curriculum and guided milestones for ${topRelated.skillName} on your learning roadmap.`,
        type: "course",
        priority: "Next Step",
        link: "/student/roadmap",
        skillName: topRelated.skillName,
      });
    }

    return {
      roleId: targetRole.id,
      roleTitle: targetRole.canonicalName,
      roleDescription: targetRole.description,
      domain: targetRole.domain,
      isStudentTargetRole,
      activeOpportunityCount: activeOppCount,
      summary: {
        totalRequired,
        totalRelated,
        acquiredPrerequisitesCount: acquiredPrereqCount,
        acquiredRelatedCount: acquiredRelatedCount,
        missingPrerequisitesCount: missingPrerequisites.length,
        missingRelatedCount: missingRelated.length,
        readinessPercentage,
        overallMatchScore,
      },
      acquiredSkills,
      missingPrerequisites,
      missingRelated,
      table,
      actionPlan,
    };
  }
}

export const skillGapService = new SkillGapService();
