// src/lib/services/verification/__tests__/freshnessSweeper.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FreshnessAndExpirySweeper,
  determineFreshnessPriority,
  calculateEffectiveFreshnessThresholdHours,
} from "../freshnessManager.ts";
import { OpportunityLifecycleManager } from "../lifecycleManager.ts";
import type { VerificationResult } from "../types.ts";

describe("Chunk 8: Freshness Manager & Expiry Sweep", () => {
  function createMockPrisma(opportunities: any[]) {
    const oppStore = opportunities.map((o) => ({ ...o }));
    const changes: any[] = [];

    const mockPrisma = {
      opportunity: {
        findMany: async ({ where }: any) => {
          return oppStore.filter((o) => {
            if (where.status?.in && !where.status.in.includes(o.status)) {
              return false;
            }
            if (where.status && typeof where.status === "string" && o.status !== where.status) {
              return false;
            }
            if (where.applicationDeadline?.not === null && !o.applicationDeadline) {
              return false;
            }
            if (where.applicationDeadline?.lte && o.applicationDeadline) {
              if (o.applicationDeadline > where.applicationDeadline.lte) {
                return false;
              }
            }
            return true;
          });
        },
        update: async ({ where, data }: any) => {
          const idx = oppStore.findIndex((o) => o.id === where.id);
          if (idx !== -1) {
            oppStore[idx] = { ...oppStore[idx], ...data };
            return oppStore[idx];
          }
          throw new Error("Not found");
        },
        findUnique: async ({ where }: any) => {
          return oppStore.find((o) => o.id === where.id) || null;
        },
      },
      opportunityChange: {
        create: async ({ data }: any) => {
          changes.push(data);
          return { id: `chg-${changes.length}`, ...data };
        },
      },
      opportunitySource: {
        findUnique: async () => ({ id: "src-1", opportunityId: "opp-1" }),
        update: async () => ({}),
      },
      verificationLog: {
        findFirst: async () => null,
        create: async ({ data }: any) => ({ id: "log-1", ...data }),
      },
      $transaction: async (cb: any) => cb(mockPrisma),
      _getStore: () => oppStore,
      _getChanges: () => changes,
    };

    return mockPrisma;
  }

  const now = new Date("2026-11-15T12:00:00Z");

  it("stale transition: ACTIVE with lastVerifiedAt older than threshold becomes STALE", async () => {
    const testOpps = [
      {
        id: "opp-stale-1",
        status: "ACTIVE",
        category: "jobs", // normal priority = 24h
        lastVerifiedAt: new Date("2026-11-13T10:00:00Z"), // 50 hours ago (>24h)
        nextVerificationAt: null,
        applicationDeadline: null,
      },
      {
        id: "opp-fresh-1",
        status: "ACTIVE",
        category: "jobs",
        lastVerifiedAt: new Date("2026-11-15T08:00:00Z"), // 4 hours ago (<24h)
        nextVerificationAt: null,
        applicationDeadline: null,
      },
    ];

    const mockPrisma = createMockPrisma(testOpps);
    const sweeper = new FreshnessAndExpirySweeper(mockPrisma as any);

    const results = await sweeper.runSweep(now);

    assert.equal(results.staleCount, 1);
    assert.deepEqual(results.staleIds, ["opp-stale-1"]);

    const store = mockPrisma._getStore();
    const staledOpp = store.find((o: any) => o.id === "opp-stale-1");
    assert.equal(staledOpp.status, "STALE");
    assert.equal(staledOpp.nextVerificationAt.toISOString(), now.toISOString());

    const freshOpp = store.find((o: any) => o.id === "opp-fresh-1");
    assert.equal(freshOpp.status, "ACTIVE");
  });

  it("recovery: STALE opportunity returns to ACTIVE after successful positive verification", async () => {
    const testOpps = [
      {
        id: "opp-recover-1",
        status: "STALE",
        lastVerifiedAt: new Date("2026-11-10T00:00:00Z"),
        consecutiveFailures: 0,
        applicationDeadline: null,
      },
    ];

    const mockPrisma = createMockPrisma(testOpps);
    const lifecycleManager = new OpportunityLifecycleManager(mockPrisma as any);

    const verifiedResult: VerificationResult = {
      outcome: "AVAILABLE",
      checkedAt: now,
      evidence: "Job active on board",
      evidenceType: "job_board_listing",
      httpStatus: 200,
    };

    const response = await lifecycleManager.processResult({
      opportunityId: "opp-recover-1",
      opportunitySourceId: "src-1",
      sourceId: "source-123",
      result: verifiedResult,
    });

    assert.equal(response.previousStatus, "STALE");
    assert.equal(response.newStatus, "ACTIVE");

    const store = mockPrisma._getStore();
    const opp = store.find((o: any) => o.id === "opp-recover-1");
    assert.equal(opp.status, "ACTIVE");
    assert.equal(opp.lastVerifiedAt.toISOString(), now.toISOString());
  });

  it("null deadline never expires: opportunity remains ACTIVE even when posted long ago", async () => {
    const testOpps = [
      {
        id: "opp-no-deadline",
        status: "ACTIVE",
        applicationDeadline: null, // explicit null
        lastVerifiedAt: now,
      },
    ];

    const mockPrisma = createMockPrisma(testOpps);
    const sweeper = new FreshnessAndExpirySweeper(mockPrisma as any);

    const results = await sweeper.runSweep(now);

    assert.equal(results.expiredCount, 0);
    const store = mockPrisma._getStore();
    assert.equal(store[0].status, "ACTIVE");
  });

  it("expiry sweep: explicit past deadline transitions to EXPIRED, future deadline stays active", async () => {
    const testOpps = [
      {
        id: "opp-past-deadline",
        status: "ACTIVE",
        applicationDeadline: new Date("2026-11-14T23:59:59Z"), // past
        lastVerifiedAt: now,
      },
      {
        id: "opp-future-deadline",
        status: "ACTIVE",
        applicationDeadline: new Date("2026-11-20T23:59:59Z"), // future
        lastVerifiedAt: now,
      },
    ];

    const mockPrisma = createMockPrisma(testOpps);
    const sweeper = new FreshnessAndExpirySweeper(mockPrisma as any);

    const results = await sweeper.runSweep(now);

    assert.equal(results.expiredCount, 1);
    assert.deepEqual(results.expiredIds, ["opp-past-deadline"]);

    const store = mockPrisma._getStore();
    const expiredOpp = store.find((o: any) => o.id === "opp-past-deadline");
    assert.equal(expiredOpp.status, "EXPIRED");

    const futureOpp = store.find((o: any) => o.id === "opp-future-deadline");
    assert.equal(futureOpp.status, "ACTIVE");
  });

  it("deadline boundary: exact millisecond boundary evaluation", async () => {
    const exactNow = new Date("2026-11-15T12:00:00.000Z");
    const testOpps = [
      {
        id: "opp-boundary-exact",
        status: "ACTIVE",
        applicationDeadline: new Date("2026-11-15T12:00:00.000Z"), // exact boundary (lte)
        lastVerifiedAt: exactNow,
      },
      {
        id: "opp-boundary-future",
        status: "ACTIVE",
        applicationDeadline: new Date("2026-11-15T12:00:00.001Z"), // 1ms in future
        lastVerifiedAt: exactNow,
      },
    ];

    const mockPrisma = createMockPrisma(testOpps);
    const sweeper = new FreshnessAndExpirySweeper(mockPrisma as any);

    const results = await sweeper.runSweep(exactNow);

    assert.equal(results.expiredCount, 1);
    assert.deepEqual(results.expiredIds, ["opp-boundary-exact"]);
  });

  it("sweep idempotency: running sweep consecutively produces zero redundant changes", async () => {
    const testOpps = [
      {
        id: "opp-idempotent-1",
        status: "ACTIVE",
        applicationDeadline: new Date("2026-11-10T00:00:00Z"),
        lastVerifiedAt: new Date("2026-11-01T00:00:00Z"),
      },
    ];

    const mockPrisma = createMockPrisma(testOpps);
    const sweeper = new FreshnessAndExpirySweeper(mockPrisma as any);

    // Pass 1: transitions to EXPIRED
    const pass1 = await sweeper.runSweep(now);
    assert.equal(pass1.expiredCount, 1);

    // Pass 2: already EXPIRED, must not re-process
    const pass2 = await sweeper.runSweep(now);
    assert.equal(pass2.expiredCount, 0);
    assert.equal(pass2.staleCount, 0);
  });

  it("rate-limit adaptation: freshness threshold respects source polling limits", () => {
    // A source requiring 12 hours between requests should not have a 6h freshness threshold
    const effectiveHours = calculateEffectiveFreshnessThresholdHours("HIGH", 720); // 720m = 12h
    assert.ok(effectiveHours >= 24, "Threshold must expand to accommodate polling limits");
  });
});
