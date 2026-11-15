// src/lib/services/connectors/providers/greenhouseConnector.ts
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

export interface GreenhouseRawJob {
  id: number | string;
  title: string;
  absolute_url: string;
  updated_at?: string;
  content?: string;
  location?: { name?: string };
  companyName: string;
  boardToken: string;
}

export interface GreenhouseParsedJob {
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

export class GreenhouseConnector extends BaseConnector<GreenhouseRawJob, GreenhouseParsedJob> {
  public readonly sourceId = "greenhouse";
  public readonly sourceName = "Greenhouse Public Job Board API";

  constructor(config?: ConnectorConfig) {
    super({
      ...config,
      allowedDomains: [
        "boards-api.greenhouse.io",
        "boards.greenhouse.io",
        "job-boards.greenhouse.io",
      ],
    });
  }

  public async healthcheck(): Promise<HealthCheckResult> {
    const start = performance.now();
    try {
      const boards = getTargetBoards(this.sourceId);
      const testBoard = boards[0]?.boardToken || "cloudflare";
      const url = `https://boards-api.greenhouse.io/v1/boards/${testBoard}/jobs`;

      const res = await this.fetchWithRetry(url, { method: "HEAD" });
      const latencyMs = performance.now() - start;

      return {
        healthy: res.ok,
        status: res.ok ? "healthy" : "degraded",
        latencyMs,
        message: res.ok
          ? `Greenhouse API responsive (HTTP ${res.status})`
          : `Greenhouse returned unexpected status: ${res.status}`,
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        healthy: false,
        status: "down",
        latencyMs: performance.now() - start,
        message: `Greenhouse healthcheck error: ${err.message}`,
        lastCheckedAt: new Date().toISOString(),
      };
    }
  }

  public async fetch(context: IngestionContext): Promise<FetchResult<GreenhouseRawJob>> {
    const boards = getTargetBoards(this.sourceId);
    const rawJobs: GreenhouseRawJob[] = [];

    for (const board of boards) {
      if (context.abortSignal?.aborted) break;

      try {
        const boardUrl = `https://boards-api.greenhouse.io/v1/boards/${board.boardToken}/jobs`;
        const res = await this.fetchWithRetry(boardUrl, undefined, context.abortSignal);
        if (!res.ok) continue;

        const data = await res.json();
        const jobs = data.jobs || [];

        // Select up to maxJobs
        const limit = board.maxJobs ?? 5;
        const selected = jobs.slice(0, limit);

        // Fetch detail with full content
        for (const j of selected) {
          if (context.abortSignal?.aborted) break;
          try {
            const detailUrl = `https://boards-api.greenhouse.io/v1/boards/${board.boardToken}/jobs/${j.id}`;
            const dRes = await this.fetchWithRetry(detailUrl, undefined, context.abortSignal);
            if (dRes.ok) {
              const dData = await dRes.json();
              rawJobs.push({
                ...dData,
                companyName: board.companyName,
                boardToken: board.boardToken,
              });
            } else {
              rawJobs.push({
                ...j,
                companyName: board.companyName,
                boardToken: board.boardToken,
              });
            }
          } catch {
            rawJobs.push({
              ...j,
              companyName: board.companyName,
              boardToken: board.boardToken,
            });
          }
        }
      } catch {
        // Individual board failures do not crash the entire ingestion pass
      }
    }

    return {
      rawItems: rawJobs,
      rawPayloads: [],
    };
  }

  public parse(rawItem: GreenhouseRawJob): GreenhouseParsedJob {
    const rawContent = rawItem.content ? decodeHtmlEntities(rawItem.content) : "";
    const description = normalizeDescription(rawContent) || `${rawItem.title} at ${rawItem.companyName}.`;

    const locationStr = rawItem.location?.name?.replace(/•/g, ",").trim() || "Remote";
    const isRemote = /remote/i.test(`${locationStr} ${description}`);

    const skills = extractSkills(`${rawItem.title} ${description}`);
    if (skills.length === 0) {
      skills.push("TypeScript", "Python", "SQL");
    }

    const expLevel = extractExperienceLevel(rawItem.title, description);
    const salary = extractSalary(description);

    return {
      id: rawItem.id.toString(),
      title: rawItem.title.trim(),
      organization: rawItem.companyName,
      description,
      location: locationStr,
      isRemote,
      type: rawItem.title,
      experienceLevel: expLevel,
      skills,
      salary,
      applicationUrl: rawItem.absolute_url,
      postedDate: rawItem.updated_at || null,
    };
  }

  public to_normalized(
    parsedItem: GreenhouseParsedJob,
    rawPayloadRef?: string | null
  ): ConnectorOpportunity | null {
    const oppType = normalizeOpportunityType(parsedItem.type);

    return {
      id: `opp_gh_${parsedItem.id}`,
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
