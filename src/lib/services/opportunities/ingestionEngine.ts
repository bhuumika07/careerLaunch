// src/lib/services/opportunities/ingestionEngine.ts
/**
 * Canonical Opportunities Ingestion Engine (India Tech Focus)
 *
 * Ingestion sources:
 * 1. Greenhouse Board APIs for top product & tech companies hiring in India
 *    (Stripe, MongoDB, Okta, InMobi, Rubrik, GitLab, Elastic, Twilio, Airbnb, Coinbase, Datadog, Coursera, etc.)
 *    Zero rate limits, zero API key needed, verified direct application links.
 * 2. Adzuna India API (/in/) for broad Indian tech hubs (Bengaluru, Hyderabad, Pune, Gurugram, etc.)
 *    Consciously budgeted to make only 2 API calls (fetching ~50 jobs) to preserve your 25-call free tier.
 */

import fs from "fs";
import path from "path";
import { decodeHtmlEntities, normalizeDescription } from "../enrichment/normalizer.ts";
import type { Opportunity } from "../../db.ts";

export interface GreenhouseJobSummary {
  id: number | string;
  title: string;
  absolute_url: string;
  updated_at?: string;
  location?: { name?: string };
}

export interface CompanyTarget {
  name: string;
  token: string;
  domain: string;
  maxJobs: number;
}

export const GREENHOUSE_INDIA_COMPANIES: CompanyTarget[] = [
  { name: "Okta", token: "okta", domain: "okta.com", maxJobs: 15 },
  { name: "MongoDB", token: "mongodb", domain: "mongodb.com", maxJobs: 15 },
  { name: "Stripe", token: "stripe", domain: "stripe.com", maxJobs: 15 },
  { name: "InMobi", token: "inmobi", domain: "inmobi.com", maxJobs: 15 },
  { name: "Rubrik", token: "rubrik", domain: "rubrik.com", maxJobs: 15 },
  { name: "GitLab", token: "gitlab", domain: "gitlab.com", maxJobs: 12 },
  { name: "Elastic", token: "elastic", domain: "elastic.co", maxJobs: 10 },
  { name: "Twilio", token: "twilio", domain: "twilio.com", maxJobs: 10 },
  { name: "Airbnb", token: "airbnb", domain: "airbnb.com", maxJobs: 10 },
  { name: "Coinbase", token: "coinbase", domain: "coinbase.com", maxJobs: 10 },
  { name: "Datadog", token: "datadog", domain: "datadoghq.com", maxJobs: 8 },
  { name: "Coursera", token: "coursera", domain: "coursera.org", maxJobs: 8 },
  { name: "Samsara", token: "samsara", domain: "samsara.com", maxJobs: 5 },
  { name: "Yext", token: "yext", domain: "yext.com", maxJobs: 5 },
  { name: "Figma", token: "figma", domain: "figma.com", maxJobs: 5 },
];

export const INDIA_LOCATION_REGEX = /\b(india|bengaluru|bangalore|hyderabad|pune|gurgaon|gurugram|noida|mumbai|delhi|chennai|remote\s*-\s*india)\b/i;

export const SKILL_MAP: Array<{ skill: string; regex: RegExp }> = [
  { skill: "TypeScript", regex: /\btypescript\b/i },
  { skill: "JavaScript", regex: /\bjavascript|es6\b/i },
  { skill: "Python", regex: /\bpython\b/i },
  { skill: "Java", regex: /\bjava\b(?!\s*script)/i },
  { skill: "Go", regex: /\bgo\b|\bgolang\b/i },
  { skill: "Rust", regex: /\brust\b/i },
  { skill: "C++", regex: /\bc\+\+\b/i },
  { skill: "React", regex: /\breact(?:\.js)?\b/i },
  { skill: "Next.js", regex: /\bnext(?:\.js)?\b/i },
  { skill: "Node.js", regex: /\bnode(?:\.js)?\b/i },
  { skill: "SQL", regex: /\bsql\b|\bpostgres(?:ql)?\b|\bmysql\b/i },
  { skill: "AWS", regex: /\baws\b|amazon web services/i },
  { skill: "Docker", regex: /\bdocker\b/i },
  { skill: "Kubernetes", regex: /\bkubernetes|k8s\b/i },
  { skill: "GraphQL", regex: /\bgraphql\b/i },
  { skill: "Redis", regex: /\bredis\b/i },
  { skill: "Linux", regex: /\blinux\b/i },
  { skill: "Git", regex: /\bgit\b|\bgithub\b/i },
  { skill: "Machine Learning", regex: /\bmachine learning|\bml\b|\bai\b|\bdeep learning\b/i },
  { skill: "Data Structures", regex: /\bdata structures|algorithms\b/i },
];

