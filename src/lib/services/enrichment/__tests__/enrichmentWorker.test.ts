// src/lib/services/enrichment/__tests__/enrichmentWorker.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { OpportunityEnrichmentService } from "../enrichmentService.ts";
import { MockLlmExtractionClient } from "../llmClient.ts";
import { PROMPT_VERSION, SCHEMA_VERSION } from "../extractor.ts";

describe("Module 3.3: Enrichment Worker & Pipeline Integration", () => {
  const sampleDescriptionV1 = `
Acme Corp is hiring a Data Science Intern in Pune, India.
Work Mode: Remote.
Stipend: ₹30,000 per month.
Requirements:
• Python and SQL
• Familiarity with Pandas is preferred
• Pursuing B.Tech or M.Tech in CS/IT
Deadline: 2026-07-15
  `.trim();

  const sampleDescriptionV2 = `
Acme Corp is hiring a Data Science Intern in Pune, India.
Work Mode: Remote.
Stipend: ₹45,000 per month.
Requirements:
• Python and SQL
• Familiarity with Pandas is preferred
• Pursuing B.Tech or M.Tech in CS/IT
Deadline: 2026-07-15
  `.trim();

  const mockExtractionJsonV1 = JSON.stringify({
    schema_version: SCHEMA_VERSION,
    prompt_version: PROMPT_VERSION,
    basic: {
      role_title: "Data Science Intern",
      company: "Acme Corp",
      department: null,
      description_summary: "Data Science internship role working with Python and SQL.",
    },
    opportunity_type: {
      primary_type: "internship",
      provenance: { source_snippet: "Data Science Intern" },
    },
    skills: {
      required_skills: [
        { name: "Python", category: "programming_language", source_snippet: "Python" },
        { name: "SQL", category: "database", source_snippet: "and SQL" },
      ],
      preferred_skills: [
        { name: "Pandas", category: "framework", source_snippet: "Familiarity with Pandas is preferred" },
      ],
      inferred_skills: [
        { name: "Data Analysis", rationale: "Inferred from data science context" },
      ],
    },
    qualifications: {
      degree_levels: ["Bachelors", "Masters"],
      branches: ["Computer Science", "Information Technology"],
      graduationYears: [],
      min_cgpa: null,
      academic_requirements: "Pursuing B.Tech or M.Tech in CS/IT",
      provenance: { source_snippet: "Pursuing B.Tech or M.Tech in CS/IT" },
    },
    experience: {
      experience_level: "entry",
      min_experience_months: 0,
      max_experience_months: null,
      provenance: { source_snippet: "Intern" },
    },
    location: {
      work_mode: "remote",
      cities: ["Pune"],
      state_or_region: null,
      country: "India",
      is_worldwide: false,
      provenance: { source_snippet: "Pune, India" },
    },
    compensation: {
      is_paid: true,
      currency: "INR",
      min_amount: 30000,
      max_amount: 30000,
      interval: "monthly",
      text_verbatim: "₹30,000 per month",
      provenance: { source_snippet: "Stipend: ₹30,000 per month." },
    },
    timeline: {
      application_deadline: "2026-07-15",
      start_date: null,
      duration_text: null,
      provenance: { source_snippet: "Deadline: 2026-07-15" },
    },
    eligibility: {
      work_authorization: null,
      explicit_restrictions: [],
      target_audience: "CS/IT students",
      provenance: null,
    },
    confidence: {
      overall_score: 0.96,
      field_scores: {
        skills: 1.0,
        opportunity_type: 1.0,
        qualifications: 0.95,
        location: 1.0,
        compensation: 1.0,
        timeline: 1.0,
      },
    },
    quality: {
      missing_fields: [],
      unsupported_claims: [],
      extraction_errors: [],
      needs_manual_review: false,
      review_reasons: [],
    },
  });

  function createMockPrisma(initialOpportunities: any[] = []) {
    const opportunities = [...initialOpportunities];
    const enrichments: any[] = [];

    const mockPrisma: any = {
      $transaction: async (cb: any) => cb(mockPrisma),
      opportunity: {
        findUnique: async ({ where }: any) => opportunities.find((o) => o.id === where.id),
        findMany: async ({ where }: any) => {
          return opportunities.filter((o) => {
            if (where?.status && o.status !== where.status) return false;
            return true;
          });
        },
      },
      opportunityEnrichment: {
        findFirst: async ({ where }: any) => {
          return enrichments.find((e) => {
            if (e.opportunityId !== where.opportunityId) return false;
            if (where.contentHash && e.contentHash !== where.contentHash) return false;
            if (where.schemaVersion && e.schemaVersion !== where.schemaVersion) return false;
            if (where.promptVersion && e.promptVersion !== where.promptVersion) return false;
            if (where.status && where.status.in && !where.status.in.includes(e.status)) return false;
            return true;
          });
        },
        create: async ({ data }: any) => {
          enrichments.push({ ...data });
          return data;
        },
        updateMany: async ({ where, data }: any) => {
          let count = 0;
          for (const e of enrichments) {
            if (e.opportunityId === where.opportunityId) {
              Object.assign(e, data);
              count++;
            }
          }
          return { count };
        },
      },
      _getEnrichments: () => enrichments,
      _getOpportunities: () => opportunities,
    };

    return mockPrisma;
  }

  describe("End-to-End Enrichment & Immutability", () => {
    it("enriches opportunity, persists structured record, and leaves raw description untouched", async () => {
      const mockPrisma = createMockPrisma([
        {
          id: "opp_ai_001",
          title: "Data Science Intern",
          organizationName: "Acme Corp",
          description: sampleDescriptionV1,
          status: "ACTIVE",
          postedAt: new Date("2026-11-10"),
        },
      ]);

      const mockClient = new MockLlmExtractionClient(mockExtractionJsonV1);
      const service = new OpportunityEnrichmentService(mockPrisma, mockClient);

      const result = await service.enrichOpportunity({
        opportunityId: "opp_ai_001",
      });

      assert.equal(result.success, true);
      assert.equal(result.status, "succeeded");
      assert.equal(result.isCurrent, true);
      assert.equal(typeof result.contentHash, "string");

      // Verify enrichment record in DB
      const enrichments = mockPrisma._getEnrichments();
      assert.equal(enrichments.length, 1);
      const record = enrichments[0];

      assert.equal(record.opportunityId, "opp_ai_001");
      assert.equal(record.roleTitle, "Data Science Intern");
      assert.equal(record.company, "Acme Corp");
      assert.equal(record.workMode, "remote");
      assert.deepEqual(record.cities, ["Pune"]);
      assert.deepEqual(record.requiredSkills, ["Python", "SQL"]);
      assert.deepEqual(record.preferredSkills, ["Pandas"]);
      assert.deepEqual(record.inferredSkills, ["Data Analysis"]);
      assert.equal(record.isPaid, true);
      assert.equal(record.minAmount, 30000);
      assert.equal(record.isCurrent, true);
      assert.ok(record.rawPayload);

      // Verify IMMUTABILITY: original Opportunity description is completely unmodified
      const opp = mockPrisma._getOpportunities()[0];
      assert.equal(opp.description, sampleDescriptionV1);
      assert.equal(opp.status, "ACTIVE"); // Lifecycle status untouched
    });
  });

  describe("Idempotency Gate", () => {
    it("skips redundant LLM extraction when content_hash is identical", async () => {
      const mockPrisma = createMockPrisma([
        {
          id: "opp_ai_002",
          title: "Data Science Intern",
          organizationName: "Acme Corp",
          description: sampleDescriptionV1,
        },
      ]);

      let llmCalls = 0;
      const mockClient = new MockLlmExtractionClient(mockExtractionJsonV1);
      mockClient.generateCompletion = async () => {
        llmCalls++;
        return { rawText: mockExtractionJsonV1, latencyMs: 5 };
      };

      const service = new OpportunityEnrichmentService(mockPrisma, mockClient);

      // Run 1: First enrichment
      const res1 = await service.enrichOpportunity({ opportunityId: "opp_ai_002" });
      assert.equal(res1.success, true);
      assert.equal(res1.skipped, undefined);
      assert.equal(llmCalls, 1);

      // Run 2: Second enrichment with identical description
      const res2 = await service.enrichOpportunity({ opportunityId: "opp_ai_002" });
      assert.equal(res2.success, true);
      assert.equal(res2.skipped, true);
      assert.match(res2.reason!, /Identical content_hash already successfully enriched/);
      assert.equal(llmCalls, 1); // Zero additional LLM calls made!
    });
  });

  describe("Historical Versioning & isCurrent Toggle", () => {
    it("retires prior version to isCurrent = false when content is updated and reprocessed", async () => {
      const mockPrisma = createMockPrisma([
        {
          id: "opp_ai_003",
          title: "Data Science Intern",
          organizationName: "Acme Corp",
          description: sampleDescriptionV1, // Initial v1 (₹30,000)
        },
      ]);

      const mockClient = new MockLlmExtractionClient(mockExtractionJsonV1);
      const service = new OpportunityEnrichmentService(mockPrisma, mockClient);

      // 1. Initial enrichment (v1)
      await service.enrichOpportunity({ opportunityId: "opp_ai_003" });

      const enrichmentsBefore = mockPrisma._getEnrichments();
      assert.equal(enrichmentsBefore.length, 1);
      assert.equal(enrichmentsBefore[0].isCurrent, true);
      assert.equal(enrichmentsBefore[0].minAmount, 30000);

      // 2. Collector updates opportunity description (stipend changed to ₹45,000)
      mockPrisma._getOpportunities()[0].description = sampleDescriptionV2;

      // Update mock client response to match ₹45,000
      const mockExtractionV2 = JSON.parse(mockExtractionJsonV1);
      mockExtractionV2.compensation.min_amount = 45000;
      mockExtractionV2.compensation.max_amount = 45000;
      mockExtractionV2.compensation.text_verbatim = "₹45,000 per month";
      mockExtractionV2.compensation.provenance.source_snippet = "Stipend: ₹45,000 per month.";
      mockClient.setDefaultResponse(JSON.stringify(mockExtractionV2));

      // 3. Second enrichment (v2)
      const res2 = await service.enrichOpportunity({ opportunityId: "opp_ai_003" });
      assert.equal(res2.success, true);
      assert.equal(res2.isCurrent, true);

      // 4. Verify historical preservation in DB
      const enrichmentsAfter = mockPrisma._getEnrichments();
      assert.equal(enrichmentsAfter.length, 2);

      // v1 is preserved but retired (isCurrent = false)
      assert.equal(enrichmentsAfter[0].minAmount, 30000);
      assert.equal(enrichmentsAfter[0].isCurrent, false);

      // v2 is active (isCurrent = true)
      assert.equal(enrichmentsAfter[1].minAmount, 45000);
      assert.equal(enrichmentsAfter[1].isCurrent, true);
    });
  });

  describe("Resilient Failure Handling", () => {
    it("records status = failed without altering opportunity when LLM permanently fails", async () => {
      const mockPrisma = createMockPrisma([
        {
          id: "opp_ai_004",
          title: "Data Science Intern",
          description: sampleDescriptionV1,
          status: "ACTIVE",
        },
      ]);

      const failingClient: any = {
        generateCompletion: async () => {
          throw new Error("503 Service Unavailable from AI gateway");
        },
      };

      const service = new OpportunityEnrichmentService(mockPrisma, failingClient);

      const result = await service.enrichOpportunity({
        opportunityId: "opp_ai_004",
      });

      assert.equal(result.success, false);
      assert.equal(result.status, "failed");
      assert.match(result.error!, /503 Service Unavailable/);

      // Verify failed record was recorded in DB with diagnostics
      const enrichments = mockPrisma._getEnrichments();
      assert.equal(enrichments.length, 1);
      assert.equal(enrichments[0].status, "failed");
      assert.equal(enrichments[0].isCurrent, false);
      assert.ok(enrichments[0].errorDetails);

      // Verify Opportunity is completely unharmed
      const opp = mockPrisma._getOpportunities()[0];
      assert.equal(opp.status, "ACTIVE");
    });
  });

  describe("EnrichmentWorker: Autonomous Worker Lifecycle & Concurrency (Module 3.4)", () => {
    it("respects feature flag and exits immediately when disabled", async () => {
      const mockPrisma = createMockPrisma([
        {
          id: "opp_flag_01",
          title: "Frontend Intern",
          description: sampleDescriptionV1,
          status: "ACTIVE",
        },
      ]);
      const mockClient = new MockLlmExtractionClient(mockExtractionJsonV1);
      const worker = new (await import("../enrichmentWorker.ts")).EnrichmentWorker(
        mockPrisma,
        mockClient,
        { enabled: false }
      );

      assert.equal(worker.isEnabled(), false);
      const result = await worker.run();
      assert.equal(result.enabled, false);
      assert.equal(result.processedCount, 0);
      assert.equal(mockPrisma._getEnrichments().length, 0);
    });

    it("filters eligibility strictly: selects active fresh, skips expired/closed and already current", async () => {
      const { EnrichmentWorker } = await import("../enrichmentWorker.ts");
      const mockPrisma = createMockPrisma([
        {
          id: "opp_eligible_1",
          title: "Eligible Role",
          description: sampleDescriptionV1,
          status: "ACTIVE",
        },
        {
          id: "opp_ineligible_expired",
          title: "Expired Role",
          description: sampleDescriptionV1,
          status: "EXPIRED",
        },
        {
          id: "opp_ineligible_closed",
          title: "Closed Role",
          description: sampleDescriptionV1,
          status: "CLOSED",
        },
      ]);
      const mockClient = new MockLlmExtractionClient(mockExtractionJsonV1);
      const worker = new EnrichmentWorker(mockPrisma, mockClient, { enabled: true });

      // First run: only opp_eligible_1 is selected
      const eligible = await worker.selectEligibleOpportunities(10);
      assert.equal(eligible.length, 1);
      assert.equal(eligible[0].id, "opp_eligible_1");
    });

    it("ensures concurrency safety: two workers cannot claim the same opportunity simultaneously", async () => {
      const { EnrichmentWorker } = await import("../enrichmentWorker.ts");
      const mockPrisma = createMockPrisma([
        {
          id: "opp_concurrent_1",
          title: "Concurrent Role",
          description: sampleDescriptionV1,
          status: "ACTIVE",
        },
      ]);
      const mockClient = new MockLlmExtractionClient(mockExtractionJsonV1);
      const workerA = new EnrichmentWorker(mockPrisma, mockClient, { enabled: true });
      const workerB = new EnrichmentWorker(mockPrisma, mockClient, { enabled: true });

      // Worker A claims lease
      const claimA = workerA.claimLease("opp_concurrent_1");
      assert.equal(claimA, true);

      // Worker B attempts to claim lease on same opportunity -> rejected!
      const claimB = workerB.claimLease("opp_concurrent_1");
      assert.equal(claimB, false);

      // Worker A finishes and releases lease
      workerA.releaseLease("opp_concurrent_1");

      // Worker B can now claim lease
      const claimBAfter = workerB.claimLease("opp_concurrent_1");
      assert.equal(claimBAfter, true);
      workerB.releaseLease("opp_concurrent_1");
    });

    it("runs batch enrichment cleanly with error tracking", async () => {
      const { EnrichmentWorker } = await import("../enrichmentWorker.ts");
      const mockPrisma = createMockPrisma([
        {
          id: "opp_batch_1",
          title: "Batch Role 1",
          description: sampleDescriptionV1,
          status: "ACTIVE",
        },
      ]);
      const mockClient = new MockLlmExtractionClient(mockExtractionJsonV1);
      const worker = new EnrichmentWorker(mockPrisma, mockClient, {
        enabled: true,
        batchSize: 5,
        concurrency: 2,
      });

      const res = await worker.run();
      assert.equal(res.enabled, true);
      assert.equal(res.processedCount, 1);
      assert.equal(res.succeededCount, 1);
      assert.equal(res.failedCount, 0);

      // Second run: opp_batch_1 is already current, so 0 eligible
      const res2 = await worker.run();
      assert.equal(res2.processedCount, 0);
    });
  });
});
