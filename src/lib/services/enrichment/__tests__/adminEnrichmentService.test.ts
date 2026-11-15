// src/lib/services/enrichment/__tests__/adminEnrichmentService.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeEnrichmentMetrics,
  getEnrichmentReviewQueue,
  getEnrichmentDiagnostics,
  applyAdminReviewAction,
} from "../adminEnrichmentService.ts";

describe("Admin Review & Diagnostics Service (Chunk 7)", () => {
  const mockOpportunities = [
    {
      id: "opp_1",
      title: "Backend Engineer",
      organizationName: "Vercel",
      description: "Build Next.js cloud edge platform.",
    },
    {
      id: "opp_2",
      title: "ML Engineering Intern",
      organizationName: "Cohere",
      description: "Train large generative models.",
    },
    {
      id: "opp_3",
      title: "Security Analyst",
      organizationName: "Cloudflare",
      description: "Protect global internet infrastructure.",
    },
  ];

  const mockEnrichments = [
    {
      id: "enr_1",
      opportunityId: "opp_1",
      status: "succeeded",
      overallConfidence: 0.92,
      fieldConfidences: { basic: 0.95, skills: 0.9, qualifications: 0.9 },
      missingFields: [],
      unsupportedClaims: [],
      contradictions: [],
      extractionModel: "mock-llm-v1",
      promptVersion: "2026-11-v1.0.0",
      schemaVersion: "2026-11-v1.0.0",
      contentHash: "hash123",
      processedAt: new Date("2026-11-15T10:00:00Z"),
      isCurrent: true,
      roleTitle: "Senior Backend Engineer",
      company: "Vercel",
      opportunityType: "full_time",
      workMode: "remote",
      requiredSkills: ["Go", "Node.js"],
      preferredSkills: ["Rust"],
    },
    {
      id: "enr_2",
      opportunityId: "opp_2",
      status: "needs_review",
      overallConfidence: 0.58, // Low confidence trigger
      fieldConfidences: { basic: 0.8, compensation: 0.3 },
      missingFields: ["min_experience_months", "application_deadline"],
      unsupportedClaims: [
        {
          field: "compensation",
          claimedValue: "$120,000",
          citedSnippet: null,
          reason: "Snippet not found in text",
        },
      ],
      contradictions: ["Intern role requires 36 months experience"],
      extractionModel: "mock-llm-v1",
      promptVersion: "2026-11-v1.0.0",
      schemaVersion: "2026-11-v1.0.0",
      contentHash: "hash456",
      processedAt: new Date("2026-11-15T11:00:00Z"),
      isCurrent: false,
      roleTitle: "ML Engineering Intern",
      company: "Cohere",
      opportunityType: "internship",
      workMode: "hybrid",
      requiredSkills: ["Python", "PyTorch"],
    },
    {
      id: "enr_3",
      opportunityId: "opp_3",
      status: "failed",
      overallConfidence: 0.0,
      fieldConfidences: {},
      missingFields: ["all"],
      unsupportedClaims: [],
      contradictions: [],
      extractionModel: "mock-llm-v1",
      promptVersion: "2026-11-v1.0.0",
      schemaVersion: "2026-11-v1.0.0",
      contentHash: "hash789",
      processedAt: new Date("2026-11-15T12:00:00Z"),
      isCurrent: false,
      retryCount: 3,
      errorDetails: { error: "LLM rate limit reached" },
    },
  ];

  describe("computeEnrichmentMetrics", () => {
    it("handles empty input safely", () => {
      const metrics = computeEnrichmentMetrics([]);
      assert.equal(metrics.totalProcessed, 0);
      assert.equal(metrics.succeededCount, 0);
      assert.equal(metrics.needsReviewCount, 0);
      assert.equal(metrics.failedCount, 0);
      assert.equal(metrics.averageConfidence, 0);
      assert.equal(metrics.topMissingFields.length, 0);
    });

    it("accurately computes breakdown, averages, and unsupported claims", () => {
      const metrics = computeEnrichmentMetrics(mockEnrichments);
      assert.equal(metrics.totalProcessed, 3);
      assert.equal(metrics.succeededCount, 1);
      assert.equal(metrics.needsReviewCount, 1);
      assert.equal(metrics.failedCount, 1);
      assert.equal(metrics.unsupportedClaimsCount, 1);

      // (0.92 + 0.58 + 0.0) / 3 = 0.500
      assert.equal(metrics.averageConfidence, 0.5);

      // 2 out of 3 have confidence < 0.65 (enr_2: 0.58, enr_3: 0.0) -> 66.7%
      assert.equal(metrics.lowConfidenceRate, 66.7);

      // Top missing fields
      assert.ok(metrics.topMissingFields.some((f) => f.field === "min_experience_months"));
      assert.ok(metrics.topMissingFields.some((f) => f.field === "application_deadline"));
    });
  });

  describe("getEnrichmentReviewQueue", () => {
    it("returns all items when status filter is 'all'", () => {
      const queue = getEnrichmentReviewQueue(mockEnrichments, mockOpportunities, {
        status: "all",
      });
      assert.equal(queue.totalCount, 3);
      assert.equal(queue.items.length, 3);
    });

    it("filters strictly by status = needs_review", () => {
      const queue = getEnrichmentReviewQueue(mockEnrichments, mockOpportunities, {
        status: "needs_review",
      });
      assert.equal(queue.totalCount, 1);
      assert.equal(queue.items[0].id, "enr_2");
      assert.equal(queue.items[0].opportunityTitle, "ML Engineering Intern");
      assert.equal(queue.items[0].employer, "Cohere");
      assert.equal(queue.items[0].unsupportedClaimsCount, 1);
    });

    it("filters by minConfidence threshold", () => {
      const queue = getEnrichmentReviewQueue(mockEnrichments, mockOpportunities, {
        minConfidence: 0.8,
      });
      assert.equal(queue.totalCount, 1);
      assert.equal(queue.items[0].id, "enr_1");
    });

    it("filters by text search query", () => {
      const queue = getEnrichmentReviewQueue(mockEnrichments, mockOpportunities, {
        query: "Vercel",
      });
      assert.equal(queue.totalCount, 1);
      assert.equal(queue.items[0].id, "enr_1");
    });

    it("filters by unsupported claims presence", () => {
      const queue = getEnrichmentReviewQueue(mockEnrichments, mockOpportunities, {
        hasUnsupportedClaims: true,
      });
      assert.equal(queue.totalCount, 1);
      assert.equal(queue.items[0].id, "enr_2");
    });

    it("paginates results accurately", () => {
      const queue = getEnrichmentReviewQueue(mockEnrichments, mockOpportunities, {
        limit: 1,
        page: 2,
      });
      assert.equal(queue.totalCount, 3);
      assert.equal(queue.totalPages, 3);
      assert.equal(queue.items.length, 1);
      assert.equal(queue.items[0].id, "enr_2");
    });
  });

  describe("getEnrichmentDiagnostics", () => {
    it("returns null when enrichment does not exist", () => {
      const diag = getEnrichmentDiagnostics("non_existent", mockEnrichments, mockOpportunities);
      assert.equal(diag, null);
    });

    it("returns full diagnostic detail for enr_2 with contradictions and unsupported claims", () => {
      const diag = getEnrichmentDiagnostics("enr_2", mockEnrichments, mockOpportunities);
      assert.ok(diag !== null);
      assert.equal(diag?.id, "enr_2");
      assert.equal(diag?.opportunityTitle, "ML Engineering Intern");
      assert.equal(diag?.employer, "Cohere");
      assert.equal(diag?.confidenceScore, 0.58);
      assert.equal(diag?.unsupportedClaims.length, 1);
      assert.equal(diag?.unsupportedClaims[0].field, "compensation");
      assert.equal(diag?.contradictions.length, 1);
      assert.equal(diag?.contradictions[0], "Intern role requires 36 months experience");
      assert.deepEqual(diag?.missingFields, ["min_experience_months", "application_deadline"]);
      assert.equal(diag?.structuredData.workMode, "hybrid");
    });
  });

  describe("applyAdminReviewAction", () => {
    it("approves a needs_review record and sets isCurrent = true", () => {
      const now = new Date("2026-11-15T15:00:00Z");
      const { updatedRecord, result } = applyAdminReviewAction(
        mockEnrichments[1], // enr_2
        "approve",
        {
          adminId: "admin_123",
          notes: "Audited manually, values verified.",
          now,
        }
      );

      assert.equal(result.success, true);
      assert.equal(result.newStatus, "succeeded");
      assert.equal(result.reviewedBy, "admin_123");
      assert.equal(updatedRecord.status, "succeeded");
      assert.equal(updatedRecord.isCurrent, true);
      assert.equal(updatedRecord.adminNotes, "Audited manually, values verified.");
    });

    it("overrides a record with partial manual edits", () => {
      const now = new Date("2026-11-15T15:00:00Z");
      const { updatedRecord, result } = applyAdminReviewAction(
        mockEnrichments[1], // enr_2
        "override",
        {
          adminId: "admin_123",
          notes: "Corrected work mode to remote.",
          editedPayload: { workMode: "remote" },
          now,
        }
      );

      assert.equal(result.success, true);
      assert.equal(result.newStatus, "succeeded");
      assert.equal(updatedRecord.workMode, "remote");
      assert.equal(updatedRecord.isCurrent, true);
      assert.equal(updatedRecord.adminNotes, "Corrected work mode to remote.");
    });

    it("rejects an enrichment record and sets isCurrent = false", () => {
      const now = new Date("2026-11-15T15:00:00Z");
      const { updatedRecord, result } = applyAdminReviewAction(
        mockEnrichments[1],
        "reject",
        {
          adminId: "admin_123",
          notes: "Description was completely unparseable.",
          now,
        }
      );

      assert.equal(result.success, true);
      assert.equal(result.newStatus, "failed");
      assert.equal(updatedRecord.status, "failed");
      assert.equal(updatedRecord.isCurrent, false);
      assert.equal(updatedRecord.errorDetails.reason, "Admin rejected enrichment");
    });
  });
});