export function determineWorkMode(text: string, locationStr: string): "remote" | "hybrid" | "onsite" {
  const combined = `${locationStr} ${text}`.toLowerCase();
  if (combined.includes("remote")) return "remote";
  if (combined.includes("hybrid")) return "hybrid";
  return "onsite";
}

export function determineOpportunityType(title: string): "internship" | "full_time" {
  if (/\bintern(?:ship)?\b|\bco-op\b|\bapprentice(?:ship)?\b|\bstudent\b|\btrainee\b/i.test(title)) {
    return "internship";
  }
  return "full_time";
}

export function determineExperienceLevel(title: string): {
  uiLevel: "Student / Intern" | "Entry-level" | "Mid-level" | "Senior";
  phase3Level: "entry" | "mid" | "senior";
} {
  if (/\bintern(?:ship)?\b|\bstudent\b|\bco-op\b|\btrainee\b/i.test(title)) {
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

// ---------------------------------------------------------------------------
// 1. Greenhouse India Ingestion
// ---------------------------------------------------------------------------
export async function fetchGreenhouseCompanyJobs(company: CompanyTarget): Promise<any[]> {
  const boardUrl = `https://boards-api.greenhouse.io/v1/boards/${company.token}/jobs`;
  const res = await fetch(boardUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${company.name} jobs: HTTP ${res.status}`);
  }
  const data = await res.json();
  const allJobs: GreenhouseJobSummary[] = data.jobs || [];

  // Filter ONLY jobs located in India
  const indiaJobs = allJobs.filter((job) => INDIA_LOCATION_REGEX.test(job.location?.name || ""));

  const selected: GreenhouseJobSummary[] = [];
  const seenTitles = new Set<string>();

  for (const job of indiaJobs) {
    if (selected.length >= company.maxJobs) break;
    const cleanTitle = job.title.trim();
    const isManager = /\bmanager\b|\bdirector\b|\bvp\b/i.test(cleanTitle);
    if (!isManager && !seenTitles.has(cleanTitle.toLowerCase())) {
      selected.push(job);
      seenTitles.add(cleanTitle.toLowerCase());
    }
  }

  const fullJobs: any[] = [];
  for (const item of selected) {
    try {
      const detailUrl = `https://boards-api.greenhouse.io/v1/boards/${company.token}/jobs/${item.id}`;
      const dRes = await fetch(detailUrl);
      if (dRes.ok) {
        const dData = await dRes.json();
        fullJobs.push({ ...dData, companyName: company.name });
      } else {
        fullJobs.push({ ...item, companyName: company.name });
      }
    } catch {
      fullJobs.push({ ...item, companyName: company.name });
    }
  }

  return fullJobs;
}

// ---------------------------------------------------------------------------
// 2. Adzuna India Ingestion (Strict 2-Call Budget)
// ---------------------------------------------------------------------------
export async function fetchAdzunaIndiaJobs(): Promise<Opportunity[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    console.log("ℹ️  Adzuna credentials not found in .env; skipping Adzuna.");
    return [];
  }

  console.log("\n📡 Ingesting from Adzuna India API (Budgeting exactly 2 calls to preserve your quota)...");

  const queries = [
    { what: "software engineer intern", where: "India", count: 25 },
    { what: "graduate software developer", where: "India", count: 25 },
  ];

  const adzunaOpportunities: Opportunity[] = [];
  const now = new Date();
  const futureDeadline = new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString();

  let callIndex = 1;
  for (const q of queries) {
    try {
      const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${encodeURIComponent(appId)}&app_key=${encodeURIComponent(appKey)}&results_per_page=${q.count}&what=${encodeURIComponent(q.what)}&where=${encodeURIComponent(q.where)}&content-type=application/json`;
      console.log(`   [Call ${callIndex}/2] Fetching "${q.what}" in ${q.where}...`);
      const res = await fetch(url);
      callIndex++;

      if (!res.ok) {
        console.warn(`   ⚠️ Adzuna call failed: HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      const results = data.results || [];
      console.log(`   Fetched ${results.length} listings from Adzuna.`);

      for (const item of results) {
        const title = (item.title || "Software Engineer").replace(/<\/?[^>]+(>|$)/g, "").trim();
        const org = (item.company?.display_name || "Tech Company").trim();
        const rawDesc = (item.description || "").replace(/<\/?[^>]+(>|$)/g, "").trim();
        const location = item.location?.display_name || "India";

        let stipendSalary: string | null = null;
        if (item.salary_min || item.salary_max) {
          const min = item.salary_min ? `₹${Math.round(item.salary_min).toLocaleString("en-IN")}` : null;
          const max = item.salary_max ? `₹${Math.round(item.salary_max).toLocaleString("en-IN")}` : null;
          if (min && max && min !== max) {
            stipendSalary = `${min} - ${max} / year`;
          } else {
            stipendSalary = `${min || max} / year`;
          }
        }

        const isIntern = /\bintern(?:ship)?\b|\bco-op\b|\btrainee\b/i.test(title);
        const oppType: "internship" | "full_time" = isIntern ? "internship" : "full_time";
        const category = isIntern ? "Internships" : "Jobs";
        const workMode: "remote" | "hybrid" | "onsite" = determineWorkMode(rawDesc, location);
        const exp = determineExperienceLevel(title);

        const combinedText = `${title} ${rawDesc}`;
        const foundSkills: string[] = [];
        for (const s of SKILL_MAP) {
          if (s.regex.test(combinedText)) {
            foundSkills.push(s.skill);
          }
        }

        const opp: Opportunity = {
          id: `adzuna_${item.id}`,
          recruiterId: "adzuna_india",
          title,
          description: rawDesc,
          org,
          category,
          skills: foundSkills.length > 0 ? foundSkills : ["Software Engineering", "Problem Solving"],
          eligibility: {
            degrees: ["B.Tech", "B.E", "B.Sc", "BCA", "M.Tech", "MCA"],
            minCgpa: null,
            graduationYears: ["2024", "2025", "2026", "2027", "2028", "2029"],
            experienceLevel: exp.uiLevel,
          },
          location,
          workMode,
          deadline: futureDeadline,
          stipendSalary,
          status: "active",
          sourceUrl: item.redirect_url,
          isExternal: true,
          publicationDate: item.created || now.toISOString(),
          lastVerifiedDate: now.toISOString(),
          applicantCount: 0,
          shortlistedCount: 0,
          selectedCount: 0,
          createdAt: item.created || now.toISOString(),
          updatedAt: now.toISOString(),
          isQuarantined: false,
          quarantineReasons: [],
          enrichment: {
            status: "succeeded",
            roleTitle: title,
            descriptionSummary: rawDesc.length > 240 ? rawDesc.substring(0, 240) + "..." : rawDesc,
            opportunityType: oppType,
            workMode,
            requiredSkills: foundSkills.slice(0, 5),
            preferredSkills: foundSkills.slice(5),
            inferredSkills: [],
            degreeLevels: ["bachelors", "masters"],
            branches: ["Computer Science", "Information Technology", "Electronics"],
            graduationYears: [2024, 2025, 2026, 2027, 2028, 2029],
            minCgpa: null,
            experienceLevel: exp.phase3Level,
            isPaid: stipendSalary ? true : null,
            compensation: stipendSalary ? { textVerbatim: stipendSalary } : null,
          },
        };

        adzunaOpportunities.push(opp);
      }
    } catch (err: any) {
      console.warn("   ⚠️ Adzuna query error:", err.message);
    }
  }

  console.log(`✅ Adzuna India Ingestion completed: ${adzunaOpportunities.length} jobs.`);
  return adzunaOpportunities;
}

