/**
 * scripts/quarantine_synthetic_data.ts
 *
 * Scans existing Opportunity records (in src/data/db.json and Prisma PostgreSQL if connected)
 * for synthetic/unsupported fallback values:
 *   - Canned fallback salaries ("$45 - $65 / hour", "$120,000 - $185,000 / year")
 *   - Blanket ungrounded degree requirements (["Bachelors", "Masters"], ["Bachelors", "Masters", "PhD"])
 *   - Blanket ungrounded graduation cohorts (["2025", "2026", "2027"], ["2024", "2025", "2026"])
 *   - Ungrounded hardcoded minimum CGPA (7.0)
 *   - Fabricated/randomized application deadlines unsupported by listing text
 *
 * Mode:
 *   - Default: DRY-RUN (read-only audit, reports counts, reasons breakdown, and sample records)
 *   - With `--apply`: Writes quarantine flags to src/data/db.json (and Prisma DB if available)
 */

import fs from "fs";
import path from "path";

export interface QuarantineAuditResult {
  id: string;
  title: string;
  org: string;
  reasons: string[];
  dataQualityScore: number;
  flaggedFields: Record<string, any>;
}

export const CANNED_SALARY_FALLBACKS = [
  "$45 - $65 / hour",
  "$120,000 - $185,000 / year",
];

export function auditOpportunityForSyntheticData(opp: any): {
  isQuarantined: boolean;
  quarantineReasons: string[];
  dataQualityScore: number;
  flaggedFields: Record<string, any>;
} {
  const reasons: string[] = [];
  const flaggedFields: Record<string, any> = {};

  const fullText = `${opp.title || ""} ${opp.description || ""} ${opp.originalText || ""}`.toLowerCase();

  // 1. Audit Salary: check for known canned fallback strings
  const salary = opp.stipendSalary || opp.compensation?.textVerbatim || opp.salary;
  if (salary) {
    const isCannedFallback = CANNED_SALARY_FALLBACKS.some((canned) =>
      String(salary).trim().toLowerCase() === canned.toLowerCase()
    );
    if (isCannedFallback) {
      reasons.push("SYNTHETIC_SALARY_FALLBACK");
      flaggedFields.salary = salary;
    }
  }

  // 2. Audit Degrees: check for blanket synthetic degree arrays unsupported by text
  const rawDegrees = opp.eligibility?.degrees || opp.degreeLevels || [];
  const degreeStrings: string[] = Array.isArray(rawDegrees) ? rawDegrees.map(String) : [];
  const isCannedDegreeArray =
    (degreeStrings.length === 2 && degreeStrings.includes("Bachelors") && degreeStrings.includes("Masters")) ||
    (degreeStrings.length === 3 && degreeStrings.includes("Bachelors") && degreeStrings.includes("Masters") && degreeStrings.includes("PhD"));

  if (isCannedDegreeArray) {
    const hasDegreeInText = /\b(?:b\.?tech|b\.?e\.?|b\.?sc|bachelor|undergraduate|m\.?tech|m\.?s\.?|master|postgraduate|ph\.?d|doctorate)\b/i.test(fullText);
    if (!hasDegreeInText) {
      reasons.push("SYNTHETIC_DEGREE_FALLBACK");
      flaggedFields.degrees = degreeStrings;
    }
  }

  // 3. Audit Graduation Years: check for canned cohorts [2025, 2026, 2027] or [2024, 2025, 2026]
  const rawGradYears = opp.eligibility?.graduationYears || opp.graduationYears || [];
  const gradYearStrings: string[] = Array.isArray(rawGradYears) ? rawGradYears.map(String) : [];
  const isCannedGradYears =
    (gradYearStrings.length === 3 && gradYearStrings.includes("2025") && gradYearStrings.includes("2026") && gradYearStrings.includes("2027")) ||
    (gradYearStrings.length === 3 && gradYearStrings.includes("2024") && gradYearStrings.includes("2025") && gradYearStrings.includes("2026"));

  if (isCannedGradYears) {
    const hasGradYearInText = /\b(202[4-9])\b/.test(fullText);
    if (!hasGradYearInText) {
      reasons.push("SYNTHETIC_GRAD_YEAR_FALLBACK");
      flaggedFields.graduationYears = gradYearStrings;
    }
  }

  // 4. Audit CGPA: check for ungrounded minCgpa 7.0
  const minCgpa = opp.eligibility?.minCgpa ?? opp.minCgpa;
  if (minCgpa === 7 || minCgpa === 7.0) {
    const hasCgpaInText = /\b(?:cgpa|gpa)\b/i.test(fullText);
    if (!hasCgpaInText) {
      reasons.push("SYNTHETIC_CGPA_FALLBACK");
      flaggedFields.minCgpa = minCgpa;
    }
  }

  // 5. Audit Deadline: check for synthetic randomized deadlines unsupported by text
  const deadline = opp.deadline || opp.applicationDeadline;
  if (deadline) {
    const hasDeadlineInText = /\b(?:deadline|apply by|last date|closing date|valid through)\b/i.test(fullText);
    if (!hasDeadlineInText) {
      reasons.push("SYNTHETIC_DEADLINE_FALLBACK");
      flaggedFields.deadline = deadline;
    }
  }

  const isQuarantined = reasons.length > 0;
  const dataQualityScore = Number(Math.max(0, 1.0 - reasons.length * 0.2).toFixed(2));

  return {
    isQuarantined,
    quarantineReasons: reasons,
    dataQualityScore,
    flaggedFields,
  };
}

