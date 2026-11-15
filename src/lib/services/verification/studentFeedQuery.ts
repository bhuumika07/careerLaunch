// src/lib/services/verification/studentFeedQuery.ts
import { DEFAULT_FRESHNESS_CONFIG } from "./freshnessManager.ts";

export interface StudentFeedFilters {
  query?: string;
  category?: string;
  workMode?: string;
  experienceLevel?: string;
  urgencyDays?: number;
  page?: number;
  limit?: number;
  now?: Date;
  freshnessThresholdHours?: number;
}

export interface StudentFeedOpportunityItem {
  id: string;
  title: string;
  employer: string;
  org: string; // for backward compatibility with UI
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
}

export interface StudentFeedQueryResult {
  opportunities: StudentFeedOpportunityItem[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Pure function: Filters and normalizes opportunities for the student-facing active feed.
 *
 * Rules:
 * - status MUST be ACTIVE (or 'active' in legacy format)
 * - lastVerifiedAt MUST be >= freshnessCutoff (computed from DEFAULT_FRESHNESS_CONFIG)
 * - applicationDeadline MUST be null OR in the future (> now)
 * - Items with status STALE, CLOSED, EXPIRED, INVALID, PENDING, REVIEW_REQUIRED are strictly excluded.
 */
export function filterStudentActiveFeed(
  rawOpportunities: any[],
  filters: StudentFeedFilters = {}
): StudentFeedQueryResult {
  const now = filters.now ?? new Date();
  const thresholdHours =
    filters.freshnessThresholdHours ??
    DEFAULT_FRESHNESS_CONFIG.normalPriorityHours; // default 24h
  const freshnessCutoff = new Date(now.getTime() - thresholdHours * 3600 * 1000);

  const activeCandidates = rawOpportunities.filter((opp) => {
    // 1. Status rule: strictly ACTIVE
    const normalizedStatus = String(opp.status || "").toUpperCase();
    if (normalizedStatus !== "ACTIVE") {
      return false;
    }

    // 2. Freshness rule: lastVerifiedAt must exist and be >= freshnessCutoff
    const verifiedTimeStr = opp.lastVerifiedAt || opp.lastVerifiedDate;
    if (!verifiedTimeStr) {
      return false;
    }
    const verifiedTime = new Date(verifiedTimeStr).getTime();
    if (isNaN(verifiedTime) || verifiedTime < freshnessCutoff.getTime()) {
      return false;
    }

    // 3. Deadline rule: null deadline never expires; if deadline exists, must be in future
    const deadlineStr = opp.applicationDeadline || opp.deadline;
    if (deadlineStr) {
      const deadlineTime = new Date(deadlineStr).getTime();
      if (!isNaN(deadlineTime) && deadlineTime <= now.getTime()) {
        return false;
      }
    }

    // 4. Text search query
    if (filters.query && filters.query.trim()) {
      const q = filters.query.toLowerCase().trim();
      const title = (opp.title || "").toLowerCase();
      const org = (opp.org || opp.organizationName || "").toLowerCase();
      const desc = (opp.description || "").toLowerCase();
      const skills = Array.isArray(opp.skills) ? opp.skills : [];
      const matchSkill = skills.some((s: string) => s.toLowerCase().includes(q));

      if (!title.includes(q) && !org.includes(q) && !desc.includes(q) && !matchSkill) {
        return false;
      }
    }

    // 5. Category filter
    if (filters.category && filters.category !== "All") {
      const cat = String(opp.category || "").toLowerCase();
      if (cat !== filters.category.toLowerCase()) {
        return false;
      }
    }

    // 6. Work mode filter
    if (filters.workMode && filters.workMode !== "All") {
      const mode = String(opp.workMode || "").toLowerCase();
      if (mode !== filters.workMode.toLowerCase()) {
        return false;
      }
    }

    // 7. Experience level
    if (filters.experienceLevel && filters.experienceLevel !== "All") {
      const exp = opp.eligibility?.experienceLevel;
      if (exp && exp !== filters.experienceLevel) {
        return false;
      }
    }

    // 8. Urgency filter (within X days of deadline)
    if (filters.urgencyDays && deadlineStr) {
      const deadlineTime = new Date(deadlineStr).getTime();
      const diffDays = (deadlineTime - now.getTime()) / (1000 * 3600 * 24);
      if (diffDays < 0 || diffDays > filters.urgencyDays) {
        return false;
      }
    }

    return true;
  });

  const totalCount = activeCandidates.length;
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.max(1, filters.limit ?? 20);
  const totalPages = Math.ceil(totalCount / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginated = activeCandidates.slice(startIndex, startIndex + limit);

  const formatted: StudentFeedOpportunityItem[] = paginated.map((opp) => {
    const verifiedTimeStr = opp.lastVerifiedAt || opp.lastVerifiedDate;
    const verifiedTime = verifiedTimeStr ? new Date(verifiedTimeStr).getTime() : 0;
    const isFresh = verifiedTime >= freshnessCutoff.getTime();
    const sourceName =
      opp.source?.name || opp.sourceName || (opp.sourceUrl?.includes("greenhouse") ? "Greenhouse" : "Direct Employer");

    return {
      id: opp.id,
      title: opp.title,
      employer: opp.organizationName || opp.org || "Employer",
      org: opp.organizationName || opp.org || "Employer",
      location:
        opp.location ||
        [opp.locationCity, opp.locationState, opp.locationCountry]
          .filter(Boolean)
          .join(", ") ||
        "Remote",
      type: opp.workMode || "unspecified",
      workMode: opp.workMode || "unspecified",
      sourceName,
      lastVerifiedAt: verifiedTimeStr ? new Date(verifiedTimeStr).toISOString() : null,
      applicationUrl: opp.applicationUrl || opp.sourceUrl || null,
      sourceUrl: opp.sourceUrl || "",
      description: opp.description || "",
      skills: Array.isArray(opp.skills) ? opp.skills : opp.requiredSkills || [],
      deadline: opp.applicationDeadline || opp.deadline || null,
      stipendSalary: opp.stipendSalary || (opp.compensation ? "Competitive" : null),
      isFresh,
      status: "ACTIVE",
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