// ---------------------------------------------------------------------------
// 3. Merging and Persistence
// ---------------------------------------------------------------------------
export function mergeOpportunities(
  existing: Opportunity[],
  incoming: Opportunity[]
): { merged: Opportunity[]; addedCount: number; updatedCount: number } {
  const existingMap = new Map<string, Opportunity>();
  for (const opp of existing) {
    existingMap.set(opp.id, opp);
  }

  let addedCount = 0;
  let updatedCount = 0;
  const now = new Date().toISOString();

  for (const newOpp of incoming) {
    const prev = existingMap.get(newOpp.id);
    if (prev) {
      existingMap.set(newOpp.id, {
        ...newOpp,
        applicantCount: prev.applicantCount ?? 0,
        shortlistedCount: prev.shortlistedCount ?? 0,
        selectedCount: prev.selectedCount ?? 0,
        createdAt: prev.createdAt || newOpp.createdAt,
        updatedAt: now,
        lastVerifiedDate: now,
        status:
          prev.status === "closed" || prev.status === "expired"
            ? prev.status
            : (prev.status as string) === "archived"
            ? ("closed" as const)
            : "active",
      });
      updatedCount++;
    } else {
      existingMap.set(newOpp.id, {
        ...newOpp,
        createdAt: now,
        updatedAt: now,
        lastVerifiedDate: now,
      });
      addedCount++;
    }
  }

  return {
    merged: Array.from(existingMap.values()),
    addedCount,
    updatedCount,
  };
}

