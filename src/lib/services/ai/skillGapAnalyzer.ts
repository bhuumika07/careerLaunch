import Groq from "groq-sdk";
import { z } from "zod";
import type { OpportunityMatchResult } from "../matching/matchingService";
import type { GroqFitStudentContext, GroqFitOpportunityContext } from "./groqFitAnalyzer";

const JobRequirementsSchema = z.object({
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
});

const SkillGapActionSchema = z.object({
  title: z.string(),
  type: z.enum(["learn", "project", "resume"]).default("learn"),
  timeframe: z.string().default("1-2 weeks"),
  description: z.string(),
});

const GroqNarrativeSchema = z.object({
  roleInterestScore: z.number().min(0).max(30).optional(),
  strengths: z.array(z.string()).default([]),
  gaps: z.array(z.string()).default([]),
  actionPlan: z.array(SkillGapActionSchema).default([]),
  summary: z.string().default(""),
});

export interface SkillGapAnalysisResult extends OpportunityMatchResult {
  poweredBy: "groq" | "deterministic";
  summary: string;
  missingPreferredSkills: string[];
  strengths: string[];
  gaps: string[];
  actionPlan: Array<{
    title: string;
    type: "learn" | "project" | "resume";
    timeframe: string;
    description: string;
  }>;
}

interface CachedJobRequirements {
  expiresAt: number;
  requiredSkills: string[];
  preferredSkills: string[];
  poweredBy: "groq" | "deterministic";
}

interface CachedNarrative {
  expiresAt: number;
  roleInterestScore: number;
  strengths: string[];
  gaps: string[];
  actionPlan: SkillGapAnalysisResult["actionPlan"];
  summary: string;
  poweredBy: "groq" | "deterministic";
}

// Cache extracted job requirements per opportunityId so adding a student skill
// never causes the job's required/preferred skill list to fluctuate.
const JOB_REQUIREMENTS_CACHE = new Map<string, CachedJobRequirements>();
const NARRATIVE_CACHE = new Map<string, CachedNarrative>();
const JOB_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const NARRATIVE_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
let cachedWorkingModel: string | null = null;

const SKILL_ALIASES: Record<string, string> = {
  dsa: "datastructuresalgorithms",
  datastructuresandalgorithms: "datastructuresalgorithms",
  js: "javascript",
  ts: "typescript",
  nodejs: "node",
  node: "node",
  nextjs: "nextjs",
  reactjs: "react",
  postgres: "postgresql",
  csharp: "c#",
  dotnet: "net",
  "c++": "cpp",
  technicalcommunication: "communication",
  communicaiton: "communication",
  communications: "communication",
};

