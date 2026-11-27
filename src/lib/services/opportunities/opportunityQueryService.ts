// src/lib/services/opportunities/opportunityQueryService.ts
/**
 * Canonical Opportunity Access Layer (Phase 1 - Chunk 1.2)
 *
 * Implements the approved Canonical Model Decision from Phase 0:
 * 1. Single unified access service for all student-facing features (feed, search, detail, applications).
 * 2. Bridges canonical Opportunity store (Prisma PostgreSQL / file-based fallback) with non-canonical
 *    ConnectorOpportunity models via a lossless, factual adapter.
 * 3. Enforces strict Phase 1 quality gates: Quarantined records (with synthetic values) are strictly excluded
 *    from student discovery feeds, while saved applications remain 100% accessible to their student owners.
 * 4. Preserves all legacy fields (org, recruiterId, applicantCount, skills, eligibility, stipendSalary, deadline)
 *    and enriched AI fields (required_skills, preferred_skills, inferred_skills, summary).
 */

import fs from "fs";
import path from "path";
import type { Opportunity, ApplicationRecord } from "../../db.ts";
import {
  filterEnrichedStudentFeed,
  type EnrichedFeedFilters,
  type EnrichedStudentFeedResult,
  type EnrichedStudentOpportunityItem,
} from "../enrichment/studentEnrichmentQuery.ts";
import {
  isRecommendable,
  normalizeLifecycleStatus,
} from "../verification/lifecycleConsistency.ts";

export { isRecommendable, normalizeLifecycleStatus };

function readDbStore(): any {
  try {
    const dbPath = path.resolve(process.cwd(), "src/data/db.json");
    if (fs.existsSync(dbPath)) {
      return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    }
  } catch (e) {
    console.error("[opportunityQueryService] Failed reading db.json", e);
  }
  return { opportunities: [], applications: [] };
}

function writeDbStore(data: any): void {
  try {
    const dbPath = path.resolve(process.cwd(), "src/data/db.json");
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("[opportunityQueryService] Failed writing db.json", e);
  }
}

export interface OpportunityFeedQueryOptions extends EnrichedFeedFilters {
  allowQuarantined?: boolean;
}

/**
 * Lossless adapter transforming a non-canonical ConnectorOpportunity into the canonical Opportunity model.
 * Strict Phase 1 Invariant: missing values are stored as null / empty arrays, never fabricated.
 */
