// src/lib/services/connectors/__tests__/normalizationAndDedup.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTitle,
  normalizeLocation,
  normalizeExperience,
  normalizeEmploymentType,
  normalizeDate,
} from "../normalization/normalizationEngine.ts";
import {
  normalizeCanonicalUrl,
  generateOpportunityFingerprint,
  calculateTokenSimilarity,
  DeduplicationEngine,
} from "../deduplication/deduplicationEngine.ts";
import { DEDUP_TEST_FIXTURES } from "../deduplication/testFixtures.ts";
import { generateDeduplicationReport } from "../deduplication/dedupReporter.ts";

describe("Chunk 5: Normalization and Deduplication", () => {
  describe("1. Title Normalization", () => {
    it("standardizes engineering titles, seniority, and domains", () => {
      const sde1 = normalizeTitle("SDE 1 - Distributed Core");
      assert.equal(sde1.canonicalTitle, "Software Engineer");
      assert.equal(sde1.seniority, "entry");
      assert.equal(sde1.domain, "Engineering");

      const srFrontend = normalizeTitle("Sr. Frontend Software Engineer (React)");
      assert.equal(srFrontend.canonicalTitle, "Frontend Engineer");
      assert.equal(srFrontend.seniority, "senior");
      assert.equal(srFrontend.domain, "Engineering");

      const intern = normalizeTitle("Product Design Intern (Summer 2027)");
      assert.equal(intern.canonicalTitle, "Product Design Intern");
      assert.equal(intern.seniority, "fresher");
      assert.equal(intern.domain, "Design");

      const ml = normalizeTitle("Lead Machine Learning Engineer");
      assert.equal(ml.canonicalTitle, "Machine Learning Engineer");
      assert.equal(ml.seniority, "lead");
      assert.equal(ml.domain, "Artificial Intelligence");
    });
  });

  describe("2. Location Normalization", () => {
    it("resolves Indian tech hubs to standardized city, state, and country", () => {
      const blr = normalizeLocation("BLR / Bangalore • Hybrid");
      assert.equal(blr.city, "Bengaluru");
      assert.equal(blr.state, "Karnataka");
      assert.equal(blr.country, "India");
      assert.equal(blr.workMode, "hybrid");
      assert.equal(blr.isRemote, false);
      assert.equal(blr.formattedLocation, "Bengaluru, Karnataka, India");

      const hyd = normalizeLocation("Hyderabad, Telangana");
      assert.equal(hyd.city, "Hyderabad");
      assert.equal(hyd.state, "Telangana");
      assert.equal(hyd.country, "India");

      const gurgaon = normalizeLocation("Gurgaon, NCR");
      assert.equal(gurgaon.city, "Gurugram");
      assert.equal(gurgaon.state, "Haryana");
      assert.equal(gurgaon.country, "India");

      const pune = normalizeLocation("Pune, India (Work From Home)");
      assert.equal(pune.city, "Pune");
      assert.equal(pune.workMode, "remote");
      assert.equal(pune.isRemote, true);
    });

    it("resolves global metros and remote flags correctly", () => {
      const sf = normalizeLocation("San Francisco, CA");
      assert.equal(sf.city, "San Francisco");
      assert.equal(sf.state, "California");
      assert.equal(sf.country, "United States");

      const remote = normalizeLocation("Remote - Worldwide");
      assert.equal(remote.workMode, "remote");
      assert.equal(remote.isRemote, true);
      assert.match(remote.formattedLocation, /remote/i);
    });
  });

  describe("3. Experience Level & Eligibility Normalization", () => {
    it("identifies fresher-friendly roles and extracts experience year ranges", () => {
      const intern = normalizeExperience("Data Science Intern", "Requires current student status");
      assert.equal(intern.level, "fresher");
      assert.equal(intern.isFresherFriendly, true);
      assert.equal(intern.minYears, 0);

      const fresher = normalizeExperience("Graduate Trainee", "0 - 1 years of experience required");
      assert.equal(fresher.level, "fresher");
      assert.equal(fresher.isFresherFriendly, true);

      const entry = normalizeExperience("Junior Software Developer", "1 to 3 years experience with Python");
      assert.equal(entry.level, "entry");
      assert.equal(entry.minYears, 1);
      assert.equal(entry.maxYears, 3);
      assert.equal(entry.isFresherFriendly, false);

      const senior = normalizeExperience("Staff Infrastructure Engineer", "7+ years in distributed systems");
      assert.equal(senior.level, "senior");
      assert.equal(senior.minYears, 5);
    });
  });

  describe("4. Employment Type & Date Normalization", () => {
    it("normalizes employment types accurately", () => {
      assert.equal(normalizeEmploymentType("Permanent", "Software Engineer"), "job");
      assert.equal(normalizeEmploymentType("Summer Intern", "Engineering"), "internship");
      assert.equal(normalizeEmploymentType("Contractor", "QA Tester"), "contract");
      assert.equal(normalizeEmploymentType("Postdoctoral Fellowship"), "fellowship");
    });

    it("standardizes Unix timestamps and date strings into ISO format", () => {
      const fromSec = normalizeDate(1792767640);
      assert.ok(fromSec?.startsWith("2026-"));

      const fromMs = normalizeDate(1792767640000);
      assert.ok(fromMs?.startsWith("2026-"));

      const fromIso = normalizeDate("2026-11-15T12:00:00Z");
      assert.equal(fromIso, "2026-11-15T12:00:00.000Z");

      assert.equal(normalizeDate("invalid_date"), null);
    });
  });

  describe("5. Deduplication Engine (3-Layer Pipeline)", () => {
    it("Layer 1: detects duplicates by stripping tracking parameters from canonical URLs", () => {
      const [opp1, opp2] = DEDUP_TEST_FIXTURES.canonicalUrlDuplicates;
      const clean1 = normalizeCanonicalUrl(opp1.originalUrl);
      const clean2 = normalizeCanonicalUrl(opp2.originalUrl);

      assert.equal(clean1, clean2);
      assert.equal(clean1, "https://boards.greenhouse.io/cloudflare/jobs/8038898");

      const engine = new DeduplicationEngine();
      const res1 = engine.process(opp1);
      assert.equal(res1.isNew, true);

      const res2 = engine.process(opp2);
      assert.equal(res2.isNew, false);
      assert.equal(res2.matchType, "canonical_url");
      assert.equal(res2.opportunity.id, opp1.id);
    });

    it("Layer 2: detects cross-source duplicates via deterministic fingerprint", () => {
      const [ghOpp, leverOpp] = DEDUP_TEST_FIXTURES.fingerprintDuplicates;
      const fp1 = generateOpportunityFingerprint(ghOpp);
      const fp2 = generateOpportunityFingerprint(leverOpp);

      assert.equal(fp1, fp2);

      const engine = new DeduplicationEngine();
      const res1 = engine.process(ghOpp);
      assert.equal(res1.isNew, true);

      const res2 = engine.process(leverOpp);
      assert.equal(res2.isNew, false);
      assert.equal(res2.matchType, "fingerprint");
      assert.equal(res2.opportunity.id, ghOpp.id);
    });

    it("Layer 3: detects slight title and company variants via fuzzy matching", () => {
      const [oppA, oppB] = DEDUP_TEST_FIXTURES.fuzzyDuplicates;
      const engine = new DeduplicationEngine();

      const res1 = engine.process(oppA);
      assert.equal(res1.isNew, true);

      const res2 = engine.process(oppB);
      assert.equal(res2.isNew, false);
      assert.equal(res2.matchType, "fuzzy");
      assert.equal(res2.opportunity.id, oppA.id);
    });

    it("distinguishes truly different roles at the same company", () => {
      const [swe, sec] = DEDUP_TEST_FIXTURES.distinctOpportunities;
      const engine = new DeduplicationEngine();

      const res1 = engine.process(swe);
      const res2 = engine.process(sec);

      assert.equal(res1.isNew, true);
      assert.equal(res2.isNew, true);
      assert.equal(engine.getOpportunities().length, 2);
    });
  });

  describe("6. Provenance Retention & Deduplication Reporting", () => {
    it("NEVER discards provenance: retains all source references on merged records", () => {
      const [ghOpp, leverOpp] = DEDUP_TEST_FIXTURES.fingerprintDuplicates;
      const engine = new DeduplicationEngine();

      engine.process(ghOpp);
      const res = engine.process(leverOpp);

      const merged = res.opportunity;
      assert.equal(merged.sourceProvenance.length, 2);

      const sources = merged.sourceProvenance.map((s) => s.sourceId);
      assert.ok(sources.includes("greenhouse"));
      assert.ok(sources.includes("lever"));

      // Verify URLs and raw payload refs are preserved
      assert.equal(merged.sourceProvenance[0].originalUrl, ghOpp.originalUrl);
      assert.equal(merged.sourceProvenance[1].originalUrl, leverOpp.originalUrl);
      assert.equal(merged.sourceProvenance[0].rawPayloadRef, ghOpp.rawPayloadRef);
      assert.equal(merged.sourceProvenance[1].rawPayloadRef, leverOpp.rawPayloadRef);
    });

    it("generates a comprehensive deduplication report with zero provenance loss", () => {
      const allFixtures = [
        ...DEDUP_TEST_FIXTURES.canonicalUrlDuplicates,
        ...DEDUP_TEST_FIXTURES.fingerprintDuplicates,
        ...DEDUP_TEST_FIXTURES.fuzzyDuplicates,
        ...DEDUP_TEST_FIXTURES.distinctOpportunities,
      ];

      const { report } = generateDeduplicationReport(allFixtures);

      assert.equal(report.totalInputOpportunities, 8);
      assert.equal(report.totalUniqueCanonical, 5); // 3 pairs merged + 2 distinct
      assert.equal(report.totalDuplicatesMerged, 3);
      assert.equal(report.matchLayerBreakdown.canonicalUrlMatches, 1);
      assert.equal(report.matchLayerBreakdown.fingerprintMatches, 1);
      assert.equal(report.matchLayerBreakdown.fuzzyMatches, 1);

      // Provenance check invariant
      assert.equal(report.provenanceCheck.zeroProvenanceLoss, true);
      assert.equal(report.provenanceCheck.totalSourceReferencesRetained, 8);
      assert.equal(report.mergedExamples.length, 3);
    });
  });
});