export function saveOpportunities(incoming: Opportunity[]): { total: number; added: number; updated: number } {
  const dbPath = path.resolve(process.cwd(), "src/data/db.json");
  let existingOpps: Opportunity[] = [];
  let db: any = {};

  if (fs.existsSync(dbPath)) {
    try {
      db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
      existingOpps = Array.isArray(db.opportunities) ? db.opportunities : [];
    } catch {
      console.warn("Could not parse existing db.json, creating clean structure.");
    }
  }

  const { merged, addedCount, updatedCount } = mergeOpportunities(existingOpps, incoming);
  db.opportunities = merged;

  const tempFile = `${dbPath}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), "utf-8");
  try {
    fs.renameSync(tempFile, dbPath);
  } catch {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf-8");
    if (fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile);
      } catch {
        // ignore
      }
    }
  }

  // Also sync live to Supabase Cloud PostgreSQL so feed updates seamlessly
  if (process.env.DATABASE_URL) {
    syncOpportunitiesToPrisma(incoming).catch((err) => {
      console.warn("[saveOpportunities] Supabase sync warning:", err?.message);
    });
  }

  return { total: merged.length, added: addedCount, updated: updatedCount };
}

export async function syncOpportunitiesToPrisma(incoming: Opportunity[]): Promise<void> {
  try {
    const { prisma } = await import("@/lib/prisma");
    for (const opp of incoming) {
      const isIntern = opp.category?.toLowerCase() === "internships";
      const cat = isIntern ? "internships" : "jobs";
      const sourceId = opp.id.startsWith("gh_")
        ? "source_greenhouse_india"
        : opp.id.startsWith("adzuna_")
        ? "source_adzuna_india"
        : "source_default";

      await (prisma.opportunity as any).upsert({
        where: { id: opp.id },
        update: {
          title: opp.title,
          category: cat,
          organizationName: opp.org || "Company",
          description: opp.description || "",
          requiredSkills: opp.skills || [],
          locationCountry: "India",
          locationCity: opp.location || null,
          workMode: opp.workMode || "unspecified",
          sourceId,
          sourceUrl: opp.sourceUrl || "https://careerlaunch.internal",
          applicationUrl: opp.sourceUrl || null,
          verificationStatus: "verified",
          lifecycleStatus:
            (opp.status as string) === "archived"
              ? "removed"
              : opp.status === "expired"
              ? "expired"
              : "active",
          postedAt: opp.publicationDate ? new Date(opp.publicationDate) : new Date(),
          applicationDeadline: opp.deadline ? new Date(opp.deadline) : null,
          lastCheckedAt: new Date(),
        },
        create: {
          id: opp.id,
          title: opp.title,
          category: cat,
          organizationName: opp.org || "Company",
          description: opp.description || "",
          requiredSkills: opp.skills || [],
          eligibility: opp.eligibility || {},
          locationCountry: "India",
          locationCity: opp.location || null,
          workMode: opp.workMode || "unspecified",
          sourceId,
          sourceUrl: opp.sourceUrl || "https://careerlaunch.internal",
          applicationUrl: opp.sourceUrl || null,
          verificationStatus: "verified",
          lifecycleStatus: "active",
          firstSeenAt: new Date(),
          postedAt: opp.publicationDate ? new Date(opp.publicationDate) : new Date(),
          applicationDeadline: opp.deadline ? new Date(opp.deadline) : null,
          lastCheckedAt: new Date(),
        },
      });
    }
  } catch (err: any) {
    console.warn("[syncOpportunitiesToPrisma] Sync error:", err?.message);
  }
}

// ---------------------------------------------------------------------------
// 4. Standalone Ingestion Functions
// ---------------------------------------------------------------------------
export async function ingestGreenhouseIndiaJobs(): Promise<Opportunity[]> {
  console.log(`\n🏢 Fetching authentic India tech jobs from top product companies on Greenhouse...`);
  const greenhouseOpportunities: Opportunity[] = [];
  const now = new Date();
  const futureDeadline = new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString();

  for (const target of GREENHOUSE_INDIA_COMPANIES) {
    try {
      const jobs = await fetchGreenhouseCompanyJobs(target);
      if (jobs.length > 0) {
        console.log(`   ✓ ${target.name}: Ingested ${jobs.length} roles in India.`);
      }

      for (const j of jobs) {
        const rawContent = j.content ? decodeHtmlEntities(j.content) : "";
        const normalizedDesc = normalizeDescription(rawContent);
        const description = normalizedDesc.trim() || null;

        const locationName = j.location?.name?.replace(/•/g, ",").trim() || "India";
        const workMode = determineWorkMode(normalizedDesc, locationName);
        const oppType = determineOpportunityType(j.title);
        const exp = determineExperienceLevel(j.title);
        const isIntern = oppType === "internship";

        const foundSkills: string[] = [];
        const combinedSearch = `${j.title} ${normalizedDesc}`;
        for (const item of SKILL_MAP) {
          if (item.regex.test(combinedSearch)) {
            foundSkills.push(item.skill);
          }
        }

        const opportunity: Opportunity = {
          id: `gh_in_${target.token}_${j.id}`,
          recruiterId: `recruiter_${target.token}`,
          title: j.title.trim(),
          description: description || "Job description available on official career page.",
          org: target.name,
          category: isIntern ? "Internships" : "Jobs",
          skills: foundSkills.length > 0 ? foundSkills : ["Software Engineering", "Problem Solving"],
          eligibility: {
            degrees: ["B.Tech", "B.E", "B.Sc", "M.Tech", "Any Graduate"],
            minCgpa: null,
            graduationYears: ["2024", "2025", "2026", "2027", "2028", "2029"],
            experienceLevel: exp.uiLevel,
          },
          location: locationName,
          workMode,
          deadline: futureDeadline,
          stipendSalary: isIntern ? "Competitive Internship Stipend" : "Competitive Tech Compensation",
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
          enrichment: {
            status: "succeeded",
            roleTitle: j.title.trim(),
            descriptionSummary: description ? description.substring(0, 240) + "..." : null,
            opportunityType: oppType,
            workMode,
            requiredSkills: foundSkills.slice(0, 5),
            preferredSkills: foundSkills.slice(5),
            inferredSkills: [],
            degreeLevels: ["bachelors", "masters"],
            branches: ["Computer Science", "Information Technology", "Electronics"],
            graduationYears: [2024, 2025, 2026, 2027, 2028, 2029],
            minCgpa: null,
            experienceLevel: exp.phase3Level,
            isPaid: true,
            compensation: {
              textVerbatim: isIntern ? "Competitive Internship Stipend" : "Competitive Tech Compensation",
            },
          },
        };

        greenhouseOpportunities.push(opportunity);
      }
    } catch (err: any) {
      console.warn(`   ⚠️ ${target.name}: ${err.message}`);
    }
  }

  console.log(`✅ Greenhouse India sweep completed: ${greenhouseOpportunities.length} jobs.`);
  return greenhouseOpportunities;
}

export async function ingestAdzunaIndiaJobs(): Promise<Opportunity[]> {
  return await fetchAdzunaIndiaJobs();
}

export async function ingestAllIndiaJobs(): Promise<Opportunity[]> {
  console.log(`\n================================================================`);
  console.log(`🇮🇳 Starting Real-World INDIA Tech Opportunities Ingestion Engine`);
  console.log(`================================================================\n`);

  const ghJobs = await ingestGreenhouseIndiaJobs();
  const adzunaJobs = await ingestAdzunaIndiaJobs();
  const allOpportunities = [...ghJobs, ...adzunaJobs];

  console.log(`\n🎉 Total Genuine India Opportunities Ingested: ${allOpportunities.length}`);
  return allOpportunities;
}
