// src/lib/services/resume/onboardingResumeParser.ts
import Groq from "groq-sdk";
import { z } from "zod";

export const ParsedOnboardingResumeSchema = z.object({
  phone: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  githubUrl: z.string().nullable().optional(),
  linkedinUrl: z.string().nullable().optional(),
  portfolioUrl: z.string().nullable().optional(),
  college: z.string().nullable().optional(),
  degree: z.string().nullable().optional(),
  branch: z.string().nullable().optional(),
  graduationYear: z.number().int().min(1990).max(2040).nullable().optional(),
  cgpa: z.number().min(0).max(10).nullable().optional(),
  skills: z
    .array(
      z.object({
        name: z.string().min(1),
        category: z.enum(["technical", "non-technical"]).default("technical"),
      })
    )
    .default([]),
  projects: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().default(""),
        technologies: z.array(z.string()).default([]),
        githubUrl: z.string().optional(),
        deploymentUrl: z.string().optional(),
      })
    )
    .default([]),
  experience: z
    .array(
      z.object({
        role: z.string().min(1),
        company: z.string().min(1),
        location: z.string().optional(),
        startDate: z.string().default(""),
        endDate: z.string().optional(),
        current: z.boolean().default(false),
        description: z.string().default(""),
      })
    )
    .default([]),
  certifications: z
    .array(
      z.object({
        name: z.string().min(1),
        issuer: z.string().default(""),
        issueDate: z.string().default(""),
        credentialId: z.string().optional(),
        verificationUrl: z.string().optional(),
      })
    )
    .default([]),
  achievements: z
    .array(
      z.object({
        title: z.string().min(1),
        date: z.string().default(""),
        description: z.string().default(""),
      })
    )
    .default([]),
});

export type ParsedOnboardingResume = z.infer<typeof ParsedOnboardingResumeSchema>;

/**
 * Extracts plain text from an uploaded PDF, DOCX, or TXT/MD resume buffer.
 */
export async function extractTextFromResumeFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const lowerName = fileName.toLowerCase();
  const lowerMime = (mimeType || "").toLowerCase();

  if (lowerName.endsWith(".pdf") || lowerMime.includes("pdf")) {
    // Import internal lib directly to avoid pdf-parse index.js reading test fixtures
    // @ts-expect-error pdf-parse internal module has no bundled TypeScript declarations
    const pdfParseMod: any = await import("pdf-parse/lib/pdf-parse.js");
    const pdfParse = pdfParseMod.default || pdfParseMod;
    const data = await pdfParse(buffer);
    return (data?.text || "").trim();
  }

  if (
    lowerName.endsWith(".docx") ||
    lowerMime.includes("wordprocessingml") ||
    lowerMime.includes("msword")
  ) {
    const mammothMod: any = await import("mammoth");
    const mammoth = mammothMod.default || mammothMod;
    const result = await mammoth.extractRawText({ buffer });
    return (result?.value || "").trim();
  }

  // Plain text / markdown fallback
  return buffer.toString("utf-8").trim();
}

const TECHNICAL_KEYWORDS = [
  "TypeScript", "JavaScript", "Python", "Java", "C++", "C", "Go", "Rust",
  "React", "Next.js", "Vue.js", "Angular", "Node.js", "Express", "FastAPI", "Django",
  "Spring Boot", "Tailwind CSS", "HTML", "CSS", "GraphQL", "REST APIs",
  "PostgreSQL", "MongoDB", "Redis", "MySQL", "SQL", "Prisma",
  "Docker", "Kubernetes", "AWS", "GCP", "Azure", "Linux", "Git",
  "PyTorch", "TensorFlow", "Scikit-learn", "Machine Learning", "Deep Learning", "NLP",
];

const NON_TECHNICAL_KEYWORDS = [
  "Leadership", "Communication", "Agile", "Scrum", "Teamwork",
  "Problem Solving", "Project Management", "Public Speaking", "Mentorship",
];

function fallbackDeterministicParse(rawText: string): ParsedOnboardingResume {
  const lower = rawText.toLowerCase();
  const skills: ParsedOnboardingResume["skills"] = [];

  for (const s of TECHNICAL_KEYWORDS) {
    if (lower.includes(s.toLowerCase())) {
      skills.push({ name: s, category: "technical" });
    }
  }
  for (const s of NON_TECHNICAL_KEYWORDS) {
    if (lower.includes(s.toLowerCase())) {
      skills.push({ name: s, category: "non-technical" });
    }
  }

  const phoneMatch = rawText.match(/(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3,5}\)?[\s-]?)?\d{3,5}[\s-]?\d{4,5}/);
  const githubMatch = rawText.match(/https?:\/\/(?:www\.)?github\.com\/[A-Za-z0-9_.-]+/i);
  const linkedinMatch = rawText.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_.-]+/i);
  const cgpaMatch = rawText.match(/\b(?:cgpa|gpa)\s*[:\-]?\s*(\d(?:\.\d{1,2})?)/i);
  const yearMatch = rawText.match(/\b(202[0-9]|203[0-5])\b/);

  return {
    phone: phoneMatch ? phoneMatch[0].trim() : null,
    location: null,
    bio: null,
    githubUrl: githubMatch ? githubMatch[0] : null,
    linkedinUrl: linkedinMatch ? linkedinMatch[0] : null,
    portfolioUrl: null,
    college: null,
    degree: null,
    branch: null,
    graduationYear: yearMatch ? parseInt(yearMatch[1], 10) : null,
    cgpa: cgpaMatch ? Math.min(10, parseFloat(cgpaMatch[1])) : null,
    skills,
    projects: [],
    experience: [],
    certifications: [],
    achievements: [],
  };
}

