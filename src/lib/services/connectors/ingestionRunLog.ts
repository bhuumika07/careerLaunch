// src/lib/services/connectors/ingestionRunLog.ts
import type { PrismaClient } from "@prisma/client";
import type { IngestionRunLog, IngestionCountsDelta } from "./types.ts";

// In-memory run logs store for tests and fallback
const inMemoryLogs = new Map<string, IngestionRunLog>();

export function clearInMemoryRunLogs(): void {
  inMemoryLogs.clear();
}

/**
 * Initializes and records a new Ingestion Run in 'running' state.
 */
export async function startIngestionRun(
  sourceId: string,
  prisma?: PrismaClient | any
): Promise<IngestionRunLog> {
  const runId = `run_${sourceId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const log: IngestionRunLog = {
    id: runId,
    sourceId,
    startTime: now,
    status: "running",
    fetchedCount: 0,
    newCount: 0,
    updatedCount: 0,
    rejectedCount: 0,
    errors: [],
    createdAt: now,
  };

  if (prisma && prisma.ingestionRunLog) {
    try {
      await prisma.ingestionRunLog.create({
        data: {
          id: log.id,
          sourceId: log.sourceId,
          startTime: new Date(log.startTime),
          status: log.status,
          fetchedCount: log.fetchedCount,
          newCount: log.newCount,
          updatedCount: log.updatedCount,
          rejectedCount: log.rejectedCount,
          errors: log.errors,
          createdAt: new Date(log.createdAt),
        },
      });
    } catch {
      // Fallback
    }
  }

  inMemoryLogs.set(log.id, log);
  return log;
}

/**
 * Completes an Ingestion Run, updating counts, status, and duration.
 */
export async function completeIngestionRun(
  runId: string,
  params: {
    status?: "completed" | "failed";
    counts: IngestionCountsDelta;
    errors?: string[] | any;
  },
  prisma?: PrismaClient | any
): Promise<IngestionRunLog> {
  const existing = inMemoryLogs.get(runId);
  const now = new Date();
  const startTime = existing?.startTime ? new Date(existing.startTime) : now;
  const durationMs = Math.max(0, now.getTime() - startTime.getTime());

  const updated: IngestionRunLog = {
    id: runId,
    sourceId: existing?.sourceId || "unknown",
    startTime: existing?.startTime || now.toISOString(),
    endTime: now.toISOString(),
    status: params.status || (params.errors && params.errors.length > 0 ? "failed" : "completed"),
    fetchedCount: params.counts.fetchedCount ?? existing?.fetchedCount ?? 0,
    newCount: params.counts.newCount ?? existing?.newCount ?? 0,
    updatedCount: params.counts.updatedCount ?? existing?.updatedCount ?? 0,
    rejectedCount: params.counts.rejectedCount ?? existing?.rejectedCount ?? 0,
    errors: params.errors || existing?.errors || [],
    durationMs,
    createdAt: existing?.createdAt || now.toISOString(),
  };

  if (prisma && prisma.ingestionRunLog) {
    try {
      await prisma.ingestionRunLog.update({
        where: { id: runId },
        data: {
          endTime: now,
          status: updated.status,
          fetchedCount: updated.fetchedCount,
          newCount: updated.newCount,
          updatedCount: updated.updatedCount,
          rejectedCount: updated.rejectedCount,
          errors: updated.errors,
        },
      });
    } catch {
      // Fallback
    }
  }

  inMemoryLogs.set(runId, updated);
  return updated;
}

/**
 * Retrieves ingestion run history.
 */
export async function getIngestionRunLogs(
  sourceId?: string,
  limit: number = 20,
  prisma?: PrismaClient | any
): Promise<IngestionRunLog[]> {
  if (prisma && prisma.ingestionRunLog) {
    try {
      const records = await prisma.ingestionRunLog.findMany({
        where: sourceId ? { sourceId } : undefined,
        orderBy: { startTime: "desc" },
        take: limit,
      });
      if (records && records.length > 0) {
        return records.map((r: any) => ({
          ...r,
          startTime: new Date(r.startTime).toISOString(),
          endTime: r.endTime ? new Date(r.endTime).toISOString() : null,
          createdAt: new Date(r.createdAt).toISOString(),
        }));
      }
    } catch {
      // Fallback
    }
  }

  const all = Array.from(inMemoryLogs.values());
  const filtered = sourceId ? all.filter((l) => l.sourceId === sourceId) : all;
  return filtered
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, limit);
}