export async function runQuarantineAudit(options: { apply?: boolean } = {}) {
  const isApply = options.apply === true;
  console.log("=".repeat(75));
  console.log(`[QUARANTINE AUDIT] Running in ${isApply ? ">> COMMIT / APPLY <<" : "[DRY-RUN]"} mode`);
  console.log("=".repeat(75));

  // 1. Audit File-based store (src/data/db.json)
  const dbPath = path.resolve(process.cwd(), "src/data/db.json");
  if (!fs.existsSync(dbPath)) {
    console.warn(`[WARN] File not found: ${dbPath}`);
    return;
  }

  const raw = fs.readFileSync(dbPath, "utf-8");
  const db = JSON.parse(raw);
  const opps: any[] = db.opportunities || [];

  console.log(`\nEvaluating ${opps.length} opportunities from src/data/db.json...`);

  let quarantinedCount = 0;
  let cleanCount = 0;
  const reasonHistogram: Record<string, number> = {};
  const auditResults: QuarantineAuditResult[] = [];

  for (const opp of opps) {
    const audit = auditOpportunityForSyntheticData(opp);
    if (audit.isQuarantined) {
      quarantinedCount++;
      for (const r of audit.quarantineReasons) {
        reasonHistogram[r] = (reasonHistogram[r] || 0) + 1;
      }
      auditResults.push({
        id: opp.id,
        title: opp.title,
        org: opp.org || opp.organizationName || "Unknown",
        reasons: audit.quarantineReasons,
        dataQualityScore: audit.dataQualityScore,
        flaggedFields: audit.flaggedFields,
      });

      if (isApply) {
        opp.isQuarantined = true;
        opp.quarantineReasons = audit.quarantineReasons;
        opp.dataQualityScore = audit.dataQualityScore;
      }
    } else {
      cleanCount++;
      if (isApply) {
        opp.isQuarantined = false;
        opp.quarantineReasons = [];
        opp.dataQualityScore = 1.0;
      }
    }
  }

  console.log("\n---------------- AUDIT SUMMARY ----------------");
  console.log(`Total Opportunities Examined: ${opps.length}`);
  console.log(`Flagged for Quarantine:       ${quarantinedCount}`);
  console.log(`Verified Clean / Grounded:   ${cleanCount}`);

  console.log("\n---------------- REASONS BREAKDOWN ----------------");
  for (const [reason, count] of Object.entries(reasonHistogram)) {
    console.log(`  - ${reason.padEnd(30)} : ${count}`);
  }

  console.log("\n---------------- SAMPLE QUARANTINED RECORDS (First 3) ----------------");
  for (const sample of auditResults.slice(0, 3)) {
    console.log(`\nID:    ${sample.id}`);
    console.log(`Title: ${sample.title} (${sample.org})`);
    console.log(`Score: ${sample.dataQualityScore}`);
    console.log(`Reasons: [${sample.reasons.join(", ")}]`);
    console.log("Flagged Fields:", JSON.stringify(sample.flaggedFields, null, 2));
  }

  // 2. Audit Prisma database if DATABASE_URL is configured
  if (process.env.DATABASE_URL) {
    try {
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();
      console.log("\nAuditing Prisma PostgreSQL database...");
      const prismaOpps = await (prisma.opportunity as any).findMany();
      console.log(`Found ${prismaOpps.length} opportunities in Prisma database.`);

      let prismaQuarantined = 0;
      for (const pOpp of prismaOpps) {
        const audit = auditOpportunityForSyntheticData(pOpp);
        if (audit.isQuarantined) {
          prismaQuarantined++;
          if (isApply) {
            await (prisma.opportunity as any).update({
              where: { id: pOpp.id },
              data: {
                isQuarantined: true,
                quarantineReasons: audit.quarantineReasons,
                dataQualityScore: audit.dataQualityScore,
              },
            });
          }
        }
      }
      console.log(`Prisma: ${prismaQuarantined} flagged for quarantine.`);
      await prisma.$disconnect();
    } catch (err) {
      console.log(`Prisma audit skipped or encountered error (offline mode):`, (err as any).message);
    }
  }

  // Commit if in apply mode
  if (isApply) {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf-8");
    console.log(`\n>>> [APPLIED] Updated ${quarantinedCount} opportunities with quarantine flags in ${dbPath} <<<`);
  } else {
    console.log(`\n>>> [DRY-RUN] No files or databases modified. Run with --apply to commit changes. <<<`);
  }

  return {
    total: opps.length,
    quarantinedCount,
    cleanCount,
    reasonHistogram,
    samples: auditResults.slice(0, 3),
  };
}

// Direct CLI execution
if (process.argv[1] && process.argv[1].includes("quarantine_synthetic_data")) {
  const isApply = process.argv.includes("--apply");
  runQuarantineAudit({ apply: isApply }).catch((err) => {
    console.error("Quarantine audit error:", err);
    process.exit(1);
  });
}
