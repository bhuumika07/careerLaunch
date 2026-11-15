// src/lib/services/verification/ingestionHook.ts
import type { PrismaClient } from "@prisma/client";
import { enqueueOpportunityVerification } from "../../queue/verificationQueue.ts";

export interface HookIngestionParams {
  opportunityId: string;
  sourceId: string;
  sourceUrl: string;
  externalId?: string | null;
  applicationUrl?: string | null;
  enqueueImmediately?: boolean;
}

/**
 * Hook invoked during data ingestion.
 *
 * Ensures:
 * 1. Initial status is strictly PENDING.
 * 2. nextVerificationAt is set to now.
 * 3. Enqueues immediate verification in the background if Redis/BullMQ is active.
 */
export async function hookNewOpportunityIngestion(
  prisma: PrismaClient,
  params: HookIngestionParams
): Promise<{ opportunityId: string; enqueued: boolean }> {
  const now = new Date();

  // 1. Ensure Opportunity is initialized with PENDING and nextVerificationAt = now
  await (prisma.opportunity as any).update({
    where: { id: params.opportunityId },
    data: {
      status: "PENDING",
      nextVerificationAt: now,
      consecutiveFailures: 0,
      lastVerificationOutcome: null,
    },
  });

  // 2. Ensure OpportunitySource record exists
  const existingSource = await (prisma.opportunitySource as any).findFirst({
    where: {
      opportunityId: params.opportunityId,
      sourceId: params.sourceId,
      sourceUrl: params.sourceUrl,
    },
  });

  if (!existingSource) {
    await (prisma.opportunitySource as any).create({
      data: {
        opportunityId: params.opportunityId,
        sourceId: params.sourceId,
        sourceUrl: params.sourceUrl,
        externalId: params.externalId ?? null,
        applicationUrl: params.applicationUrl ?? null,
        verificationStatus: "pending",
      },
    });
  }

  // 3. Immediately enqueue verification if requested
  let enqueued = false;
  if (params.enqueueImmediately !== false) {
    try {
      await enqueueOpportunityVerification(params.opportunityId, {
        sourceId: params.sourceId,
        triggeredBy: "scheduler",
      });
      enqueued = true;
    } catch {
      // In environments where Redis is not active, the scheduled sweep will pick it up
      enqueued = false;
    }
  }

  return { opportunityId: params.opportunityId, enqueued };
}