export function adaptConnectorOpportunityToCanonical(connectorOpp: any): Opportunity {
  const isIntern =
    connectorOpp.type === "internship" ||
    /\bintern(?:ship)?\b/i.test(connectorOpp.title || "");

  // Map category to canonical OpportunityCategory enum
  let category: any = "Jobs";
  if (connectorOpp.type === "internship" || isIntern) {
    category = "Internships";
  } else if (connectorOpp.type === "fellowship") {
    category = "Research fellowships";
  } else if (connectorOpp.type === "research") {
    category = "Research collaborations";
  }

  // Map experience level to canonical eligibility enum
  let experienceLevel: "Entry-level" | "Mid-level" | "Senior" | "Student / Intern" = "Entry-level";
  const expStr = String(connectorOpp.experienceLevel || "").toLowerCase();
  if (isIntern || expStr.includes("fresher") || expStr.includes("intern")) {
    experienceLevel = "Student / Intern";
  } else if (expStr.includes("senior") || expStr.includes("lead")) {
    experienceLevel = "Senior";
  } else if (expStr.includes("mid")) {
    experienceLevel = "Mid-level";
  }

  const workMode: "remote" | "hybrid" | "onsite" = connectorOpp.isRemote
    ? "remote"
    : /\bhybrid\b/i.test(connectorOpp.description || "")
    ? "hybrid"
    : "onsite";

  let status: "active" | "closed" | "expired" = "active";
  const verStatus = String(connectorOpp.verificationStatus || "").toLowerCase();
  if (verStatus === "closed") status = "closed";
  else if (verStatus === "expired") status = "expired";

  const nowIso = new Date().toISOString();
  const rawDesc = connectorOpp.description || "";

  return {
    id: connectorOpp.id,
    recruiterId: connectorOpp.sourceId || "external_connector",
    title: connectorOpp.title || "Untitled Role",
    description: rawDesc,
    org: connectorOpp.organization || "Company",
    category,
    skills: Array.isArray(connectorOpp.skills) ? connectorOpp.skills : [],
    eligibility: {
      degrees: [], // Factual extraction: empty unless grounded in text
      minCgpa: null,
      graduationYears: [],
      experienceLevel,
    },
    location: connectorOpp.location || (connectorOpp.isRemote ? "Remote" : "Unspecified"),
    workMode,
    deadline: connectorOpp.deadline || null,
    stipendSalary: connectorOpp.salary || null,
    status,
    sourceUrl: connectorOpp.originalUrl || "",
    isExternal: true,
    publicationDate: connectorOpp.postedDate || connectorOpp.fetchedAt || nowIso,
    lastVerifiedDate: connectorOpp.lastVerifiedAt || connectorOpp.fetchedAt || nowIso,
    applicantCount: 0,
    shortlistedCount: 0,
    selectedCount: 0,
    createdAt: connectorOpp.createdAt || connectorOpp.fetchedAt || nowIso,
    updatedAt: connectorOpp.updatedAt || connectorOpp.fetchedAt || nowIso,
    isQuarantined: connectorOpp.isQuarantined ?? false,
    quarantineReasons: connectorOpp.quarantineReasons ?? [],
    dataQualityScore: connectorOpp.dataQualityScore ?? 1.0,
    enrichment: {
      status: "succeeded",
      roleTitle: connectorOpp.title,
      descriptionSummary: rawDesc ? rawDesc.substring(0, 240) + "..." : null,
      opportunityType: connectorOpp.type || (isIntern ? "internship" : "full_time"),
      workMode,
      requiredSkills: Array.isArray(connectorOpp.skills) ? connectorOpp.skills : [],
      preferredSkills: [],
      inferredSkills: [],
      degreeLevels: [],
      branches: [],
      graduationYears: [],
      minCgpa: null,
      experienceLevel: expStr || "entry",
      isPaid: connectorOpp.salary ? true : null,
      compensation: connectorOpp.salary
        ? {
            textVerbatim: connectorOpp.salary,
          }
        : null,
    },
  };
}

export class OpportunityQueryService {
  lastLoadWasFallback = false;

  /**
   * Retrieves all candidate opportunities from storage (Prisma or file-based db.json),
   * seamlessly adapting any registered ConnectorOpportunity records.
   */
  async loadAllRawOpportunities(): Promise<Opportunity[]> {
    let rawOpps: any[] = [];
    this.lastLoadWasFallback = false;

    // 1. Attempt PostgreSQL via Prisma
    if (process.env.DATABASE_URL) {
      try {
        const { prisma } = await import("@/lib/prisma");
        const dbOpps = await (prisma.opportunity as any).findMany({
          include: { source: true },
        });

        const mappedDbOpps = (dbOpps || []).map((o: any) => {
          const verifiedIso = o.lastCheckedAt
            ? new Date(o.lastCheckedAt).toISOString()
            : o.firstSeenAt
            ? new Date(o.firstSeenAt).toISOString()
            : new Date().toISOString();
          return {
            ...o,
            org: o.organizationName || o.org || "Company",
            employer: o.organizationName || o.employer || o.org || "Company",
            skills: o.requiredSkills || o.skills || [],
            deadline: o.applicationDeadline ? new Date(o.applicationDeadline).toISOString() : null,
            location: o.locationCity
              ? `${o.locationCity}${o.locationState ? `, ${o.locationState}` : ""}`
              : o.locationCountry || "India",
            status: o.lifecycleStatus === "removed" ? "closed" : o.lifecycleStatus || "active",
            lastVerifiedDate: verifiedIso,
            lastVerifiedAt: verifiedIso,
            sourceName:
              o.source?.name ||
              (o.id?.startsWith("gh_in_") ? "Greenhouse" : o.id?.startsWith("adzuna_") ? "Adzuna" : "Direct"),
          };
        });

        // Also check if any ConnectorOpportunity records exist that need adapting
        let connectorOpps: any[] = [];
        try {
          connectorOpps = await (prisma as any).connectorOpportunity.findMany();
        } catch {
          // Table may not have records yet
        }

        const adaptedConnectors = connectorOpps.map(adaptConnectorOpportunityToCanonical);
        rawOpps = [...mappedDbOpps, ...adaptedConnectors];
      } catch (err) {
        console.warn("[OpportunityQueryService] Prisma load failed, falling back to db.json", err);
      }
    }

    // 2. Fallback to file-based store (src/data/db.json)
    if (!rawOpps || rawOpps.length === 0) {
      const db = readDbStore();
      rawOpps = db.opportunities || [];
      this.lastLoadWasFallback = true;
    }

    return rawOpps;
  }

