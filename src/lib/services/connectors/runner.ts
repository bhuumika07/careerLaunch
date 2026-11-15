// src/lib/services/connectors/runner.ts
import type { PrismaClient } from "@prisma/client";
import type { IConnector, ConnectorExecutionResult } from "./framework/types.ts";
import { GreenhouseConnector } from "./providers/greenhouseConnector.ts";
import { LeverConnector } from "./providers/leverConnector.ts";
import { AshbyConnector } from "./providers/ashbyConnector.ts";
import { startIngestionRun, completeIngestionRun } from "./ingestionRunLog.ts";
import { saveConnectorOpportunity } from "./opportunityModel.ts";
import { getSourceById } from "./sourceRegistry.ts";

export interface OrchestratedIngestionResult {
  runId: string;
  startedAt: string;
  completedAt: string;
  sourceResults: Record<string, ConnectorExecutionResult>;
  totalFetched: number;
  totalNormalized: number;
  totalRejected: number;
  totalSaved: number;
  allOpportunities: any[];
  errors: string[];
}

/**
 * Connector Runner & Ingestion Orchestrator
 *
 * Runs authorized connectors, records audit execution logs, and persists normalized
 * opportunities with complete raw payload isolation.
 */
export class ConnectorRunner {
  private prisma?: PrismaClient;
  private connectors: Map<string, IConnector>;

  constructor(prisma?: PrismaClient, customConnectors?: IConnector[]) {
    this.prisma = prisma;
    this.connectors = new Map();

    if (customConnectors && customConnectors.length > 0) {
      for (const c of customConnectors) {
        this.connectors.set(c.sourceId, c);
      }
    } else {
      // Default approved Tier 1 ATS connectors from Chunk 1
      const gh = new GreenhouseConnector();
      const lever = new LeverConnector();
      const ashby = new AshbyConnector();

      this.connectors.set(gh.sourceId, gh);
      this.connectors.set(lever.sourceId, lever);
      this.connectors.set(ashby.sourceId, ashby);
    }
  }

  /**
   * Registers a connector with the runner.
   */
  public registerConnector(connector: IConnector): void {
    this.connectors.set(connector.sourceId, connector);
  }

  /**
   * Runs ingestion for a specific connector.
   */
  public async runSource(
    sourceId: string,
    abortSignal?: AbortSignal
  ): Promise<ConnectorExecutionResult> {
    // Check registry status first
    const sourceRecord = await getSourceById(sourceId, this.prisma);
    if (sourceRecord && sourceRecord.status !== "active") {
      return {
        sourceId,
        runId: `run_skipped_${Date.now()}`,
        success: true,
        fetchedCount: 0,
        normalizedCount: 0,
        rejectedCount: 0,
        opportunities: [],
        errors: [`Source "${sourceId}" has status "${sourceRecord.status}". Ingestion skipped.`],
        circuitState: "CLOSED",
        durationMs: 0,
      };
    }

    const connector = this.connectors.get(sourceId);
    if (!connector) {
      throw new Error(`No connector registered for source "${sourceId}".`);
    }

    // Start execution run log
    const log = await startIngestionRun(sourceId, this.prisma);

    try {
      const execResult = await connector.execute({
        runId: log.id,
        sourceId,
        abortSignal,
      });

      let savedCount = 0;
      for (const opp of execResult.opportunities) {
        try {
          await saveConnectorOpportunity(opp, this.prisma);
          savedCount++;
        } catch (saveErr: any) {
          execResult.errors.push(`Failed to save opportunity ${opp.id}: ${saveErr.message}`);
        }
      }

      // Finalize run log
      await completeIngestionRun(
        log.id,
        {
          status: execResult.success ? "completed" : "failed",
          counts: {
            fetchedCount: execResult.fetchedCount,
            newCount: savedCount,
            updatedCount: 0,
            rejectedCount: execResult.rejectedCount,
          },
          errors: execResult.errors,
        },
        this.prisma
      );

      return execResult;
    } catch (err: any) {
      await completeIngestionRun(
        log.id,
        {
          status: "failed",
          counts: {
            fetchedCount: 0,
            rejectedCount: 0,
          },
          errors: [err.message],
        },
        this.prisma
      );

      throw err;
    }
  }

  /**
   * Runs ingestion across all approved active connectors in parallel with fault isolation.
   */
  public async runAll(abortSignal?: AbortSignal): Promise<OrchestratedIngestionResult> {
    const runId = `orchestrated_${Date.now()}`;
    const startedAt = new Date().toISOString();
    const sourceResults: Record<string, ConnectorExecutionResult> = {};
    const allOpportunities: any[] = [];
    const errors: string[] = [];

    let totalFetched = 0;
    let totalNormalized = 0;
    let totalRejected = 0;
    let totalSaved = 0;

    const sourceIds = Array.from(this.connectors.keys());

    await Promise.all(
      sourceIds.map(async (sourceId) => {
        try {
          const res = await this.runSource(sourceId, abortSignal);
          sourceResults[sourceId] = res;
          totalFetched += res.fetchedCount;
          totalNormalized += res.normalizedCount;
          totalRejected += res.rejectedCount;
          totalSaved += res.opportunities.length;
          allOpportunities.push(...res.opportunities);
          if (res.errors.length > 0) {
            errors.push(...res.errors.map((e) => `[${sourceId}] ${e}`));
          }
        } catch (err: any) {
          errors.push(`[${sourceId}] Uncaught failure: ${err.message}`);
        }
      })
    );

    const completedAt = new Date().toISOString();

    return {
      runId,
      startedAt,
      completedAt,
      sourceResults,
      totalFetched,
      totalNormalized,
      totalRejected,
      totalSaved,
      allOpportunities,
      errors,
    };
  }
}
