// scripts/ingest_real_jobs.ts
/**
 * Real-World Job Postings Ingestion Engine
 *
 * Connects to authoritative public Greenhouse Job Board APIs of prominent real-world tech companies
 * (Cloudflare, Figma, GitLab, Datadog, Affirm, Elastic, Airbnb, Pinterest, Discord).
 * Normalizes descriptions, extracts skills & qualifications, generates Phase 3 enrichments,
 * and populates the opportunity feed with genuine, live job positions.
 */

import fs from "fs";
import path from "path";
import { decodeHtmlEntities, normalizeDescription } from "../src/lib/services/enrichment/normalizer.ts";
import type { Opportunity } from "../src/lib/db.ts";

interface GreenhouseJobSummary {
  id: number | string;
  title: string;
  absolute_url: string;
  updated_at?: string;
  location?: { name?: string };
}

interface CompanyTarget {
  name: string;
  token: string;
  domain: string;
  maxJobs: number;
  priorityRoles?: RegExp[];
}

const TARGET_COMPANIES: CompanyTarget[] = [
  {
    name: "Cloudflare",
    token: "cloudflare",
    domain: "cloudflare.com",
    maxJobs: 5,
    priorityRoles: [
      /software engineer/i,
      /systems engineer/i,
      /security/i,
      /frontend|backend|fullstack/i,
      /intern/i,
    ],
  },
  {
    name: "Figma",
    token: "figma",
    domain: "figma.com",
    maxJobs: 5,
    priorityRoles: [
      /intern/i,
      /engineer/i,
      /designer/i,
      /developer/i,
    ],
  },
  {
    name: "GitLab",
    token: "gitlab",
    domain: "gitlab.com",
    maxJobs: 5,
    priorityRoles: [
      /backend engineer/i,
      /frontend engineer/i,
      /security engineer/i,
      /infrastructure/i,
    ],
  },
  {
    name: "Datadog",
    token: "datadog",
    domain: "datadoghq.com",
    maxJobs: 5,
    priorityRoles: [
      /software engineer/i,
      /observability/i,
      /intern/i,
      /sre|infrastructure/i,
    ],
  },
  {
    name: "Affirm",
    token: "affirm",
    domain: "affirm.com",
    maxJobs: 4,
    priorityRoles: [
      /intern/i,
      /engineer/i,
      /data/i,
      /platform/i,
    ],
  },
  {
    name: "Elastic",
    token: "elastic",
    domain: "elastic.co",
    maxJobs: 4,
    priorityRoles: [
      /software engineer/i,
      /search/i,
      /distributed/i,
    ],
  },
  {
    name: "Airbnb",
    token: "airbnb",
    domain: "airbnb.com",
    maxJobs: 4,
    priorityRoles: [
      /software engineer/i,
      /mobile|ios|android/i,
      /guest/i,
    ],
  },
  {
    name: "Pinterest",
    token: "pinterest",
    domain: "pinterest.com",
    maxJobs: 4,
    priorityRoles: [
      /software engineer/i,
      /machine learning|ml/i,
      /infrastructure/i,
    ],
  },
  {
    name: "Discord",
    token: "discord",
    domain: "discord.com",
    maxJobs: 4,
    priorityRoles: [
      /software engineer/i,
      /audio|video/i,
      /product/i,
    ],
  },
];