function normalizeSkillKey(skill: string): string {
  const base = skill
    .toLowerCase()
    .replace(/[^a-z0-9+#]/g, "")
    .replace(/skills?$/, "");
  return SKILL_ALIASES[base] || base;
}

function getCandidateGroqModels(): string[] {
  const candidates = [
    cachedWorkingModel,
    process.env.GROQ_MODEL,
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "qwen/qwen3.8-27b",
  ].filter((m): m is string => Boolean(m && m.trim()));
  return Array.from(new Set(candidates));
}

async function callGroqJson(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === "gsk_your_groq_api_key_here") {
    return null;
  }

  const groq = new Groq({ apiKey });
  let completion: any = null;
  let lastErr: unknown = null;

  for (const candidateModel of getCandidateGroqModels()) {
    try {
      completion = await groq.chat.completions.create({
        model: candidateModel,
        temperature: 0.15,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      cachedWorkingModel = candidateModel;
      break;
    } catch (err: any) {
      lastErr = err;
      const msg = err?.message || "";
      if (err?.status === 404 || msg.includes("model_not_found") || msg.includes("does not exist")) {
        continue;
      }
      throw err;
    }
  }

  if (!completion) {
    throw lastErr || new Error("No available Groq model succeeded");
  }

  return completion.choices[0]?.message?.content || null;
}

function dedupeSkills(skills: string[]): string[] {
  const map = new Map<string, string>();
  for (const s of skills) {
    const trimmed = s.trim();
    const key = normalizeSkillKey(trimmed);
    if (key && !map.has(key)) {
      map.set(key, trimmed);
    }
  }
  return Array.from(map.values());
}

/**
 * Extracts and caches the canonical required & preferred skills for a job posting
 * once per opportunityId so subsequent skill additions compare against a fixed baseline.
 */
async function getFixedJobRequirements(
  opp: GroqFitOpportunityContext,
  baseResult: OpportunityMatchResult,
  cleanDesc: string
): Promise<{ requiredSkills: string[]; preferredSkills: string[]; poweredBy: "groq" | "deterministic" }> {
  const cached = JOB_REQUIREMENTS_CACHE.get(opp.id);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  const fallbackRequired = dedupeSkills([
    ...(opp.skills || []),
    ...(baseResult.skillAnalysis?.matchedRequiredSkills || []),
    ...(baseResult.skillAnalysis?.missingRequiredSkills || []),
  ]);

  try {
    const systemPrompt = `Extract the concrete technical and professional skills required for this job posting.
Return ONLY valid JSON matching:
{
  "requiredSkills": string[],
  "preferredSkills": string[]
}
Rules:
- Keep skill names concise and canonical (e.g., "React", "TypeScript", "SQL Server", "Data Structures & Algorithms", ".NET", "Docker").
- Put core mandatory skills in requiredSkills (4-10 items) and nice-to-have/bonus skills in preferredSkills (0-6 items).
- Do not repeat the same skill in both arrays.`;

    const userPrompt = `JOB POSTING:
- Title: ${opp.title}
- Company: ${opp.employer}
- Tagged Skills: ${(opp.skills || []).join(", ") || "None"}
- Description: ${cleanDesc || "No detailed description provided."}`;

    const content = await callGroqJson(systemPrompt, userPrompt);
    if (content) {
      const parsed = JobRequirementsSchema.parse(JSON.parse(content));
      const requiredSkills = dedupeSkills(
        parsed.requiredSkills.length > 0 ? parsed.requiredSkills : fallbackRequired
      );
      const reqKeys = new Set(requiredSkills.map(normalizeSkillKey));
      const preferredSkills = dedupeSkills(parsed.preferredSkills).filter(
        (s) => !reqKeys.has(normalizeSkillKey(s))
      );

      const entry: CachedJobRequirements = {
        expiresAt: Date.now() + JOB_CACHE_TTL_MS,
        requiredSkills,
        preferredSkills,
        poweredBy: "groq",
      };
      JOB_REQUIREMENTS_CACHE.set(opp.id, entry);
      return entry;
    }
  } catch (err) {
    console.warn("[skillGapAnalyzer] Job requirements extraction failed, using deterministic fallback:", err);
  }

  const fallbackEntry: CachedJobRequirements = {
    expiresAt: Date.now() + JOB_CACHE_TTL_MS,
    requiredSkills: fallbackRequired,
    preferredSkills: [],
    poweredBy: "deterministic",
  };
  JOB_REQUIREMENTS_CACHE.set(opp.id, fallbackEntry);
  return fallbackEntry;
}

function buildDeterministicNarrative(
  opp: GroqFitOpportunityContext,
  baseResult: OpportunityMatchResult,
  matchedSkills: string[],
  missingRequiredSkills: string[],
  overallScore: number
): Omit<CachedNarrative, "expiresAt"> {
  const strengths: string[] = [];
  if (matchedSkills.length > 0) {
    strengths.push(
      `You already demonstrate ${matchedSkills.slice(0, 4).join(", ")} relevant to ${opp.title}.`
    );
  }
  if (baseResult.hardEligibility?.isFullyEligible) {
    strengths.push("You satisfy the stated academic and eligibility criteria for this role.");
  }
  if (baseResult.reasons?.length > 0) {
    strengths.push(baseResult.reasons[0]);
  }

  const gaps: string[] = [];
  if (!baseResult.isEligible && baseResult.hardEligibility?.ineligibilityReasons?.length) {
    gaps.push(...baseResult.hardEligibility.ineligibilityReasons);
  }
  if (missingRequiredSkills.length > 0) {
    gaps.push(`Missing core skills: ${missingRequiredSkills.slice(0, 5).join(", ")}.`);
  }
  if (matchedSkills.length === 0) {
    gaps.push("No direct skill overlap detected yet — update your profile skills or build a targeted project.");
  }

  const actionPlan: SkillGapAnalysisResult["actionPlan"] = [];
  if (missingRequiredSkills.length > 0) {
    actionPlan.push({
      title: `Bridge core skills: ${missingRequiredSkills.slice(0, 3).join(", ")}`,
      type: "learn",
      timeframe: "1-2 weeks",
      description: `Review core concepts and build hands-on familiarity with ${missingRequiredSkills.slice(0, 3).join(", ")} as required for ${opp.title}.`,
    });
    actionPlan.push({
      title: `Build a portfolio mini-project for ${opp.title}`,
      type: "project",
      timeframe: "2 weeks",
      description: `Create a focused project combining ${[...matchedSkills.slice(0, 2), ...missingRequiredSkills.slice(0, 2)].filter(Boolean).join(" + ") || opp.title} with measurable results.`,
    });
  }
  actionPlan.push({
    title: "Tailor your resume bullets to role keywords",
    type: "resume",
    timeframe: "1-2 days",
    description: `Highlight concrete metrics and tools from your projects that align with ${opp.title} at ${opp.employer}.`,
  });

  return {
    roleInterestScore: baseResult.breakdown?.roleInterestScore ?? 15,
    strengths,
    gaps,
    actionPlan,
    summary:
      baseResult.isEligible === false
        ? `Hard eligibility criteria are not met for ${opp.title}, though you can still review the skill gaps below.`
        : `Your current profile matches ${overallScore}% of ${opp.title} at ${opp.employer}.`,
    poweredBy: "deterministic",
  };
}

/**
 * Produces a deterministic, consistent Skill Gap Analysis:
 * 1. Job requirements (requiredSkills, preferredSkills) are extracted & cached once per opportunityId.
 * 2. Matched vs. missing skills and scores are computed deterministically from student.skills.
 * 3. Groq generates qualitative strengths, gaps, and an action plan without mutating the skill lists.
 */
export async function analyzeSkillGapWithGroq(
  baseResult: OpportunityMatchResult,
  student: GroqFitStudentContext,
  opp: GroqFitOpportunityContext
): Promise<SkillGapAnalysisResult> {
  const cleanDesc = (opp.description || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4500);

  // 1. Get fixed job requirements (cached per opportunityId)
  const jobReqs = await getFixedJobRequirements(opp, baseResult, cleanDesc);

  // 2. Build normalized candidate skill lookup
  const candidateSkillMap = new Map<string, string>();
  for (const s of student.skills) {
    const trimmed = s.trim();
    const key = normalizeSkillKey(trimmed);
    if (key && !candidateSkillMap.has(key)) {
      candidateSkillMap.set(key, trimmed);
    }
  }

  // 3. Deterministic set comparison against the fixed job requirements
  const matchedMap = new Map<string, string>();
  const missingRequiredSkills: string[] = [];
  const missingPreferredSkills: string[] = [];

  for (const reqSkill of jobReqs.requiredSkills) {
    const key = normalizeSkillKey(reqSkill);
    if (key && candidateSkillMap.has(key)) {
      matchedMap.set(key, reqSkill);
    } else if (key) {
      missingRequiredSkills.push(reqSkill);
    }
  }

  for (const prefSkill of jobReqs.preferredSkills) {
    const key = normalizeSkillKey(prefSkill);
    if (key && candidateSkillMap.has(key)) {
      if (!matchedMap.has(key)) matchedMap.set(key, prefSkill);
    } else if (key) {
      missingPreferredSkills.push(prefSkill);
    }
  }

  const matchedSkills = Array.from(matchedMap.values());

  // 4. Deterministic sub-scores (Academic & Preferences stay locked to baseResult)
  const totalReq = jobReqs.requiredSkills.length;
  const matchedReqCount = totalReq - missingRequiredSkills.length;
  const totalPref = jobReqs.preferredSkills.length;
  const matchedPrefCount = totalPref - missingPreferredSkills.length;

  let skillsScore = baseResult.breakdown?.skillsScore ?? 0;
  if (totalReq > 0) {
    const reqRatio = matchedReqCount / totalReq;
    const prefBonus = totalPref > 0 ? Math.round((matchedPrefCount / totalPref) * 6) : 0;
    skillsScore = Math.min(40, Math.round(reqRatio * 34) + prefBonus);
  }

  const academicFitScore = baseResult.breakdown?.academicFitScore ?? 0;
  const preferencesScore = baseResult.breakdown?.preferencesScore ?? 0;

  // 5. Qualitative coaching narrative (cached per user + opportunityId)
  const narrativeKey = `narrative::${student.userId}::${opp.id}`;
  let narrative = NARRATIVE_CACHE.get(narrativeKey);

  if (!narrative || narrative.expiresAt <= Date.now()) {
    const initialRoleScore = baseResult.breakdown?.roleInterestScore ?? 15;
    const initialOverall = baseResult.isEligible
      ? Math.min(100, Math.max(10, skillsScore + initialRoleScore + academicFitScore + preferencesScore))
      : baseResult.overallScore;

    let built = buildDeterministicNarrative(
      opp,
      baseResult,
      matchedSkills,
      missingRequiredSkills,
      initialOverall
    );

    try {
      const systemPrompt = `You are a senior technical career coach. Based on the candidate's already-computed skill match and profile, provide qualitative feedback and an action plan.
Return ONLY valid JSON matching:
{
  "roleInterestScore": number (0-30, alignment of candidate's target roles/projects/experience with this job),
  "strengths": string[] (2-3 concrete strengths),
  "gaps": string[] (2-3 concrete gaps),
  "actionPlan": [{ "title": string, "type": "learn" | "project" | "resume", "timeframe": string, "description": string }] (3-4 actionable items),
  "summary": string (2-3 concise sentences)
}`;

      const userPrompt = `CANDIDATE PROFILE:
- Degree/Branch: ${student.degree || "Unspecified"} / ${student.branch || "Unspecified"} (Grad ${student.graduationYear || "Unspecified"}, CGPA ${student.cgpa ?? "Unspecified"})
- Target Roles: ${student.targetRoles.length > 0 ? student.targetRoles.join(", ") : "None listed"}
- Projects: ${student.projects.length > 0 ? student.projects.slice(0, 5).map((p) => `${p.title} (${p.technologies.join(", ")})`).join("; ") : "None"}
- Experience: ${student.experience.length > 0 ? student.experience.slice(0, 4).map((e) => `${e.title} at ${e.company}`).join("; ") : "None"}

DETERMINISTIC SKILL COMPARISON FOR ${opp.title} AT ${opp.employer}:
- Matched Skills: ${matchedSkills.join(", ") || "None"}
- Missing Core Skills: ${missingRequiredSkills.join(", ") || "None"}
- Missing Preferred Skills: ${missingPreferredSkills.join(", ") || "None"}
- Job Description: ${cleanDesc || "No detailed description provided."}`;

      const content = await callGroqJson(systemPrompt, userPrompt);
      if (content) {
        const parsed = GroqNarrativeSchema.parse(JSON.parse(content));
        built = {
          roleInterestScore:
            typeof parsed.roleInterestScore === "number"
              ? Math.round(parsed.roleInterestScore)
              : initialRoleScore,
          strengths: parsed.strengths.length > 0 ? parsed.strengths : built.strengths,
          gaps: parsed.gaps.length > 0 ? parsed.gaps : built.gaps,
          actionPlan: parsed.actionPlan.length > 0 ? parsed.actionPlan : built.actionPlan,
          summary: parsed.summary || built.summary,
          poweredBy: "groq",
        };
      }
    } catch (err) {
      console.warn("[skillGapAnalyzer] Narrative generation failed, using deterministic fallback:", err);
    }

    narrative = {
      expiresAt: Date.now() + NARRATIVE_CACHE_TTL_MS,
      ...built,
    };
    NARRATIVE_CACHE.set(narrativeKey, narrative);
  }

  const roleInterestScore = narrative.roleInterestScore;
  const overallScore = baseResult.isEligible
    ? Math.min(100, Math.max(10, skillsScore + roleInterestScore + academicFitScore + preferencesScore))
    : baseResult.overallScore;

  const matchBand: OpportunityMatchResult["matchBand"] = !baseResult.isEligible
    ? "INELIGIBLE"
    : overallScore >= 75
    ? "STRONG_MATCH"
    : overallScore >= 50
    ? "MODERATE_MATCH"
    : "GROWTH_MATCH";

  return {
    ...baseResult,
    overallScore,
    matchBand,
    breakdown: {
      skillsScore,
      roleInterestScore,
      academicFitScore,
      preferencesScore,
    },
    skillAnalysis: {
      matchedRequiredSkills: matchedSkills,
      missingRequiredSkills,
      matchedPreferredSkills: [],
      skillsScore,
    },
    missingPreferredSkills,
    strengths: narrative.strengths,
    gaps: narrative.gaps,
    actionPlan: narrative.actionPlan,
    summary: narrative.summary,
    reasons: narrative.strengths.length > 0 ? narrative.strengths : baseResult.reasons,
    poweredBy: jobReqs.poweredBy === "groq" || narrative.poweredBy === "groq" ? "groq" : "deterministic",
  };
}
