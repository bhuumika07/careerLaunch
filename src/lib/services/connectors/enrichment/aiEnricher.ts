// src/lib/services/connectors/enrichment/aiEnricher.ts
/**
 * Chunk 6: AI Enrichment Engine
 *
 * Implements high-precision data enrichment:
 * 1. Skill extraction (technical, soft, frameworks)
 * 2. Domain classification (software, data_ai_ml, design, business, etc.)
 * 3. Fresher-friendliness tagging with confidence scoring
 * 4. Factual description summarization
 *
 * STRICT INVARIANT: Never invent fields; leave blank (null or empty) if unknown.
 */

import type {
  EnrichmentDomain,
  SkillExtractionResult,
  FresherEvaluation,
  OpportunityEnrichment,
} from "./types.ts";

// Standard Skills Lexicon with aliases
const TECHNICAL_SKILLS_MAP: Record<string, string> = {
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  java: "Java",
  golang: "Go",
  go: "Go",
  rust: "Rust",
  c: "C",
  "c++": "C++",
  cpp: "C++",
  "c#": "C#",
  csharp: "C#",
  ruby: "Ruby",
  php: "PHP",
  swift: "Swift",
  kotlin: "Kotlin",
  scala: "Scala",
  sql: "SQL",
  nosql: "NoSQL",
  postgresql: "PostgreSQL",
  postgres: "PostgreSQL",
  mysql: "MySQL",
  mongodb: "MongoDB",
  redis: "Redis",
  graphql: "GraphQL",
  rest: "REST APIs",
  html: "HTML5",
  html5: "HTML5",
  css: "CSS3",
  css3: "CSS3",
  react: "React",
  "react.js": "React",
  reactjs: "React",
  nextjs: "Next.js",
  "next.js": "Next.js",
  vue: "Vue.js",
  angular: "Angular",
  svelte: "Svelte",
  nodejs: "Node.js",
  "node.js": "Node.js",
  express: "Express",
  fastapi: "FastAPI",
  django: "Django",
  flask: "Flask",
  spring: "Spring Boot",
  "spring boot": "Spring Boot",
  pytorch: "PyTorch",
  tensorflow: "TensorFlow",
  scikit: "Scikit-Learn",
  "scikit-learn": "Scikit-Learn",
  pandas: "Pandas",
  numpy: "NumPy",
  docker: "Docker",
  kubernetes: "Kubernetes",
  k8s: "Kubernetes",
  aws: "AWS",
  azure: "Azure",
  gcp: "Google Cloud",
  linux: "Linux",
  git: "Git",
  terraform: "Terraform",
  kafka: "Apache Kafka",
  spark: "Apache Spark",
  airflow: "Apache Airflow",
};

const SOFT_SKILLS_PATTERNS: Array<{ pattern: RegExp; skill: string }> = [
  { pattern: /\bcommunication skills?\b|\bwritten and verbal communication\b/i, skill: "Communication" },
  { pattern: /\bproblem[\s-]solving\b/i, skill: "Problem Solving" },
  { pattern: /\bteam[\s-]work\b|\bcollaborat(?:ive|ion)\b/i, skill: "Team Collaboration" },
  { pattern: /\bcritical thinking\b/i, skill: "Critical Thinking" },
  { pattern: /\badaptab(?:le|ility)\b/i, skill: "Adaptability" },
  { pattern: /\bleadership\b/i, skill: "Leadership" },
  { pattern: /\btime management\b/i, skill: "Time Management" },
  { pattern: /\battention to detail\b/i, skill: "Attention to Detail" },
];

/**
 * 1. Skill Extraction
 */
