// src/lib/queue/enrichmentQueue.ts
/**
 * BullMQ Queue for Asynchronous AI Opportunity Enrichment
 */

import { Queue } from "bullmq";
import { getRedisConnection } from "./redis";

export const ENRICHMENT_QUEUE_NAME = "opportunity-enrichment";

export interface EnrichOpportunityJobData {
  opportunityId: string;
  forceReprocess?: boolean;
  triggeredBy?: string;
  enqueuedAt?: string;
  contentHash?: string;
}

export function createEnrichmentQueue(): Queue<EnrichOpportunityJobData> {
  const connection = getRedisConnection();
  return new Queue<EnrichOpportunityJobData>(ENRICHMENT_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: {
        count: 500,
        age: 24 * 3600, // 24 hours
      },
      removeOnFail: {
        count: 500,
        age: 7 * 24 * 3600, // 7 days
      },
    },
  });
}

// Lazy singleton instance for API/app usage
let queueInstance: Queue<EnrichOpportunityJobData> | null = null;

export const enrichmentQueue = {
  get instance(): Queue<EnrichOpportunityJobData> {
    if (!queueInstance) {
      queueInstance = createEnrichmentQueue();
    }
    return queueInstance;
  },
  async add(name: string, data: EnrichOpportunityJobData, opts?: any) {
    return this.instance.add(name, data, opts);
  },
  async getJob(jobId: string) {
    return this.instance.getJob(jobId);
  },
  async close() {
    if (queueInstance) {
      await queueInstance.close();
      queueInstance = null;
    }
  },
};