const SKILL_MAP: Array<{ skill: string; regex: RegExp; category: any }> = [
  { skill: "TypeScript", regex: /\btypescript\b/i, category: "programming_language" },
  { skill: "JavaScript", regex: /\bjavascript|es6\b/i, category: "programming_language" },
  { skill: "Python", regex: /\bpython\b/i, category: "programming_language" },
  { skill: "Go", regex: /\bgo\b|\bgolang\b/i, category: "programming_language" },
  { skill: "Rust", regex: /\brust\b/i, category: "programming_language" },
  { skill: "Java", regex: /\bjava\b(?!\s*script)/i, category: "programming_language" },
  { skill: "C++", regex: /\bc\+\+\b/i, category: "programming_language" },
  { skill: "React", regex: /\breact(?:\.js)?\b/i, category: "framework" },
  { skill: "Next.js", regex: /\bnext(?:\.js)?\b/i, category: "framework" },
  { skill: "Node.js", regex: /\bnode(?:\.js)?\b/i, category: "framework" },
  { skill: "SQL", regex: /\bsql\b|\bpostgres(?:ql)?\b|\bmysql\b/i, category: "database" },
  { skill: "AWS", regex: /\baws\b|amazon web services/i, category: "cloud_devops" },
  { skill: "Docker", regex: /\bdocker\b/i, category: "cloud_devops" },
  { skill: "Kubernetes", regex: /\bkubernetes|k8s\b/i, category: "cloud_devops" },
  { skill: "GraphQL", regex: /\bgraphql\b/i, category: "framework" },
  { skill: "Redis", regex: /\bredis\b/i, category: "database" },
  { skill: "Linux", regex: /\blinux\b/i, category: "tool" },
  { skill: "Git", regex: /\bgit\b|\bgithub\b/i, category: "tool" },
  { skill: "Figma", regex: /\bfigma\b/i, category: "tool" },
  { skill: "Machine Learning", regex: /\bmachine learning|\bml\b|\bai\b|\bdeep learning\b/i, category: "domain_knowledge" },
];

function determineWorkMode(text: string, locationStr: string): "remote" | "hybrid" | "onsite" {
  const combined = `${locationStr} ${text}`.toLowerCase();
  if (combined.includes("remote")) return "remote";
  if (combined.includes("hybrid")) return "hybrid";
  return "onsite";
}

function determineOpportunityType(title: string): "internship" | "full_time" {
  if (/\bintern(?:ship)?\b|\bco-op\b|\bapprentice(?:ship)?\b|\bstudent\b/i.test(title)) {
    return "internship";
  }
  return "full_time";
}

function determineExperienceLevel(title: string): {
  uiLevel: "Student / Intern" | "Entry-level" | "Mid-level" | "Senior";
  phase3Level: "entry" | "mid" | "senior";
} {
  if (/\bintern(?:ship)?\b|\bstudent\b|\bco-op\b/i.test(title)) {
    return { uiLevel: "Student / Intern", phase3Level: "entry" };
  }
  if (/\bsenior\b|\blead\b|\bprincipal\b|\bstaff\b|\bdirector\b|\bhead\b|\bmanager\b/i.test(title)) {
    return { uiLevel: "Senior", phase3Level: "senior" };
  }
  if (/\bentry\b|\bjunior\b|\bassociate\b|\bgraduate\b|\bnew grad\b/i.test(title)) {
    return { uiLevel: "Entry-level", phase3Level: "entry" };
  }
  return { uiLevel: "Mid-level", phase3Level: "mid" };
}

export function extractSalaryText(content: string): string | null {
  const match = content.match(/\$[\d,]+(?:\s*-\s*\$[\d,]+)?\s*(?:USD)?\s*(?:\/|\s+per\s+)?(?:hr|hour|yr|year|annum)?/i);
  if (match) {
    return match[0].trim();
  }
  return null;
}

export async function fetchCompanyJobs(company: CompanyTarget): Promise<any[]> {
  const boardUrl = `https://boards-api.greenhouse.io/v1/boards/${company.token}/jobs`;
  const res = await fetch(boardUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${company.name} jobs: HTTP ${res.status}`);
  }
  const data = await res.json();
  const jobs: GreenhouseJobSummary[] = data.jobs || [];

  // Filter and select top roles matching priority patterns
  const selected: GreenhouseJobSummary[] = [];
  const seenTitles = new Set<string>();

  for (const pattern of company.priorityRoles || []) {
    for (const job of jobs) {
      if (selected.length >= company.maxJobs) break;
      const cleanTitle = job.title.trim();
      const isManager = /\bmanager\b|\bdirector\b|\bvp\b/i.test(cleanTitle);
      if (pattern.test(cleanTitle) && !isManager && !seenTitles.has(cleanTitle.toLowerCase())) {
        selected.push(job);
        seenTitles.add(cleanTitle.toLowerCase());
      }
    }
    if (selected.length >= company.maxJobs) break;
  }

  // If still room, fill with other non-manager technical jobs
  for (const job of jobs) {
    if (selected.length >= company.maxJobs) break;
    const cleanTitle = job.title.trim();
    const isManager = /\bmanager\b|\bdirector\b|\bvp\b/i.test(cleanTitle);
    if (!isManager && !seenTitles.has(cleanTitle.toLowerCase())) {
      selected.push(job);
      seenTitles.add(cleanTitle.toLowerCase());
    }
  }

  // Fetch individual job details to retrieve full job content
  const fullJobs: any[] = [];
  for (const item of selected) {
    try {
      const detailUrl = `https://boards-api.greenhouse.io/v1/boards/${company.token}/jobs/${item.id}`;
      const dRes = await fetch(detailUrl);
      if (dRes.ok) {
        const dData = await dRes.json();
        fullJobs.push({
          ...dData,
          companyName: company.name,
        });
      } else {
        fullJobs.push({
          ...item,
          companyName: company.name,
        });
      }
    } catch {
      fullJobs.push({
        ...item,
        companyName: company.name,
      });
    }
  }

  return fullJobs;
}