export function extractSkills(text: string): SkillExtractionResult {
  if (!text || !text.trim()) {
    return {
      technicalSkills: [],
      softSkills: [],
      toolsAndFrameworks: [],
      allSkills: [],
    };
  }

  const lower = text.toLowerCase();
  const techFound = new Set<string>();
  const toolsFound = new Set<string>();
  const softFound = new Set<string>();

  // Match technical skills
  for (const [key, canonical] of Object.entries(TECHNICAL_SKILLS_MAP)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?:^|[\\s,./;()\\[\\]{}:-])${escaped}(?:$|[\\s,./;()\\[\\]{}:-])`, "i");
    if (regex.test(lower)) {
      if (
        ["Docker", "Kubernetes", "AWS", "Azure", "Google Cloud", "Terraform", "Git", "Linux", "Apache Kafka", "Apache Spark", "Apache Airflow"].includes(
          canonical
        )
      ) {
        toolsFound.add(canonical);
      } else {
        techFound.add(canonical);
      }
    }
  }

  // Match soft skills
  for (const { pattern, skill } of SOFT_SKILLS_PATTERNS) {
    if (pattern.test(lower)) {
      softFound.add(skill);
    }
  }

  const technicalSkills = Array.from(techFound).sort();
  const toolsAndFrameworks = Array.from(toolsFound).sort();
  const softSkills = Array.from(softFound).sort();
  const allSkills = Array.from(
    new Set([...technicalSkills, ...toolsAndFrameworks, ...softSkills])
  ).sort();

  return {
    technicalSkills,
    softSkills,
    toolsAndFrameworks,
    allSkills,
  };
}

/**
 * 2. Domain Classification
 */
export function classifyDomain(title: string, description: string = ""): EnrichmentDomain {
  const combined = `${title} ${description}`.toLowerCase();

  // 1. Data, AI, Machine Learning
  if (
    /\bmachine learning\b|\bml engineer\b|\bdata scientist\b|\bdeep learning\b|\bnlp\b|\bcomputer vision\b|\bgenai\b|\bllm\b|\bai\b|\bdata analyst\b|\bdata engineer\b|\banalytics\b/i.test(
      title
    ) ||
    (/\b(pytorch|tensorflow|scikit-learn|pandas|llm|huggingface)\b/i.test(combined) &&
      /\b(model|training|dataset|analytics)\b/i.test(combined))
  ) {
    return "data_ai_ml";
  }

  // 2. Design
  if (
    /\bproduct design(?:er)?\b|\bdesign(?:er)?\b|\bui[\s/]ux\b|\buser experience\b|\bgraphic design\b|\bdesign system\b|\bfigma\b/i.test(
      title
    )
  ) {
    return "design";
  }

  // 3. Security
  if (
    /\b(?:cyber[\s-]?)?security\b|\bcyber\b|\bsecops\b|\binfosec\b|\bpenetration test\b|\bvulnerability\b/i.test(
      combined
    )
  ) {
    return "security";
  }

  // 4. DevOps & Cloud
  if (/\bdevops\b|\bsre\b|\bsite reliability\b|\bcloud engineer\b|\binfrastructure\b|\bplatform engineer\b/i.test(title)) {
    return "devops_cloud";
  }

  // 5. Product Management
  if (/\bproduct manager\b|\btechnical product\b|\bgroup product manager\b|\bapm\b/i.test(title)) {
    return "product";
  }

  // 6. Business, Sales, Marketing, HR
  if (/\bbusiness development\b|\bsales\b|\baccount executive\b|\bmarketing\b|\bhuman resources\b|\brecruiter\b|\bfinance\b/i.test(title)) {
    return "business";
  }

  // 7. General Software Development
  if (
    /\bsoftware\b|\bdeveloper\b|\bengineer\b|\bfrontend\b|\bbackend\b|\bfullstack\b|\bsde\b|\bswe\b|\bqa\b|\btester\b|\bweb\b|\bios\b|\bandroid\b/i.test(
      title
    )
  ) {
    return "software";
  }

  return "other";
}

/**
 * 3. Fresher-Friendliness Evaluation
 */
export function evaluateFresherFriendliness(
  title: string,
  description: string = "",
  experienceLevel?: string
): FresherEvaluation {
  const combined = `${title} ${description}`.toLowerCase();
  const reasons: string[] = [];
  let score = 0.5; // neutral baseline
  let minYears = 0;
  let maxYears: number | undefined = undefined;

  // Positive signals
  if (/\bintern(?:ship)?\b|\bco-op\b|\bstudent\b|\bapprentice\b/i.test(title)) {
    score += 0.45;
    reasons.push("Explicit internship or student role title");
    minYears = 0;
    maxYears = 1;
  }

  if (/\bgraduate trainee\b|\bcampus recruit\b|\bnew grad(?:uate)?\b|\bfresher\b/i.test(combined)) {
    score += 0.4;
    reasons.push("Explicitly targeted at new graduates or freshers");
    minYears = 0;
    maxYears = 1;
  }

  if (/\b(0\s*-\s*[12]|0|no prior experience required)\s*(?:years?|yrs?)\b/i.test(combined)) {
    score += 0.35;
    reasons.push("Requires 0-1 years of experience or no prior experience");
    minYears = 0;
    maxYears = 1;
  }

  if (/\bentry[\s-]level\b|\bjunior\b|\bjr\.?\b|\bassociate\b/i.test(title)) {
    score += 0.25;
    reasons.push("Junior or entry-level role designation");
    if (minYears === 0 && maxYears === undefined) {
      minYears = 1;
      maxYears = 2;
    }
  }

  // Negative signals (barriers to freshers)
  if (/\b(5\+|[5-9]|\d{2})\+?\s*(?:years?|yrs?)(?:\s*of)?\s*experience\b/i.test(combined)) {
    score -= 0.55;
    reasons.push("Demands 5+ years of industry experience");
    minYears = 5;
  } else if (/\b([3-4])\+?\s*(?:years?|yrs?)(?:\s*of)?\s*experience\b/i.test(combined)) {
    score -= 0.35;
    reasons.push("Demands 3-4 years of industry experience");
    minYears = 3;
    maxYears = 4;
  }

  if (/\bsenior\b|\bsr\.?\b|\blead\b|\bprincipal\b|\bstaff\b|\bdirector\b|\bmanager\b/i.test(title)) {
    score -= 0.4;
    reasons.push("Senior, lead, or management seniority title");
  }

  if (experienceLevel === "senior") {
    score -= 0.3;
  } else if (experienceLevel === "fresher") {
    score += 0.2;
  }

  // Clamp confidence between 0.0 and 1.0
  const confidence = Math.max(0.0, Math.min(1.0, score));
  const isFresherFriendly = confidence >= 0.6;

  return {
    isFresherFriendly,
    confidence: parseFloat(confidence.toFixed(2)),
    reasons,
    minYears,
    maxYears,
  };
}

/**
 * 4. Description Summarizer
 * Generates a clean 2-3 sentence factual summary.
 * Never invents fields or filler; returns null if description is too sparse.
 */
export function summarizeDescription(
  title: string,
  organization: string,
  rawDescription: string
): string | null {
  if (!rawDescription || rawDescription.trim().length < 40) {
    return null;
  }

  // Clean HTML tags and line breaks
  const plainText = rawDescription
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

  if (plainText.length < 50) {
    return null;
  }

  // Extract initial informative sentences (skip boilerplate like "About us", "Equal opportunity")
  const sentences = plainText
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => {
      const l = s.toLowerCase();
      return (
        s.length >= 25 &&
        !l.includes("equal opportunity employer") &&
        !l.includes("privacy policy") &&
        !l.includes("all rights reserved") &&
        !l.includes("cookie policy")
      );
    });

  if (sentences.length === 0) {
    return `${title} role at ${organization}.`;
  }

  // Take up to 2-3 concise factual sentences (capped at ~300 chars)
  const selected: string[] = [];
  let charCount = 0;

  for (const sentence of sentences) {
    if (selected.length >= 3 || charCount + sentence.length > 320) break;
    selected.push(sentence);
    charCount += sentence.length;
  }

  return selected.join(" ");
}

/**
 * 5. Full Opportunity AI Enricher
 */
export function enrichOpportunityData(opportunity: {
  title: string;
  organization: string;
  description: string;
  experienceLevel?: string;
}): OpportunityEnrichment {
  const domain = classifyDomain(opportunity.title, opportunity.description);
  const skills = extractSkills(`${opportunity.title} ${opportunity.description}`);
  const fresherEvaluation = evaluateFresherFriendliness(
    opportunity.title,
    opportunity.description,
    opportunity.experienceLevel
  );
  const summary = summarizeDescription(
    opportunity.title,
    opportunity.organization,
    opportunity.description
  );

  return {
    domain,
    skills,
    fresherEvaluation,
    summary,
    enrichmentTimestamp: new Date().toISOString(),
  };
}
