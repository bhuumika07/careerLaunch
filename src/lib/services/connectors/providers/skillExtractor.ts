// src/lib/services/connectors/providers/skillExtractor.ts
/**
 * Shared Skill, Experience, and Compensation Extraction Utilities for ATS Connectors
 */

export const ATS_COMMON_SKILLS: Array<{ skill: string; regex: RegExp }> = [
  { skill: "TypeScript", regex: /\btypescript\b/i },
  { skill: "JavaScript", regex: /\bjavascript|es6\b/i },
  { skill: "Python", regex: /\bpython\b/i },
  { skill: "Go", regex: /\bgo\b|\bgolang\b/i },
  { skill: "Rust", regex: /\brust\b/i },
  { skill: "Java", regex: /\bjava\b(?!\s*script)/i },
  { skill: "C++", regex: /\bc\+\+\b/i },
  { skill: "C#", regex: /\bc#|\b\.net\b/i },
  { skill: "React", regex: /\breact(?:\.js)?\b/i },
  { skill: "Next.js", regex: /\bnext(?:\.js)?\b/i },
  { skill: "Node.js", regex: /\bnode(?:\.js)?\b/i },
  { skill: "SQL", regex: /\bsql\b|\bpostgres(?:ql)?\b|\bmysql\b/i },
  { skill: "AWS", regex: /\baws\b|amazon web services/i },
  { skill: "GCP", regex: /\bgcp\b|google cloud/i },
  { skill: "Azure", regex: /\bazure\b/i },
  { skill: "Docker", regex: /\bdocker\b/i },
  { skill: "Kubernetes", regex: /\bkubernetes|k8s\b/i },
  { skill: "GraphQL", regex: /\bgraphql\b/i },
  { skill: "Redis", regex: /\bredis\b/i },
  { skill: "Linux", regex: /\blinux\b/i },
  { skill: "Git", regex: /\bgit\b|\bgithub\b/i },
  { skill: "Figma", regex: /\bfigma\b/i },
  { skill: "Machine Learning", regex: /\bmachine learning|\bml\b|\bai\b|\bdeep learning\b/i },
];

/**
 * Extracts technical skills from text content.
 */
export function extractSkills(text: string): string[] {
  const found: string[] = [];
  for (const item of ATS_COMMON_SKILLS) {
    if (item.regex.test(text)) {
      found.push(item.skill);
    }
  }
  return found;
}

/**
 * Derives experience level from title and description.
 */
export function extractExperienceLevel(
  title: string,
  desc: string = ""
): string {
  const combined = `${title} ${desc}`.toLowerCase();
  if (/\bintern(?:ship)?\b|\bco-op\b|\bstudent\b/i.test(title)) {
    return "fresher";
  }
  if (/\bsenior\b|\blead\b|\bprincipal\b|\bstaff\b|\bdirector\b|\bhead\b/i.test(title)) {
    return "senior";
  }
  if (/\bentry\b|\bjunior\b|\bgraduate\b|\bnew grad\b|\bfresher\b/i.test(combined)) {
    return "entry";
  }
  return "mid";
}

/**
 * Extracts salary pattern from plain text if available.
 */
export function extractSalary(text: string): string | null {
  const match = text.match(
    /\$[\d,]+(?:\s*-\s*\$[\d,]+)?(?:\s*USD)?(?:\s*(?:per|\/)\s*(?:hr|hour|yr|year|annum|month))?/i
  );
  if (match) {
    return match[0].trim();
  }
  const inrMatch = text.match(
    /(?:₹|INR)\s*[\d,]+(?:\s*-\s*[\d,]+)?(?:\s*(?:LPA|lakhs?|per\s+year|per\s+month))?/i
  );
  if (inrMatch) {
    return inrMatch[0].trim();
  }
  return null;
}