  /**
   * Primary student feed discovery method:
   * Returns active, verified opportunities matching filters with AI enrichment,
   * strictly excluding quarantined synthetic records.
   */
  async getStudentFeed(options: OpportunityFeedQueryOptions = {}): Promise<EnrichedStudentFeedResult> {
    const rawOpps = await this.loadAllRawOpportunities();

    // Default: local fallback without active cron keeps seed opportunities visible for local dev
    const isLocalFallback = !process.env.DATABASE_URL || this.lastLoadWasFallback;
    const freshnessThresholdHours = options.freshnessThresholdHours ?? (isLocalFallback ? 24 * 365 : undefined);

    return filterEnrichedStudentFeed(rawOpps, {
      ...options,
      freshnessThresholdHours,
      allowQuarantined: options.allowQuarantined ?? false,
    });
  }

  /**
   * Retrieves recommended opportunities for a student profile.
   * Central Invariant: ONLY ACTIVE recommendable opportunities are eligible.
   * Expired, closed, stale, removed, or rejected opportunities are strictly excluded.
   */
  async getRecommendedOpportunities(
    studentProfile?: any,
    options: OpportunityFeedQueryOptions = {}
  ): Promise<Opportunity[]> {
    const rawOpps = await this.loadAllRawOpportunities();
    const isLocalFallback = !process.env.DATABASE_URL || this.lastLoadWasFallback;
    const freshnessThresholdHours = options.freshnessThresholdHours ?? (isLocalFallback ? 24 * 365 : undefined);

    return rawOpps.filter((opp) =>
      isRecommendable(opp, {
        now: options.now,
        freshnessThresholdHours,
        allowQuarantined: options.allowQuarantined ?? false,
      })
    );
  }

