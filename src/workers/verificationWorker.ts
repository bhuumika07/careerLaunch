// src/workers/verificationWorker.ts
import { Worker, type Job } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { getRedisConnectionOptions } from "../lib/queue/redis.ts";
import {
  VERIFICATION_QUEUE_NAME,
  type VerifyOpportunityJobData,
} from "../lib/queue/verificationQueue.ts";
import { ConnectorManager } from "../lib/services/verification/connectorManager.ts";
import { OpportunityLifecycleManager } from "../lib/services/verification/lifecycleManager.ts";
import { SourceRateLimiter } from "../lib/services/verification/reliability.ts";
import { SourceHealthManager } from "../lib/services/verification/sourceHealthManager.ts";
import type { SourceConfig, SourceListingInfo } from "../lib/services/verification/types.ts";

export interface VerificationJobResult {
  opportunityId: string;
  processedCount: number;
  skippedCount: number;
  results: Array<{
    opportunitySourceId: string;
    sourceId: string;
    sourceName: string;
    status: "verified" | "skipped" | "failed";
    outcome?: string;
    newOpportunityStatus?: string;
    skipReason?: string;
    error?: string;
  }>;
}

export interface WorkerDependencies {
  prisma: PrismaClient;
  connectorManager: ConnectorManager;
  lifecycleManager: OpportunityLifecycleManager;
  sourceRateLimiter?: SourceRateLimiter;
  sourceHealthManager?: SourceHealthManager;
}

const globalRateLimiter = new SourceRateLimiter();

/**
 * Pure worker processor function.
 * Receives the job and processes all attached source listings independently.
 */
export async function processVerifyOpportunityJob(
  job: Job<VerifyOpportunityJobData> | { data: VerifyOpportunityJobData },
  deps: WorkerDependencies
): Promise<VerificationJobResult> {
  const { opportunityId } = job.data;
  const { prisma, connectorManager, lifecycleManager } = deps;
  const rateLimiter = deps.sourceRateLimiter || globalRateLimiter;
  const healthManager =
    deps.sourceHealthManager || new SourceHealthManager(prisma);

  // 1. Load canonical opportunity with all source listings
  const opportunity = await (prisma.opportunity as any).findUnique({
    where: { id: opportunityId },
    include: {
      opportunitySources: {
        include: {
          source: true,
        },
      },
      source: true,
    },
  });

  if (!opportunity) {
    return {
      opportunityId,
      processedCount: 0,
      skippedCount: 0,
      results: [
        {
          opportunitySourceId: "",
          sourceId: "",
          sourceName: "",
          status: "failed",
          error: `Opportunity "${opportunityId}" not found in database`,
        },
      ],
    };
  }

  let listingsToProcess: Array<{ oppSource: any; source: any }> = [];
  if (
    opportunity.opportunitySources &&
    opportunity.opportunitySources.length > 0
  ) {
    listingsToProcess = opportunity.opportunitySources.map((os: any) => ({
      oppSource: os,
      source: os.source,
    }));
  } else if (opportunity.source) {
    listingsToProcess = [
      {
        oppSource: {
          id: opportunity.id,
          opportunityId: opportunity.id,
          sourceId: opportunity.source.id,
          sourceUrl: opportunity.sourceUrl,
          applicationUrl: opportunity.applicationUrl,
          externalId: null,
        },
        source: opportunity.source,
      },
    ];
  }

  const jobResult: VerificationJobResult = {
    opportunityId,
    processedCount: 0,
    skippedCount: 0,
    results: [],
  };

  // 2. Iterate through each source listing independently
  for (const { oppSource, source } of listingsToProcess) {
    if (!source) {
      jobResult.skippedCount++;
      jobResult.results.push({
        opportunitySourceId: oppSource.id,
        sourceId: oppSource.sourceId,
        sourceName: "unknown",
        status: "skipped",
        skipReason: "Source record is missing or deleted",
      });
      continue;
    }

    const sourceConfig: SourceConfig = {
      id: source.id,
      name: source.name,
      baseUrl: source.baseUrl,
      config: source.config as any,
      verificationRateLimit: source.verificationRateLimit,
      verificationTimeoutSec: source.verificationTimeoutSec,
    };

    // 3. Check compliance and eligibility
    const eligibility = connectorManager.validateSourceEligibility(sourceConfig);
    if (!eligibility.isEligible) {
      jobResult.skippedCount++;
      jobResult.results.push({
        opportunitySourceId: oppSource.id,
        sourceId: source.id,
        sourceName: source.name,
        status: "skipped",
        skipReason: eligibility.reason,
      });
      continue;
    }

    // 4. Enforce Source Rate Limiting & Source Pause check
    const rateCheck = rateLimiter.canRequest(
      source.id,
      source.verificationRateLimit
    );
    if (!rateCheck.allowed) {
      jobResult.skippedCount++;
      jobResult.results.push({
        opportunitySourceId: oppSource.id,
        sourceId: source.id,
        sourceName: source.name,
        status: "skipped",
        skipReason: rateCheck.reason,
      });
      continue;
    }

    const listingInfo: SourceListingInfo = {
      opportunityId: opportunity.id,
      sourceId: source.id,
      sourceUrl: oppSource.sourceUrl,
      externalId: oppSource.externalId,
      applicationUrl: oppSource.applicationUrl,
      title: opportunity.title,
      organizationName: opportunity.organizationName,
      contentHash: (opportunity as any).contentHash || (opportunity as any).rawListing?.contentHash || null,
      description: opportunity.description || null,
    };

    try {
      // 5. Execute provider availability check
      const verificationResult = await connectorManager.checkAvailability(
        listingInfo,
        sourceConfig
      );

      // 6. Handle 429 Rate Limiting with Retry-After
      if (
        verificationResult.outcome === "UNKNOWN" &&
        verificationResult.httpStatus === 429
      ) {
        const pauseSeconds = verificationResult.retryAfterSeconds || 60;
        rateLimiter.pauseSource(
          source.id,
          pauseSeconds,
          `HTTP 429 Too Many Requests (Retry-After: ${pauseSeconds}s)`
        );
        await healthManager.recordTransientFailure(
          source.id,
          verificationResult.reason,
          429
        );
      }

      // 7. Handle 401/403 Permanent Authentication Failure & Transient Server Failures
      if (
        verificationResult.outcome === "UNKNOWN" &&
        (verificationResult.httpStatus === 401 ||
          verificationResult.httpStatus === 403)
      ) {
        await healthManager.recordPermanentFailure(
          source.id,
          verificationResult.reason,
          verificationResult.httpStatus
        );
      } else if (
        verificationResult.outcome === "UNKNOWN" &&
        (!verificationResult.httpStatus || verificationResult.httpStatus >= 500)
      ) {
        // Track transient source-level failure (timeout, 5xx)
        await healthManager.recordTransientFailure(
          source.id,
          verificationResult.reason,
          verificationResult.httpStatus
        );
      } else if (
        verificationResult.outcome === "AVAILABLE" ||
        verificationResult.outcome === "CLOSED"
      ) {
        await healthManager.recordSuccess(source.id);
      }

      // 8. Atomically persist result via LifecycleManager
      const persistenceResult = await lifecycleManager.processResult({
        opportunityId: opportunity.id,
        opportunitySourceId: oppSource.id,
        sourceId: source.id,
        result: verificationResult,
      });

      jobResult.processedCount++;
      jobResult.results.push({
        opportunitySourceId: oppSource.id,
        sourceId: source.id,
        sourceName: source.name,
        status: "verified",
        outcome: verificationResult.outcome,
        newOpportunityStatus: persistenceResult.newStatus,
      });
    } catch (err: any) {
      jobResult.results.push({
        opportunitySourceId: oppSource.id,
        sourceId: source.id,
        sourceName: source.name,
        status: "failed",
        error: err.message || "Failed during verification execution",
      });
    }
  }

  return jobResult;
}

