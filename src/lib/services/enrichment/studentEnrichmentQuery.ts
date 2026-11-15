// src/lib/services/enrichment/studentEnrichmentQuery.ts
/**
 * Student Feed Query & Filtering with AI Enrichment (Phase 3 - Milestone 3.3)
 *
 * Implements rich discovery filtering across structured qualifications, skills,
 * work mode, opportunity type, and academic eligibility while maintaining strict
 * Phase 2 active-only and freshness constraints.
 */

import { DEFAULT_FRESHNESS_CONFIG } from "../verification/freshnessManager.ts";
import type {
  OpportunityType,
  WorkMode,
  ExperienceLevel,
  DegreeLevel,
} from "./types.ts";

export interface EnrichedFeedFilters {
  // Phase 2 base filters
  query?: string;
  category?: string;
  urgencyDays?: number;
  now?: Date;
  freshnessThresholdHours?: number;
  page?: number;
  limit?: number;

  // Phase 3 enriched discovery filters
  skills?: string[];
  workMode?: string;
  opportunityType?: string;
  degreeLevels?: string[];
  branches?: string[];
  graduationYears?: number[];
  minCgpa?: number;
  experienceLevel?: string;
}

export interface EnrichedDetails {
  status: string;
  roleTitle?: string;
  descriptionSummary?: string;
  opportunityType?: OpportunityType;
  workMode?: WorkMode;
  requiredSkills: string[];
  preferredSkills: string[];
  inferredSkills: string[];
  degreeLevels: string[];
  branches: string[];
  graduationYears: number[];
  minCgpa?: number | null;
  academicRequirements?: string | null;
  experienceLevel?: ExperienceLevel;
  minExperienceMonths?: number | null;
  maxExperienceMonths?: number | null;
  isPaid?: boolean | null;
  compensation?: {
    minAmount?: number | null;
    maxAmount?: number | null;
    currency?: string | null;
    interval?: string | null;
    textVerbatim?: string | null;
  } | null;
  workAuthorization?: string | null;
  explicitRestrictions?: string[];
}

export interface EnrichedStudentOpportunityItem {
  id: string;
  title: string;
  employer: string;
  org: string;
  location: string;
  type: string;
  workMode: string;
  sourceName: string;
  lastVerifiedAt: string | null;
  applicationUrl: string | null;
  sourceUrl: string;
  description: string;
  skills: string[];
  deadline?: string | null;
  stipendSalary?: string | null;
  isFresh: boolean;
  status: string;
  enrichment?: EnrichedDetails | null;
}

