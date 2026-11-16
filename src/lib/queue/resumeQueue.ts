// src/lib/queue/resumeQueue.ts
import { Queue } from "bullmq";
import { getRedisConnection } from "./redis";
import { prisma } from "@/lib/prisma";

export const RESUME_QUEUE_NAME = "resume-extraction";

export interface ResumeExtractionJobData {
  resumeVersionId: string;
  userId: string; // Mandatory server-verified userId
  enqueuedAt: string;
}

export function createResumeQueue(): Queue<ResumeExtractionJobData> {
  const connection = getRedisConnection();
  return new Queue<ResumeExtractionJobData>(RESUME_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 3000,
      },
      removeOnComplete: { count: 200, age: 24 * 3600 },
      removeOnFail: { count: 200, age: 7 * 24 * 3600 },
    },
  });
}

let queueInstance: Queue<ResumeExtractionJobData> | null = null;

export const resumeQueue = {
  get instance(): Queue<ResumeExtractionJobData> {
    if (!queueInstance) {
      queueInstance = createResumeQueue();
    }
    return queueInstance;
  },
  async add(name: string, data: ResumeExtractionJobData, opts?: any) {
    return this.instance.add(name, data, opts);
  },
};

/**
 * Enqueues a resume extraction job. Strictly mandates server-verified userId.
 */
export async function enqueueResumeExtraction(resumeVersionId: string, userId: string) {
  if (!resumeVersionId || !userId) {
    throw new Error("Both resumeVersionId and server-verified userId are required to enqueue extraction.");
  }

  // Verify ownership before enqueueing
  const version = await prisma.resumeVersion.findFirst({
    where: {
      id: resumeVersionId,
      resume: {
        studentId: userId,
      },
    },
  });

  if (!version) {
    throw new Error(`Cannot enqueue extraction: Resume version ${resumeVersionId} does not belong to user ${userId}.`);
  }

  try {
    await resumeQueue.add("extract", {
      resumeVersionId,
      userId,
      enqueuedAt: new Date().toISOString(),
    });
  } catch (err) {
    // If Redis is offline in local dev/testing without Redis, log warning gracefully
    console.warn("[resumeQueue] Warning: Could not enqueue to Redis. Resume record is preserved in DB.", err);
  }
}
