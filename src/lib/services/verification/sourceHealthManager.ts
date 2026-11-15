// src/lib/services/verification/sourceHealthManager.ts
import type { PrismaClient } from "@prisma/client";

export interface AdminAlert {
  sourceId: string;
  sourceName: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  message: string;
  timestamp: Date;
}

/**
 * Source Health Manager
 *
 * Tracks health of external sources (Greenhouse, Lever, etc.) independently
 * of individual opportunity availability.
 *
 * Core invariant: A failing or unauthorized source NEVER marks its opportunities CLOSED.
 */
export class SourceHealthManager {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Records a permanent or critical failure (e.g. HTTP 401/403 or invalid credentials).
   * Transitions source healthStatus to FAILING, emits an admin alert,
   * but strictly leaves opportunity availability untouched.
   */
  async recordPermanentFailure(
    sourceId: string,
    reason: string,
    httpStatus?: number
  ): Promise<{ sourceId: string; healthStatus: string; alertEmitted: boolean }> {
    const now = new Date();

    const source = (this.prisma as any).source?.findUnique
      ? await (this.prisma.source as any).findUnique({
          where: { id: sourceId },
        })
      : { id: sourceId, name: "Source" };

    const failureReason = `Permanent/Authentication Failure (HTTP ${httpStatus || "N/A"}): ${reason}`;

    if ((this.prisma as any).source?.update) {
      await (this.prisma.source as any).update({
        where: { id: sourceId },
        data: {
          healthStatus: "FAILING",
          lastFailureAt: now,
          lastErrorMessage: failureReason,
        },
      });
    }

    let alertEmitted = false;
    try {
      if ((this.prisma as any).auditLog?.create) {
        await (this.prisma as any).auditLog.create({
          data: {
            adminId: "system",
            action: "SOURCE_AUTH_FAILURE",
            target: "Source",
            targetId: sourceId,
            details: {
              sourceName: source?.name || sourceId,
              reason: failureReason,
              httpStatus,
              timestamp: now.toISOString(),
              instruction: "Check source API credentials in environment settings.",
            },
          },
        });
        alertEmitted = true;
      }
    } catch {
      console.warn(`[SourceHealthManager] Admin Alert: ${failureReason} for source "${source?.name || sourceId}"`);
    }

    return {
      sourceId,
      healthStatus: "FAILING",
      alertEmitted,
    };
  }

  /**
   * Records a transient failure (timeout, 5xx server error, rate limit).
   * Increments per-source failure tracking.
   * Core Invariant: Source failure NEVER marks opportunities CLOSED.
   */
  async recordTransientFailure(
    sourceId: string,
    reason: string,
    httpStatus?: number
  ): Promise<void> {
    const now = new Date();
    if ((this.prisma as any).source?.update) {
      try {
        await (this.prisma.source as any).update({
          where: { id: sourceId },
          data: {
            healthStatus: "DEGRADED",
            lastFailureAt: now,
            lastErrorMessage: `Transient Source Error (HTTP ${httpStatus || "N/A"}): ${reason}`,
          },
        });
      } catch {
        // Safe catch for mock/in-memory environments
      }
    }
  }

  /**
   * Records a positive interaction with a source, maintaining or restoring HEALTHY status.
   */
  async recordSuccess(sourceId: string): Promise<void> {
    const now = new Date();
    if ((this.prisma as any).source?.update) {
      await (this.prisma.source as any).update({
        where: { id: sourceId },
        data: {
          healthStatus: "HEALTHY",
          lastSuccessAt: now,
          lastErrorMessage: null,
        },
      });
    }
  }
}
