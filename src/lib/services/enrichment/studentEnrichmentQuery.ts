// src/lib/services/enrichment/studentEnrichmentQuery.ts
/**
 * Student Feed Query & Filtering with AI Enrichment (Phase 3 - Milestone 3.3)
 *
 * Implements rich discovery filtering across structured qualifications, skills,
 * work mode, opportunity type, and academic eligibility while maintaining strict
 * Phase 2 active-only and freshness constraints.
 */

import { DEFAULT_FRESHNESS_CONFIG } from "../verification/freshnessManager.ts";
import { isRecommendable } from "../verification/lifecycleConsistency.ts";
import type {
  OpportunityType,
  WorkMode,
  ExperienceLevel,
  DegreeLevel,
} from "./types.ts";

export const TITLE_DOMAIN_RULES: Array<{ domain: string; pattern: RegExp }> = [
  { domain: "security", pattern: /\b(security|infosec|cybersecurity|secops|penetration|cryptograph)\b/i },
  { domain: "data_ai_ml", pattern: /\b(machine learning|data scientist|data science|deep learning|nlp|computer vision|genai|llm|data analyst|data engineer|artificial intelligence|applied scientist|ai engineer)\b/i },
  { domain: "design", pattern: /\b(product design|ui[\s/]ux|designer|graphic design|figma|visual design)\b/i },
  { domain: "devops_cloud", pattern: /\b(devops|sre|site reliability|cloud|infrastructure|systems engineer|platform engineering)\b/i },
  { domain: "product", pattern: /\b(product manager|product management|apm|technical product manager)\b/i },
  { domain: "business", pattern: /\b(business development|sales|marketing|account executive|recruiter|finance|operations|consulting)\b/i },
  { domain: "software", pattern: /\b(software|developer|engineer|frontend|backend|fullstack|sde|swe|web|mobile|ios|android|application)\b/i },
];

export const DOMAIN_PATTERNS: Record<string, RegExp[]> = {
  data_ai_ml: [
    /\b(machine learning|data scientist|data science|deep learning|nlp|computer vision|genai|llm|data analyst|data engineer|artificial intelligence)\b/i,
    /\b(pytorch|tensorflow|scikit-learn|pandas|huggingface|spark|big data|(?:data|predictive|business)\s+analytics|analytics engine)\b/i,
  ],
  design: [
    /\b(product design(?:er)?|ui[\s/]ux|user experience|graphic design|design system|figma|visual design|interaction design)\b/i,
  ],
  security: [
    /\b(cyber[\s-]?security|infosec|secops|penetration test(?:ing)?|vulnerability|ethical hack(?:er|ing)|soc analyst|cryptography)\b/i,
  ],
  devops_cloud: [
    /\b(devops|sre|site reliability|cloud engineer|platform engineer|infrastructure|kubernetes|docker|terraform|aws|azure|gcp)\b/i,
  ],
  product: [
    /\b(product manager|technical product manager|associate product manager|apm|product management|group product manager)\b/i,
  ],
  business: [
    /\b(business development|sales|marketing|account executive|human resources|recruiter|finance|operations|consulting)\b/i,
  ],
  software: [
    /\b(software|developer|engineer|frontend|backend|fullstack|sde|swe|web developer|mobile developer|ios|android|java|python|react|node|typescript|golang)\b/i,
  ],
};

export const DEGREE_ALIASES: Record<string, string[]> = {
  bachelors: ["b.tech", "b.e", "b.sc", "bca", "bs", "bachelor", "undergraduate", "b.des", "dual degree"],
  masters: ["m.tech", "m.s", "m.sc", "mca", "master", "postgraduate", "mba"],
  phd: ["phd", "doctorate", "doctoral", "research scholar"],
};

export function inferOpportunityDomain(opp: any, enrichment?: EnrichedDetails | null): string {
  // 1. High-confidence Title check takes first priority
  const title = (opp.title || "").trim();
  for (const rule of TITLE_DOMAIN_RULES) {
    if (rule.pattern.test(title)) {
      return rule.domain;
    }
  }

  // 2. Explicit structured enrichment domain
  if (enrichment?.domain && enrichment.domain !== "other" && enrichment.domain !== "unknown") {
    return enrichment.domain;
  }

  // 3. Fallback to description & skills patterns
  const text = `${title} ${opp.description || ""} ${(opp.skills || []).join(" ")}`.toLowerCase();
  for (const [dom, patterns] of Object.entries(DOMAIN_PATTERNS)) {
    if (patterns.some((p) => p.test(text))) {
      return dom;
    }
  }
  return "software";
}

