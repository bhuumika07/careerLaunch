// src/lib/services/connectors/sourceRegistry.ts
import type { PrismaClient } from "@prisma/client";
import type { SourceRegistryEntry, SourceRegistryStatus } from "./types.ts";
import { INITIAL_SOURCE_REGISTRY } from "./seedData.ts";

// In-memory fallback registry for offline / local-dev execution
const inMemoryRegistry = new Map<string, SourceRegistryEntry>();

// Initialize in-memory registry with seed data
for (const entry of INITIAL_SOURCE_REGISTRY) {
  inMemoryRegistry.set(entry.id, { ...entry });
}

/**
 * Resets the in-memory registry to initial seed data (useful for test isolation).
 */
export function resetInMemoryRegistry(): void {
  inMemoryRegistry.clear();
  for (const entry of INITIAL_SOURCE_REGISTRY) {
    inMemoryRegistry.set(entry.id, { ...entry });
  }
}

/**
 * Fetches all source registry entries.
 * Tries Prisma (SourceRegistry table) first, falling back gracefully to in-memory store.
 */
export async function getSourceRegistry(
  prisma?: PrismaClient | any
): Promise<SourceRegistryEntry[]> {
  if (prisma && prisma.sourceRegistry) {
    try {
      const records = await prisma.sourceRegistry.findMany({
        orderBy: { name: "asc" },
      });
      if (records && records.length > 0) {
        return records.map((r: any) => ({
          ...r,
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
        }));
      }
    } catch {
      // Fallback on error / uninitialized table
    }
  }

  return Array.from(inMemoryRegistry.values());
}

/**
 * Finds a source entry by unique ID (e.g. "naukri", "greenhouse").
 */
export async function getSourceById(
  id: string,
  prisma?: PrismaClient | any
): Promise<SourceRegistryEntry | null> {
  const normalizedId = id.trim().toLowerCase();

  if (prisma && prisma.sourceRegistry) {
    try {
      const record = await prisma.sourceRegistry.findUnique({
        where: { id: normalizedId },
      });
      if (record) {
        return {
          ...record,
          createdAt: record.createdAt ? new Date(record.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: record.updatedAt ? new Date(record.updatedAt).toISOString() : new Date().toISOString(),
        };
      }
    } catch {
      // Fallback
    }
  }

  return inMemoryRegistry.get(normalizedId) || null;
}

/**
 * Registers or updates a source in the registry.
 */
export async function registerSource(
  entry: Omit<SourceRegistryEntry, "createdAt" | "updatedAt"> & {
    createdAt?: string;
    updatedAt?: string;
  },
  prisma?: PrismaClient | any
): Promise<SourceRegistryEntry> {
  const normalizedId = entry.id.trim().toLowerCase();
  const now = new Date().toISOString();

  const fullEntry: SourceRegistryEntry = {
    ...entry,
    id: normalizedId,
    createdAt: entry.createdAt || now,
    updatedAt: now,
  };

  if (prisma && prisma.sourceRegistry) {
    try {
      const saved = await prisma.sourceRegistry.upsert({
        where: { id: normalizedId },
        update: {
          name: fullEntry.name,
          category: fullEntry.category,
          geography: fullEntry.geography,
          accessMethod: fullEntry.accessMethod,
          status: fullEntry.status,
          termsUrl: fullEntry.termsUrl,
          refreshInterval: fullEntry.refreshInterval,
          attributionText: fullEntry.attributionText,
          updatedAt: new Date(now),
        },
        create: {
          id: normalizedId,
          name: fullEntry.name,
          category: fullEntry.category,
          geography: fullEntry.geography,
          accessMethod: fullEntry.accessMethod,
          status: fullEntry.status,
          termsUrl: fullEntry.termsUrl,
          refreshInterval: fullEntry.refreshInterval,
          attributionText: fullEntry.attributionText,
          createdAt: new Date(fullEntry.createdAt),
          updatedAt: new Date(now),
        },
      });

      // Keep in-memory cache in sync
      inMemoryRegistry.set(normalizedId, fullEntry);

      return {
        ...saved,
        createdAt: saved.createdAt ? new Date(saved.createdAt).toISOString() : now,
        updatedAt: saved.updatedAt ? new Date(saved.updatedAt).toISOString() : now,
      };
    } catch {
      // Fallback to in-memory
    }
  }

  inMemoryRegistry.set(normalizedId, fullEntry);
  return fullEntry;
}

/**
 * Updates the operational status of a source.
 */
export async function updateSourceStatus(
  id: string,
  newStatus: SourceRegistryStatus,
  prisma?: PrismaClient | any
): Promise<SourceRegistryEntry | null> {
  const existing = await getSourceById(id, prisma);
  if (!existing) return null;

  const updated: SourceRegistryEntry = {
    ...existing,
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };

  return registerSource(updated, prisma);
}

/**
 * Returns only active sources available for scheduled connector ingestion.
 */
export async function getActiveSources(
  prisma?: PrismaClient | any
): Promise<SourceRegistryEntry[]> {
  const all = await getSourceRegistry(prisma);
  return all.filter((s) => s.status === "active");
}

/**
 * Returns sources configured as external destinations (link-only).
 */
export async function getExternalLinkOnlySources(
  prisma?: PrismaClient | any
): Promise<SourceRegistryEntry[]> {
  const all = await getSourceRegistry(prisma);
  return all.filter((s) => s.status === "external_link_only");
}
