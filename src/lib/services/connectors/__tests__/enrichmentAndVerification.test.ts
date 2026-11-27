// src/lib/services/connectors/__tests__/enrichmentAndVerification.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractSkills,
  classifyDomain,
  evaluateFresherFriendliness,
  summarizeDescription,
  enrichOpportunityData,
} from "../enrichment/aiEnricher.ts";
import {
  detectScam,
  probeUrlLiveness,
  verifyOpportunity,
} from "../verification/verifier.ts";
import { StaleListingReverifier } from "../verification/staleListingReverifier.ts";
import { VERIFICATION_TEST_FIXTURES } from "../verification/testFixtures.ts";

describe("Chunk 6: AI Enrichment and Verification", () => {
  describe("1. Skill Extraction & Normalization", () => {
    it("extracts technical and soft skills accurately with deduplication", () => {
      const text =
        "We are looking for a Senior Software Engineer with strong experience in Go, Rust, Docker, and Linux. Excellent communication skills and problem solving required.";
      const skills = extractSkills(text);

      assert.ok(skills.technicalSkills.includes("Go"));
      assert.ok(skills.technicalSkills.includes("Rust"));
      assert.ok(skills.toolsAndFrameworks.includes("Docker"));
      assert.ok(skills.toolsAndFrameworks.includes("Linux"));
      assert.ok(skills.softSkills.includes("Communication"));
      assert.ok(skills.softSkills.includes("Problem Solving"));
      assert.equal(skills.allSkills.length, 6);
    });

    it("handles empty or sparse inputs cleanly without hallucinations", () => {
      const empty = extractSkills("");
      assert.deepEqual(empty.allSkills, []);
      assert.deepEqual(empty.technicalSkills, []);
    });
  });

  describe("2. Domain Classification", () => {
    it("classifies diverse roles into canonical industry domains", () => {
      assert.equal(
        classifyDomain("Machine Learning Engineer", "PyTorch deep learning model training"),
        "data_ai_ml"
      );
      assert.equal(
        classifyDomain("Product Designer", "Figma design systems and user research"),
        "design"
      );
      assert.equal(
        classifyDomain("Cloud Infrastructure Architect", "Kubernetes, AWS, and Terraform"),
        "devops_cloud"
      );
      assert.equal(
        classifyDomain("Cybersecurity Analyst", "Penetration testing and vulnerability assessment"),
        "security"
      );
      assert.equal(
        classifyDomain("Fullstack Developer", "React, Node.js and PostgreSQL web applications"),
        "software"
      );
    });
  });

  describe("3. Fresher-Friendliness Evaluation", () => {
    it("recognizes student internships and 0-1 year roles as highly fresher-friendly", () => {
      const res = evaluateFresherFriendliness(
        "Software Engineering Intern",
        "Open to current students and recent graduates with 0 - 1 years of experience."
      );
      assert.equal(res.isFresherFriendly, true);
      assert.ok(res.confidence >= 0.85);
      assert.equal(res.minYears, 0);
    });

    it("rejects senior positions with strict 5+ year experience requirements", () => {
      const res = evaluateFresherFriendliness(
        "Principal Systems Architect",
        "Must have 7+ years of experience in distributed systems."
      );
      assert.equal(res.isFresherFriendly, false);
      assert.ok(res.confidence <= 0.3);
      assert.equal(res.minYears, 5);
    });
  });

  describe("4. Description Summarizer", () => {
    it("synthesizes concise factual summaries and avoids invented fields", () => {
      const summary = summarizeDescription(
        "Systems Engineer",
        "Cloudflare",
        "<p>Join Cloudflare's core infrastructure team to build globally distributed edge systems using Go and Rust. You will optimize low-latency network proxies. Equal opportunity employer.</p>"
      );
      assert.ok(summary);
      assert.ok(summary.includes("Cloudflare"));
      assert.ok(!summary.includes("Equal opportunity employer"));
    });

    it("returns null for sparse descriptions rather than hallucinating details", () => {
      assert.equal(summarizeDescription("QA", "Company", "Short text"), null);
    });
  });

  describe("5. Scam & Fraud Detection Heuristics", () => {
    it("detects fee-based scams and telegram recruitment with critical risk", () => {
      const scam = detectScam(VERIFICATION_TEST_FIXTURES.feeBasedScamJob);
      assert.equal(scam.isScam, true);
      assert.equal(scam.riskLevel, "critical");
      assert.ok(scam.scamScore >= 0.85);
      assert.ok(scam.detectedPatterns.some((p) => p.includes("fee")));
      assert.ok(scam.detectedPatterns.some((p) => p.includes("Telegram")));
    });

    it("detects personal free email usage and unrealistic claims", () => {
      const scam = detectScam(VERIFICATION_TEST_FIXTURES.freeEmailScamJob);
      assert.equal(scam.isScam, true);
      assert.ok(scam.scamScore >= 0.5);
      assert.ok(scam.detectedPatterns.some((p) => p.includes("gmail.com")));
    });

    it("validates legitimate company postings as safe with 0.0 scam score", () => {
      const safe = detectScam(VERIFICATION_TEST_FIXTURES.legitimateAtsJob);
      assert.equal(safe.isScam, false);
      assert.equal(safe.riskLevel, "safe");
      assert.equal(safe.scamScore, 0.0);
      assert.equal(safe.detectedPatterns.length, 0);
    });
  });

  describe("6. URL Liveness & Expiration Prober", () => {
    it("confirms live status for active HTTP 200 URLs", async () => {
      const mockFetch = async () =>
        new Response("OK", { status: 200, statusText: "OK" });

      const res = await probeUrlLiveness("https://boards.greenhouse.io/cloudflare/jobs/8038898", {
        mockFetch,
      });

      assert.equal(res.isLive, true);
      assert.equal(res.statusCode, 200);
      assert.equal(res.isExpiredOrClosed, false);
    });

    it("identifies closed postings via HTTP 404 or 410", async () => {
      const mockFetch = async () =>
        new Response("Not Found", { status: 404, statusText: "Not Found" });

      const res = await probeUrlLiveness("https://boards.greenhouse.io/datadog/jobs/99999999", {
        mockFetch,
      });

      assert.equal(res.isLive, false);
      assert.equal(res.statusCode, 404);
      assert.equal(res.isExpiredOrClosed, true);
    });

    it("rejects loopback and private SSRF IP addresses", async () => {
      const res = await probeUrlLiveness("http://127.0.0.1:8080/admin");
      assert.equal(res.isLive, false);
      assert.equal(res.isExpiredOrClosed, true);
      assert.ok(res.reason.includes("non-routable"));
    });
  });

  describe("7. End-to-End Verification & Confidence Scoring", () => {
    it("verifies legitimate ATS job with high confidence (>= 0.95)", async () => {
      const mockFetch = async () =>
        new Response("OK", { status: 200, statusText: "OK" });

      const res = await verifyOpportunity(VERIFICATION_TEST_FIXTURES.legitimateAtsJob, {
        mockFetch,
      });

      assert.equal(res.verificationStatus, "verified");
      assert.ok(res.confidenceScore >= 0.95);
      assert.equal(res.scamDetection.isScam, false);
    });

    it("flags scam listing as 'flagged_scam' with 0.0 confidence", async () => {
      const res = await verifyOpportunity(VERIFICATION_TEST_FIXTURES.feeBasedScamJob, {
        probeLiveness: false,
      });

      assert.equal(res.verificationStatus, "flagged_scam");
      assert.equal(res.confidenceScore, 0.0);
      assert.equal(res.scamDetection.isScam, true);
    });

    it("flags 404 URL as 'expired' with 0.0 confidence", async () => {
      const mockFetch = async () =>
        new Response("Not Found", { status: 404, statusText: "Not Found" });

      const res = await verifyOpportunity(VERIFICATION_TEST_FIXTURES.expiredClosedJob, {
        mockFetch,
      });

      assert.equal(res.verificationStatus, "expired");
      assert.equal(res.confidenceScore, 0.0);
    });
  });

  describe("8. Scheduled Re-verification Worker", () => {
    it("identifies stale listings and executes batch re-verification", async () => {
      const mockFetch = async (input: RequestInfo | URL) => {
        const urlStr = String(input);
        if (urlStr.includes("7777777")) {
          return new Response("OK", { status: 200, statusText: "OK" });
        }
        return new Response("Not Found", { status: 404 });
      };

      const reverifier = new StaleListingReverifier({
        maxStalenessHours: 24,
        mockFetch,
      });

      const staleTimestamp = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
      const freshTimestamp = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();

      const fixtures = [
        { ...VERIFICATION_TEST_FIXTURES.staleJob, lastVerifiedAt: staleTimestamp },
        { ...VERIFICATION_TEST_FIXTURES.legitimateAtsJob, lastVerifiedAt: freshTimestamp },
      ];

      // Stale job was verified 3 days ago, legitimate was verified 1 hour ago
      assert.equal(reverifier.isOpportunityStale(fixtures[0]), true);
      assert.equal(reverifier.isOpportunityStale(fixtures[1]), false);

      const batchResult = await reverifier.runReverification(fixtures);

      assert.equal(batchResult.totalEvaluated, 1);
      assert.equal(batchResult.stillActiveCount, 1);
      assert.equal(batchResult.errorsCount, 0);

      // Verify that timestamp was refreshed to now
      assert.notEqual(fixtures[0].lastVerifiedAt, staleTimestamp);
    });
  });
});
