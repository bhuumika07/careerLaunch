// src/lib/services/enrichment/__tests__/enrichmentIntegration.test.ts
/**
 * End-to-End Integration, Resilience & Failure Testing for Phase 3:
 * AI Opportunity Enrichment (Chunk 8 - Milestone 3.4 part 2)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { OpportunityEnrichmentService } from "../enrichmentService.ts";
import { filterEnrichedStudentFeed } from "../studentEnrichmentQuery.ts";
import {
  getEnrichmentDiagnostics,
  getEnrichmentReviewQueue,
  applyAdminReviewAction,
} from "../adminEnrichmentService.ts";
import { PROMPT_VERSION, SCHEMA_VERSION } from "../extractor.ts";
import type { LlmExtractionClient } from "../llmClient.ts";

describe("Phase 3 E2E Integration: AI Opportunity Enrichment Journey", () => {
  const now = new Date("2026-11-15T12:00:00.000Z");
  const recentVerified = new Date(now.getTime() - 2 * 3600 * 1000).toISOString();
  const futureDeadline = new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString();

  // Simulated in-memory relational database
  function createTestDb() {
    const opportunities: any[] = [];
    const enrichments: any[] = [];

    const mockPrisma: any = {
      $transaction: async (cb: any) => cb(mockPrisma),
      opportunity: {
        findUnique: async ({ where }: any) =>
          opportunities.find((o) => o.id === where.id) || null,
        update: async ({ where, data }: any) => {
          const opp = opportunities.find((o) => o.id === where.id);
          if (opp) Object.assign(opp, data);
          return opp;
        },
      },
      opportunityEnrichment: {
        findFirst: async ({ where }: any) => {
          return (
            enrichments.find((e) => {
              if (where.opportunityId && e.opportunityId !== where.opportunityId) return false;
              if (where.contentHash && e.contentHash !== where.contentHash) return false;
              if (where.schemaVersion && e.schemaVersion !== where.schemaVersion) return false;
              if (where.promptVersion && e.promptVersion !== where.promptVersion) return false;
              if (where.isCurrent !== undefined && e.isCurrent !== where.isCurrent) return false;
              return true;
            }) || null
          );
        },
        findMany: async ({ where }: any = {}) => {
          if (!where) return enrichments;
          return enrichments.filter((e) => {
            if (where.opportunityId && e.opportunityId !== where.opportunityId) return false;
            if (where.isCurrent !== undefined && e.isCurrent !== where.isCurrent) return false;
            return true;
          });
        },
        findUnique: async ({ where }: any) =>
          enrichments.find((e) => e.id === where.id) || null,
        create: async ({ data }: any) => {
          enrichments.push({ ...data });
          return data;
        },
        updateMany: async ({ where, data }: any) => {
          let count = 0;
          for (const e of enrichments) {
            if (where.opportunityId && e.opportunityId !== where.opportunityId) continue;
            if (where.id && where.id.not && e.id === where.id.not) continue;
            Object.assign(e, data);
            count++;
          }
          return { count };
        },
        update: async ({ where, data }: any) => {
          const item = enrichments.find((e) => e.id === where.id);
          if (item) Object.assign(item, data);
          return item;
        },
      },
    };

    return {
      opportunities,
      enrichments,
      mockPrisma,
    };
  }

  let testDb = createTestDb();

  it("executes the full Phase 3 lifecycle: Ingest -> Normalize -> AI Extraction -> Immutability Check -> Student Discovery -> Admin Diagnostics", async () => {
    testDb = createTestDb();

    // 1. Initial Opportunity Ingestion (Phase 1/2)
    const rawHtmlDescription = `
      <div class="job-posting">
        <h2>Frontend Systems Engineer (Remote)</h2>
        <p>Join CloudScale Labs to build mission-critical distributed web consoles.</p>
        
        <h3>Required Qualifications</h3>
        <ul>
          <li>Proficient in <strong>TypeScript</strong> and <strong>React</strong></li>
          <li>Experience with <strong>Tailwind CSS</strong> and modern design systems</li>
          <li>Bachelor's degree in Computer Science, Software Engineering or related discipline</li>
          <li>Graduating class of 2025 or 2026</li>
        </ul>

        <h3>Preferred Qualifications</h3>
        <ul>
          <li>Experience with Next.js and GraphQL</li>
        </ul>

        <h3>Compensation & Mode</h3>
        <p>Work Mode: Remote. Compensation: $120,000 - $140,000 / year.</p>
      </div>
    `;

    const originalOpportunity = {
      id: "opp_e2e_1",
      title: "Frontend Systems Engineer",
      organizationName: "CloudScale Labs",
      description: rawHtmlDescription,
      status: "ACTIVE",
      lastVerifiedAt: recentVerified,
      applicationDeadline: futureDeadline,
      workMode: "remote",
      category: "Jobs",
      skills: ["Frontend Dev"],
    };

    testDb.opportunities.push(originalOpportunity);

    // 2. Mock LLM Extraction Client with grounding and contract-compliant JSON
    const mockLlmClient: LlmExtractionClient = {
      async generateCompletion() {
        return {
          rawText: JSON.stringify({
          basic: {
            role_title: "Frontend Systems Engineer",
            company: "CloudScale Labs",
            department: "Web Infrastructure",
            description_summary: "Build mission-critical distributed web consoles in TypeScript and React.",
          },
          opportunity_type: {
            primary_type: "full_time",
            provenance: {
              source_snippet: "Frontend Systems Engineer",
            },
          },
          skills: {
            required_skills: [
              {
                name: "TypeScript",
                category: "programming_language",
                source_snippet: "Proficient in TypeScript and React",
              },
              {
                name: "React",
                category: "framework",
                source_snippet: "Proficient in TypeScript and React",
              },
              {
                name: "Tailwind CSS",
                category: "framework",
                source_snippet: "Experience with Tailwind CSS and modern design systems",
              },
            ],
            preferred_skills: [
              {
                name: "Next.js",
                category: "framework",
                source_snippet: "Experience with Next.js and GraphQL",
              },
            ],
            inferred_skills: [
              {
                name: "Component Architecture",
                rationale: "Required experience with modern design systems implies component architecture expertise.",
              },
            ],
          },
          qualifications: {
            degree_levels: ["Bachelors"],
            branches: ["Computer Science", "Software Engineering"],
            graduation_years: [2025, 2026],
            min_cgpa: null,
            academic_requirements: "Bachelor's degree in Computer Science or Software Engineering.",
            provenance: {
              source_snippet: "Bachelor's degree in Computer Science, Software Engineering or related discipline",
            },
          },
          experience: {
            experience_level: "entry",
            min_experience_months: 0,
            max_experience_months: 24,
            provenance: null,
          },
          location: {
            work_mode: "remote",
            country: "United States",
            state_or_region: null,
            cities: [],
            is_worldwide: true,
            is_relocation_offered: false,
            provenance: {
              source_snippet: "Work Mode: Remote.",
            },
          },
          compensation: {
            is_paid: true,
            currency: "USD",
            min_amount: 120000,
            max_amount: 140000,
            interval: "yearly",
            text_verbatim: "$120,000 - $140,000 / year",
            provenance: {
              source_snippet: "$120,000 - $140,000 / year.",
            },
          },
          timeline: {
            application_deadline: futureDeadline,
            start_date: null,
            duration_months: null,
            is_rolling: true,
            provenance: null,
          },
          eligibility: {
            work_authorization: "Any authorized",
            visas_sponsored: false,
            security_clearance: "none",
            explicit_restrictions: [],
            target_audience: "College graduates and entry-level engineers",
            provenance: null,
          },
          confidence: {
            overall_score: 0.95,
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
        }),
        };
      },
    };

    // 3. Execute Worker Enrichment Service
    const enrichmentService = new OpportunityEnrichmentService(testDb.mockPrisma, mockLlmClient);
    const enrichmentResult = await enrichmentService.enrichOpportunity({ opportunityId: "opp_e2e_1" });

    assert.equal(enrichmentResult.success, true);
    assert.equal(enrichmentResult.status, "succeeded");
    assert.equal(enrichmentResult.isCurrent, true);
    assert.ok(enrichmentResult.contentHash.length === 64); // SHA-256 hash length

    // 4. Hard Rule Invariant: Opportunity.description is NEVER overwritten
    const oppAfterEnrichment = testDb.opportunities.find((o) => o.id === "opp_e2e_1");
    assert.equal(oppAfterEnrichment.description, rawHtmlDescription);

    // 5. Verify database persistence in additive child table
    assert.equal(testDb.enrichments.length, 1);
    const savedEnrichment = testDb.enrichments[0];
    assert.equal(savedEnrichment.opportunityId, "opp_e2e_1");
    assert.equal(savedEnrichment.status, "succeeded");
    assert.equal(savedEnrichment.isCurrent, true);
    assert.equal(savedEnrichment.roleTitle, "Frontend Systems Engineer");
    assert.deepEqual(savedEnrichment.requiredSkills, ["TypeScript", "React", "Tailwind CSS"]);
    assert.deepEqual(savedEnrichment.preferredSkills, ["Next.js"]);
    assert.deepEqual(savedEnrichment.degreeLevels, ["Bachelors"]);
    assert.deepEqual(savedEnrichment.graduationYears, [2025, 2026]);
    assert.equal(savedEnrichment.compensationVerbatim, "$120,000 - $140,000 / year");

    // 6. Student Discovery Feed Search & Filtering
    // Attach enrichment relation for student feed test
    oppAfterEnrichment.enrichment = savedEnrichment;

    // A. Filter by extracted required skill: "TypeScript"
    const skillFeedResult = filterEnrichedStudentFeed(testDb.opportunities, {
      now,
      skills: ["TypeScript"],
    });
    assert.equal(skillFeedResult.totalCount, 1);
    assert.equal(skillFeedResult.opportunities[0].id, "opp_e2e_1");

    // B. Filter by extracted graduation class: 2026
    const gradYearFeedResult = filterEnrichedStudentFeed(testDb.opportunities, {
      now,
      graduationYears: [2026],
    });
    assert.equal(gradYearFeedResult.totalCount, 1);

    // C. Filter by incompatible graduation class: 2030 (should exclude)
    const incompatibleGradResult = filterEnrichedStudentFeed(testDb.opportunities, {
      now,
      graduationYears: [2030],
    });
    assert.equal(incompatibleGradResult.totalCount, 0);

    // D. Filter by extracted workMode: remote
    const remoteFeedResult = filterEnrichedStudentFeed(testDb.opportunities, {
      now,
      workMode: "remote",
    });
    assert.equal(remoteFeedResult.totalCount, 1);

    // 7. Admin Diagnostics & Inspection
    const diagnostics = getEnrichmentDiagnostics(
      savedEnrichment.id,
      testDb.enrichments,
      testDb.opportunities
    );
    assert.ok(diagnostics !== null);
    assert.equal(diagnostics?.opportunityTitle, "Frontend Systems Engineer");
    assert.equal(diagnostics?.employer, "CloudScale Labs");
    assert.equal(diagnostics?.status, "succeeded");
    assert.equal(diagnostics?.promptVersion, PROMPT_VERSION);
    assert.equal(diagnostics?.schemaVersion, SCHEMA_VERSION);
    assert.equal(diagnostics?.unsupportedClaims.length, 0);
  });

  it("idempotency gate: skips redundant extraction when content hash is unchanged", async () => {
    testDb = createTestDb();

    let llmCallCount = 0;
    const countingLlmClient: LlmExtractionClient = {
      async generateCompletion() {
        llmCallCount++;
        return {
          rawText: JSON.stringify({
            basic: {
              role_title: "Idempotency Test Role",
              company: "Test Co",
              description_summary: "Test summary.",
            },
          opportunity_type: { primary_type: "internship", provenance: null },
          skills: { required_skills: [], preferred_skills: [], inferred_skills: [] },
          qualifications: { degree_levels: [], branches: [], graduation_years: [] },
          experience: { experience_level: "entry" },
          location: { work_mode: "remote" },
          compensation: { is_paid: false },
          timeline: {},
          eligibility: {},
          confidence: {
            overall_score: 0.95,
            field_scores: {
              skills: 1.0,
              opportunity_type: 1.0,
              qualifications: 1.0,
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
        }),
        };
      },
    };

    const opp = {
      id: "opp_idempotent_1",
      title: "Test Role",
      description: "Fixed unchanging description text for testing.",
      status: "ACTIVE",
      lastVerifiedAt: recentVerified,
    };
    testDb.opportunities.push(opp);

    const enrichmentService = new OpportunityEnrichmentService(testDb.mockPrisma, countingLlmClient);

    // First run -> executes LLM extraction
    const firstResult = await enrichmentService.enrichOpportunity({ opportunityId: "opp_idempotent_1" });
    assert.equal(firstResult.success, true);
    assert.equal(firstResult.skipped ?? false, false);
    assert.equal(llmCallCount, 1);
    assert.equal(testDb.enrichments.length, 1);

    // Second run with same content -> should be bypassed by SHA-256 idempotency gate
    const secondResult = await enrichmentService.enrichOpportunity({ opportunityId: "opp_idempotent_1" });
    if (!secondResult.skipped) {
      console.log("DEBUG SECOND RESULT:", secondResult, "ENRICHMENTS IN DB:", testDb.enrichments.length);
    }
    assert.equal(secondResult.success, true);
    assert.equal(secondResult.skipped, true);
    assert.equal(llmCallCount, 1); // Zero additional LLM calls
    assert.equal(testDb.enrichments.length, 1); // No duplicate rows created
  });

  it("historical versioning: retires prior version when description materially changes", async () => {
    testDb = createTestDb();

    let versionCounter = 1;
    const versionedLlmClient: LlmExtractionClient = {
      async generateCompletion() {
        const v = versionCounter++;
        return {
          rawText: JSON.stringify({
            basic: {
              role_title: `Role Version ${v}`,
              company: "Evolving Org",
              description_summary: `Summary for version ${v}`,
            },
          opportunity_type: { primary_type: "full_time", provenance: null },
          skills: { required_skills: [], preferred_skills: [], inferred_skills: [] },
          qualifications: { degree_levels: [], branches: [], graduation_years: [] },
          experience: { experience_level: "entry" },
          location: { work_mode: "remote" },
          compensation: { is_paid: false },
          timeline: {},
          eligibility: {},
          confidence: {
            overall_score: 0.95,
            field_scores: {
              skills: 1.0,
              opportunity_type: 1.0,
              qualifications: 1.0,
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
        }),
        };
      },
    };

    const opp = {
      id: "opp_versioning_1",
      title: "Software Engineer",
      description: "Initial description version A.",
      status: "ACTIVE",
      lastVerifiedAt: recentVerified,
    };
    testDb.opportunities.push(opp);

    const enrichmentService = new OpportunityEnrichmentService(testDb.mockPrisma, versionedLlmClient);

    // Initial extraction: Version 1
    const v1 = await enrichmentService.enrichOpportunity({ opportunityId: "opp_versioning_1" });
    assert.equal(v1.success, true);
    assert.equal(v1.isCurrent, true);
    assert.equal(testDb.enrichments.length, 1);
    assert.equal(testDb.enrichments[0].isCurrent, true);

    // Update opportunity description materially
    opp.description = "Updated description version B with completely revised requirements.";

    // Second extraction: Version 2
    const v2 = await enrichmentService.enrichOpportunity({ opportunityId: "opp_versioning_1" });
    assert.equal(v2.success, true);
    assert.equal(v2.isCurrent, true);
    assert.equal(testDb.enrichments.length, 2);

    // Prior version is preserved for audit trail with isCurrent = false
    const priorEnrichment = testDb.enrichments.find((e) => e.id === v1.enrichmentId);
    assert.equal(priorEnrichment?.isCurrent, false);

    // New version is active with isCurrent = true
    const newEnrichment = testDb.enrichments.find((e) => e.id === v2.enrichmentId);
    assert.equal(newEnrichment?.isCurrent, true);
  });

  it("resilience & failure isolation: permanent LLM failure does not crash or block student feed", async () => {
    testDb = createTestDb();

    const failingLlmClient: LlmExtractionClient = {
      async generateCompletion() {
        throw new Error("HTTP 503 Upstream LLM Capacity Overloaded");
      },
    };

    const opp = {
      id: "opp_failure_1",
      title: "Site Reliability Engineer",
      organizationName: "HighAvailability Inc",
      description: "Ensuring zero downtime across all services.",
      status: "ACTIVE",
      lastVerifiedAt: recentVerified,
      applicationDeadline: futureDeadline,
      workMode: "remote",
      skills: ["Linux", "Kubernetes"],
    };
    testDb.opportunities.push(opp);

    const enrichmentService = new OpportunityEnrichmentService(testDb.mockPrisma, failingLlmClient);

    // Execution should complete gracefully without throwing unhandled rejection
    const result = await enrichmentService.enrichOpportunity({ opportunityId: "opp_failure_1" });

    assert.equal(result.success, false);
    assert.equal(result.status, "failed");
    assert.equal(result.isCurrent, false);

    // Hard Rule Invariant: raw opportunity description remains untouched
    assert.equal(opp.description, "Ensuring zero downtime across all services.");

    // Hard Rule Invariant: student feed is never blocked; falls back cleanly to base attributes
    const studentFeed = filterEnrichedStudentFeed(testDb.opportunities, {
      now,
      skills: ["Linux"],
    });
    assert.equal(studentFeed.totalCount, 1);
    assert.equal(studentFeed.opportunities[0].id, "opp_failure_1");
    assert.equal(studentFeed.opportunities[0].status, "ACTIVE");
  });

  it("human-in-the-loop review flow: low-confidence extraction requires review, is approved, and becomes active", async () => {
    testDb = createTestDb();

    // Opportunity with contradictory / low-confidence data
    const lowConfidenceLlmClient: LlmExtractionClient = {
      async generateCompletion() {
        return {
          rawText: JSON.stringify({
            basic: {
              role_title: "Junior Intern",
              company: "ReviewCorp",
              description_summary: "Summer intern role requiring extensive executive experience.",
            },
          opportunity_type: { primary_type: "internship", provenance: null },
          skills: { required_skills: [], preferred_skills: [], inferred_skills: [] },
          qualifications: { degree_levels: ["Bachelors"], branches: [], graduation_years: [] },
          experience: {
            experience_level: "intern",
            min_experience_months: 48, // Contradiction: intern role with 48 months
            provenance: null,
          },
          location: { work_mode: "hybrid" },
          compensation: { is_paid: false },
          timeline: {},
          eligibility: {},
          confidence: {
            overall_score: 0.95,
            field_scores: {
              skills: 1.0,
              opportunity_type: 1.0,
              qualifications: 1.0,
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
        }),
        };
      },
    };

    const opp = {
      id: "opp_review_1",
      title: "Junior Intern",
      organizationName: "ReviewCorp",
      description: "Summer intern role requiring extensive executive experience.",
      status: "ACTIVE",
      lastVerifiedAt: recentVerified,
    };
    testDb.opportunities.push(opp);

    const enrichmentService = new OpportunityEnrichmentService(testDb.mockPrisma, lowConfidenceLlmClient);
    const enrichmentResult = await enrichmentService.enrichOpportunity({ opportunityId: "opp_review_1" });

    // Extraction succeeded but flagged for review
    assert.equal(enrichmentResult.success, true);
    assert.equal(enrichmentResult.status, "needs_review");

    // Review Queue surfaces the item
    const reviewQueue = getEnrichmentReviewQueue(testDb.enrichments, testDb.opportunities, {
      status: "needs_review",
    });
    assert.equal(reviewQueue.totalCount, 1);
    assert.equal(reviewQueue.items[0].id, enrichmentResult.enrichmentId);

    // Admin reviews and overrides experience requirement
    const record = testDb.enrichments.find((e) => e.id === enrichmentResult.enrichmentId);
    const { updatedRecord, result } = applyAdminReviewAction(record, "override", {
      adminId: "admin_sarah",
      notes: "Corrected experience requirement: removed erroneous 48-month experience cutoff.",
      editedPayload: { minExperienceMonths: 0 },
      now,
    });

    assert.equal(result.success, true);
    assert.equal(result.newStatus, "succeeded");
    assert.equal(updatedRecord.status, "succeeded");
    assert.equal(updatedRecord.isCurrent, true);
    assert.equal(updatedRecord.minExperienceMonths, 0);
  });
});
