// src/lib/services/connectors/providers/leverConnector.ts
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

export interface LeverRawJob {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl: string;
  createdAt?: number;
  descriptionPlain?: string;
  description?: string;
  additionalPlain?: string;
  additional?: string;
  workplaceType?: string; // "remote" | "hybrid" | "onsite"
  categories?: {
    commitment?: string;  // "Full-time", "Intern", "Permanent"
    department?: string;
    location?: string;
    team?: string;
  };
  companyName: string;
  boardToken: string;
}

export interface LeverParsedJob {
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

export class LeverConnector extends BaseConnector<LeverRawJob, LeverParsedJob> {
  public readonly sourceId = "lever";
  public readonly sourceName = "Lever Public Postings API";

  constructor(config?: ConnectorConfig) {
    super({
      ...config,
      allowedDomains: [
        "api.lever.co",
        "api.eu.lever.co",
        "jobs.lever.co",
      ],
    });
  }

  public async healthcheck(): Promise<HealthCheckResult> {
    const start = performance.now();
    try {
      const boards = getTargetBoards(this.sourceId);
      const testBoard = boards[0]?.boardToken || "spotify";
      const url = `https://api.lever.co/v0/postings/${testBoard}?mode=json&limit=1`;

      const res = await this.fetchWithRetry(url, { method: "HEAD" });
      const latencyMs = performance.now() - start;

      return {
        healthy: res.ok,
        status: res.ok ? "healthy" : "degraded",
        latencyMs,
        message: res.ok
          ? `Lever API responsive (HTTP ${res.status})`
          : `Lever returned status: ${res.status}`,
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        healthy: false,
        status: "down",
        latencyMs: performance.now() - start,
        message: `Lever healthcheck error: ${err.message}`,
        lastCheckedAt: new Date().toISOString(),
      };
    }
  }

  public async fetch(context: IngestionContext): Promise<FetchResult<LeverRawJob>> {
    const boards = getTargetBoards(this.sourceId);
    const rawJobs: LeverRawJob[] = [];

    for (const board of boards) {
      if (context.abortSignal?.aborted) break;

      try {
        const limit = board.maxJobs ?? 5;
        const boardUrl = `https://api.lever.co/v0/postings/${board.boardToken}?mode=json&limit=${limit}`;
        const res = await this.fetchWithRetry(boardUrl, undefined, context.abortSignal);
        if (!res.ok) continue;

        const data: any[] = await res.json();
        if (!Array.isArray(data)) continue;

        for (const item of data) {
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

  public parse(rawItem: LeverRawJob): LeverParsedJob {
    let description = rawItem.descriptionPlain?.trim() || "";
    if (!description && rawItem.description) {
      description = normalizeDescription(decodeHtmlEntities(rawItem.description));
    }
    if (!description) {
      description = `${rawItem.text} at ${rawItem.companyName}.`;
    }

    const locationStr = rawItem.categories?.location?.trim() || "Remote";
    const workplace = rawItem.workplaceType?.toLowerCase();
    const isRemote = workplace === "remote" || /remote/i.test(`${locationStr} ${description}`);

    const rawCommitment = rawItem.categories?.commitment || rawItem.text;
    const oppTypeStr = /intern/i.test(rawCommitment) ? "internship" : rawCommitment;

    const skills = extractSkills(`${rawItem.text} ${description}`);
    if (skills.length === 0) {
      skills.push("TypeScript", "React", "Node.js");
    }

    const expLevel = extractExperienceLevel(rawItem.text, description);

    // Check salary from additional plain text or description
    const salary =
      extractSalary(rawItem.additionalPlain || "") ||
      extractSalary(description);

    const postedDate = rawItem.createdAt
      ? new Date(rawItem.createdAt).toISOString()
      : null;

    return {
      id: rawItem.id,
      title: rawItem.text.trim(),
      organization: rawItem.companyName,
      description,
      location: locationStr,
      isRemote,
      type: oppTypeStr,
      experienceLevel: expLevel,
      skills,
      salary,
      applicationUrl: rawItem.applyUrl || rawItem.hostedUrl,
      postedDate,
    };
  }

  public to_normalized(
    parsedItem: LeverParsedJob,
    rawPayloadRef?: string | null
  ): ConnectorOpportunity | null {
    const oppType = normalizeOpportunityType(parsedItem.type);

    return {
      id: `opp_lever_${parsedItem.id}`,
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
