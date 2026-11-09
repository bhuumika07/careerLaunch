import { Opportunity } from "@/lib/db";

/**
 * Calculates Jaccard / Levenshtein-based similarity index between two strings (0 to 1)
 */
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, "");
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (s1 === s2) return 1.0;
  if (s1.length < 2 || s2.length < 2) return 0.0;

  const getBigrams = (str: string) => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  };

  const b1 = getBigrams(s1);
  const b2 = getBigrams(s2);

  let intersection = 0;
  b1.forEach((bigram) => {
    if (b2.has(bigram)) intersection++;
  });

  return (2.0 * intersection) / (b1.size + b2.size);
}

/**
 * Duplicate detector for opportunities based on title, org, and deadline similarity.
 * Returns true if similarity exceeds 85%.
 */
export function findDuplicateOpportunity(
  newOpp: { title: string; org: string; deadline: string },
  existingOpps: Opportunity[]
): { isDuplicate: boolean; matchedOpp?: Opportunity; similarityScore: number } {
  for (const existing of existingOpps) {
    const titleSim = stringSimilarity(newOpp.title, existing.title);
    const orgSim = stringSimilarity(newOpp.org, existing.org);

    // Date closeness check: within 7 days
    const newDeadline = new Date(newOpp.deadline).getTime();
    const existingDeadline = new Date(existing.deadline).getTime();
    const dateDiffDays = Math.abs(newDeadline - existingDeadline) / (1000 * 60 * 60 * 24);
    const dateSim = dateDiffDays <= 7 ? 1.0 : Math.max(0, 1 - dateDiffDays / 30);

    const compositeScore = titleSim * 0.5 + orgSim * 0.35 + dateSim * 0.15;

    if (compositeScore >= 0.85) {
      return {
        isDuplicate: true,
        matchedOpp: existing,
        similarityScore: Math.round(compositeScore * 100),
      };
    }
  }

  return { isDuplicate: false, similarityScore: 0 };
}

/**
 * Automatically evaluates whether an opportunity is expired based on current timestamp
 */
export function refreshOpportunityStatus(opp: Opportunity): Opportunity {
  const deadlineTime = new Date(opp.deadline).getTime();
  const now = Date.now();

  if (now > deadlineTime && opp.status === "active") {
    return { ...opp, status: "expired" };
  }
  return opp;
}

/**
 * Filter opportunities by query and multi-dimensional criteria
 */
export interface OpportunityFilterParams {
  query?: string;
  category?: string;
  location?: string;
  workMode?: string;
  experienceLevel?: string;
  minCgpa?: number;
  urgencyDays?: number; // e.g. 2 for <= 48h, 7 for <= 7d
}

export function filterOpportunities(
  opps: Opportunity[],
  params: OpportunityFilterParams
): Opportunity[] {
  const now = Date.now();

  return opps.filter((opp) => {
    // 1. Text search
    if (params.query && params.query.trim()) {
      const q = params.query.toLowerCase();
      const matchText =
        opp.title.toLowerCase().includes(q) ||
        opp.org.toLowerCase().includes(q) ||
        opp.description.toLowerCase().includes(q) ||
        opp.skills.some((s) => s.toLowerCase().includes(q));
      if (!matchText) return false;
    }

    // 2. Category
    if (params.category && params.category !== "All") {
      if (opp.category !== params.category) return false;
    }

    // 3. Work mode
    if (params.workMode && params.workMode !== "All") {
      if (opp.workMode.toLowerCase() !== params.workMode.toLowerCase()) return false;
    }

    // 4. Experience level
    if (params.experienceLevel && params.experienceLevel !== "All") {
      if (opp.eligibility.experienceLevel !== params.experienceLevel) return false;
    }

    // 5. Urgency filter
    if (params.urgencyDays) {
      const deadline = new Date(opp.deadline).getTime();
      const diffDays = (deadline - now) / (1000 * 60 * 60 * 24);
      if (diffDays < 0 || diffDays > params.urgencyDays) return false;
    }

    return true;
  });
}
