// src/lib/services/matching/matchingService.ts
/**
 * Opportunity-to-Student Matching Service (Phase 6 - Chunk 6.1)
 *
 * Rules & Invariants:
 * 1. Hard Eligibility Gates (Non-negotiable invariants):
 *    - Opportunity Status: Strictly ACTIVE opportunities only. Closed, expired, pending, or quarantined
 *      opportunities must NEVER be recommended or eligible.
 *    - Graduation Year: If opportunity restricts batches, student's graduation year must match.
 *    - Degree & Branch: Student degree must satisfy required degree types if specified.
 *    - Minimum CGPA: Student's confirmed CGPA must be >= min CGPA threshold.
 * 2. If any hard eligibility gate fails: isEligible = false, score = 0, matchBand = 'INELIGIBLE',
 *    with explicit and transparent ineligibilityReasons[].
 * 3. Soft Scoring (when eligible, 0-100%):
 *    - Confirmed Skills Match (up to 40 pts)
 *    - Target Career Role Alignment (up to 30 pts)
 *    - Academic Branch Fit (up to 15 pts)
 *    - Location & Workplace Preferences Fit (up to 15 pts)
 * 4. Zero fabricated match scores, eligibility, or mock data.
 */

import {
  profileService,
  ProfileService,
  type StudentProfileEntity,
} from "../student/profileService.ts";
import {
  extendedProfileService,
  ExtendedProfileService,
  type StudentSkillDto,
  type CareerInterestDto,
  type StudentPreferenceDto,
} from "../student/extendedProfileService.ts";
import {
  roleCatalogueService,
  RoleCatalogueService,
  normalizeTitleToRole,
  type CareerRoleEntity,
} from "../career-roles/roleCatalogueService.ts";
import * as fs from "node:fs";
import * as path from "node:path";

export interface EligibilityCriterionCheck {
  criterion: "Opportunity Status" | "Graduation Year" | "Degree & Branch" | "Minimum CGPA";
  requirement: string;
  studentValue: string;
  isMet: boolean;
  notes?: string;
}

export interface SkillMatchSummary {
  matchedRequiredSkills: string[];
  missingRequiredSkills: string[];
  matchedPreferredSkills: string[];
  skillsScore: number;
}

export interface OpportunityMatchResult {
  opportunityId: string;
  title: string;
  employer: string;
  location: string;
  workplaceType: string | null;
  employmentType: string | null;
  applicationUrl: string;
  deadline: string | null;
  verifiedAt: string | null;
  isEligible: boolean;
  overallScore: number;
  matchBand: "STRONG_MATCH" | "MODERATE_MATCH" | "GROWTH_MATCH" | "INELIGIBLE";
  hardEligibility: {
    isFullyEligible: boolean;
    checks: EligibilityCriterionCheck[];
    ineligibilityReasons: string[];
  };
  breakdown: {
    skillsScore: number;
    roleInterestScore: number;
    academicFitScore: number;
    preferencesScore: number;
  };
  skillAnalysis: SkillMatchSummary;
  reasons: string[];
}

export interface RecommendedFeedOptions {
  minScore?: number;
  workplaceType?: string;
  domain?: string;
  limit?: number;
  offset?: number;
}

export interface RecommendedFeedResponse {
  total: number;
  items: OpportunityMatchResult[];
  studentTargetRoles: string[];
}

function readDbStore(): any {
  try {
    const dbPath = path.resolve(process.cwd(), "src/data/db.json");
    if (fs.existsSync(dbPath)) {
      return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    }
  } catch (err) {
    console.error("[matchingService] Failed reading db.json", err);
  }
  return {};
}

export class MatchingService {
  private prisma: any;
  private profService: ProfileService;
  private extProfService: ExtendedProfileService;
  private catalogueSvc: RoleCatalogueService;

