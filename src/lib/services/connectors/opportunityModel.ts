// src/lib/services/connectors/opportunityModel.ts
import type { PrismaClient } from "@prisma/client";
import type {
  ConnectorOpportunity,
  IngestionOpportunityType,
} from "./types.ts";

// In-memory opportunities store for testing and local dev fallback
const inMemoryOpportunities = new Map<string, ConnectorOpportunity>();

export function clearInMemoryOpportunities(): void {
  inMemoryOpportunities.clear();
}

/**
 * Normalizes an arbitrary type string into standard IngestionOpportunityType enum.
 */
export function normalizeOpportunityType(
  rawType: string | null | undefined
): IngestionOpportunityType {
  if (!rawType) return "job";
  const lower = rawType.toLowerCase().trim();

  if (/\bintern(?:ship)?\b|\bco-op\b|\bapprentice\b|\bstudent\b/i.test(lower)) {
    return "internship";
  }
  if (/\bfellowship\b|\bjrf\b|\bsrf\b|\bpostdoc\b/i.test(lower)) {
    return "fellowship";
  }
  if (/\bresearch\b|\blab\b|\bscientist\b/i.test(lower)) {
    return "research";
  }

  return "job";
}

/**
 * Validates a ConnectorOpportunity record against schema requirements.
 */
export function validateConnectorOpportunity(opp: Partial<ConnectorOpportunity>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!opp.id || typeof opp.id !== "string" || !opp.id.trim()) {
    errors.push("Opportunity 'id' is required.");
  }
  if (!opp.title || typeof opp.title !== "string" || !opp.title.trim()) {
    errors.push("Opportunity 'title' is required.");
  }
  if (!opp.organization || typeof opp.organization !== "string" || !opp.organization.trim()) {
    errors.push("Opportunity 'organization' is required.");
  }
  if (!opp.description || typeof opp.description !== "string" || !opp.description.trim()) {
    errors.push("Opportunity 'description' is required.");
  }
  if (!opp.type || !["job", "internship", "fellowship", "research"].includes(opp.type)) {
    errors.push("Opportunity 'type' must be one of: 'job', 'internship', 'fellowship', 'research'.");
  }
  if (!opp.experienceLevel || typeof opp.experienceLevel !== "string") {
    errors.push("Opportunity 'experienceLevel' is required.");
  }
  if (typeof opp.isRemote !== "boolean") {
    errors.push("Opportunity 'isRemote' must be a boolean flag.");
  }
  if (!Array.isArray(opp.skills)) {
    errors.push("Opportunity 'skills' must be an array of strings.");
  }
  if (!opp.originalUrl || typeof opp.originalUrl !== "string") {
    errors.push("Opportunity 'originalUrl' is required.");
  }
  if (!opp.sourceId || typeof opp.sourceId !== "string") {
    errors.push("Opportunity 'sourceId' is required.");
  }
  if (!opp.fetchedAt || typeof opp.fetchedAt !== "string") {
    errors.push("Opportunity 'fetchedAt' timestamp is required.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Stores or updates a standardized ConnectorOpportunity.
 */
export async function saveConnectorOpportunity(
  opp: ConnectorOpportunity,
  prisma?: PrismaClient | any
): Promise<ConnectorOpportunity> {
  const validation = validateConnectorOpportunity(opp);
  if (!validation.valid) {
    throw new Error(`Invalid ConnectorOpportunity: ${validation.errors.join("; ")}`);
  }

  const now = new Date().toISOString();
  const record: ConnectorOpportunity = {
    ...opp,
    createdAt: opp.createdAt || now,
    updatedAt: now,
  };

  if (prisma && prisma.connectorOpportunity) {
    try {
      const saved = await prisma.connectorOpportunity.upsert({
        where: { id: record.id },
        update: {
          title: record.title,
          organization: record.organization,
          description: record.description,
          type: record.type,
          experienceLevel: record.experienceLevel,
          location: record.location,
          isRemote: record.isRemote,
          salary: record.salary,
          skills: record.skills,
          postedDate: record.postedDate ? new Date(record.postedDate) : null,
          deadline: record.deadline ? new Date(record.deadline) : null,
          originalUrl: record.originalUrl,
          sourceId: record.sourceId,
          sourceExternalId: record.sourceExternalId,
          lastVerifiedAt: record.lastVerifiedAt ? new Date(record.lastVerifiedAt) : null,
          verificationStatus: record.verificationStatus,
          rawPayloadRef: record.rawPayloadRef,
          updatedAt: new Date(now),
        },
        create: {
          id: record.id,
          title: record.title,
          organization: record.organization,
          description: record.description,
          type: record.type,
          experienceLevel: record.experienceLevel,
          location: record.location,
          isRemote: record.isRemote,
          salary: record.salary,
          skills: record.skills,
          postedDate: record.postedDate ? new Date(record.postedDate) : null,
          deadline: record.deadline ? new Date(record.deadline) : null,
          originalUrl: record.originalUrl,
          sourceId: record.sourceId,
          sourceExternalId: record.sourceExternalId,
          fetchedAt: new Date(record.fetchedAt),
          lastVerifiedAt: record.lastVerifiedAt ? new Date(record.lastVerifiedAt) : null,
          verificationStatus: record.verificationStatus,
          rawPayloadRef: record.rawPayloadRef,
          createdAt: new Date(record.createdAt),
          updatedAt: new Date(now),
        },
      });

      inMemoryOpportunities.set(record.id, record);
      return {
        ...saved,
        postedDate: saved.postedDate ? new Date(saved.postedDate).toISOString() : null,
        deadline: saved.deadline ? new Date(saved.deadline).toISOString() : null,
        fetchedAt: saved.fetchedAt ? new Date(saved.fetchedAt).toISOString() : now,
        lastVerifiedAt: saved.lastVerifiedAt ? new Date(saved.lastVerifiedAt).toISOString() : null,
        createdAt: saved.createdAt ? new Date(saved.createdAt).toISOString() : now,
        updatedAt: saved.updatedAt ? new Date(saved.updatedAt).toISOString() : now,
      };
    } catch {
      // Fallback
    }
  }

  inMemoryOpportunities.set(record.id, record);
  return record;
}

/**
 * Retrieves a ConnectorOpportunity by ID.
 */
export async function getConnectorOpportunityById(
  id: string,
  prisma?: PrismaClient | any
): Promise<ConnectorOpportunity | null> {
  if (prisma && prisma.connectorOpportunity) {
    try {
      const record = await prisma.connectorOpportunity.findUnique({
        where: { id },
      });
      if (record) {
        return {
          ...record,
          postedDate: record.postedDate ? new Date(record.postedDate).toISOString() : null,
          deadline: record.deadline ? new Date(record.deadline).toISOString() : null,
          fetchedAt: record.fetchedAt ? new Date(record.fetchedAt).toISOString() : new Date().toISOString(),
          lastVerifiedAt: record.lastVerifiedAt ? new Date(record.lastVerifiedAt).toISOString() : null,
          createdAt: record.createdAt ? new Date(record.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: record.updatedAt ? new Date(record.updatedAt).toISOString() : new Date().toISOString(),
        };
      }
    } catch {
      // Fallback
    }
  }

  return inMemoryOpportunities.get(id) || null;
}