/**
 * Standalone Worker Process Entry Point with Graceful Shutdown
 */
export function startVerificationWorker(): Worker<VerifyOpportunityJobData> {
  const prisma = new PrismaClient();
  const connectorManager = new ConnectorManager();
  const lifecycleManager = new OpportunityLifecycleManager(prisma);
  const healthManager = new SourceHealthManager(prisma);
  const connection = getRedisConnectionOptions();
  const concurrency = parseInt(process.env.WORKER_CONCURRENCY || "5", 10);

  console.log(
    `[VerificationWorker] Starting worker on queue "${VERIFICATION_QUEUE_NAME}" with concurrency ${concurrency}...`
  );

  const worker = new Worker<VerifyOpportunityJobData>(
    VERIFICATION_QUEUE_NAME,
    async (job) => {
      console.log(
        `[VerificationWorker] Processing job ${job.id} for opportunity ${job.data.opportunityId}`
      );
      const result = await processVerifyOpportunityJob(job, {
        prisma,
        connectorManager,
        lifecycleManager,
        sourceRateLimiter: globalRateLimiter,
        sourceHealthManager: healthManager,
      });
      return result;
    },
    {
      connection: connection as any,
      concurrency,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(
      `[VerificationWorker] Monitoring: Job ${job?.id} (opportunity: ${job?.data?.opportunityId}) failed with error:`,
      err
    );
  });

  worker.on("completed", (job) => {
    console.log(
      `[VerificationWorker] Monitoring: Job ${job?.id} (opportunity: ${job?.data?.opportunityId}) completed.`
    );
  });

  // Graceful shutdown handling
  const shutdown = async () => {
    console.log("[VerificationWorker] Gracefully closing worker...");
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return worker;
}

const isDirectExecution =
  process.argv[1] &&
  (process.argv[1].endsWith("verificationWorker.ts") ||
    process.argv[1].endsWith("verificationWorker.js"));

if (isDirectExecution) {
  startVerificationWorker();
}