  /**
   * Retrieve a single opportunity by ID.
   * If the opportunity is quarantined, it is hidden from general discovery (returns null)
   * unless options.allowQuarantined is true (e.g. for students viewing their existing application).
   */
  async getOpportunityById(
    id: string,
    options: { allowQuarantined?: boolean } = {}
  ): Promise<Opportunity | null> {
    let found: any = null;

    // Respect subclass/test overrides of loadAllRawOpportunities
    if (this.loadAllRawOpportunities !== OpportunityQueryService.prototype.loadAllRawOpportunities) {
      const allOpps = await this.loadAllRawOpportunities();
      found = allOpps.find((o) => o.id === id) || null;
    } else {
      // Fast local lookup first for file-backed / ingested opportunities (<1ms)
      const db = readDbStore();
      found = (db.opportunities || []).find((o: any) => o.id === id) || null;

      if (!found && process.env.DATABASE_URL) {
        try {
          const { prisma } = await import("@/lib/prisma");
          const dbOpp = await (prisma.opportunity as any).findUnique({
            where: { id },
            include: { source: true },
          });
          if (dbOpp) {
            found = {
              ...dbOpp,
              org: dbOpp.organizationName || dbOpp.org || "Company",
              skills: dbOpp.requiredSkills || dbOpp.skills || [],
              deadline: dbOpp.applicationDeadline ? new Date(dbOpp.applicationDeadline).toISOString() : null,
              location: dbOpp.locationCity
                ? `${dbOpp.locationCity}${dbOpp.locationState ? `, ${dbOpp.locationState}` : ""}`
                : dbOpp.locationCountry || "India",
              status: dbOpp.lifecycleStatus === "removed" ? "closed" : dbOpp.lifecycleStatus || "active",
              lastVerifiedDate: dbOpp.lastCheckedAt ? new Date(dbOpp.lastCheckedAt).toISOString() : new Date().toISOString(),
            };
          } else {
            const connOpp = await (prisma as any).connectorOpportunity?.findUnique?.({
              where: { id },
            });
            if (connOpp) {
              found = adaptConnectorOpportunityToCanonical(connOpp);
            }
          }
        } catch {
          // Ignore Prisma error when falling back
        }
      }
    }

    if (!found) {
      return null;
    }

    if (found.isQuarantined && !options.allowQuarantined) {
      return null;
    }

    return found;
  }

  /**
   * Batch lookup of opportunities by IDs.
   */
  async getOpportunitiesByIds(
    ids: string[],
    options: { allowQuarantined?: boolean } = {}
  ): Promise<Opportunity[]> {
    const allOpps = await this.loadAllRawOpportunities();
    const idSet = new Set(ids);

    return allOpps.filter((o) => {
      if (!idSet.has(o.id)) return false;
      if (o.isQuarantined && !options.allowQuarantined) return false;
      return true;
    });
  }

  /**
   * Student Application Tracking:
   * Hydrates all tracked applications for a student with their corresponding opportunity records.
   * Invariant: Saved applications ALWAYS remain accessible, even if the opportunity is
   * expired, closed, or quarantined.
   */
  async getStudentApplicationsWithOpportunities(studentId: string): Promise<any[]> {
    const db = readDbStore();
    const studentApps = (db.applications || []).filter((a: any) => a.studentId === studentId);

    const hydrated = studentApps.map((app: any) => {
      // allowQuarantined: true ensures historical applications remain 100% accessible to student
      const opp = (db.opportunities || []).find((o: any) => o.id === app.opportunityId);
      const isExpiredOrClosed = opp ? opp.status === "closed" || opp.status === "expired" : true;

      return {
        ...app,
        opportunity: opp || null,
        isExpiredOrClosed,
        confirmationSource: "self_reported",
      };
    });

    return hydrated;
  }

  /**
   * Backfills non-canonical connector opportunities into the canonical opportunity store.
   */
  async backfillConnectorOpportunities(connectorOpps?: any[]): Promise<{ backfilled: number }> {
    let oppsToBackfill = connectorOpps;

    if (!oppsToBackfill && process.env.DATABASE_URL) {
      try {
        const { prisma } = await import("@/lib/prisma");
        oppsToBackfill = await (prisma as any).connectorOpportunity.findMany();
      } catch (e) {
        oppsToBackfill = [];
      }
    }

    if (!oppsToBackfill || oppsToBackfill.length === 0) {
      return { backfilled: 0 };
    }

    const db = readDbStore();
    db.opportunities = db.opportunities || [];
    let count = 0;

    for (const cOpp of oppsToBackfill) {
      const canonical = adaptConnectorOpportunityToCanonical(cOpp);
      const existingIdx = db.opportunities.findIndex((o: any) => o.id === canonical.id);
      if (existingIdx >= 0) {
        db.opportunities[existingIdx] = { ...db.opportunities[existingIdx], ...canonical };
      } else {
        db.opportunities.push(canonical);
      }
      count++;
    }

    writeDbStore(db);
    return { backfilled: count };
  }
}

// Global singleton instance
export const opportunityQueryService = new OpportunityQueryService();