  constructor(
    prismaClient?: any,
    profileServiceInstance?: ProfileService,
    extProfileServiceInstance?: ExtendedProfileService,
    catalogueServiceInstance?: RoleCatalogueService
  ) {
    this.prisma = prismaClient;
    this.profService = profileServiceInstance || profileService;
    this.extProfService = extProfileServiceInstance || extendedProfileService;
    this.catalogueSvc = catalogueServiceInstance || roleCatalogueService;
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
   * Evaluates hard eligibility and soft matching for a student against a single opportunity.
   */
  async matchOpportunity(
    userId: string,
    opportunity: any,
    catalogue?: CareerRoleEntity[]
  ): Promise<OpportunityMatchResult> {
    if (!opportunity) {
      throw new Error("Opportunity payload is required for matching.");
    }

    const activeCatalogue = catalogue || (await this.catalogueSvc.getCatalogue());

    // 1. Retrieve student profile dimensions
    let profile: StudentProfileEntity | null = null;
    let studentSkills: StudentSkillDto[] = [];
    let careerInterests: CareerInterestDto[] = [];
    let preferences: StudentPreferenceDto | null = null;

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
      preferences = await this.extProfService.getPreferences(userId);
    } catch {
      preferences = null;
    }

    // STRICT INVARIANT: Only confirmed/verified skills count
    const confirmedSkills = studentSkills.filter(
      (s) => s.confirmed === true || s.reviewStatus === "CONFIRMED"
    );
    const confirmedSkillNames = new Set(
      confirmedSkills.map((s) => s.name.toLowerCase().trim())
    );

    const helperMatchesSkill = (targetSkill: string): boolean => {
      const lower = targetSkill.toLowerCase().trim();
      const lowerBase = lower.replace(/\.js$/, "");
      return Array.from(confirmedSkillNames).some(
        (cs) => cs === lower || cs.replace(/\.js$/, "") === lowerBase
      );
    };

    // -------------------------------------------------------------
    // HARD ELIGIBILITY GATES
    // -------------------------------------------------------------
    const checks: EligibilityCriterionCheck[] = [];
    const ineligibilityReasons: string[] = [];

    // Gate 1: Status & Freshness Invariant
    const oppStatus = (opportunity.status || "ACTIVE").toUpperCase();
    const isDeadlinePassed =
      opportunity.deadline && new Date(opportunity.deadline).getTime() < Date.now();

    const isStatusEligible = oppStatus === "ACTIVE" && !isDeadlinePassed;
    checks.push({
      criterion: "Opportunity Status",
      requirement: "Verified ACTIVE and not expired",
      studentValue: `Opportunity is ${oppStatus}${isDeadlinePassed ? " (Expired)" : ""}`,
      isMet: isStatusEligible,
      notes: isStatusEligible
        ? "Active verified listing"
        : `Opportunity is ${oppStatus.toLowerCase()}${isDeadlinePassed ? " and past deadline" : ""}`,
    });
    if (!isStatusEligible) {
      ineligibilityReasons.push(
        `Opportunity is ${oppStatus.toLowerCase()}${isDeadlinePassed ? " (deadline passed)" : ""}`
      );
    }

    // Gate 2: Graduation Year Gate
    const allowedYears: number[] = [];
    if (Array.isArray(opportunity.eligibility?.graduationYears)) {
      for (const y of opportunity.eligibility.graduationYears) {
        const parsed = parseInt(String(y), 10);
        if (!isNaN(parsed)) allowedYears.push(parsed);
      }
    }
    // Also parse from title e.g. "Software Engineer Intern (Winter 2027)" or "(2026)"
    const titleYearMatch = (opportunity.title || "").match(/\b(202[4-9])\b/);
    if (titleYearMatch && allowedYears.length === 0) {
      allowedYears.push(parseInt(titleYearMatch[1], 10));
    }

    let isGradYearMet = true;
    if (allowedYears.length > 0) {
      const studentGradYear = profile?.graduationYear;
      if (studentGradYear) {
        isGradYearMet = allowedYears.includes(studentGradYear);
      } else {
        // If student has not specified graduation year, flag as unmet
        isGradYearMet = false;
      }

      checks.push({
        criterion: "Graduation Year",
        requirement: `Designated for class of ${allowedYears.join(", ")}`,
        studentValue: profile?.graduationYear ? String(profile.graduationYear) : "Not recorded",
        isMet: isGradYearMet,
        notes: isGradYearMet
          ? `Matches target batch (${profile?.graduationYear})`
          : profile?.graduationYear
          ? `Profile indicates ${profile.graduationYear}, which does not match ${allowedYears.join(", ")}`
          : "Graduation year missing from student profile",
      });

      if (!isGradYearMet) {
        ineligibilityReasons.push(
          profile?.graduationYear
            ? `Designated for ${allowedYears.join(", ")} graduates (your profile indicates ${profile.graduationYear})`
            : `Designated for ${allowedYears.join(", ")} graduates (graduation year missing in your profile)`
        );
      }
    }

    // Gate 3: Degree & Branch Gate
    const allowedDegrees: string[] = opportunity.eligibility?.degrees || [];
    let isDegreeMet = true;
    if (allowedDegrees.length > 0 && !allowedDegrees.some((d) => d.toLowerCase() === "all" || d.toLowerCase() === "any")) {
      const studentDegree = profile?.degree?.toLowerCase() || "";
      isDegreeMet = allowedDegrees.some(
        (reqDeg) =>
          studentDegree.includes(reqDeg.toLowerCase()) ||
          reqDeg.toLowerCase().includes(studentDegree)
      );

      checks.push({
        criterion: "Degree & Branch",
        requirement: allowedDegrees.join(", "),
        studentValue: profile?.degree || "Not recorded",
        isMet: isDegreeMet,
        notes: isDegreeMet ? "Degree requirement satisfied" : "Student degree does not match listed requirements",
      });

      if (!isDegreeMet) {
        ineligibilityReasons.push(
          `Requires ${allowedDegrees.join(", ")} degree (your profile indicates ${profile?.degree || "unspecified"})`
        );
      }
    }

    // Gate 4: Minimum CGPA Gate
    const minCgpa = opportunity.eligibility?.minCgpa;
    let isCgpaMet = true;
    if (minCgpa !== undefined && minCgpa !== null) {
      const studentCgpa = profile?.cgpa;
      if (studentCgpa !== undefined && studentCgpa !== null) {
        isCgpaMet = studentCgpa >= minCgpa;
      } else {
        isCgpaMet = false;
      }

      checks.push({
        criterion: "Minimum CGPA",
        requirement: `Minimum ${minCgpa.toFixed(2)} CGPA`,
        studentValue: studentCgpa !== undefined && studentCgpa !== null ? studentCgpa.toFixed(2) : "Not recorded",
        isMet: isCgpaMet,
        notes: isCgpaMet
          ? `CGPA cutoff satisfied (${studentCgpa?.toFixed(2)} >= ${minCgpa.toFixed(2)})`
          : studentCgpa !== undefined && studentCgpa !== null
          ? `CGPA (${studentCgpa.toFixed(2)}) is below the minimum ${minCgpa.toFixed(2)} threshold`
          : "CGPA missing from student profile",
      });

      if (!isCgpaMet) {
        ineligibilityReasons.push(
          studentCgpa !== undefined && studentCgpa !== null
            ? `Requires minimum ${minCgpa.toFixed(2)} CGPA (your CGPA is ${studentCgpa.toFixed(2)})`
            : `Requires minimum ${minCgpa.toFixed(2)} CGPA (not recorded in profile)`
        );
      }
    }

    const isFullyEligible =
      isStatusEligible && isGradYearMet && isDegreeMet && isCgpaMet;

    // -------------------------------------------------------------
    // SOFT SCORING (Only computed if fully eligible; 0 if ineligible)
    // -------------------------------------------------------------
    const reasons: string[] = [];

    // A. Skills Match (up to 40 pts)
    const oppRequiredSkills: string[] = opportunity.requiredSkills || [];
    const oppPreferredSkills: string[] = opportunity.preferredSkills || [];

    const matchedRequired: string[] = [];
    const missingRequired: string[] = [];
    for (const reqSkill of oppRequiredSkills) {
      if (helperMatchesSkill(reqSkill)) {
        matchedRequired.push(reqSkill);
      } else {
        missingRequired.push(reqSkill);
      }
    }

    const matchedPreferred: string[] = [];
    for (const prefSkill of oppPreferredSkills) {
      if (helperMatchesSkill(prefSkill)) {
        matchedPreferred.push(prefSkill);
      }
    }

    const totalRequiredCount = Math.max(1, oppRequiredSkills.length);
    const totalPreferredCount = Math.max(1, oppPreferredSkills.length);

    let skillsScore = 0;
    if (oppRequiredSkills.length > 0) {
      skillsScore = Math.round(
        (matchedRequired.length / totalRequiredCount) * 30 +
          (oppPreferredSkills.length > 0 ? (matchedPreferred.length / totalPreferredCount) * 10 : 10)
      );
    } else {
      // If opportunity lists no explicit skills, give baseline 25 pts
      skillsScore = 25;
    }

    if (matchedRequired.length > 0) {
      reasons.push(
        `Matches ${matchedRequired.length} required skill${
          matchedRequired.length === 1 ? "" : "s"
        }: ${matchedRequired.slice(0, 3).join(", ")}`
      );
    }

    // B. Target Career Role Alignment (up to 30 pts)
    let roleInterestScore = 0;
    let matchedTargetRole: string | null = null;

    const oppRole = activeCatalogue.find(
      (r) =>
        r.id === opportunity.careerRoleId ||
        r.canonicalName.toLowerCase() === (opportunity.title || "").toLowerCase()
    ) || (opportunity.title ? normalizeTitleToRole(opportunity.title, activeCatalogue) : null);

    const oppCanonical = oppRole && "canonicalName" in oppRole ? oppRole.canonicalName : null;
    const oppRoleId = oppRole && "id" in oppRole ? oppRole.id : oppRole && "roleId" in oppRole ? oppRole.roleId : null;

    for (const ci of careerInterests) {
      const normInterest = normalizeTitleToRole(ci.targetRole, activeCatalogue);
      if (
        (oppRoleId && normInterest.roleId === oppRoleId) ||
        (oppCanonical && ci.targetRole.toLowerCase() === oppCanonical.toLowerCase())
      ) {
        roleInterestScore = 30;
        matchedTargetRole = ci.targetRole;
        break;
      }
      if (ci.domain && oppRole && "domain" in oppRole && oppRole.domain && ci.domain.toLowerCase() === oppRole.domain.toLowerCase()) {
        roleInterestScore = Math.max(roleInterestScore, 20);
        matchedTargetRole = ci.domain;
      }
    }

    if (matchedTargetRole) {
      reasons.push(`Directly aligns with your target career interest: "${matchedTargetRole}"`);
    }

    // C. Academic Fit (up to 15 pts)
    let academicFitScore = 0;
    if (profile?.branch) {
      const branchLower = profile.branch.toLowerCase();
      const techBranches = ["computer", "software", "information", "data", "ai", "electrical"];
      if (techBranches.some((tb) => branchLower.includes(tb))) {
        academicFitScore = 15;
        reasons.push(`Complements your academic background in ${profile.branch}`);
      } else {
        academicFitScore = 8;
      }
    }

    // D. Location & Workplace Preferences Fit (up to 15 pts)
    let preferencesScore = 0;
    if (preferences) {
      const oppLocation = (opportunity.location || "").toLowerCase();
      const oppWorkMode = (opportunity.workplaceType || "").toLowerCase();

      const workModeMatched = (preferences.preferredWorkModes || []).some((wm) =>
        oppWorkMode.includes(wm.toLowerCase()) || wm.toLowerCase().includes(oppWorkMode)
      );

      const locationMatched = (preferences.preferredLocations || []).some((loc) =>
        oppLocation.includes(loc.toLowerCase()) || loc.toLowerCase().includes(oppLocation)
      );

      if (workModeMatched) preferencesScore += 8;
      if (locationMatched || preferences.openToRelocation) preferencesScore += 7;

      if (workModeMatched || locationMatched) {
        reasons.push(
          `Matches your preferences (${opportunity.workplaceType || "workplace mode"}${
            locationMatched ? ` in ${opportunity.location}` : ""
          })`
        );
      }
    } else {
      preferencesScore = 10; // Baseline
    }

    // Overall Score Calculation
    let overallScore = 0;
    let matchBand: OpportunityMatchResult["matchBand"] = "INELIGIBLE";

    if (isFullyEligible) {
      overallScore = Math.min(
        100,
        Math.max(10, Math.round(skillsScore + roleInterestScore + academicFitScore + preferencesScore))
      );

      if (overallScore >= 75) {
        matchBand = "STRONG_MATCH";
      } else if (overallScore >= 50) {
        matchBand = "MODERATE_MATCH";
      } else {
        matchBand = "GROWTH_MATCH";
      }
    } else {
      overallScore = 0;
      matchBand = "INELIGIBLE";
      reasons.length = 0; // Clear positive reasons if ineligible
    }

    return {
      opportunityId: opportunity.id,
      title: opportunity.title,
      employer: opportunity.employer,
      location: opportunity.location,
      workplaceType: opportunity.workplaceType || null,
      employmentType: opportunity.employmentType || null,
      applicationUrl: opportunity.applicationUrl,
      deadline: opportunity.deadline || null,
      verifiedAt: opportunity.lastVerifiedAt || opportunity.verifiedAt || null,
      isEligible: isFullyEligible,
      overallScore,
      matchBand,
      hardEligibility: {
        isFullyEligible,
        checks,
        ineligibilityReasons,
      },
      breakdown: {
        skillsScore,
        roleInterestScore,
        academicFitScore,
        preferencesScore,
      },
      skillAnalysis: {
        matchedRequiredSkills: matchedRequired,
        missingRequiredSkills: missingRequired,
        matchedPreferredSkills: matchedPreferred,
        skillsScore,
      },
      reasons,
    };
  }

