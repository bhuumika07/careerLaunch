// src/lib/services/verification/__tests__/lifecycleConsistency.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isRecommendable,
  normalizeLifecycleStatus,
  mapToPrismaLifecycleStatus,
} from "../lifecycleConsistency.ts";
import { OpportunityQueryService } from "../../opportunities/opportunityQueryService.ts";

describe("Phase 2 Chunk 2.2: Lifecycle Consistency and Recommendation Exclusion", () => {
  const now = new Date("2026-11-16T12:00:00.000Z");
  const recentVerified = new Date(now.getTime() - 2 * 3600 * 1000).toISOString(); // 2 hours ago
  const staleVerified = new Date(now.getTime() - 96 * 3600 * 1000).toISOString(); // 96 hours ago (exceeds 72h)
  const futureDeadline = new Date(now.getTime() + 14 * 86400000).toISOString(); // 14 days in future
  const pastDeadline = new Date(now.getTime() - 2 * 86400000).toISOString(); // 2 days in past

  describe("1. Lifecycle Status Mapping and Normalization", () => {
    it("maps status strings onto canonical lifecycle states", () => {
      assert.strictEqual(normalizeLifecycleStatus("active"), "ACTIVE");
      assert.strictEqual(normalizeLifecycleStatus("closed"), "CLOSED");
      assert.strictEqual(normalizeLifecycleStatus("expired"), "EXPIRED");
      assert.strictEqual(normalizeLifecycleStatus("stale"), "STALE");
      assert.strictEqual(normalizeLifecycleStatus("removed"), "REMOVED");
      assert.strictEqual(normalizeLifecycleStatus("rejected"), "REJECTED");
    });

    it("evaluates past deadline as EXPIRED regardless of active status", () => {
      const status = normalizeLifecycleStatus("active", {
        deadline: pastDeadline,
        now,
      });
      assert.strictEqual(status, "EXPIRED");
    });

    it("evaluates stale verification window as STALE", () => {
      const status = normalizeLifecycleStatus("active", {
        lastVerifiedAt: staleVerified,
        freshnessThresholdHours: 72,
        now,
      });
      assert.strictEqual(status, "STALE");
    });

    it("evaluates quarantined opportunities as REJECTED", () => {
      const status = normalizeLifecycleStatus("active", {
        isQuarantined: true,
      });
      assert.strictEqual(status, "REJECTED");
    });

    it("maps to Prisma LifecycleStatus enum correctly", () => {
      assert.strictEqual(mapToPrismaLifecycleStatus("ACTIVE"), "active");
      assert.strictEqual(mapToPrismaLifecycleStatus("STALE"), "expiring");
      assert.strictEqual(mapToPrismaLifecycleStatus("EXPIRED"), "expired");
      assert.strictEqual(mapToPrismaLifecycleStatus("CLOSED"), "removed");
      assert.strictEqual(mapToPrismaLifecycleStatus("REMOVED"), "removed");
      assert.strictEqual(mapToPrismaLifecycleStatus("REJECTED"), "removed");
    });
  });

  describe("2. Central isRecommendable Predicate (ONLY ACTIVE Counts)", () => {
    const baseCleanOpp = {
      id: "opp_valid_recommendable",
      title: "Backend Engineer",
      status: "ACTIVE",
      lastVerifiedAt: recentVerified,
      deadline: futureDeadline,
      isQuarantined: false,
    };

    it("returns true for ACTIVE, fresh opportunity with future deadline", () => {
      assert.strictEqual(
        isRecommendable(baseCleanOpp, { now, freshnessThresholdHours: 72 }),
        true
      );
    });

    it("returns true for ACTIVE, fresh opportunity with NULL deadline (never expires)", () => {
      const nullDeadlineOpp = { ...baseCleanOpp, deadline: null };
      assert.strictEqual(
        isRecommendable(nullDeadlineOpp, { now, freshnessThresholdHours: 72 }),
        true
      );
    });

    it("strictly excludes CLOSED opportunities", () => {
      const closedOpp = { ...baseCleanOpp, status: "CLOSED" };
      assert.strictEqual(isRecommendable(closedOpp, { now }), false);
    });

    it("strictly excludes EXPIRED opportunities (past deadline)", () => {
      const expiredOpp = { ...baseCleanOpp, deadline: pastDeadline };
      assert.strictEqual(isRecommendable(expiredOpp, { now }), false);
    });

    it("strictly excludes STALE opportunities (exceeding freshness window)", () => {
      const staleOpp = { ...baseCleanOpp, lastVerifiedAt: staleVerified };
      assert.strictEqual(
        isRecommendable(staleOpp, { now, freshnessThresholdHours: 72 }),
        false
      );
    });

    it("strictly excludes REJECTED opportunities", () => {
      const rejectedOpp = { ...baseCleanOpp, verificationStatus: "rejected" };
      assert.strictEqual(isRecommendable(rejectedOpp, { now }), false);
    });

    it("strictly excludes REMOVED opportunities", () => {
      const removedOpp = { ...baseCleanOpp, lifecycleStatus: "removed" };
      assert.strictEqual(isRecommendable(removedOpp, { now }), false);
    });

    it("strictly excludes QUARANTINED opportunities", () => {
      const quarantinedOpp = { ...baseCleanOpp, isQuarantined: true };
      assert.strictEqual(isRecommendable(quarantinedOpp, { now }), false);
    });
  });

  describe("3. Application Tracking Invariant (Saved Applications Remain Open & Accessible)", () => {
    it("preserves access to saved applications even when opportunities are expired, closed, stale, or quarantined", async () => {
      const service = new OpportunityQueryService();
      const testStudentId = "student_lifecycle_test";

      const oppActive = {
        id: "opp_lifecycle_active",
        title: "Active Job",
        status: "ACTIVE",
        lastVerifiedAt: recentVerified,
        deadline: futureDeadline,
        isQuarantined: false,
      };

      const oppClosed = {
        id: "opp_lifecycle_closed",
        title: "Closed Job",
        status: "closed",
        lastVerifiedAt: recentVerified,
        deadline: futureDeadline,
        isQuarantined: false,
      };

      const oppExpired = {
        id: "opp_lifecycle_expired",
        title: "Expired Job",
        status: "expired",
        lastVerifiedAt: recentVerified,
        deadline: pastDeadline,
        isQuarantined: false,
      };

      const oppQuarantined = {
        id: "opp_lifecycle_quarantined",
        title: "Quarantined Job",
        status: "active",
        lastVerifiedAt: recentVerified,
        deadline: null,
        isQuarantined: true,
      };

      // Simulated student applications
      const studentApps = [
        {
          id: "app_1",
          opportunityId: "opp_lifecycle_active",
          studentId: testStudentId,
          status: "Submitted",
          appliedAt: recentVerified,
        },
        {
          id: "app_2",
          opportunityId: "opp_lifecycle_closed",
          studentId: testStudentId,
          status: "Shortlisted",
          appliedAt: recentVerified,
        },
        {
          id: "app_3",
          opportunityId: "opp_lifecycle_expired",
          studentId: testStudentId,
          status: "Under review",
          appliedAt: recentVerified,
        },
        {
          id: "app_4",
          opportunityId: "opp_lifecycle_quarantined",
          studentId: testStudentId,
          status: "Selected",
          appliedAt: recentVerified,
        },
      ];

      const allOpportunities = [oppActive, oppClosed, oppExpired, oppQuarantined];

      // Verify that recommendations only select the active one
      const recommended = allOpportunities.filter((o) =>
        isRecommendable(o, { now, freshnessThresholdHours: 72 })
      );
      assert.strictEqual(recommended.length, 1);
      assert.strictEqual(recommended[0].id, "opp_lifecycle_active");

      // Verify hydration for student application tracking: ALL 4 remain open and accessible!
      const hydrated = studentApps.map((app) => {
        const opp = allOpportunities.find((o) => o.id === app.opportunityId);
        const isExpiredOrClosed = opp ? opp.status === "closed" || opp.status === "expired" : true;
        return {
          ...app,
          opportunity: opp || null,
          isExpiredOrClosed,
          confirmationSource: "self_reported",
        };
      });

      assert.strictEqual(hydrated.length, 4, "All 4 applications must be accessible");

      // App 1: Active
      assert.strictEqual(hydrated[0].opportunity?.id, "opp_lifecycle_active");
      assert.strictEqual(hydrated[0].isExpiredOrClosed, false);

      // App 2: Closed (accessible, marked closed)
      assert.strictEqual(hydrated[1].opportunity?.id, "opp_lifecycle_closed");
      assert.strictEqual(hydrated[1].isExpiredOrClosed, true);
      assert.strictEqual(hydrated[1].status, "Shortlisted");

      // App 3: Expired (accessible, marked expired)
      assert.strictEqual(hydrated[2].opportunity?.id, "opp_lifecycle_expired");
      assert.strictEqual(hydrated[2].isExpiredOrClosed, true);

      // App 4: Quarantined (accessible to student owner who applied!)
      assert.strictEqual(hydrated[3].opportunity?.id, "opp_lifecycle_quarantined");
      assert.strictEqual(hydrated[3].status, "Selected");
    });
  });
});
