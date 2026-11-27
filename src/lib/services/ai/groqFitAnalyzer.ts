// src/lib/services/ai/groqFitAnalyzer.ts
import Groq from "groq-sdk";
import { z } from "zod";
import type { OpportunityMatchResult } from "../matching/matchingService";

const GroqFitResponseSchema = z.object({
  overallScore: z.number().min(0).max(100),
  breakdown: z.object({
    skillsScore: z.number().min(0).max(40),
    roleInterestScore: z.number().min(0).max(30),
    academicFitScore: z.number().min(0).max(15),
    preferencesScore: z.number().min(0).max(15),
  }),
  matchedSkills: z.array(z.string()).default([]),
  missingSkills: z.array(z.string()).default([]),
  reasons: z.array(z.string()).default([]),
});

export interface GroqFitStudentContext {
  userId: string;
  updatedAt?: string | Date;
  college?: string | null;
  degree?: string | null;
  branch?: string | null;
  graduationYear?: number | null;
  cgpa?: number | null;
  skills: string[];
  targetRoles: string[];
  projects: Array<{ title: string; technologies: string[]; description?: string | null }>;
  experience: Array<{ title: string; company: string; description?: string | null }>;
  preferredWorkModes?: string[];
  preferredLocations?: string[];
}

export interface GroqFitOpportunityContext {
  id: string;
  title: string;
  employer: string;
  description?: string | null;
  location?: string | null;
  workMode?: string | null;
  skills?: string[];
}

interface CacheEntry {
  expiresAt: number;
  result: OpportunityMatchResult & { poweredBy?: string };
}

const FIT_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
let cachedWorkingModel: string | null = null;

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

/**
 * Enhances an eligible OpportunityMatchResult using Groq LLM semantic evaluation
 * across the candidate's full profile (skills, projects, experience, academics, preferences)
 * and the job's actual description. Falls back to the deterministic result on error.
 */
