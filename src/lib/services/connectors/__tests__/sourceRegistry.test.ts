// src/lib/services/connectors/__tests__/sourceRegistry.test.ts
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  getSourceRegistry,
  getSourceById,
  registerSource,
  updateSourceStatus,
  getActiveSources,
  getExternalLinkOnlySources,
  resetInMemoryRegistry,
} from "../sourceRegistry.ts";
import {
  validateConnectorOpportunity,
  normalizeOpportunityType,
  saveConnectorOpportunity,
  getConnectorOpportunityById,
  clearInMemoryOpportunities,
} from "../opportunityModel.ts";
import {
  startIngestionRun,
  completeIngestionRun,
  getIngestionRunLogs,
  clearInMemoryRunLogs,
} from "../ingestionRunLog.ts";
import type { ConnectorOpportunity } from "../types.ts";

describe("Chunk 2: Data Model and Source Registry", () => {
  beforeEach(() => {
    resetInMemoryRegistry();
    clearInMemoryOpportunities();
    clearInMemoryRunLogs();
  });

  describe("1. Source Registry & Seed Invariants", () => {
    it("seeds Naukri strictly with status 'external_link_only' per Chunk 1 decision", async () => {
      const naukri = await getSourceById("naukri");
      assert.ok(naukri, "Naukri source must be present in registry");
      assert.equal(naukri.id, "naukri");
      assert.equal(naukri.name, "Naukri.com");
      assert.equal(naukri.category, "job_board");
      assert.equal(naukri.geography, "India");
      assert.equal(naukri.accessMethod, "external_search");
      assert.equal(naukri.status, "external_link_only");
      assert.equal(naukri.refreshInterval, 0);
      assert.match(naukri.attributionText || "", /Direct external search destination/i);
    });

    it("seeds ATS providers (Greenhouse, Lever, Ashby) as 'active'", async () => {
      const activeSources = await getActiveSources();
      const activeIds = activeSources.map((s) => s.id);

      assert.ok(activeIds.includes("greenhouse"), "Greenhouse should be active");
      assert.ok(activeIds.includes("lever"), "Lever should be active");
      assert.ok(activeIds.includes("ashby"), "Ashby should be active");

      const gh = await getSourceById("greenhouse");
      assert.equal(gh?.category, "ats");
      assert.equal(gh?.accessMethod, "public_api");
      assert.equal(gh?.refreshInterval, 60);
    });

    it("seeds AICTE as 'external_link_only' and licensed/gov APIs as 'permission_pending'", async () => {
      const aicte = await getSourceById("aicte");
      assert.equal(aicte?.status, "external_link_only");

      const adzuna = await getSourceById("adzuna");
      assert.equal(adzuna?.status, "permission_pending");
      assert.equal(adzuna?.accessMethod, "licensed_api");

      const ncs = await getSourceById("ncs");
      assert.equal(ncs?.status, "permission_pending");
      assert.equal(ncs?.category, "government");
    });

    it("allows registering and updating a new source in the registry", async () => {
      const customSource = await registerSource({
        id: "custom_ats",
        name: "Custom Enterprise ATS",
        category: "ats",
        geography: "India",
        accessMethod: "public_api",
        status: "active",
        termsUrl: "https://example.com/terms",
        refreshInterval: 120,
        attributionText: "Custom ATS Feed",
      });

      assert.equal(customSource.id, "custom_ats");
      const fetched = await getSourceById("custom_ats");
      assert.equal(fetched?.name, "Custom Enterprise ATS");
      assert.equal(fetched?.refreshInterval, 120);

      // Update status
      const updated = await updateSourceStatus("custom_ats", "disabled");
      assert.equal(updated?.status, "disabled");

      const active = await getActiveSources();
      assert.ok(!active.some((s) => s.id === "custom_ats"));
    });

    it("filters external link-only sources correctly", async () => {
      const linkOnly = await getExternalLinkOnlySources();
      const ids = linkOnly.map((s) => s.id);
      assert.ok(ids.includes("naukri"));
      assert.ok(ids.includes("aicte"));
      assert.ok(!ids.includes("greenhouse"));
    });
  });

  describe("2. Standardized Connector Opportunity Model", () => {
    const validOpp: ConnectorOpportunity = {
      id: "opp_test_001",
      title: "Graduate Software Engineer (Fresher 2026)",
      organization: "CloudCorp Technologies",
      description: "We are seeking ambitious fresh graduates for our distributed systems engineering team.",
      type: "job",
      experienceLevel: "fresher",
      location: "Bengaluru, Karnataka, India",
      isRemote: false,
      salary: "₹12,00,000 - ₹16,00,000",
      skills: ["Java", "Spring Boot", "SQL", "Docker"],
      postedDate: "2026-11-15T00:00:00.000Z",
      deadline: "2026-12-15T23:59:59.000Z",
      originalUrl: "https://example.com/jobs/001",
      sourceId: "greenhouse",
      sourceExternalId: "gh_89211",
      fetchedAt: "2026-11-15T12:00:00.000Z",
      lastVerifiedAt: "2026-11-15T12:00:00.000Z",
      verificationStatus: "verified",
      rawPayloadRef: "s3://raw-listings/greenhouse/gh_89211.json",
    };

    it("validates a fully formed opportunity successfully", () => {
      const result = validateConnectorOpportunity(validOpp);
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });

    it("catches missing required fields and invalid opportunity types", () => {
      const invalid: Partial<ConnectorOpportunity> = {
        id: "bad_opp",
        // missing title, organization, description, type, etc.
      };
      const result = validateConnectorOpportunity(invalid);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes("title")));
      assert.ok(result.errors.some((e) => e.includes("organization")));
      assert.ok(result.errors.some((e) => e.includes("description")));
      assert.ok(result.errors.some((e) => e.includes("type")));
    });

    it("normalizes opportunity types correctly", () => {
      assert.equal(normalizeOpportunityType("Summer Intern 2027"), "internship");
      assert.equal(normalizeOpportunityType("Co-Op Engineering Trainee"), "internship");
      assert.equal(normalizeOpportunityType("Junior Research Fellow (JRF)"), "fellowship");
      assert.equal(normalizeOpportunityType("Postdoctoral Fellowship"), "fellowship");
      assert.equal(normalizeOpportunityType("AI Research Scientist"), "research");
      assert.equal(normalizeOpportunityType("Fullstack Software Engineer"), "job");
      assert.equal(normalizeOpportunityType(null), "job");
    });

    it("persists and retrieves ConnectorOpportunity records", async () => {
      const saved = await saveConnectorOpportunity(validOpp);
      assert.equal(saved.id, validOpp.id);
      assert.equal(saved.isRemote, false);
      assert.equal(saved.sourceId, "greenhouse");

      const retrieved = await getConnectorOpportunityById(validOpp.id);
      assert.ok(retrieved);
      assert.equal(retrieved?.title, validOpp.title);
      assert.deepEqual(retrieved?.skills, ["Java", "Spring Boot", "SQL", "Docker"]);
      assert.equal(retrieved?.rawPayloadRef, "s3://raw-listings/greenhouse/gh_89211.json");
    });
  });

  describe("3. Ingestion Run Log", () => {
    it("tracks start, progress, and completion of an ingestion run", async () => {
      const run = await startIngestionRun("greenhouse");
      assert.ok(run.id.startsWith("run_greenhouse_"));
      assert.equal(run.sourceId, "greenhouse");
      assert.equal(run.status, "running");
      assert.equal(run.fetchedCount, 0);

      // Simulate completed ingestion
      const completed = await completeIngestionRun(run.id, {
        status: "completed",
        counts: {
          fetchedCount: 50,
          newCount: 42,
          updatedCount: 8,
          rejectedCount: 0,
        },
      });

      assert.equal(completed.status, "completed");
      assert.equal(completed.fetchedCount, 50);
      assert.equal(completed.newCount, 42);
      assert.equal(completed.updatedCount, 8);
      assert.equal(completed.rejectedCount, 0);
      assert.ok(completed.endTime, "endTime must be set");
      assert.ok(typeof completed.durationMs === "number");

      // Verify retrieval in history
      const history = await getIngestionRunLogs("greenhouse");
      assert.ok(history.length >= 1);
      assert.equal(history[0].id, run.id);
    });

    it("records failure status and error details accurately", async () => {
      const run = await startIngestionRun("adzuna");
      const failed = await completeIngestionRun(run.id, {
        status: "failed",
        counts: {
          fetchedCount: 10,
          rejectedCount: 10,
        },
        errors: ["HTTP 401: Invalid API Key", "Quota exceeded"],
      });

      assert.equal(failed.status, "failed");
      assert.equal(failed.rejectedCount, 10);
      assert.deepEqual(failed.errors, ["HTTP 401: Invalid API Key", "Quota exceeded"]);
    });
  });

  describe("4. Mock Database / Prisma Integration", () => {
    it("interacts cleanly with mock Prisma client delegating to registry tables", async () => {
      const mockDb = {
        sources: [] as any[],
        opportunities: [] as any[],
        logs: [] as any[],
      };

      const mockPrisma: any = {
        sourceRegistry: {
          findMany: async () => mockDb.sources,
          findUnique: async ({ where }: any) => mockDb.sources.find((s) => s.id === where.id) || null,
          upsert: async ({ where, update, create }: any) => {
            let existing = mockDb.sources.find((s) => s.id === where.id);
            if (existing) {
              Object.assign(existing, update);
              return existing;
            } else {
              mockDb.sources.push(create);
              return create;
            }
          },
        },
        connectorOpportunity: {
          findUnique: async ({ where }: any) => mockDb.opportunities.find((o) => o.id === where.id) || null,
          upsert: async ({ create }: any) => {
            mockDb.opportunities.push(create);
            return create;
          },
        },
        ingestionRunLog: {
          create: async ({ data }: any) => {
            mockDb.logs.push(data);
            return data;
          },
          update: async ({ where, data }: any) => {
            const log = mockDb.logs.find((l) => l.id === where.id);
            if (log) Object.assign(log, data);
            return log;
          },
        },
      };

      // Register into mock Prisma
      const registered = await registerSource(
        {
          id: "prisma_lever",
          name: "Lever ATS",
          category: "ats",
          geography: "Global",
          accessMethod: "public_api",
          status: "active",
          refreshInterval: 60,
        },
        mockPrisma
      );

      assert.equal(registered.id, "prisma_lever");
      assert.equal(mockDb.sources.length, 1);

      // Query from mock Prisma
      const queried = await getSourceById("prisma_lever", mockPrisma);
      assert.equal(queried?.name, "Lever ATS");
    });
  });
});
