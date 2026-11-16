// src/lib/jobs/resumeExtractionQueue.ts
import {
  enqueueResumeExtraction as baseEnqueue,
  type ResumeExtractionJobData,
  resumeQueue,
} from "@/lib/queue/resumeQueue";

export { type ResumeExtractionJobData, resumeQueue };

export async function enqueueResumeExtraction(
  resumeVersionId: string,
  userId?: string
) {
  return baseEnqueue(resumeVersionId, userId || "system");
}

export default enqueueResumeExtraction;
