// src/lib/services/connectors/providers/ashbyConnector.ts
import { BaseConnector } from "../framework/baseConnector.ts";
import type {
  ConnectorConfig,
  HealthCheckResult,
  FetchResult,
  IngestionContext,
} from "../framework/types.ts";
import type { ConnectorOpportunity } from "../types.ts";
import { getTargetBoards } from "../config/targetBoards.ts";
import { decodeHtmlEntities, normalizeDescription } from "../../enrichment/normalizer.ts";
import { normalizeOpportunityType } from "../opportunityModel.ts";
import { extractSkills, extractExperienceLevel, extractSalary } from "./skillExtractor.ts";

export interface AshbyRawJob {
  id: string;
  title: string;
  location?: string;
  secondaryLocations?: Array<{ location?: string }>;
  department?: string;
  team?: string;
  isListed?: boolean;
  isRemote?: boolean;
  workplaceType?: string;
  publishedAt?: string;
  employmentType?: string; // "FullTime" | "Internship" | "PartTime" | "Contract"
  jobUrl?: string;
  applyUrl?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  compensation?: {
    compensationTierSummary?: string | null;
    compensationTiers?: Array<{
      title?: string;
      components?: Array<{
        minValue?: number;
        maxValue?: number;
        currencyCode?: string;
        interval?: string;
      }>;
    }>;
  };
  companyName: string;
  boardToken: string;
}

export interface AshbyParsedJob {
  id: string;
  title: string;
  organization: string;
  description: string;
  location: string;
  isRemote: boolean;
  type: string;
  experienceLevel: string;
  skills: string[];
  salary?: string | null;
  applicationUrl: string;
  postedDate?: string | null;
}

export class AshbyConnector extends BaseConnector<AshbyRawJob, AshbyParsedJob> {
  public readonly sourceId = "ashby";
  public readonly sourceName = "Ashby Public Job Board Posting API";

  constructor(config?: ConnectorConfig) {
    super({
      ...config,
      allowedDomains: [
        "api.ashbyhq.com",
        "jobs.ashbyhq.com",
      ],
    });
  }

  public async healthcheck(): Promise<HealthCheckResult> {
    const start = performance.now();
    try {
      const boards = getTargetBoards(this.sourceId);
      const testBoard = boards[0]?.boardToken || "notion";
      const url = `https://api.ashbyhq.com/posting-api/job-board/${testBoard}`;

      const res = await this.fetchWithRetry(url, { method: "HEAD" });
      const latencyMs = performance.now() - start;

      return {
        healthy: res.ok,
        status: res.ok ? "healthy" : "degraded",
        latencyMs,
        message: res.ok
          ? `Ashby API responsive (HTTP ${res.status})`
          : `Ashby returned status: ${res.status}`,
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        healthy: false,
        status: "down",
        latencyMs: performance.now() - start,
        message: `Ashby healthcheck error: ${err.message}`,
        lastCheckedAt: new Date().toISOString(),
      };
    }
  }

  public async fetch(context: IngestionContext): Promise<FetchResult<AshbyRawJob>> {
    const boards = getTargetBoards(this.sourceId);
    const rawJobs: AshbyRawJob[] = [];

    for (const board of boards) {
      if (context.abortSignal?.aborted) break;

      try {
        const boardUrl = `https://api.ashbyhq.com/posting-api/job-board/${board.boardToken}?includeCompensation=true`;
        const res = await this.fetchWithRetry(boardUrl, undefined, context.abortSignal);
        if (!res.ok) continue;

        const data = await res.json();
        const jobs: any[] = data.jobs || [];

        const limit = board.maxJobs ?? 5;
        const selected = jobs.filter((j) => j.isListed !== false).slice(0, limit);

        for (const item of selected) {
          rawJobs.push({
            ...item,
            companyName: board.companyName,
            boardToken: board.boardToken,
          });
        }
      } catch {
        // Individual board failures do not crash the pass
      }
    }

    return {
      rawItems: rawJobs,
      rawPayloads: [],
    };
  }

  public parse(rawItem: AshbyRawJob): AshbyParsedJob {
    let description = rawItem.descriptionPlain?.trim() || "";
    if (!description && rawItem.descriptionHtml) {
      description = normalizeDescription(decodeHtmlEntities(rawItem.descriptionHtml));
    }
    if (!description) {
      description = `${rawItem.title} at ${rawItem.companyName}.`;
    }

    const locationStr = rawItem.location?.replace(/•/g, ",").trim() || "Remote";
    const workplace = rawItem.workplaceType?.toLowerCase();
    const isRemote =
      rawItem.isRemote === true ||
      workplace === "remote" ||
      /remote/i.test(`${locationStr} ${description}`);

    const skills = extractSkills(`${rawItem.title} ${description}`);
    if (skills.length === 0) {
      skills.push("TypeScript", "Python", "SQL");
    }

    const expLevel = extractExperienceLevel(rawItem.title, description);

    // Format compensation
    let salary: string | null = null;
    if (rawItem.compensation?.compensationTierSummary) {
      salary = rawItem.compensation.compensationTierSummary;
    } else if (rawItem.compensation?.compensationTiers?.[0]?.components?.[0]) {
      const comp = rawItem.compensation.compensationTiers[0].components[0];
      const curr = comp.currencyCode === "USD" ? "$" : `${comp.currencyCode} `;
      salary = `${curr}${comp.minValue?.toLocaleString()} - ${curr}${comp.maxValue?.toLocaleString()} / ${comp.interval}`;
    } else {
      salary = extractSalary(description);
    }

    const oppTypeStr =
      rawItem.employmentType?.toLowerCase().includes("intern") ||
      rawItem.title.toLowerCase().includes("intern")
        ? "internship"
        : rawItem.employmentType || "job";

    return {
      id: rawItem.id,
      title: rawItem.title.trim(),
      organization: rawItem.companyName,
      description,
      location: locationStr,
      isRemote,
      type: oppTypeStr,
      experienceLevel: expLevel,
      skills,
      salary,
      applicationUrl: rawItem.applyUrl || rawItem.jobUrl || "https://ashbyhq.com",
      postedDate: rawItem.publishedAt || null,
    };
  }

  public to_normalized(
    parsedItem: AshbyParsedJob,
    rawPayloadRef?: string | null
  ): ConnectorOpportunity | null {
    const oppType = normalizeOpportunityType(parsedItem.type);

    return {
      id: `opp_ashby_${parsedItem.id}`,
      title: parsedItem.title,
      organization: parsedItem.organization,
      description: parsedItem.description,
      type: oppType,
      experienceLevel: parsedItem.experienceLevel,
      location: parsedItem.location,
      isRemote: parsedItem.isRemote,
      salary: parsedItem.salary || null,
      skills: parsedItem.skills,
      postedDate: parsedItem.postedDate || new Date().toISOString(),
      deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
      originalUrl: parsedItem.applicationUrl,
      sourceId: this.sourceId,
      sourceExternalId: parsedItem.id,
      fetchedAt: new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString(),
      verificationStatus: "verified",
      rawPayloadRef: rawPayloadRef || null,
    };
  }
}