/**
 * Parses raw resume text into structured onboarding profile sections using Groq LLM,
 * with a deterministic fallback if GROQ_API_KEY is absent or fails.
 */
export async function parseResumeTextForOnboarding(
  rawText: string
): Promise<{ parsed: ParsedOnboardingResume; usedAi: boolean }> {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return { parsed: ParsedOnboardingResumeSchema.parse({}), usedAi: false };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === "gsk_your_groq_api_key_here") {
    return { parsed: fallbackDeterministicParse(trimmed), usedAi: false };
  }

  try {
    const groq = new Groq({ apiKey });
    const candidateModels = Array.from(
      new Set(
        [
          process.env.GROQ_MODEL,
          "openai/gpt-oss-20b",
          "openai/gpt-oss-120b",
          "qwen/qwen3.8-27b",
        ].filter((m): m is string => Boolean(m && m.trim()))
      )
    );

    const systemPrompt = `You are a strict, factual resume parser. Extract ONLY facts explicitly present in the provided resume text.
NEVER invent, guess, or fabricate any field, company, project, degree, CGPA, or URL.
If a field is not present in the resume, set it to null (for scalars) or [] (for arrays).
Return ONLY valid JSON matching this exact structure:
{
  "phone": string | null,
  "location": string | null,
  "bio": string | null (1-2 sentence summary based only on the resume),
  "githubUrl": string | null,
  "linkedinUrl": string | null,
  "portfolioUrl": string | null,
  "college": string | null,
  "degree": string | null,
  "branch": string | null,
  "graduationYear": number | null (4-digit integer e.g. 2026),
  "cgpa": number | null (on 10-point scale if mentioned, <= 10),
  "skills": [{ "name": string, "category": "technical" | "non-technical" }],
  "projects": [{ "title": string, "description": string, "technologies": string[], "githubUrl": string (optional), "deploymentUrl": string (optional) }],
  "experience": [{ "role": string, "company": string, "location": string (optional), "startDate": string, "endDate": string (optional), "current": boolean, "description": string }],
  "certifications": [{ "name": string, "issuer": string, "issueDate": string, "credentialId": string (optional), "verificationUrl": string (optional) }],
  "achievements": [{ "title": string, "date": string, "description": string }]
}`;

    let completion: any = null;
    let lastErr: unknown = null;
    for (const model of candidateModels) {
      try {
        completion = await groq.chat.completions.create({
          model,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Extract structured profile details from this resume:\n\n${trimmed.slice(0, 14000)}`,
            },
          ],
        });
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
    if (!completion) throw lastErr;

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return { parsed: fallbackDeterministicParse(trimmed), usedAi: false };
    }

    const rawJson = JSON.parse(content);
    // Coerce null optional strings inside arrays cleanly before Zod parse
    const sanitizeUrl = (v: unknown) =>
      typeof v === "string" && v.trim().startsWith("http") ? v.trim() : undefined;

    if (Array.isArray(rawJson.projects)) {
      rawJson.projects = rawJson.projects.map((p: any) => ({
        title: String(p?.title || "").trim(),
        description: String(p?.description || "").trim(),
        technologies: Array.isArray(p?.technologies) ? p.technologies.map(String) : [],
        githubUrl: sanitizeUrl(p?.githubUrl),
        deploymentUrl: sanitizeUrl(p?.deploymentUrl),
      })).filter((p: any) => p.title);
    }

    if (Array.isArray(rawJson.experience)) {
      rawJson.experience = rawJson.experience.map((e: any) => ({
        role: String(e?.role || "").trim(),
        company: String(e?.company || "").trim(),
        location: typeof e?.location === "string" ? e.location : undefined,
        startDate: String(e?.startDate || "").trim(),
        endDate: typeof e?.endDate === "string" ? e.endDate : undefined,
        current: Boolean(e?.current),
        description: String(e?.description || "").trim(),
      })).filter((e: any) => e.role && e.company);
    }

    if (Array.isArray(rawJson.certifications)) {
      rawJson.certifications = rawJson.certifications.map((c: any) => ({
        name: String(c?.name || "").trim(),
        issuer: String(c?.issuer || "").trim(),
        issueDate: String(c?.issueDate || "").trim(),
        credentialId: typeof c?.credentialId === "string" ? c.credentialId : undefined,
        verificationUrl: sanitizeUrl(c?.verificationUrl),
      })).filter((c: any) => c.name);
    }

    if (Array.isArray(rawJson.achievements)) {
      rawJson.achievements = rawJson.achievements.map((a: any) => ({
        title: String(a?.title || "").trim(),
        date: String(a?.date || "").trim(),
        description: String(a?.description || "").trim(),
      })).filter((a: any) => a.title);
    }

    if (typeof rawJson.cgpa === "number" && rawJson.cgpa > 10) {
      rawJson.cgpa = null;
    }

    const validated = ParsedOnboardingResumeSchema.parse(rawJson);
    return { parsed: validated, usedAi: true };
  } catch (err) {
    console.warn("[onboardingResumeParser] Groq parse failed, using deterministic fallback:", err);
    return { parsed: fallbackDeterministicParse(trimmed), usedAi: false };
  }
}