export function inferPositionType(opp: any, enrichment?: EnrichedDetails | null): string {
  if (enrichment?.opportunityType && (enrichment.opportunityType as string) !== "unknown") {
    if ((enrichment.opportunityType as string) === "fellowship") return "research";
    return enrichment.opportunityType;
  }
  const title = (opp.title || "").toLowerCase();
  const cat = String(opp.category || "").toLowerCase();
  const type = String(opp.type || "").toLowerCase();

  if (cat.includes("intern") || type.includes("intern") || /\bintern(?:ship)?\b/i.test(title)) {
    return "internship";
  }
  if (cat.includes("research") || cat.includes("fellowship") || /\b(research|fellowship|lab)\b/i.test(title)) {
    return "research";
  }
  if (type.includes("contract") || type.includes("part_time") || cat.includes("project") || /\b(contract|part[\s-]time|freelance)\b/i.test(title)) {
    return "contract";
  }
  return "full_time";
}

export interface EnrichedFeedFilters {
  // Phase 2 base filters
  query?: string;
  category?: string;
  urgencyDays?: number;
  now?: Date;
  freshnessThresholdHours?: number;
  page?: number;
  limit?: number;

  // Streamlined 4 Core Dimensions
  domain?: string; // Job Domain: software, data_ai_ml, design, devops_cloud, security, product, business
  positionType?: string; // Position Type: internship, full_time, research, contract
  graduationYears?: number[];
  degreeLevels?: string[];

  // Phase 3 enriched discovery filters & backward compatibility
  skills?: string[];
  workMode?: string;
  opportunityType?: string;
  location?: string;
  deadline?: string | Date;
  branches?: string[];
  minCgpa?: number;
  experienceLevel?: string;
  allowReviewState?: boolean; // Default false: hides needs_review from student feed
  allowQuarantined?: boolean; // Default false: strictly excludes quarantined records from student feed
}

