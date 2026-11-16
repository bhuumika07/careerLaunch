// src/lib/services/verification/lifecycleManager.ts
import type { PrismaClient } from "@prisma/client";
import {
  evaluateVerificationDecision,
  type FreshnessConfig,
  type OpportunityLifecycleStatus,
} from "./decisionEngine.ts";
import type { VerificationResult } from "./types.ts";

export interface ProcessResultParams {
  opportunityId: string;
  opportunitySourceId: string;
  sourceId: string;
  result: VerificationResult;
  freshnessConfig?: FreshnessConfig;
}

export interface ProcessResultResponse {
  opportunityId: string;
  opportunitySourceId: string;
  previousStatus: OpportunityLifecycleStatus;
  newStatus: OpportunityLifecycleStatus;
  outcome: string;
  logId: string;
  idempotentSkip?: boolean;
}

/**
 * Opportunity Lifecycle Manager
 *
 * Persists verification outcomes, evaluates canonical multi-source lifecycle status,
 * and maintains an append-only verification log inside an atomic database transaction.
 */
export class OpportunityLifecycleManager {
  private prisma: PrismaClient;
  private static activeLocks = new Set<string>();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Processes a single verification result atomically with concurrency control.
   */
  async processResult(
    params: ProcessResultParams
  ): Promise<ProcessResultResponse> {
    const {
      opportunityId,
      opportunitySourceId,
      sourceId,
      result,
      freshnessConfig,
    } = params;

    const lockKey = `${opportunityId}:${opportunitySourceId}`;
    if (OpportunityLifecycleManager.activeLocks.has(lockKey)) {
      return {
        opportunityId,
        opportunitySourceId,
        previousStatus: "PENDING" as any,
        newStatus: "ACTIVE" as any,
        outcome: result.outcome,
        logId: "concurrent-skip",
        idempotentSkip: true,
      };
    }

    OpportunityLifecycleManager.activeLocks.add(lockKey);

    try {
      return await (this.prisma as any).$transaction(async (tx: any) => {
        // 1. Fetch canonical Opportunity and specific OpportunitySource
        const opp: any = await tx.opportunity.findUnique({
          where: { id: opportunityId },
        });

        if (!opp) {
          throw new Error(`Opportunity with id "${opportunityId}" not found`);
        }

        const oppSource = await tx.opportunitySource.findUnique({
          where: { id: opportunitySourceId },
        });

        if (!oppSource) {
          throw new Error(
            `OpportunitySource with id "${opportunitySourceId}" not found`
          );
        }

        // 2. Idempotency check:
        // Skip duplicate processing if a log with identical checkedAt already exists
        const existingLog = await tx.verificationLog.findFirst({
          where: {
            opportunitySourceId,
            checkedAt: result.checkedAt,
          },
        });

        if (existingLog) {
          return {
            opportunityId,
            opportunitySourceId,
            previousStatus: opp.status as OpportunityLifecycleStatus,
            newStatus: opp.status as OpportunityLifecycleStatus,
            outcome: result.outcome,
            logId: existingLog.id,
            idempotentSkip: true,
          };
        }

        // 3. Evaluate the decision using the pure decision engine
        const decision = evaluateVerificationDecision({
          currentStatus: opp.status as OpportunityLifecycleStatus,
          applicationDeadline: opp.applicationDeadline,
          lastVerifiedAt: opp.lastVerifiedAt,
          consecutiveFailures: opp.consecutiveFailures,
          result,
          now: result.checkedAt,
          freshnessConfig,
        });

        // 4. Update the individual OpportunitySource record
        const errorMsg =
          result.outcome === "UNKNOWN"
            ? result.reason
            : result.outcome === "CONFLICT"
            ? result.reason
            : null;

        await tx.opportunitySource.update({
          where: { id: opportunitySourceId },
          data: {
            lastVerificationAt: result.checkedAt,
            lastVerificationOutcome: result.outcome as any,
            verificationError: errorMsg,
            verificationStatus:
              result.outcome === "AVAILABLE"
                ? "verified"
                : result.outcome === "CLOSED"
                ? "rejected"
                : "pending",
          },
        });

        // 5. Update canonical Opportunity record with optimistic concurrency protection
        const updatedOppData: Record<string, any> = {
          status: decision.newStatus as any,
          lastVerificationOutcome: decision.lastVerificationOutcome as any,
          nextVerificationAt: decision.nextVerificationAt,
          consecutiveFailures: decision.consecutiveFailures,
          lastVerificationError: decision.lastVerificationError,
        };

        if (decision.lastVerifiedAt) {
          updatedOppData.lastVerifiedAt = decision.lastVerifiedAt;
        }
        if (decision.closedAt !== undefined) {
          updatedOppData.closedAt = decision.closedAt;
        }

        if (typeof (tx.opportunity as any).updateMany === "function") {
          const updateResult = await (tx.opportunity as any).updateMany({
            where: {
              id: opportunityId,
              consecutiveFailures: opp.consecutiveFailures,
              lastVerifiedAt: opp.lastVerifiedAt,
            },
            data: updatedOppData,
          });

          if (updateResult.count === 0) {
            const freshOpp: any = await tx.opportunity.findUnique({
              where: { id: opportunityId },
            });

            if (
              !freshOpp?.lastVerifiedAt ||
              (decision.lastVerifiedAt &&
                decision.lastVerifiedAt.getTime() >=
                  freshOpp.lastVerifiedAt.getTime())
            ) {
              await tx.opportunity.update({
                where: { id: opportunityId },
                data: updatedOppData,
              });
            }
          }
        } else {
          await tx.opportunity.update({
            where: { id: opportunityId },
            data: updatedOppData,
          });
        }

        // 6. Record append-only VerificationLog row
        const log = await tx.verificationLog.create({
          data: {
            opportunityId,
            sourceId,
            opportunitySourceId,
            outcome: result.outcome as any,
            reason:
              result.outcome === "AVAILABLE" || result.outcome === "CLOSED"
                ? result.evidence
                : result.reason,
            httpStatus: result.httpStatus ?? null,
            responseTimeMs: result.responseTimeMs ?? null,
            checkedAt: result.checkedAt,
          },
        });

        return {
          opportunityId,
          opportunitySourceId,
          previousStatus: opp.status as OpportunityLifecycleStatus,
          newStatus: decision.newStatus,
          outcome: result.outcome,
          logId: log.id,
        };
      });
    } finally {
      OpportunityLifecycleManager.activeLocks.delete(lockKey);
    }
  }
}