export async function ingestAllRealJobs(): Promise<Opportunity[]> {
  console.log(`\n======================================================`);
  console.log(`🚀 Starting Real-World Greenhouse Job Ingestion Pipeline`);
  console.log(`======================================================\n`);

  const allOpportunities: Opportunity[] = [];
  const now = new Date();

  for (const target of TARGET_COMPANIES) {
    console.log(`📡 Ingesting live postings from ${target.name} (${target.token})...`);
    try {
      const jobs = await fetchCompanyJobs(target);
      console.log(`   Fetched ${jobs.length} postings for ${target.name}. Processing...`);

      for (const j of jobs) {
        const rawContent = j.content ? decodeHtmlEntities(j.content) : "";
        const normalizedDesc = normalizeDescription(rawContent);

        // Genuine description from normalized content; never invent corporate filler
        const description = normalizedDesc.trim() || null;

        const locationName = j.location?.name?.replace(/•/g, ",").trim() || "Remote";
        const workMode = determineWorkMode(normalizedDesc, locationName);
        const oppType = determineOpportunityType(j.title);
        const exp = determineExperienceLevel(j.title);
        const isIntern = oppType === "internship";

        // Extract genuine skills found in title or description text
        const foundSkills: string[] = [];
        const requiredSkillObjects: any[] = [];
        const preferredSkillObjects: any[] = [];

        const combinedSearch = `${j.title} ${normalizedDesc}`;
        for (const item of SKILL_MAP) {
          if (item.regex.test(combinedSearch)) {
            foundSkills.push(item.skill);
            if (item.regex.test(j.title) || foundSkills.length <= 3) {
              requiredSkillObjects.push({ name: item.skill, category: item.category });
            } else {
              preferredSkillObjects.push({ name: item.skill, category: item.category });
            }
          }
        }

        // If no skills found in text, do NOT invent synthetic fallbacks; leave empty
        // Extract degrees only if explicitly cited in listing text
        const degreeLevels: string[] = [];
        if (/\b(?:b\.?tech|b\.?e\.?|b\.?sc|bachelor(?:'s)?|undergraduate)\b/i.test(combinedSearch)) {
          degreeLevels.push("Bachelors");
        }
        if (/\b(?:m\.?tech|m\.?s\.?|m\.?sc|master(?:'s)?|postgraduate)\b/i.test(combinedSearch)) {
          degreeLevels.push("Masters");
        }
        if (/\b(?:ph\.?d|doctorate)\b/i.test(combinedSearch)) {
          degreeLevels.push("PhD");
        }

        // Extract graduation cohorts only if explicitly cited in text
        const gradMatches = combinedSearch.match(/\b(202[4-9])\b/g);
        const graduationYears: number[] = gradMatches
          ? Array.from(new Set(gradMatches.map(Number))).sort()
          : [];

        // Salary: strictly factual extraction. Stored as null if absent; NEVER fabricated!
        const salary = extractSalaryText(normalizedDesc);

        // Deadline: extract genuine deadline if present in text; otherwise null (never invent random future dates)
        let deadlineDate: string | null = null;
        const deadlineMatch = normalizedDesc.match(/\bdeadline[:\s]+([A-Za-z]+ \d{1,2},? \d{4}|\d{4}-\d{2}-\d{2})\b/i);
        if (deadlineMatch) {
          const parsed = new Date(deadlineMatch[1]);
          if (!isNaN(parsed.getTime())) {
            deadlineDate = parsed.toISOString();
          }
        }

        // Extract minimum CGPA only if explicitly required; otherwise null
        let minCgpa: number | null = null;
        const cgpaMatch = combinedSearch.match(/\b(?:cgpa|gpa)\s*(?:of|>=|:|\b)\s*(\d(?:\.\d+)?)\b/i);
        if (cgpaMatch) {
          const parsedCgpa = parseFloat(cgpaMatch[1]);
          if (!isNaN(parsedCgpa) && parsedCgpa <= 10) {
            minCgpa = parsedCgpa;
          }
        }

        // Academic branches: extract only if explicitly mentioned
        const branches: string[] = [];
        if (/\bcomputer science\b/i.test(combinedSearch)) branches.push("Computer Science");
        if (/\binformation technology\b/i.test(combinedSearch)) branches.push("Information Technology");
        if (/\belectrical engineering\b/i.test(combinedSearch)) branches.push("Electrical Engineering");

        const oppId = `real_${target.token}_${j.id}`;

        const opportunity: any = {
          id: oppId,
          recruiterId: `recruiter_${target.token}`,
          title: j.title.trim(),
          description: description,
          org: target.name,
          category: isIntern ? "Internships" : "Jobs",
          skills: foundSkills,
          eligibility: {
            degrees: degreeLevels,
            minCgpa: minCgpa,
            graduationYears: graduationYears.map(String),
            experienceLevel: exp.uiLevel,
          },
          location: locationName,
          workMode: workMode,
          deadline: deadlineDate,
          stipendSalary: salary,
          status: "active",
          sourceUrl: j.absolute_url,
          isExternal: true,
          publicationDate: j.updated_at || now.toISOString(),
          lastVerifiedDate: now.toISOString(),
          applicantCount: 0,
          shortlistedCount: 0,
          selectedCount: 0,
          createdAt: j.updated_at || now.toISOString(),
          updatedAt: now.toISOString(),
          isQuarantined: false,
          quarantineReasons: [],

          // Phase 3 Enriched Contract Payload
          enrichment: {
            status: "succeeded",
            roleTitle: j.title.trim(),
            descriptionSummary: description ? (description.substring(0, 240) + "...") : null,
            opportunityType: oppType,
            workMode: workMode,
            requiredSkills: requiredSkillObjects.map((s) => s.name),
            preferredSkills: preferredSkillObjects.map((s) => s.name),
            inferredSkills: [],
            degreeLevels: degreeLevels,
            branches: branches,
            graduationYears: graduationYears,
            minCgpa: minCgpa,
            experienceLevel: exp.phase3Level,
            isPaid: salary ? true : null,
            compensation: salary
              ? {
                  textVerbatim: salary,
                }
              : null,
          },
        };

        allOpportunities.push(opportunity);
      }
    } catch (err: any) {
      console.error(`   ⚠️ Failed to ingest ${target.name}:`, err.message);
    }
  }

  console.log(`\n✅ Ingested a total of ${allOpportunities.length} authentic opportunities from real companies.`);
  return allOpportunities;
}

async function main() {
  const opps = await ingestAllRealJobs();
  if (opps.length === 0) {
    console.error("❌ No opportunities were ingested. Exiting without modifying database.");
    process.exit(1);
  }

  const dbPath = path.resolve(process.cwd(), "src/data/db.json");
  const rawDb = fs.readFileSync(dbPath, "utf-8");
  const db = JSON.parse(rawDb);

  // Replace mock opportunities with genuine real company opportunities
  db.opportunities = opps;

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf-8");
  console.log(`\n🎉 Successfully updated ${dbPath} with ${opps.length} real-world opportunities!\n`);
}

if (process.argv[1]?.includes("ingest_real_jobs")) {
  main().catch((err) => {
    console.error("Fatal ingestion error:", err);
    process.exit(1);
  });
}
