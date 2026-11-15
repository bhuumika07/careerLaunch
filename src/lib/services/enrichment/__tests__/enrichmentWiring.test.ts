// src/lib/services/enrichment/__tests__/enrichmentWiring.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { OpportunityEnrichmentService } from "../enrichmentService.ts";
import { MockLlmExtractionClient, GroqExtractionClient } from "../llmClient.ts";
import { PROMPT_VERSION, SCHEMA_VERSION } from "../extractor.ts";

describe("Phase 3 Chunk 3.2: Enrichment Service and Worker Wiring", () => {
  const sampleDescription = `
Acme Engineering is seeking a Fullstack Software Engineer in Bangalore, India.
Work Mode: Hybrid.
Base Salary: ₹1,500,000 - ₹2,000,000 per year.
Requirements:
• 2+ years experience in TypeScript and React
• Proficiency with Node.js and PostgreSQL is required
• Experience with AWS is preferred
• Bachelor's degree in Computer Science or related technical field
Application Deadline: 2026-08-30
  `.trim();

  const fixtureExtractionPayload = {
    schema_version: SCHEMA_VERSION,
    prompt_version: PROMPT_VERSION,
    basic: {
      role_title: "Fullstack Software Engineer",
      company: "Acme Engineering",
      department: null,
      description_summary: "Fullstack software engineering position in Bangalore.",
      domain: "software",
      provenance: {
        source_snippet: "Fullstack Software Engineer in Bangalore",
        char_start: 30,
        char_end: 70,
      },
    },
    opportunity_type: {
      primary_type: "full_time",
      provenance: {
        source_snippet: "Fullstack Software Engineer",
      },
    },
    skills: {
      required_skills: [
        { name: "TypeScript", category: "programming_language", source_snippet: "TypeScript" },
        { name: "React", category: "framework", source_snippet: "React" },
        { name: "Node.js", category: "framework", source_snippet: "Node.js" },
        { name: "PostgreSQL", category: "database", source_snippet: "PostgreSQL" },
      ],
      preferred_skills: [
        { name: "AWS", category: "cloud_devops", source_snippet: "AWS is preferred" },
      ],
      inferred_skills: [
        { name: "REST APIs", rationale: "Inferred from fullstack role requirements" },
      ],
    },
    qualifications: {
      degree_levels: ["Bachelors"],
      branches: ["Computer Science"],
      graduation_years: [],
      min_cgpa: null,
      academic_requirements: "Bachelor's degree in Computer Science or related technical field",
      provenance: {
        source_snippet: "Bachelor's degree in Computer Science",
      },
    },
    experience: {
      experience_level: "mid",
      min_experience_months: 24,
      max_experience_months: null,
      provenance: {
        source_snippet: "2+ years experience",
      },
    },
    location: {
      work_mode: "hybrid",
      cities: ["Bangalore"],
      state_or_region: "Karnataka",
      country: "India",
      is_worldwide: false,
      provenance: {
        source_snippet: "Bangalore, India",
      },
    },
    compensation: {
      is_paid: true,
      currency: "INR",
      min_amount: 1500000,
      max_amount: 2000000,
      interval: "yearly",
      text_verbatim: "₹1,500,000 - ₹2,000,000 per year",
      provenance: {
        source_snippet: "₹1,500,000 - ₹2,000,000 per year",
      },
    },
    timeline: {
      application_deadline: "2026-08-30",
      start_date: null,
      duration_text: null,
      provenance: {
        source_snippet: "Application Deadline: 2026-08-30",
      },
    },
    eligibility: {
      work_authorization: null,
      explicit_restrictions: [],
      target_audience: null,
      provenance: null,
    },
    confidence: {
      overall_score: 0.95,
      field_scores: {
        skills: 1.0,
        opportunity_type: 1.0,
        qualifications: 0.95,
        location: 1.0,
        compensation: 0.95,
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
  };

  function createMockPrisma(initialOpportunities: any[] = []) {
    const opportunities = [...initialOpportunities];
    const enrichments: any[] = [];

    const mockPrisma: any = {
      $transaction: async (cb: any) => cb(mockPrisma),
      opportunity: {
        findUnique: async ({ where }: any) => opportunities.find((o) => o.id === where.id),
        findMany: async () => opportunities,
      },
      opportunityEnrichment: {
        findFirst: async ({ where }: any) => {
          return enrichments.find((e) => {
            if (e.opportunityId !== where.opportunityId) return false;
            if (where.contentHash && e.contentHash !== where.contentHash) return false;
            if (where.schemaVersion && e.schemaVersion !== where.schemaVersion) return false;
            if (where.promptVersion && e.promptVersion !== where.promptVersion) return false;
            if (where.status?.in && !where.status.in.includes(e.status)) return false;
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

  describe("1. End-to-End Fixture Enrichment", () => {
    it("enriches fixture opportunity end to end with versions and separated skills", async () => {
      const mockPrisma = createMockPrisma([
        {
          id: "opp_bangalore_001",
          title: "Fullstack Software Engineer",
          organizationName: "Acme Engineering",
          description: sampleDescription,
          status: "ACTIVE",
          postedAt: new Date("2026-11-15"),
        },
      ]);

      const mockClient = new MockLlmExtractionClient(JSON.stringify(fixtureExtractionPayload));
      const service = new OpportunityEnrichmentService(mockPrisma, mockClient);

      const result = await service.enrichOpportunity({
        opportunityId: "opp_bangalore_001",
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.status, "succeeded");
      assert.strictEqual(result.isCurrent, true);
      assert.ok(result.contentHash);

      const records = mockPrisma._getEnrichments();
      assert.strictEqual(records.length, 1);
      const record = records[0];

      // Verifies versions persisted
      assert.strictEqual(record.schemaVersion, SCHEMA_VERSION);
      assert.strictEqual(record.promptVersion, PROMPT_VERSION);
      assert.strictEqual(record.contentHash, result.contentHash);

      // Verifies strict skill tier separation
      assert.deepStrictEqual(record.requiredSkills, ["TypeScript", "React", "Node.js", "PostgreSQL"]);
      assert.deepStrictEqual(record.preferredSkills, ["AWS"]);
      assert.deepStrictEqual(record.inferredSkills, ["REST APIs"]);
      // Inferred skill is NOT in requiredSkills
      assert.ok(!record.requiredSkills.includes("REST APIs"));

      // Verifies compensation & deadline
      assert.strictEqual(record.isPaid, true);
      assert.strictEqual(record.minAmount, 1500000);
      assert.strictEqual(record.maxAmount, 2000000);
      assert.strictEqual(record.compensationInterval, "yearly");
      assert.ok(record.applicationDeadline instanceof Date);

      // Verifies provenance snippets and confidence preserved in rawPayload
      assert.ok(record.rawPayload);
      assert.ok(record.overallConfidence >= 0.9);
      assert.strictEqual(record.needsManualReview, false);
    });
  });

  describe("2. Idempotency Gate", () => {
    it("skips re-enrichment when content hash is unchanged", async () => {
      const mockPrisma = createMockPrisma([
        {
          id: "opp_bangalore_001",
          title: "Fullstack Software Engineer",
          organizationName: "Acme Engineering",
          description: sampleDescription,
          status: "ACTIVE",
        },
      ]);

      let callCount = 0;
      const mockClient = new MockLlmExtractionClient();
      mockClient.generateCompletion = async () => {
        callCount++;
        return {
          rawText: JSON.stringify(fixtureExtractionPayload),
          latencyMs: 10,
        };
      };

      const service = new OpportunityEnrichmentService(mockPrisma, mockClient);

      // First run: calls LLM
      const res1 = await service.enrichOpportunity({ opportunityId: "opp_bangalore_001" });
      assert.strictEqual(res1.success, true);
      assert.strictEqual(res1.skipped, undefined);
      assert.strictEqual(callCount, 1);

      // Second run with same description: skips LLM call
      const res2 = await service.enrichOpportunity({ opportunityId: "opp_bangalore_001" });
      assert.strictEqual(res2.success, true);
      assert.strictEqual(res2.skipped, true);
      assert.strictEqual(res2.reason, "Identical content_hash already successfully enriched");
      assert.strictEqual(callCount, 1); // No new LLM invocation
    });
  });

  describe("3. Resilience & Groq Outage Isolation", () => {
    it("handles Groq outage gracefully without blocking ingestion or corrupting raw listing", async () => {
      const mockPrisma = createMockPrisma([
        {
          id: "opp_bangalore_002",
          title: "Fullstack Software Engineer",
          organizationName: "Acme Engineering",
          description: sampleDescription,
          status: "ACTIVE",
        },
      ]);

      // Simulate a live Groq outage (503 Service Unavailable / Rate Limit 429)
      const failingClient = new MockLlmExtractionClient();
      failingClient.generateCompletion = async () => {
        throw new Error("[GroqExtractionClient] 503 Service Unavailable: Groq API gateway overloaded");
      };

      const service = new OpportunityEnrichmentService(mockPrisma, failingClient);

      // Service execution fails safely
      const result = await service.enrichOpportunity({
        opportunityId: "opp_bangalore_002",
      });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.status, "failed");
      assert.strictEqual(result.isCurrent, false);
      assert.ok(result.error?.includes("Groq API gateway overloaded"));

      // Ingestion listing is completely uncorrupted and stays ACTIVE
      const opps = mockPrisma._getOpportunities();
      assert.strictEqual(opps[0].status, "ACTIVE");
      assert.strictEqual(opps[0].description, sampleDescription);

      // Failed record was persisted with audit metadata
      const records = mockPrisma._getEnrichments();
      assert.strictEqual(records.length, 1);
      assert.strictEqual(records[0].status, "failed");
      assert.strictEqual(records[0].isCurrent, false);
      assert.ok(records[0].errorDetails.error.includes("Groq API gateway overloaded"));
    });
  });
});
