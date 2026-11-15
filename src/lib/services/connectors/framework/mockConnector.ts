// src/lib/services/connectors/framework/mockConnector.ts
import { BaseConnector } from "./baseConnector.ts";
import type {
  ConnectorConfig,
  HealthCheckResult,
  FetchResult,
  IngestionContext,
} from "./types.ts";
import type { ConnectorOpportunity } from "../types.ts";

export interface MockRawJob {
  id: string;
  jobTitle: string;
  company: string;
  desc: string;
  isRemote?: boolean;
  employmentType?: string;
  experience?: string;
  location?: string;
  skillsList?: string[];
  url: string;
  salaryText?: string;
}

export interface MockParsedJob {
  id: string;
  title: string;
  organization: string;
  description: string;
  isRemote: boolean;
  type: string;
  experienceLevel: string;
  location: string;
  skills: string[];
  applyUrl: string;
  salary?: string;
}

/**
 * Deterministic Mock Connector for Testing the Framework
 */
export class MockConnector extends BaseConnector<MockRawJob, MockParsedJob> {
  public readonly sourceId: string;
  public readonly sourceName: string;

  private mockItems: MockRawJob[] = [];
  private failUntilAttempt: number = 0;
  private currentAttempts: number = 0;
  private delayMs: number = 0;
  private shouldFailHealthcheck: boolean = false;

  constructor(sourceId: string = "mock_source", config?: ConnectorConfig) {
    super(config);
    this.sourceId = sourceId;
    this.sourceName = `Mock Source (${sourceId})`;
  }

  public setMockItems(items: MockRawJob[]): void {
    this.mockItems = [...items];
  }

  public simulateTransientFailures(failuresBeforeSuccess: number): void {
    this.failUntilAttempt = failuresBeforeSuccess;
    this.currentAttempts = 0;
  }

  public setDelayMs(ms: number): void {
    this.delayMs = ms;
  }

  public setHealthcheckStatus(shouldFail: boolean): void {
    this.shouldFailHealthcheck = shouldFail;
  }

  public async healthcheck(): Promise<HealthCheckResult> {
    const start = performance.now();
    if (this.shouldFailHealthcheck) {
      return {
        healthy: false,
        status: "down",
        latencyMs: performance.now() - start,
        message: "Simulated healthcheck failure: Upstream unavailable",
        lastCheckedAt: new Date().toISOString(),
      };
    }
    return {
      healthy: true,
      status: "healthy",
      latencyMs: performance.now() - start,
      message: "Mock upstream service OK",
      lastCheckedAt: new Date().toISOString(),
    };
  }

  public async fetch(context: IngestionContext): Promise<FetchResult<MockRawJob>> {
    this.currentAttempts++;

    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }

    if (this.currentAttempts <= this.failUntilAttempt) {
      throw new Error(`Mock upstream 503 error (attempt ${this.currentAttempts} of ${this.failUntilAttempt})`);
    }

    return {
      rawItems: this.mockItems,
      rawPayloads: [],
    };
  }

  public parse(rawItem: MockRawJob): MockParsedJob {
    return {
      id: rawItem.id,
      title: rawItem.jobTitle,
      organization: rawItem.company,
      description: rawItem.desc,
      isRemote: rawItem.isRemote ?? false,
      type: rawItem.employmentType || "job",
      experienceLevel: rawItem.experience || "entry",
      location: rawItem.location || "Remote",
      skills: rawItem.skillsList || [],
      applyUrl: rawItem.url,
      salary: rawItem.salaryText,
    };
  }

  public to_normalized(
    parsedItem: MockParsedJob,
    rawPayloadRef?: string | null
  ): ConnectorOpportunity | null {
    const oppType = parsedItem.type === "internship" ? "internship" : "job";

    return {
      id: `opp_${this.sourceId}_${parsedItem.id}`,
      title: parsedItem.title,
      organization: parsedItem.organization,
      description: parsedItem.description,
      type: oppType,
      experienceLevel: parsedItem.experienceLevel,
      location: parsedItem.location,
      isRemote: parsedItem.isRemote,
      salary: parsedItem.salary || null,
      skills: parsedItem.skills,
      postedDate: new Date().toISOString(),
      deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
      originalUrl: parsedItem.applyUrl,
      sourceId: this.sourceId,
      sourceExternalId: parsedItem.id,
      fetchedAt: new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString(),
      verificationStatus: "verified",
      rawPayloadRef: rawPayloadRef || null,
    };
  }
}