  /**
   * Generates a ranked, personalized feed of recommended opportunities for a student.
   *
   * Invariant: Ineligible or inactive opportunities are strictly excluded.
   */
  async getRecommendedFeed(
    userId: string,
    options?: RecommendedFeedOptions
  ): Promise<RecommendedFeedResponse> {
    const catalogue = await this.catalogueSvc.getCatalogue();
    let careerInterests: CareerInterestDto[] = [];
    try {
      careerInterests = await this.extProfService.getCareerInterests(userId);
    } catch {
      careerInterests = [];
    }

    const studentTargetRoles = careerInterests.map((ci) => ci.targetRole);

    // Retrieve active opportunities
    const prisma = await this.getPrisma();
    let opportunities: any[] = [];

    if (prisma?.opportunity) {
      try {
        opportunities = await prisma.opportunity.findMany({
          where: { status: "ACTIVE" },
        });
      } catch (err) {
        console.warn("[matchingService] Prisma query error, falling back to dbStore:", err);
      }
    }

    if (opportunities.length === 0) {
      const db = readDbStore();
      opportunities = (db.opportunities || []).filter(
        (o: any) => !o.status || o.status === "ACTIVE"
      );
    }

    // Score and filter eligible opportunities
    const scoredPromises = opportunities.map((opp) =>
      this.matchOpportunity(userId, opp, catalogue)
    );
    const scoredResults = await Promise.all(scoredPromises);

    // STRICT INVARIANT: Exclude ineligible opportunities from recommended feed
    let eligible = scoredResults.filter((r) => r.isEligible);

    // Optional filters
    if (options?.minScore) {
      eligible = eligible.filter((r) => r.overallScore >= options.minScore!);
    }

    if (options?.workplaceType && options.workplaceType !== "ALL") {
      eligible = eligible.filter(
        (r) =>
          (r.workplaceType || "").toUpperCase() === options.workplaceType!.toUpperCase()
      );
    }

    // Sort by overallScore desc, then deadline asc (urgent opportunities first)
    eligible.sort((a, b) => {
      if (b.overallScore !== a.overallScore) return b.overallScore - a.overallScore;
      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      return 0;
    });

    const total = eligible.length;
    const offset = options?.offset || 0;
    const limit = options?.limit || 20;
    const paginated = eligible.slice(offset, offset + limit);

    return {
      total,
      items: paginated,
      studentTargetRoles,
    };
  }
}

export const matchingService = new MatchingService();
