// src/workers/enrichmentWorker.ts
/**
 * Standalone Background Worker for AI Opportunity Enrichment
 * Run with: npm run worker:enrichment
 */

import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../lib/queue/redis.ts";
import { ENRICHMENT_QUEUE_NAME, EnrichOpportunityJobData } from "../lib/queue/enrichmentQueue.ts";
import { OpportunityEnrichmentService } from "../lib/services/enrichment/enrichmentService.ts";
import {
  GroqExtractionClient,
  MockLlmExtractionClient,
  type LlmExtractionClient,
} from "../lib/services/enrichment/llmClient.ts";
import { prisma } from "../lib/prisma.ts";

const CONCURRENCY = parseInt(process.env.ENRICHMENT_WORKER_CONCURRENCY || "5", 10);

console.log(`[EnrichmentWorker] Initializing worker on queue "${ENRICHMENT_QUEUE_NAME}" (concurrency: ${CONCURRENCY})...`);

// Initialize server-side Groq LLM client (with mock fallback if key absent in dev/test)
function createExtractionClient(): LlmExtractionClient {
  if (process.env.GROQ_API_KEY) {
    return new GroqExtractionClient();
  }
  console.warn(
    "[EnrichmentWorker] GROQ_API_KEY not configured. Falling back to MockLlmExtractionClient for testing/offline mode."
  );
  return new MockLlmExtractionClient();
}

const llmClient = createExtractionClient();
const enrichmentService = new OpportunityEnrichmentService(prisma, llmClient);

export function startEnrichmentWorker(): Worker<EnrichOpportunityJobData> {
  const connection = getRedisConnection();

  const worker = new Worker<EnrichOpportunityJobData>(
    ENRICHMENT_QUEUE_NAME,
    async (job: Job<EnrichOpportunityJobData>) => {
      const { opportunityId, forceReprocess, triggeredBy } = job.data;
      console.log(`[EnrichmentWorker] Processing job ${job.id} for opportunity ${opportunityId} (triggeredBy: ${triggeredBy || "system"})...`);

      const result = await enrichmentService.enrichOpportunity({
        opportunityId,
        forceReprocess,
        triggeredBy,
      });

      if (result.skipped) {
        console.log(`[EnrichmentWorker] Job ${job.id}: Skipped (${result.reason})`);
      } else if (result.success) {
        console.log(`[EnrichmentWorker] Job ${job.id}: Successfully enriched opportunity ${opportunityId} (status: ${result.status})`);
      } else {
        console.warn(`[EnrichmentWorker] Job ${job.id}: Enrichment failed for ${opportunityId}: ${result.error}`);
      }

      return result;
    },
    {
      connection,
      concurrency: CONCURRENCY,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`[EnrichmentWorker] Job ${job?.id} failed with error:`, err.message);
  });

  worker.on("error", (err) => {
    console.error("[EnrichmentWorker] Worker encountered Redis/connection error:", err.message);
  });

  return worker;
}

// Auto-start worker if executed directly as entrypoint
const isDirectEntry = process.argv[1] && process.argv[1].replace(/\\/g, "/").includes("src/workers/enrichmentWorker");

if (isDirectEntry) {
  const worker = startEnrichmentWorker();

  const shutdown = async (signal: string) => {
    console.log(`\n[EnrichmentWorker] Received ${signal}. Gracefully stopping worker...`);
    await worker.close();
    console.log("[EnrichmentWorker] Worker stopped cleanly.");
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}