export interface EnrichedDetails {
  status: string;
  domain?: string | null;
  roleTitle?: string;
  descriptionSummary?: string;
  opportunityType?: OpportunityType;
  workMode?: WorkMode;
  requiredSkills: string[];
  preferredSkills: string[];
  inferredSkills: string[];
  required_skills?: string[];
  preferred_skills?: string[];
  inferred_skills?: string[];
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
  description: string; // Original description always preserved
  rawDescription?: string; // Explicit alias
  summary?: string | null; // Description summary from enrichment
  descriptionSummary?: string | null;
  skills: string[]; // Base backward-compatible skills
  required_skills: string[]; // Strictly separated required skills
  preferred_skills: string[]; // Strictly separated preferred skills
  inferred_skills: string[]; // Clearly labeled inferred skills
  deadline?: string | null;
  stipendSalary?: string | null;
  domain?: string | null;
  positionType?: string | null;
  degreeLevels?: string[];
  graduationYears?: number[];
  isFresh: boolean;
  status: string;
  isQuarantined?: boolean;
  quarantineReasons?: string[];
  dataQualityScore?: number | null;
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
export function extractEnrichmentData(
  opp: any,
  options: { allowReviewState?: boolean } = {}
): EnrichedDetails | null {
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

  // Enforce Chunk 6 rule: Only succeeded (non-review) enrichments are shown to students by default
  const status = raw.status || "succeeded";
  if (!options.allowReviewState && status !== "succeeded") {
    return null;
  }

  // Handle nested rawPayload if stored as contract payload
  const isContractPayload = raw.basic && raw.skills && raw.opportunity_type;

  if (isContractPayload) {
    const req = (raw.skills?.required_skills || []).map((s: any) => s.name);
    const pref = (raw.skills?.preferred_skills || []).map((s: any) => s.name);
    const inf = (raw.skills?.inferred_skills || []).map((s: any) => s.name);
    return {
      status,
      domain: raw.domain || raw.basic?.domain || null,
      roleTitle: raw.basic?.role_title,
      descriptionSummary: raw.basic?.description_summary,
      opportunityType: raw.opportunity_type?.primary_type,
      workMode: raw.location?.work_mode,
      requiredSkills: req,
      preferredSkills: pref,
      inferredSkills: inf,
      required_skills: req,
      preferred_skills: pref,
      inferred_skills: inf,
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
  const reqSkills = Array.isArray(raw.requiredSkills) ? raw.requiredSkills : [];
  const prefSkills = Array.isArray(raw.preferredSkills) ? raw.preferredSkills : [];
  const infSkills = Array.isArray(raw.inferredSkills) ? raw.inferredSkills : [];

  return {
    status,
    domain: raw.domain || null,
    roleTitle: raw.roleTitle,
    descriptionSummary: raw.descriptionSummary,
    opportunityType: raw.opportunityType,
    workMode: raw.workMode,
    requiredSkills: reqSkills,
    preferredSkills: prefSkills,
    inferredSkills: infSkills,
    required_skills: reqSkills,
    preferred_skills: prefSkills,
    inferred_skills: infSkills,
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
    // Strict Phase 2 Invariant: Central isRecommendable check (ONLY ACTIVE counts)
    if (
      !isRecommendable(opp, {
        now,
        freshnessThresholdHours: thresholdHours,
        allowQuarantined: filters.allowQuarantined,
      })
    ) {
      return false;
    }

    // Extract enrichment if available (respects allowReviewState)
    const enrichment = extractEnrichmentData(opp, {
      allowReviewState: filters.allowReviewState ?? false,
    });

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

    // 5. Job Domain Filter ("what job domain u are looking for")
    if (filters.domain && filters.domain !== "All" && filters.domain !== "all") {
      const targetDomain = filters.domain.toLowerCase().trim();
      const detectedDomain = inferOpportunityDomain(opp, enrichment);

      if (detectedDomain !== targetDomain) {
        return false;
      }
    }

    // 6. Position Type Filter ("what kind of position u are looking for")
    const posFilter = filters.positionType || filters.opportunityType;
    if (posFilter && posFilter !== "All" && posFilter !== "all") {
      const targetPos = posFilter.toLowerCase().trim();
      const detectedPos = inferPositionType(opp, enrichment);

      let matchesPos = detectedPos === targetPos;
      if (!matchesPos) {
        const catLower = String(opp.category || "").toLowerCase();
        const titleLower = String(opp.title || "").toLowerCase();
        const typeLower = String(opp.type || "").toLowerCase();

        if (targetPos === "internship" || targetPos === "intern") {
          matchesPos =
            catLower.includes("intern") ||
            typeLower.includes("intern") ||
            /\bintern(?:ship)?\b/i.test(titleLower) ||
            String(opp.eligibility?.experienceLevel || "").toLowerCase().includes("intern");
        } else if (targetPos === "full_time" || targetPos === "jobs" || targetPos === "job") {
          matchesPos =
            catLower === "jobs" ||
            typeLower.includes("full_time") ||
            typeLower.includes("job") ||
            (/\b(fresher|graduate|engineer|developer|analyst)\b/i.test(titleLower) && !/\bintern(?:ship)?\b/i.test(titleLower));
        } else if (targetPos === "research" || targetPos === "fellowship") {
          matchesPos =
            catLower.includes("research") ||
            catLower.includes("fellowship") ||
            catLower.includes("collaboration") ||
            /\b(research|fellowship|lab)\b/i.test(titleLower);
        } else if (targetPos === "contract" || targetPos === "part_time") {
          matchesPos =
            catLower.includes("project") ||
            catLower.includes("workshop") ||
            typeLower.includes("contract") ||
            typeLower.includes("part_time") ||
            /\b(contract|part[\s-]time|freelance)\b/i.test(titleLower);
        }
      }

      if (!matchesPos) {
        return false;
      }
    }

    // 7. Graduating Year Filter ("graduating year")
    if (filters.graduationYears && filters.graduationYears.length > 0) {
      const filterYears = filters.graduationYears;
      const oppYears = [
        ...(enrichment?.graduationYears || []),
        ...(opp.eligibility?.graduationYears || []).map(Number).filter((n: any) => !isNaN(n)),
      ];

      if (oppYears.length > 0) {
        const hasYearMatch = filterYears.some((fy) => {
          if (fy >= 2028) {
            return oppYears.some((oy) => oy >= 2028);
          }
          return oppYears.includes(fy);
        });
        if (!hasYearMatch) {
          return false;
        }
      } else {
        const text = `${opp.title || ""} ${opp.description || ""}`.toLowerCase();
        const mentionedYears = text.match(/\b(202[3-9])\b/g);
        if (mentionedYears && mentionedYears.length > 0) {
          const numMentioned = mentionedYears.map(Number);
          const hasMentionMatch = filterYears.some((fy) => numMentioned.includes(fy));
          if (!hasMentionMatch) {
            return false;
          }
        }
      }
    }

    // 8. Degree Level Filter ("degree level")
    if (filters.degreeLevels && filters.degreeLevels.length > 0) {
      const filterDegrees = filters.degreeLevels.map((d) => d.toLowerCase());
      if (!filterDegrees.includes("all") && !filterDegrees.includes("any")) {
        const oppDegrees = [
          ...(enrichment?.degreeLevels || []),
          ...(opp.eligibility?.degrees || []),
        ].map((d) => String(d).toLowerCase());

        if (oppDegrees.length > 0 && !oppDegrees.some((d) => d.includes("any") || d.includes("open"))) {
          const hasDegreeMatch = filterDegrees.some((candDeg) => {
            const aliases = DEGREE_ALIASES[candDeg] || [candDeg];
            return oppDegrees.some((od) =>
              aliases.some((alias) => od.includes(alias) || alias.includes(od))
            );
          });
          if (!hasDegreeMatch) {
            return false;
          }
        }
      }
    }

    // 9. Work Mode Filter (Backward compatibility)
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

    // 10. Legacy Category Filter (for backward compatibility)
    if (filters.category && filters.category !== "All") {
      const cat = String(opp.category || "").toLowerCase().trim();
      const targetCat = filters.category.toLowerCase().trim();
      const norm = (s: string) => s.replace(/s$/, ""); // normalize internships -> internship, jobs -> job
      if (norm(cat) !== norm(targetCat)) {
        return false;
      }
    }

    // Location Filter
    if (filters.location && filters.location !== "All") {
      const targetLoc = filters.location.toLowerCase().trim();
      const oppLocation = (
        opp.location ||
        opp.locationCity ||
        opp.workMode ||
        enrichment?.workMode ||
        ((enrichment as any)?.cities || []).join(" ") ||
        (enrichment as any)?.country ||
        ""
      ).toLowerCase();
      if (!oppLocation.includes(targetLoc)) {
        return false;
      }
    }

    // Explicit Deadline Filter
    const deadlineStr = opp.applicationDeadline || opp.deadline;
    if (filters.deadline && deadlineStr) {
      const targetDeadline = new Date(filters.deadline).getTime();
      const oppDeadline = new Date(deadlineStr).getTime();
      if (!isNaN(targetDeadline) && !isNaN(oppDeadline) && oppDeadline > targetDeadline) {
        return false;
      }
    }

    // Skills Filter
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

    const enrichment = extractEnrichmentData(opp, {
      allowReviewState: filters.allowReviewState ?? false,
    });

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

    const rawDesc = opp.description || opp.originalText || "";
    const reqSkills = enrichment?.requiredSkills || [];
    const prefSkills = enrichment?.preferredSkills || [];
    const infSkills = enrichment?.inferredSkills || [];

    const itemDomain = inferOpportunityDomain(opp, enrichment);
    const itemPositionType = inferPositionType(opp, enrichment);
    const itemDegreeLevels = Array.from(
      new Set([...(enrichment?.degreeLevels || []), ...(opp.eligibility?.degrees || [])])
    );
    const itemGraduationYears = Array.from(
      new Set([
        ...(enrichment?.graduationYears || []),
        ...(opp.eligibility?.graduationYears || []).map(Number).filter((n: any) => !isNaN(n)),
      ])
    );

    return {
      id: opp.id,
      title: enrichment?.roleTitle || opp.title,
      employer: opp.organizationName || opp.org || "Employer",
      org: opp.organizationName || opp.org || "Employer",
      location:
        opp.location ||
        [opp.locationCity, opp.locationState, opp.locationCountry]
          .filter(Boolean)
          .join(", ") ||
        "Remote",
      type: effectiveType,
      workMode: effectiveWorkMode,
      domain: itemDomain,
      positionType: itemPositionType,
      degreeLevels: itemDegreeLevels,
      graduationYears: itemGraduationYears,
      sourceName,
      lastVerifiedAt: verifiedTimeStr ? new Date(verifiedTimeStr).toISOString() : null,
      applicationUrl: opp.applicationUrl || opp.sourceUrl || null,
      sourceUrl: opp.sourceUrl || "",
      description: rawDesc, // Original description is always preserved
      rawDescription: rawDesc,
      summary: enrichment?.descriptionSummary || null,
      descriptionSummary: enrichment?.descriptionSummary || null,
      skills: Array.isArray(opp.skills) ? opp.skills : [],
      required_skills: reqSkills,
      preferred_skills: prefSkills,
      inferred_skills: infSkills,
      deadline: opp.applicationDeadline || opp.deadline || null,
      stipendSalary,
      isFresh,
      status: "ACTIVE",
      isQuarantined: opp.isQuarantined || false,
      quarantineReasons: opp.quarantineReasons || [],
      dataQualityScore: opp.dataQualityScore ?? null,
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