export async function enhanceMatchWithGroq(
  baseResult: OpportunityMatchResult,
  student: GroqFitStudentContext,
  opp: GroqFitOpportunityContext
): Promise<OpportunityMatchResult & { poweredBy?: string }> {
  // Never override hard eligibility gates
  if (!baseResult.isEligible) {
    return baseResult;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === "gsk_your_groq_api_key_here") {
    return baseResult;
  }

  const cacheKey = `${student.userId}::${opp.id}::${student.updatedAt ? String(student.updatedAt) : "v1"}::${student.skills.length}`;
  const cached = FIT_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  try {
    const groq = new Groq({ apiKey });
    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

    const cleanDesc = (opp.description || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000);

    const systemPrompt = `You are a technical hiring fit evaluator. Compare the candidate's real profile against the job posting and produce an honest, calibrated fit score (0-100).
Scoring rubric (sum to overallScore):
- skillsScore (0-40): Semantic match between candidate's skills/projects/experience and the job's technical & domain requirements (consider related stacks, e.g. React/Next.js/TypeScript, Node/Python/SQL, etc.).
- roleInterestScore (0-30): Alignment between candidate's target roles / projects / experience and this job's title & responsibilities.
- academicFitScore (0-15): Relevance of candidate's degree, branch, and academic level.
- preferencesScore (0-15): Location and work-mode alignment.

Rules:
- Only cite skills, projects, or experience actually present in the candidate profile.
- Extract concrete matchedSkills (from candidate) and missingSkills (required by job but absent in candidate).
- Provide 3-4 concise, specific bullet reasons explaining the score.
- Return ONLY valid JSON matching:
{
  "overallScore": number,
  "breakdown": { "skillsScore": number, "roleInterestScore": number, "academicFitScore": number, "preferencesScore": number },
  "matchedSkills": string[],
  "missingSkills": string[],
  "reasons": string[]
}`;

    const userPrompt = `CANDIDATE PROFILE:
- Degree/Branch: ${student.degree || "Unspecified"} / ${student.branch || "Unspecified"} (Grad ${student.graduationYear || "Unspecified"}, CGPA ${student.cgpa ?? "Unspecified"})
- Skills: ${student.skills.length > 0 ? student.skills.join(", ") : "None listed"}
- Target Roles: ${student.targetRoles.length > 0 ? student.targetRoles.join(", ") : "None listed"}
- Projects: ${student.projects.length > 0 ? student.projects.slice(0, 4).map((p) => `${p.title} (${p.technologies.join(", ")})`).join("; ") : "None"}
- Experience: ${student.experience.length > 0 ? student.experience.slice(0, 3).map((e) => `${e.title} at ${e.company}`).join("; ") : "None"}
- Preferences: Work modes [${(student.preferredWorkModes || []).join(", ")}], Locations [${(student.preferredLocations || []).join(", ")}]

JOB POSTING:
- Title: ${opp.title}
- Company: ${opp.employer}
- Location / Work Mode: ${opp.location || "India"} / ${opp.workMode || "unspecified"}
- Tagged Skills: ${(opp.skills || []).join(", ")}
- Description: ${cleanDesc || "No detailed description provided."}`;

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

    const content = completion.choices[0]?.message?.content;
    if (!content) return baseResult;

    const parsed = GroqFitResponseSchema.parse(JSON.parse(content));
    const overallScore = Math.min(100, Math.max(10, Math.round(parsed.overallScore)));
    const matchBand: OpportunityMatchResult["matchBand"] =
      overallScore >= 75 ? "STRONG_MATCH" : overallScore >= 50 ? "MODERATE_MATCH" : "GROWTH_MATCH";

    const enhanced: OpportunityMatchResult & { poweredBy?: string } = {
      ...baseResult,
      overallScore,
      matchBand,
      breakdown: {
        skillsScore: Math.round(parsed.breakdown.skillsScore),
        roleInterestScore: Math.round(parsed.breakdown.roleInterestScore),
        academicFitScore: Math.round(parsed.breakdown.academicFitScore),
        preferencesScore: Math.round(parsed.breakdown.preferencesScore),
      },
      skillAnalysis: {
        matchedRequiredSkills: parsed.matchedSkills,
        missingRequiredSkills: parsed.missingSkills,
        matchedPreferredSkills: [],
        skillsScore: Math.round(parsed.breakdown.skillsScore),
      },
      reasons: parsed.reasons.length > 0 ? parsed.reasons : baseResult.reasons,
      poweredBy: "groq",
    };

    FIT_CACHE.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, result: enhanced });
    return enhanced;
  } catch (err) {
    console.warn("[groqFitAnalyzer] Groq fit evaluation failed, using deterministic score:", err);
    return baseResult;
  }
}

const SkillGapActionSchema = z.object({
  title: z.string(),
  type: z.enum(["learn", "project", "resume"]).default("learn"),
  timeframe: z.string().default("1-2 weeks"),
  description: z.string(),
});

