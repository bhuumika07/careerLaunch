// src/lib/services/enrichment/__tests__/extractor.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  extractOpportunityEnrichment,
  buildExtractionPrompts,
  cleanJsonOutput,
  verifyAndGroundSnippet,
  calculateWeightedConfidence,
  postProcessAndGroundPayload,
  PROMPT_VERSION,
  SCHEMA_VERSION,
} from "../extractor.ts";
import { MockLlmExtractionClient } from "../llmClient.ts";
import type { OpportunityEnrichmentPayload } from "../types.ts";

describe("Module 3.2: AI Extraction Engine & Validation Pipeline", () => {
  const sampleNormalizedDescription = `
Acme Corp is hiring a Frontend Developer Intern in Bangalore, India.
Work Mode: Hybrid.
Stipend: ₹35,000 per month.
Requirements:
• Proficiency in React and TypeScript
• Experience with Tailwind CSS is preferred
• Currently pursuing B.Tech in Computer Science
Deadline: 2026-06-30
  `.trim();

  const validSampleOutput: OpportunityEnrichmentPayload = {
    schema_version: SCHEMA_VERSION,
    prompt_version: PROMPT_VERSION,
    basic: {
      role_title: "Frontend Developer Intern",
      company: "Acme Corp",
      department: null,
      description_summary: "Frontend Developer Intern role focusing on React and TypeScript in Bangalore.",
    },
    opportunity_type: {
      primary_type: "internship",
      provenance: { source_snippet: "Frontend Developer Intern" },
    },
    skills: {
      required_skills: [
        { name: "React", category: "framework", source_snippet: "Proficiency in React" },
        { name: "TypeScript", category: "programming_language", source_snippet: "and TypeScript" },
      ],
      preferred_skills: [
        { name: "Tailwind CSS", category: "framework", source_snippet: "Experience with Tailwind CSS is preferred" },
      ],
      inferred_skills: [
        { name: "Web Development", rationale: "Implied by frontend developer responsibilities" },
      ],
    },
    qualifications: {
      degree_levels: ["Bachelors"],
      branches: ["Computer Science"],
      graduation_years: [2027],
      min_cgpa: null,
      academic_requirements: "Currently pursuing B.Tech in Computer Science",
      provenance: { source_snippet: "Currently pursuing B.Tech in Computer Science" },
    },
    experience: {
      experience_level: "entry",
      min_experience_months: 0,
      max_experience_months: null,
      provenance: { source_snippet: "Intern" },
    },
    location: {
      work_mode: "hybrid",
      cities: ["Bangalore"],
      state_or_region: null,
      country: "India",
      is_worldwide: false,
      provenance: { source_snippet: "Bangalore, India" },
    },
    compensation: {
      is_paid: true,
      currency: "INR",
      min_amount: 35000,
      max_amount: 35000,
      interval: "monthly",
      text_verbatim: "₹35,000 per month",
      provenance: { source_snippet: "Stipend: ₹35,000 per month." },
    },
    timeline: {
      application_deadline: "2026-06-30",
      start_date: null,
      duration_text: null,
      provenance: { source_snippet: "Deadline: 2026-06-30" },
    },
    eligibility: {
      work_authorization: null,
      explicit_restrictions: [],
      target_audience: "B.Tech Computer Science students",
      provenance: null,
    },
    confidence: {
      overall_score: 0.95,
      field_scores: {
        skills: 1.0,
        opportunity_type: 1.0,
        qualifications: 0.9,
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
  };

  describe("Prompt Building & Versioning", () => {
    it("builds prompts including version markers and grounding invariants", () => {
      const input = {
        opportunity_id: "opp_101",
        raw_title: "Full Stack Intern",
        raw_company: "TechStar",
        posted_at: "2026-11-15",
        source_url: "https://example.com/job/101",
        normalized_description: sampleNormalizedDescription,
      };

      const prompts = buildExtractionPrompts(input);

      assert.match(prompts.systemPrompt, /schema version 1\.0\.0/);
      assert.match(prompts.systemPrompt, /ONLY extract information that is explicitly stated/);
      assert.match(prompts.systemPrompt, /required_skills/);
      assert.match(prompts.systemPrompt, /preferred_skills/);
      assert.match(prompts.systemPrompt, /inferred_skills/);
      assert.match(prompts.userPrompt, /opp_101/);
      assert.match(prompts.userPrompt, /Full Stack Intern/);
      assert.match(prompts.userPrompt, /Acme Corp is hiring/);
    });

    it("cleans markdown fences from LLM responses", () => {
      const fenced = '```json\n{"test": true}\n```';
      assert.equal(cleanJsonOutput(fenced), '{"test": true}');

      const raw = '{"test": true}';
      assert.equal(cleanJsonOutput(raw), '{"test": true}');
    });
  });

  describe("Provenance Grounding & Offsets", () => {
    it("grounds verbatim snippet and computes exact char_start and char_end", () => {
      const snippet = "Stipend: ₹35,000 per month.";
      const res = verifyAndGroundSnippet(snippet, sampleNormalizedDescription);

      assert.equal(res.grounded, true);
      assert.ok(typeof res.char_start === "number");
      assert.ok(typeof res.char_end === "number");

      // Verify that slice produces the exact substring
      const sliced = sampleNormalizedDescription.slice(res.char_start!, res.char_end!);
      assert.equal(sliced, snippet);
    });

    it("flags non-existent snippet as ungrounded with null offsets", () => {
      const hallucinatedSnippet = "Salary: $150,000 per annum with stock options";
      const res = verifyAndGroundSnippet(hallucinatedSnippet, sampleNormalizedDescription);

      assert.equal(res.grounded, false);
      assert.equal(res.char_start, null);
      assert.equal(res.char_end, null);
    });
  });

  describe("Confidence Calculation & Review Triggers", () => {
    it("calculates weighted confidence accurately per section 5.1 weights", () => {
      // Skills: 25%, Type: 20%, Quals: 20%, Location: 15%, Compensation: 10%, Timeline: 10%
      const fieldScores = {
        skills: 1.0, // 0.25
        opportunity_type: 1.0, // 0.20
        qualifications: 1.0, // 0.20
        location: 1.0, // 0.15
        compensation: 1.0, // 0.10
        timeline: 1.0, // 0.10
      };
      const score = calculateWeightedConfidence(fieldScores);
      assert.equal(score, 1.0);

      const lowerScores = {
        skills: 0.6,
        opportunity_type: 0.5,
        qualifications: 0.4,
        location: 0.5,
        compensation: 0.5,
        timeline: 0.5,
      };
      const lower = calculateWeightedConfidence(lowerScores);
      assert.ok(lower < 0.65);
    });

    it("flags needs_manual_review when overall confidence is below 0.65 threshold", () => {
      const payload: OpportunityEnrichmentPayload = JSON.parse(JSON.stringify(validSampleOutput));
      payload.confidence.field_scores = {
        skills: 0.4,
        opportunity_type: 0.4,
        qualifications: 0.4,
        location: 0.4,
        compensation: 0.4,
        timeline: 0.4,
      };

      const processed = postProcessAndGroundPayload(payload, sampleNormalizedDescription);

      assert.equal(processed.quality.needs_manual_review, true);
      assert.ok(processed.quality.review_reasons.some((r) => r.includes("< 0.65 threshold")));
    });

    it("flags needs_manual_review and records contradiction when intern role requires > 24 months experience", () => {
      const payload: OpportunityEnrichmentPayload = JSON.parse(JSON.stringify(validSampleOutput));
      payload.opportunity_type.primary_type = "internship";
      payload.experience.min_experience_months = 36; // 3 years for an internship!

      const processed = postProcessAndGroundPayload(payload, sampleNormalizedDescription);

      assert.equal(processed.quality.needs_manual_review, true);
      assert.ok(processed.quality.review_reasons.some((r) => r.includes("requires 36 months")));
    });

    it("records unsupported claim when a field cites an ungrounded snippet", () => {
      const payload: OpportunityEnrichmentPayload = JSON.parse(JSON.stringify(validSampleOutput));
      payload.compensation.provenance = {
        source_snippet: "Guaranteed $100/hr signing bonus",
      };

      const processed = postProcessAndGroundPayload(payload, sampleNormalizedDescription);

      assert.equal(processed.quality.needs_manual_review, true);
      assert.ok(processed.quality.unsupported_claims.length > 0);
      assert.ok(processed.quality.unsupported_claims.some((c) => c.includes("Guaranteed $100/hr")));
    });
  });

  describe("End-to-End Extraction Pipeline Execution", () => {
    it("successfully parses valid response and returns enriched payload", async () => {
      const mockClient = new MockLlmExtractionClient(JSON.stringify(validSampleOutput));

      const input = {
        opportunity_id: "opp_demo_1",
        raw_title: "Frontend Developer Intern",
        raw_company: "Acme Corp",
        normalized_description: sampleNormalizedDescription,
      };

      const result = await extractOpportunityEnrichment(input, mockClient);

      assert.equal(result.success, true);
      assert.equal(result.attempts, 1);
      assert.ok(result.payload);
      assert.equal(result.payload.basic.role_title, "Frontend Developer Intern");
      assert.equal(result.payload.skills.required_skills.length, 2);
      assert.equal(result.payload.skills.preferred_skills.length, 1);
      assert.equal(result.payload.skills.inferred_skills.length, 1);
      assert.equal(result.payload.confidence.overall_score, 0.98);
      assert.equal(result.payload.quality.needs_manual_review, false);
    });

    it("recovers from malformed JSON response on retry", async () => {
      const mockClient = new MockLlmExtractionClient();
      let callCount = 0;

      // First call returns malformed JSON, second call returns valid JSON
      mockClient.generateCompletion = async () => {
        callCount++;
        if (callCount === 1) {
          return {
            rawText: "I am an AI. Here is your result: { invalid json ...",
            latencyMs: 10,
          };
        }
        return {
          rawText: JSON.stringify(validSampleOutput),
          latencyMs: 15,
        };
      };

      const input = {
        opportunity_id: "opp_demo_retry",
        raw_title: "Frontend Developer Intern",
        raw_company: "Acme Corp",
        normalized_description: sampleNormalizedDescription,
      };

      const result = await extractOpportunityEnrichment(input, mockClient, {
        maxRetries: 3,
        retryBaseDelayMs: 10,
      });

      assert.equal(result.success, true);
      assert.equal(result.attempts, 2);
      assert.ok(result.payload);
      assert.equal(result.payload.basic.company, "Acme Corp");
    });

    it("returns error result when retries are exhausted", async () => {
      const mockClient = new MockLlmExtractionClient("Always broken non-json string");

      const input = {
        opportunity_id: "opp_demo_fail",
        raw_title: "Frontend Developer Intern",
        raw_company: "Acme Corp",
        normalized_description: sampleNormalizedDescription,
      };

      const result = await extractOpportunityEnrichment(input, mockClient, {
        maxRetries: 2,
        retryBaseDelayMs: 5,
      });

      assert.equal(result.success, false);
      assert.equal(result.attempts, 2);
      assert.match(result.error!, /JSON parse error/);
    });
  });
});