export interface EnrichedStudentFeedResult {
  opportunities: EnrichedStudentOpportunityItem[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Extracts and normalizes enrichment data from an opportunity object.
 * Handles both Prisma relation shapes (`opportunity_enrichments` array or `opportunityEnrichment`)
 * and direct memory payload shapes (`enrichment`).
 */
export function extractEnrichmentData(opp: any): EnrichedDetails | null {
  if (!opp) return null;

  // Direct attached enrichment
  let raw = opp.enrichment;

  // Prisma relation: array of enrichments
  if (!raw && Array.isArray(opp.opportunity_enrichments) && opp.opportunity_enrichments.length > 0) {
    raw = opp.opportunity_enrichments.find((e: any) => e.isCurrent) || opp.opportunity_enrichments[0];
  }
  if (!raw && Array.isArray(opp.opportunityEnrichments) && opp.opportunityEnrichments.length > 0) {
    raw = opp.opportunityEnrichments.find((e: any) => e.isCurrent) || opp.opportunityEnrichments[0];
  }

  if (!raw) return null;

  // Handle nested rawPayload if stored as contract payload
  const isContractPayload = raw.basic && raw.skills && raw.opportunity_type;

  if (isContractPayload) {
    return {
      status: raw.status || "succeeded",
      roleTitle: raw.basic?.role_title,
      descriptionSummary: raw.basic?.description_summary,
      opportunityType: raw.opportunity_type?.primary_type,
      workMode: raw.location?.work_mode,
      requiredSkills: (raw.skills?.required_skills || []).map((s: any) => s.name),
      preferredSkills: (raw.skills?.preferred_skills || []).map((s: any) => s.name),
      inferredSkills: (raw.skills?.inferred_skills || []).map((s: any) => s.name),
      degreeLevels: raw.qualifications?.degree_levels || [],
      branches: raw.qualifications?.branches || [],
      graduationYears: raw.qualifications?.graduation_years || [],
      minCgpa: raw.qualifications?.min_cgpa ?? null,
      academicRequirements: raw.qualifications?.academic_requirements ?? null,
      experienceLevel: raw.experience?.experience_level,
      minExperienceMonths: raw.experience?.min_experience_months ?? null,
      maxExperienceMonths: raw.experience?.max_experience_months ?? null,
      isPaid: raw.compensation?.is_paid ?? null,
      compensation: raw.compensation
        ? {
            minAmount: raw.compensation.min_amount ?? null,
            maxAmount: raw.compensation.max_amount ?? null,
            currency: raw.compensation.currency ?? null,
            interval: raw.compensation.interval ?? null,
            textVerbatim: raw.compensation.text_verbatim ?? null,
          }
        : null,
      workAuthorization: raw.eligibility?.work_authorization ?? null,
      explicitRestrictions: raw.eligibility?.explicit_restrictions || [],
    };
  }

  // Handle flat DB column structure (from OpportunityEnrichment record)
  return {
    status: raw.status || "succeeded",
    roleTitle: raw.roleTitle,
    descriptionSummary: raw.descriptionSummary,
    opportunityType: raw.opportunityType,
    workMode: raw.workMode,
    requiredSkills: Array.isArray(raw.requiredSkills) ? raw.requiredSkills : [],
    preferredSkills: Array.isArray(raw.preferredSkills) ? raw.preferredSkills : [],
    inferredSkills: Array.isArray(raw.inferredSkills) ? raw.inferredSkills : [],
    degreeLevels: Array.isArray(raw.degreeLevels) ? raw.degreeLevels : [],
    branches: Array.isArray(raw.branches) ? raw.branches : [],
    graduationYears: Array.isArray(raw.graduationYears) ? raw.graduationYears : [],
    minCgpa: raw.minCgpa ?? null,
    academicRequirements: raw.academicRequirements ?? null,
    experienceLevel: raw.experienceLevel,
    minExperienceMonths: raw.minExperienceMonths ?? null,
    maxExperienceMonths: raw.maxExperienceMonths ?? null,
    isPaid: raw.isPaid ?? null,
    compensation: raw.compensation
      ? {
          minAmount: raw.compensation.minAmount ?? raw.compensation.min_amount ?? raw.minAmount ?? null,
          maxAmount: raw.compensation.maxAmount ?? raw.compensation.max_amount ?? raw.maxAmount ?? null,
          currency: raw.compensation.currency ?? raw.currency ?? null,
          interval: raw.compensation.interval ?? raw.compensationInterval ?? null,
          textVerbatim: raw.compensation.textVerbatim ?? raw.compensation.text_verbatim ?? raw.compensationVerbatim ?? null,
        }
      : raw.currency || raw.minAmount || raw.compensationVerbatim
      ? {
          minAmount: raw.minAmount ?? null,
          maxAmount: raw.maxAmount ?? null,
          currency: raw.currency ?? null,
          interval: raw.compensationInterval ?? null,
          textVerbatim: raw.compensationVerbatim ?? null,
        }
      : null,
    workAuthorization: raw.workAuthorization ?? null,
    explicitRestrictions: Array.isArray(raw.explicitRestrictions) ? raw.explicitRestrictions : [],
  };
}

/**
 * Pure function: Filters and formats opportunities with enriched data for the student feed.
 *
 * Preserves strict Phase 2 verification:
 * - Only ACTIVE opportunities
 * - Must be verified within freshness threshold
 * - Deadlines must not have passed
 *
 * Adds rich Phase 3 discovery filters:
 * - skills: Any match in requiredSkills, preferredSkills, or base skills
 * - workMode: Enriched work mode (remote, hybrid, onsite) or base work mode
 * - opportunityType: Enriched opportunity type (internship, full_time, etc.) or base category
 * - degreeLevels: Matches candidate degree if opportunity restricts degrees
 * - graduationYears: Matches candidate grad year if opportunity restricts years
 * - branches: Matches candidate branch
 * - minCgpa: Excludes opportunities whose minimum CGPA exceeds candidate's CGPA
 * - experienceLevel: Matches candidate experience level
 */
export function filterEnrichedStudentFeed(
  rawOpportunities: any[],
  filters: EnrichedFeedFilters = {}
): EnrichedStudentFeedResult {
  const now = filters.now ?? new Date();
  const thresholdHours =
    filters.freshnessThresholdHours ?? DEFAULT_FRESHNESS_CONFIG.normalPriorityHours;
  const freshnessCutoff = new Date(now.getTime() - thresholdHours * 3600 * 1000);

  const matched = rawOpportunities.filter((opp) => {
    // 1. Strict Phase 2 Lifecycle Status: ACTIVE only
    const normalizedStatus = String(opp.status || "").toUpperCase();
    if (normalizedStatus !== "ACTIVE") {
      return false;
    }

    // 2. Strict Phase 2 Freshness: lastVerifiedAt must be >= freshnessCutoff
    const verifiedTimeStr = opp.lastVerifiedAt || opp.lastVerifiedDate;
    if (!verifiedTimeStr) {
      return false;
    }
    const verifiedTime = new Date(verifiedTimeStr).getTime();
    if (isNaN(verifiedTime) || verifiedTime < freshnessCutoff.getTime()) {
      return false;
    }

    // 3. Strict Phase 2 Deadline: null never expires; if specified, must be > now
    const deadlineStr = opp.applicationDeadline || opp.deadline;
    if (deadlineStr) {
      const deadlineTime = new Date(deadlineStr).getTime();
      if (!isNaN(deadlineTime) && deadlineTime <= now.getTime()) {
        return false;
      }
    }

    // Extract enrichment if available
    const enrichment = extractEnrichmentData(opp);

    // Also check enrichment application deadline if present
    if (enrichment?.academicRequirements) {
      // (academic requirements checked below)
    }

    // 4. Text Search Query
    if (filters.query && filters.query.trim()) {
      const q = filters.query.toLowerCase().trim();
      const title = (opp.title || "").toLowerCase();
      const org = (opp.organizationName || opp.org || "").toLowerCase();
      const desc = (opp.description || "").toLowerCase();
      const roleTitle = (enrichment?.roleTitle || "").toLowerCase();
      const summary = (enrichment?.descriptionSummary || "").toLowerCase();

      const baseSkills = Array.isArray(opp.skills) ? opp.skills : [];
      const enrichedReqSkills = enrichment?.requiredSkills || [];
      const enrichedPrefSkills = enrichment?.preferredSkills || [];
      const enrichedInfSkills = enrichment?.inferredSkills || [];
      const allSkills = [
        ...baseSkills,
        ...enrichedReqSkills,
        ...enrichedPrefSkills,
        ...enrichedInfSkills,
      ];

      const matchesSkill = allSkills.some((s) => s.toLowerCase().includes(q));
      const matchesBranch = (enrichment?.branches || []).some((b) =>
        b.toLowerCase().includes(q)
      );

      if (
        !title.includes(q) &&
        !org.includes(q) &&
        !desc.includes(q) &&
        !roleTitle.includes(q) &&
        !summary.includes(q) &&
        !matchesSkill &&
        !matchesBranch
      ) {
        return false;
      }
    }

    // 5. Work Mode Filter
    if (filters.workMode && filters.workMode !== "All") {
      const targetMode = filters.workMode.toLowerCase();
      const effectiveMode = (
        enrichment?.workMode && enrichment.workMode !== "unknown"
          ? enrichment.workMode
          : opp.workMode || ""
      ).toLowerCase();

      if (effectiveMode !== targetMode) {
        return false;
      }
    }

    // 6. Opportunity Type Filter
    if (filters.opportunityType && filters.opportunityType !== "All") {
      const targetType = filters.opportunityType.toLowerCase();

      // Normalize base category to standard opportunity type if needed
      let baseType = (opp.type || "").toLowerCase();
      if (!baseType && opp.category) {
        const cat = opp.category.toLowerCase();
        if (cat.includes("intern")) baseType = "internship";
        else if (cat.includes("job")) baseType = "full_time";
        else baseType = cat;
      }

      const effectiveType = (
        enrichment?.opportunityType && enrichment.opportunityType !== "unknown"
          ? enrichment.opportunityType
          : baseType
      ).toLowerCase();

      if (effectiveType !== targetType) {
        return false;
      }
    }

    // 7. Legacy Category Filter (for backward compatibility)
    if (filters.category && filters.category !== "All") {
      const cat = String(opp.category || "").toLowerCase();
      if (cat !== filters.category.toLowerCase()) {
        return false;
      }
    }

    // 8. Skills Filter
    if (filters.skills && filters.skills.length > 0) {
      const filterSkillsLower = filters.skills.map((s) => s.toLowerCase().trim());
      const oppSkills = [
        ...(Array.isArray(opp.skills) ? opp.skills : []),
        ...(enrichment?.requiredSkills || []),
        ...(enrichment?.preferredSkills || []),
      ].map((s) => s.toLowerCase());

      const hasMatch = filterSkillsLower.some((reqSkill) =>
        oppSkills.some((s) => s.includes(reqSkill) || reqSkill.includes(s))
      );

      if (!hasMatch) {
        return false;
      }
    }

    // 9. Degree Levels Filter
    if (filters.degreeLevels && filters.degreeLevels.length > 0) {
      const filterDegrees = filters.degreeLevels.map((d) => d.toLowerCase());
      const oppDegrees = [
        ...(enrichment?.degreeLevels || []),
        ...(opp.eligibility?.degrees || []),
      ].map((d) => String(d).toLowerCase());

      if (oppDegrees.length > 0 && !oppDegrees.includes("any")) {
        const degreeMatches = filterDegrees.some((fd) =>
          oppDegrees.some((od) => od.includes(fd) || fd.includes(od))
        );
        if (!degreeMatches) {
          return false;
        }
      }
    }

    // 10. Graduation Years Filter
    if (filters.graduationYears && filters.graduationYears.length > 0) {
      const filterYears = filters.graduationYears;
      const oppYears = [
        ...(enrichment?.graduationYears || []),
        ...(opp.eligibility?.graduationYears || []).map(Number).filter((n: any) => !isNaN(n)),
      ];

      if (oppYears.length > 0) {
        const yearMatches = filterYears.some((fy) => oppYears.includes(fy));
        if (!yearMatches) {
          return false;
        }
      }
    }

    // 11. Academic Branches Filter
    if (filters.branches && filters.branches.length > 0) {
      const filterBranches = filters.branches.map((b) => b.toLowerCase().trim());
      const oppBranches = (enrichment?.branches || []).map((b) => b.toLowerCase());

      if (oppBranches.length > 0) {
        const branchMatches = filterBranches.some((fb) =>
          oppBranches.some((ob) => ob.includes(fb) || fb.includes(ob))
        );
        if (!branchMatches) {
          return false;
        }
      }
    }

    // 12. Minimum CGPA Filter (Student supplies their CGPA)
    if (typeof filters.minCgpa === "number") {
      const candidateCgpa = filters.minCgpa;
      const requiredCgpa =
        enrichment?.minCgpa ?? opp.eligibility?.minCgpa ?? null;

      if (typeof requiredCgpa === "number" && requiredCgpa > candidateCgpa) {
        return false; // Student is not eligible
      }
    }

    // 13. Experience Level Filter
    if (filters.experienceLevel && filters.experienceLevel !== "All") {
      const targetExp = filters.experienceLevel.toLowerCase();
      const oppExp = String(
        enrichment?.experienceLevel || opp.eligibility?.experienceLevel || ""
      ).toLowerCase();

      if (oppExp && !oppExp.includes(targetExp) && !targetExp.includes(oppExp)) {
        return false;
      }
    }

    // 14. Urgency Filter (within X days of deadline)
    if (filters.urgencyDays && deadlineStr) {
      const deadlineTime = new Date(deadlineStr).getTime();
      const diffDays = (deadlineTime - now.getTime()) / (1000 * 3600 * 24);
      if (diffDays < 0 || diffDays > filters.urgencyDays) {
        return false;
      }
    }

    return true;
  });

  const totalCount = matched.length;
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.max(1, filters.limit ?? 20);
  const totalPages = Math.ceil(totalCount / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginated = matched.slice(startIndex, startIndex + limit);

  const formatted: EnrichedStudentOpportunityItem[] = paginated.map((opp) => {
    const verifiedTimeStr = opp.lastVerifiedAt || opp.lastVerifiedDate;
    const verifiedTime = verifiedTimeStr ? new Date(verifiedTimeStr).getTime() : 0;
    const isFresh = verifiedTime >= freshnessCutoff.getTime();
    const sourceName =
      opp.source?.name ||
      opp.sourceName ||
      (opp.sourceUrl?.includes("greenhouse") ? "Greenhouse" : "Direct Employer");

    const enrichment = extractEnrichmentData(opp);

    // Merge skills: prioritizing verified enriched skills
    let finalSkills: string[] = [];
    if (enrichment && (enrichment.requiredSkills.length > 0 || enrichment.preferredSkills.length > 0)) {
      finalSkills = Array.from(new Set([...enrichment.requiredSkills, ...enrichment.preferredSkills]));
    } else {
      finalSkills = Array.isArray(opp.skills) ? opp.skills : [];
    }

    const effectiveWorkMode =
      enrichment?.workMode && enrichment.workMode !== "unknown"
        ? enrichment.workMode
        : opp.workMode || "unspecified";

    const effectiveType =
      enrichment?.opportunityType && enrichment.opportunityType !== "unknown"
        ? enrichment.opportunityType
        : opp.workMode || opp.type || "unspecified";

    let stipendSalary = opp.stipendSalary || null;
    if (enrichment?.compensation?.textVerbatim) {
      stipendSalary = enrichment.compensation.textVerbatim;
    } else if (enrichment?.compensation?.minAmount) {
      const curr = enrichment.compensation.currency || "$";
      const interval = enrichment.compensation.interval ? ` / ${enrichment.compensation.interval}` : "";
      if (enrichment.compensation.maxAmount && enrichment.compensation.maxAmount !== enrichment.compensation.minAmount) {
        stipendSalary = `${curr}${enrichment.compensation.minAmount.toLocaleString()} - ${curr}${enrichment.compensation.maxAmount.toLocaleString()}${interval}`;
      } else {
        stipendSalary = `${curr}${enrichment.compensation.minAmount.toLocaleString()}${interval}`;
      }
    }

    return {
      id: opp.id,
      title: enrichment?.roleTitle || opp.title,
      employer: enrichment?.compensation ? opp.organizationName || opp.org || "Employer" : opp.organizationName || opp.org || "Employer",
      org: opp.organizationName || opp.org || "Employer",
      location:
        opp.location ||
        [opp.locationCity, opp.locationState, opp.locationCountry]
          .filter(Boolean)
          .join(", ") ||
        "Remote",
      type: effectiveType,
      workMode: effectiveWorkMode,
      sourceName,
      lastVerifiedAt: verifiedTimeStr ? new Date(verifiedTimeStr).toISOString() : null,
      applicationUrl: opp.applicationUrl || opp.sourceUrl || null,
      sourceUrl: opp.sourceUrl || "",
      description: enrichment?.descriptionSummary || opp.description || "",
      skills: finalSkills,
      deadline: opp.applicationDeadline || opp.deadline || null,
      stipendSalary,
      isFresh,
      status: "ACTIVE",
      enrichment,
    };
  });

  return {
    opportunities: formatted,
    totalCount,
    page,
    limit,
    totalPages,
  };
}
