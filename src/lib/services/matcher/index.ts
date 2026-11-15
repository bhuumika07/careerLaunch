import { Opportunity, StudentProfile } from "@/lib/db";

export interface ConditionResult {
  condition: string;
  status: "met" | "not_met" | "unknown";
  detail: string;
}

export interface EligibilityResult {
  status: "eligible" | "not_eligible" | "partially_unknown";
  conditions: ConditionResult[];
  reasons: string[];
}

export interface MatchScoreResult {
  score: number;
  band: "Strong" | "Good" | "Partial" | "Low";
  isEligible: boolean;
  eligibility: EligibilityResult;
  matchedSkills: { name: string; status: "verified" | "self_declared"; weight: number }[];
  missingSkills: string[];
  reasons: string[];
}

/**
 * Deterministic, explainable matching engine evaluating profile against opportunity.
 */
export function calculateMatch(
  profile: StudentProfile,
  opp: Opportunity
): MatchScoreResult {
  const conditions: ConditionResult[] = [];
  const reasons: string[] = [];
  let hardFailed = false;
  let unknownCount = 0;

  // 1. HARD ELIGIBILITY CHECKS
  // Degrees check (if explicitly specified)
  if (opp.eligibility.degrees && opp.eligibility.degrees.length > 0) {
    if (!profile.degree) {
      conditions.push({ condition: "Degree", status: "unknown", detail: "Profile degree not specified" });
      unknownCount++;
    } else {
      const profileDeg = profile.degree.toLowerCase();
      const matches = opp.eligibility.degrees.some((d) => profileDeg.includes(d.toLowerCase()) || d.toLowerCase().includes(profileDeg));
      if (matches) {
        conditions.push({ condition: "Degree", status: "met", detail: `Degree matches (${profile.degree})` });
      } else {
        conditions.push({ condition: "Degree", status: "not_met", detail: `Requires ${opp.eligibility.degrees.join(" / ")}, you have ${profile.degree}` });
        hardFailed = true;
        reasons.push(`Degree requirement not met (requires ${opp.eligibility.degrees.join(", ")})`);
      }
    }
  }

  // Minimum CGPA check (if explicitly specified)
  if (opp.eligibility.minCgpa) {
    if (profile.cgpa === undefined || profile.cgpa === null) {
      conditions.push({ condition: "Minimum CGPA", status: "unknown", detail: "Profile CGPA not specified" });
      unknownCount++;
    } else if (profile.cgpa >= opp.eligibility.minCgpa) {
      conditions.push({ condition: "Minimum CGPA", status: "met", detail: `CGPA ${profile.cgpa} meets minimum ${opp.eligibility.minCgpa}` });
    } else {
      conditions.push({ condition: "Minimum CGPA", status: "not_met", detail: `CGPA ${profile.cgpa} below cutoff ${opp.eligibility.minCgpa}` });
      hardFailed = true;
      reasons.push(`Minimum CGPA of ${opp.eligibility.minCgpa} required (profile has ${profile.cgpa})`);
    }
  }

  // Graduation Year check (if explicitly specified)
  if (opp.eligibility.graduationYears && opp.eligibility.graduationYears.length > 0) {
    if (!profile.graduationYear) {
      conditions.push({ condition: "Graduation Year", status: "unknown", detail: "Profile graduation year not specified" });
      unknownCount++;
    } else {
      const matchGrad = opp.eligibility.graduationYears.some((y) => y.includes(String(profile.graduationYear)));
      if (matchGrad) {
        conditions.push({ condition: "Graduation Year", status: "met", detail: `Batch ${profile.graduationYear} eligible` });
      } else {
        conditions.push({ condition: "Graduation Year", status: "not_met", detail: `Target batches: ${opp.eligibility.graduationYears.join(", ")}` });
        hardFailed = true;
        reasons.push(`Target batches ${opp.eligibility.graduationYears.join(", ")} do not include ${profile.graduationYear}`);
      }
    }
  }

  const eligibilityStatus: "eligible" | "not_eligible" | "partially_unknown" = hardFailed
    ? "not_eligible"
    : unknownCount > 0
    ? "partially_unknown"
    : "eligible";

  // 2. SKILL MATCH
  const profileSkillsMap = new Map<string, { status: "verified" | "self_declared" }>();
  for (const s of profile.skills || []) {
    profileSkillsMap.set(s.name.toLowerCase().trim(), { status: s.status });
  }

  const matchedSkills: { name: string; status: "verified" | "self_declared"; weight: number }[] = [];
  const missingSkills: string[] = [];

  let skillPointsEarned = 0;
  const oppSkills = opp.skills || [];
  const maxSkillPoints = Math.max(oppSkills.length * 1.5, 1);

  for (const skill of oppSkills) {
    const key = skill.toLowerCase().trim();
    if (profileSkillsMap.has(key)) {
      const info = profileSkillsMap.get(key)!;
      // Verified skills receive 1.5x weight, self-declared receive 1.0x
      const weight = info.status === "verified" ? 1.5 : 1.0;
      skillPointsEarned += weight;
      matchedSkills.push({ name: skill, status: info.status, weight });
    } else {
      missingSkills.push(skill);
    }
  }

  const rawSkillScore = (skillPointsEarned / maxSkillPoints) * 100;

  // 3. EXPERIENCE & WORK MODE PREFERENCES
  let preferenceBonus = 0;
  if (profile.location && opp.location && opp.location.toLowerCase().includes(profile.location.toLowerCase())) {
    preferenceBonus += 5;
  }
  if (opp.workMode === "remote") {
    preferenceBonus += 5;
  }

  let finalScore = Math.min(Math.round(rawSkillScore * 0.9 + preferenceBonus), 100);

  // CRITICAL RULE: If user fails explicit mandatory criteria, score is capped and marked Not eligible
  let band: "Strong" | "Good" | "Partial" | "Low";
  if (hardFailed) {
    finalScore = Math.min(finalScore, 45);
    band = "Low";
  } else if (finalScore >= 85) {
    band = "Strong";
    reasons.push("Strong skill overlap with verified competencies");
  } else if (finalScore >= 70) {
    band = "Good";
    reasons.push("Good match with key required skills satisfied");
  } else if (finalScore >= 50) {
    band = "Partial";
    reasons.push("Partial match - bridge skill gaps via learning roadmap");
  } else {
    band = "Low";
    reasons.push("Several primary required skills are missing");
  }

  return {
    score: finalScore,
    band,
    isEligible: !hardFailed,
    eligibility: {
      status: eligibilityStatus,
      conditions,
      reasons,
    },
    matchedSkills,
    missingSkills,
    reasons,
  };
}
