// src/lib/services/enrichment/__tests__/groqExtractionSchema.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ExtractionPayloadSchema,
  validateExtractionPayload,
  SCHEMA_VERSION,
  PROMPT_VERSION,
} from "../extractionSchema.ts";
import {
  GroqExtractionClient,
  MockLlmExtractionClient,
} from "../llmClient.ts";
import {
  extractOpportunityEnrichment,
  buildExtractionPrompts,
} from "../extractor.ts";

describe("Phase 3 Chunk 3.1: Groq Client, Zod Schema & Extraction Contract", () => {
  const validPayload = {
    opportunity_id: "opp_test_001",
    basic: {
      role_title: "Fullstack Engineer (Next.js & TypeScript)",
      description_summary: "Build scalable web applications and student dashboards using Next.js 16 and PostgreSQL.",
      domain: "software",
      provenance: {
        source_snippet: "Fullstack Engineer (Next.js & TypeScript)",
        char_start: 0,
        char_end: 42,
        confidence: 0.95,
      },
    },
    opportunity_type: {
      primary_type: "full_time",
      provenance: {
        source_snippet: "Full-time position based in San Francisco",
        char_start: 45,
        char_end: 86,
      },
    },
    skills: {
      required_skills: [
        { name: "TypeScript", category: "programming_language" },
        { name: "React", category: "framework" },
      ],
      preferred_skills: [
        { name: "PostgreSQL", category: "database" },
      ],
      inferred_skills: [
        { name: "Git", category: "tool" },
      ],
    },
    qualifications: {
      degree_levels: ["Bachelors"],
      branches: ["Computer Science"],
      graduation_years: [2025, 2026],
      min_cgpa: 7.5,
      academic_requirements: "Bachelor's in Computer Science or related field",
    },
    experience: {
      experience_level: "entry",
      min_experience_months: 0,
      max_experience_months: 24,
    },
    compensation: {
      is_paid: true,
      min_amount: 110000,
      max_amount: 140000,
      currency: "USD",
      interval: "yearly",
      text_verbatim: "$110,000 - $140,000 / year",
    },
    location: {
      work_mode: "hybrid",
      locations: [
        { city: "San Francisco", state: "CA", country: "USA", raw_location: "San Francisco, CA" },
      ],
    },
    metadata: {
      schema_version: SCHEMA_VERSION,
      prompt_version: PROMPT_VERSION,
      extracted_at: "2026-11-16T02:00:00.000Z",
      overall_confidence: 0.92,
      missing_fields: [],
      needs_manual_review: false,
      unsupported_claims: [],
    },
  };

  describe("1. Zod Schema Validation & Invariants", () => {
    it("successfully validates a fully-formed extraction payload", () => {
      const result = validateExtractionPayload(validPayload);
      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.opportunity_id, "opp_test_001");
      assert.strictEqual(result.data.basic.role_title, "Fullstack Engineer (Next.js & TypeScript)");
    });

    it("accepts null for absent compensation and qualifications (null-if-absent rule)", () => {
      const payloadWithNulls = {
        ...validPayload,
        compensation: null,
        qualifications: {
          degree_levels: [],
          branches: [],
          graduation_years: [],
          min_cgpa: null,
          academic_requirements: null,
        },
      };

      const result = validateExtractionPayload(payloadWithNulls);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data?.compensation, null);
      assert.strictEqual(result.data?.qualifications.min_cgpa, null);
    });

    it("rejects payload missing mandatory role_title", () => {
      const invalid = {
        ...validPayload,
        basic: {
          ...validPayload.basic,
          role_title: "", // empty role_title
        },
      };

      const result = validateExtractionPayload(invalid);
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
      const issues = result.error.issues.map((i) => i.path.join("."));
      assert.ok(issues.includes("basic.role_title"));
    });

    it("rejects payload missing opportunity_id", () => {
      const invalid = { ...validPayload };
      delete (invalid as any).opportunity_id;

      const result = validateExtractionPayload(invalid);
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });

    it("enforces strict separation of required, preferred, and inferred skills", () => {
      // Rejects when skills is not an object containing the three separate arrays
      const invalid = {
        ...validPayload,
        skills: {
          skills: ["TypeScript"], // Merged invalid shape
        },
      };

      const result = validateExtractionPayload(invalid);
      assert.strictEqual(result.success, false);
    });

    it("rejects invalid enum values for work_mode and primary_type", () => {
      const invalidWorkMode = {
        ...validPayload,
        location: {
          ...validPayload.location,
          work_mode: "telepathic", // Invalid work_mode
        },
      };
      assert.strictEqual(validateExtractionPayload(invalidWorkMode).success, false);

      const invalidType = {
        ...validPayload,
        opportunity_type: {
          primary_type: "random_type", // Invalid type
        },
      };
      assert.strictEqual(validateExtractionPayload(invalidType).success, false);
    });

    it("rejects out-of-range CGPA values (> 10)", () => {
      const invalidCgpa = {
        ...validPayload,
        qualifications: {
          ...validPayload.qualifications,
          min_cgpa: 15.0, // Invalid CGPA
        },
      };

      const result = validateExtractionPayload(invalidCgpa);
      assert.strictEqual(result.success, false);
    });
  });

  describe("2. Server-side Groq Client & Error Wrapping", () => {
    it("throws descriptive error when GROQ_API_KEY is not configured", async () => {
      const client = new GroqExtractionClient({ apiKey: "" });

      await assert.rejects(
        async () => {
          await client.extract({
            systemPrompt: "Test prompt",
            userPrompt: "Job description",
          });
        },
        (err: Error) => {
          assert.match(err.message, /GROQ_API_KEY is not configured server-side/);
          return true;
        }
      );
    });

    it("exposes model name correctly from config", () => {
      const client = new GroqExtractionClient({
        model: "llama-3.3-70b-versatile",
      });
      assert.strictEqual(client.getModelName(), "llama-3.3-70b-versatile");
    });
  });

  describe("3. Prompt Template & Versioning", () => {
    it("includes PROMPT_VERSION and strict null-if-absent instructions", () => {
      const prompts = buildExtractionPrompts({
        opportunity_id: "opp_prompt_test",
        raw_title: "Software Engineer",
        raw_company: "Cloudflare",
        normalized_description: "We are seeking a systems engineer to build network proxy software.",
      });

      assert.ok(prompts.systemPrompt.includes("STRICT INVARIANTS"));
      assert.ok(prompts.systemPrompt.includes("return null"));
      assert.ok(prompts.systemPrompt.includes("required_skills"));
      assert.ok(prompts.systemPrompt.includes("preferred_skills"));
      assert.ok(prompts.systemPrompt.includes("provenance"));
      assert.ok(prompts.userPrompt.includes("opp_prompt_test"));
      assert.ok(prompts.userPrompt.includes("Software Engineer"));
    });
  });

  describe("4. Mocked LLM Extraction & Provenance Grounding", () => {
    it("successfully runs extraction pipeline with MockLlmExtractionClient", async () => {
      const mockLlm = new MockLlmExtractionClient();
      mockLlm.setDefaultResponse(JSON.stringify(validPayload));

      const result = await extractOpportunityEnrichment(
        {
          opportunity_id: "opp_test_001",
          raw_title: "Fullstack Engineer",
          raw_company: "Acme",
          normalized_description: "Fullstack Engineer (Next.js & TypeScript). Full-time position based in San Francisco. $110,000 - $140,000 / year.",
        },
        mockLlm
      );

      assert.strictEqual(result.success, true);
      assert.ok(result.payload);
      assert.strictEqual(result.payload.basic.role_title, "Fullstack Engineer (Next.js & TypeScript)");
      assert.strictEqual(result.payload.schema_version, SCHEMA_VERSION);
      assert.strictEqual(result.payload.prompt_version, PROMPT_VERSION);
    });

    it("retries upon receiving malformed JSON from LLM and succeeds when corrected", async () => {
      const mockLlm = new MockLlmExtractionClient();
      mockLlm.simulateTransientFailures(1); // 1 failure before responding
      mockLlm.setDefaultResponse(JSON.stringify(validPayload));

      const result = await extractOpportunityEnrichment(
        {
          opportunity_id: "opp_test_002",
          raw_title: "Frontend Developer",
          raw_company: "Beta Corp",
          normalized_description: "Frontend Developer position.",
        },
        mockLlm,
        { retryBaseDelayMs: 10 }
      );

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.attempts, 2);
    });
  });
});
