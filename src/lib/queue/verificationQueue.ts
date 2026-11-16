// src/lib/queue/verificationQueue.ts
import { Queue, type JobsOptions } from "bullmq";
import { getRedisConnectionOptions } from "./redis";

export const VERIFICATION_QUEUE_NAME = "opportunity-verification";
export const VERIFY_OPPORTUNITY_JOB_NAME = "verify-opportunity";

export interface VerifyOpportunityJobData {
  opportunityId: string;
  sourceId?: string;
  triggeredBy?: "scheduler" | "manual" | "worker";
  enqueuedAt?: string;
}

export const defaultVerificationJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 5000, // 5s, 10s, 20s
  },
  removeOnComplete: 1000,
  removeOnFail: 5000,
};

let queueInstance: Queue<VerifyOpportunityJobData> | null = null;

export function getVerificationQueue(): Queue<VerifyOpportunityJobData> {
  if (!queueInstance) {
    const connection = getRedisConnectionOptions();
    queueInstance = new Queue<VerifyOpportunityJobData>(VERIFICATION_QUEUE_NAME, {
      connection: connection as any,
      defaultJobOptions: defaultVerificationJobOptions,
    });
  }
  return queueInstance;
}

export const verificationQueue: Queue<VerifyOpportunityJobData> = new Proxy({} as Queue<VerifyOpportunityJobData>, {
  get(_target, prop) {
    const q = getVerificationQueue();
    const val = (q as any)[prop];
    if (typeof val === 'function') {
      return val.bind(q);
    }
    return val;
  }
});

export async function enqueueOpportunityVerification(
  opportunityId: string,
  options?: {
    sourceId?: string;
    delayMs?: number;
    triggeredBy?: "scheduler" | "manual" | "worker";
  }
) {
  const queue = getVerificationQueue();
  return await queue.add(
    VERIFY_OPPORTUNITY_JOB_NAME,
    {
      opportunityId,
      sourceId: options?.sourceId,
      triggeredBy: options?.triggeredBy || "manual",
      enqueuedAt: new Date().toISOString(),
    },
    {
      delay: options?.delayMs,
    }
  );
}