const GroqSkillGapSchema = z.object({
  overallScore: z.number().min(0).max(100),
  breakdown: z.object({
    skillsScore: z.number().min(0).max(40),
    roleInterestScore: z.number().min(0).max(30),
    academicFitScore: z.number().min(0).max(15),
    preferencesScore: z.number().min(0).max(15),
  }),
  matchedSkills: z.array(z.string()).default([]),
  missingRequiredSkills: z.array(z.string()).default([]),
  missingPreferredSkills: z.array(z.string()).default([]),
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

const SKILL_GAP_CACHE = new Map<string, { expiresAt: number; result: SkillGapAnalysisResult }>();

function buildDeterministicSkillGap(
  baseResult: OpportunityMatchResult,
  opp: GroqFitOpportunityContext
): SkillGapAnalysisResult {
  const matched = Array.from(
    new Set([
      ...(baseResult.skillAnalysis?.matchedRequiredSkills || []),
      ...(baseResult.skillAnalysis?.matchedPreferredSkills || []),
    ])
  );
  const missingReq = baseResult.skillAnalysis?.missingRequiredSkills || [];
  const strengths: string[] = [];
  if (matched.length > 0) {
    strengths.push(`You already demonstrate ${matched.slice(0, 4).join(", ")} required for ${opp.title}.`);
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
  if (missingReq.length > 0) {
    gaps.push(`Missing or unlisted key skills: ${missingReq.slice(0, 5).join(", ")}.`);
  }
  if (matched.length === 0) {
    gaps.push("No direct skill overlap detected yet — update your profile skills or build a targeted project.");
  }

  const actionPlan: SkillGapAnalysisResult["actionPlan"] = [];
  if (missingReq.length > 0) {
    actionPlan.push({
      title: `Bridge core skills: ${missingReq.slice(0, 3).join(", ")}`,
      type: "learn",
      timeframe: "1-2 weeks",
      description: `Review core concepts and build hands-on familiarity with ${missingReq.slice(0, 3).join(", ")} as highlighted in ${opp.employer}'s job description.`,
    });
    actionPlan.push({
      title: `Build a portfolio mini-project for ${opp.title}`,
      type: "project",
      timeframe: "2 weeks",
      description: `Create a focused project combining ${[...matched.slice(0, 2), ...missingReq.slice(0, 2)].filter(Boolean).join(" + ") || opp.title} with measurable results.`,
    });
  }
  actionPlan.push({
    title: "Tailor your resume bullets to role keywords",
    type: "resume",
    timeframe: "1-2 days",
    description: `Highlight concrete metrics and tools from your projects that align with ${opp.title} at ${opp.employer}.`,
  });

  return {
    ...baseResult,
    poweredBy: "deterministic",
    summary:
      baseResult.isEligible === false
        ? `Hard eligibility criteria are not met for ${opp.title}, though you can still review the skill gaps below.`
        : `Your current profile matches ${baseResult.overallScore}% of ${opp.title} at ${opp.employer}.`,
    missingPreferredSkills: [],
    strengths,
    gaps,
    actionPlan,
  };
}

/**
 * Produces an advanced, structured Skill Gap Analysis using Groq LLM (with deterministic fallback)
 * for the dedicated /student/skill-gap workspace.
 */
export async function analyzeSkillGapWithGroq(
  baseResult: OpportunityMatchResult,
  student: GroqFitStudentContext,
  opp: GroqFitOpportunityContext
): Promise<SkillGapAnalysisResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === "gsk_your_groq_api_key_here") {
    return buildDeterministicSkillGap(baseResult, opp);
  }

  const skillsSig = [...student.skills].sort().join(",");
  const cacheKey = `gap::${student.userId}::${opp.id}::${student.updatedAt ? String(student.updatedAt) : "v1"}::${skillsSig}`;
  const cached = SKILL_GAP_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  try {
    const groq = new Groq({ apiKey });
    const cleanDesc = (opp.description || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4500);

    const systemPrompt = `You are a senior technical career coach and hiring evaluator conducting an advanced Skill Gap Analysis.
Compare the candidate's real profile against the job posting and return an honest, calibrated analysis.

Scoring rubric (sum to overallScore, 0-100):
- skillsScore (0-40): Semantic overlap between candidate skills/projects/experience and the job's required & preferred skills.
- roleInterestScore (0-30): Alignment between candidate's target roles, projects, and experience with this job's responsibilities.
- academicFitScore (0-15): Relevance of degree, branch, graduation year, and CGPA.
- preferencesScore (0-15): Location and work-mode alignment.

Rules:
- Only cite skills, projects, or experience actually present in the candidate profile.
- Categorize skills cleanly into matchedSkills (present in candidate), missingRequiredSkills (essential skills from the job that candidate lacks), and missingPreferredSkills (nice-to-have skills from the job that candidate lacks).
- Provide 2-3 specific strengths (where the candidate fits well) and 2-3 specific gaps (where the candidate falls short).
- Provide 3-4 actionable actionPlan items with type ("learn" | "project" | "resume"), realistic timeframe, and concrete instructions tailored to this role.
- Return ONLY valid JSON matching:
{
  "overallScore": number,
  "breakdown": { "skillsScore": number, "roleInterestScore": number, "academicFitScore": number, "preferencesScore": number },
  "matchedSkills": string[],
  "missingRequiredSkills": string[],
  "missingPreferredSkills": string[],
  "strengths": string[],
  "gaps": string[],
  "actionPlan": [{ "title": string, "type": "learn" | "project" | "resume", "timeframe": string, "description": string }],
  "summary": string
}`;

    const userPrompt = `CANDIDATE PROFILE:
- Degree/Branch: ${student.degree || "Unspecified"} / ${student.branch || "Unspecified"} (Grad ${student.graduationYear || "Unspecified"}, CGPA ${student.cgpa ?? "Unspecified"})
- Skills: ${student.skills.length > 0 ? student.skills.join(", ") : "None listed"}
- Target Roles: ${student.targetRoles.length > 0 ? student.targetRoles.join(", ") : "None listed"}
- Projects: ${student.projects.length > 0 ? student.projects.slice(0, 5).map((p) => `${p.title} (${p.technologies.join(", ")})`).join("; ") : "None"}
- Experience: ${student.experience.length > 0 ? student.experience.slice(0, 4).map((e) => `${e.title} at ${e.company}`).join("; ") : "None"}
- Preferences: Work modes [${(student.preferredWorkModes || []).join(", ")}], Locations [${(student.preferredLocations || []).join(", ")}]

JOB POSTING:
- Title: ${opp.title}
- Company: ${opp.employer}
- Location / Work Mode: ${opp.location || "India"} / ${opp.workMode || "unspecified"}
- Tagged Skills: ${(opp.skills || []).join(", ")}
- Description: ${cleanDesc || "No detailed description provided."}`;

    let completion: any = null;
    let lastErr: unknown = null;

    for (const candidateModel of getCandidateGroqModels()) {
      try {
        completion = await groq.chat.completions.create({
          model: candidateModel,
          temperature: 0.2,
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

    const content = completion.choices[0]?.message?.content;
    if (!content) return buildDeterministicSkillGap(baseResult, opp);

    const parsed = GroqSkillGapSchema.parse(JSON.parse(content));
    const overallScore = baseResult.isEligible
      ? Math.min(100, Math.max(10, Math.round(parsed.overallScore)))
      : baseResult.overallScore;
    const matchBand: OpportunityMatchResult["matchBand"] = !baseResult.isEligible
      ? "INELIGIBLE"
      : overallScore >= 75
      ? "STRONG_MATCH"
      : overallScore >= 50
      ? "MODERATE_MATCH"
      : "GROWTH_MATCH";

    const result: SkillGapAnalysisResult = {
      ...baseResult,
      overallScore,
      matchBand,
      breakdown: {
        skillsScore: Math.round(parsed.breakdown.skillsScore),
        roleInterestScore: Math.round(parsed.breakdown.roleInterestScore),
        academicFitScore: Math.round(parsed.breakdown.academicFitScore),
        preferencesScore: Math.round(parsed.breakdown.preferencesScore),
      },
      skillAnalysis: {
        matchedRequiredSkills: parsed.matchedSkills,
        missingRequiredSkills: parsed.missingRequiredSkills,
        matchedPreferredSkills: [],
        skillsScore: Math.round(parsed.breakdown.skillsScore),
      },
      missingPreferredSkills: parsed.missingPreferredSkills,
      strengths: parsed.strengths,
      gaps: parsed.gaps,
      actionPlan: parsed.actionPlan,
      summary: parsed.summary || `AI analysis for ${opp.title} at ${opp.employer}.`,
      reasons: parsed.strengths.length > 0 ? parsed.strengths : baseResult.reasons,
      poweredBy: "groq",
    };

    SKILL_GAP_CACHE.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, result });
    return result;
  } catch (err) {
    console.warn("[groqFitAnalyzer] Skill gap analysis failed, using deterministic fallback:", err);
    return buildDeterministicSkillGap(baseResult, opp);
  }
}
