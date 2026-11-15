// src/lib/services/verification/__tests__/scheduler.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { VerificationScheduler } from "../scheduler.ts";

describe("Verification Scheduler (Atomic Claiming & Deduplication)", () => {
  function createMockEnvironment(opportunities: any[]) {
    const oppStore = opportunities.map((o) => ({ ...o }));
    const enqueuedJobs: any[] = [];
    const jobStateMap = new Map<string, string>();

    const mockTx = {
      opportunity: {
        findMany: async ({ where, take }: any) => {
          return oppStore
            .filter((o) => {
              if (where.status?.in && !where.status.in.includes(o.status)) {
                return false;
              }
              const now = new Date();
              const isDue =
                !o.nextVerificationAt || o.nextVerificationAt <= now;
              return isDue;
            })
            .slice(0, take || 50);
        },
        update: async ({ where, data }: any) => {
          const index = oppStore.findIndex((o) => o.id === where.id);
          if (index !== -1) {
            oppStore[index] = { ...oppStore[index], ...data };
            return oppStore[index];
          }
          throw new Error("Not found");
        },
      },
    };

    const mockPrisma = {
      $transaction: async (cb: any) => cb(mockTx),
      _getStore: () => oppStore,
    };

    const mockQueue = {
      getJob: async (jobId: string) => {
        if (!jobStateMap.has(jobId)) return null;
        return {
          id: jobId,
          getState: async () => jobStateMap.get(jobId),
          remove: async () => jobStateMap.delete(jobId),
        };
      },
      add: async (jobName: string, data: any, opts: any) => {
        enqueuedJobs.push({ jobName, data, opts });
        if (opts?.jobId) {
          jobStateMap.set(opts.jobId, "waiting");
        }
        return { id: opts?.jobId || `job-${enqueuedJobs.length}` };
      },
      _getEnqueued: () => enqueuedJobs,
    };

    return { mockPrisma, mockQueue };
  }

  it("selects only due opportunities and ignores not-due or terminal opportunities", async () => {
    const now = new Date("2026-11-15T12:00:00Z");
    const testOpps = [
      {
        id: "opp-due-1",
        status: "PENDING",
        nextVerificationAt: new Date("2026-11-15T11:00:00Z"), // due
      },
      {
        id: "opp-due-2",
        status: "ACTIVE",
        nextVerificationAt: null, // null = due immediately
      },
      {
        id: "opp-not-due",
        status: "ACTIVE",
        nextVerificationAt: new Date("2026-11-15T18:00:00Z"), // future
      },
      {
        id: "opp-closed",
        status: "CLOSED", // terminal status
        nextVerificationAt: new Date("2026-11-15T10:00:00Z"),
      },
    ];

    const { mockPrisma, mockQueue } = createMockEnvironment(testOpps);
    const scheduler = new VerificationScheduler(mockPrisma as any, mockQueue as any);

    const result = await scheduler.runSchedulerPass(now);

    assert.equal(result.claimedCount, 2);
    assert.equal(result.enqueuedCount, 2);
    assert.deepEqual(result.opportunityIds.sort(), ["opp-due-1", "opp-due-2"].sort());

    const enqueued = mockQueue._getEnqueued();
    assert.equal(enqueued.length, 2);
  });

  it("prevents double-enqueueing under concurrent schedulers via atomic row leasing", async () => {
    const now = new Date("2026-11-15T12:00:00Z");
    const testOpps = [
      {
        id: "opp-shared-1",
        status: "ACTIVE",
        nextVerificationAt: new Date("2026-11-15T10:00:00Z"),
      },
    ];

    const { mockPrisma, mockQueue } = createMockEnvironment(testOpps);
    const schedulerInstanceA = new VerificationScheduler(mockPrisma as any, mockQueue as any);
    const schedulerInstanceB = new VerificationScheduler(mockPrisma as any, mockQueue as any);

    // Pass 1: Instance A runs
    const resA = await schedulerInstanceA.runSchedulerPass(now);
    assert.equal(resA.enqueuedCount, 1);

    // Pass 2: Instance B runs immediately after – opportunity is leased & advanced
    const resB = await schedulerInstanceB.runSchedulerPass(now);
    assert.equal(resB.enqueuedCount, 0, "Second scheduler must not double enqueue leased opportunity");

    // Queue must only have 1 job
    assert.equal(mockQueue._getEnqueued().length, 1);
  });

  it("recovers and re-claims opportunities when an earlier lease has expired", async () => {
    const oldTime = new Date("2026-11-15T10:00:00Z");
    const currentTime = new Date("2026-11-15T10:10:00Z"); // 10 mins later (lease was 5 mins)

    const testOpps = [
      {
        id: "opp-crashed",
        status: "ACTIVE",
        nextVerificationAt: new Date("2026-11-15T10:05:00Z"),
        lastVerificationError: `[LEASE:${oldTime.getTime()}:token-abc]`,
      },
    ];

    const { mockPrisma, mockQueue } = createMockEnvironment(testOpps);
    const scheduler = new VerificationScheduler(mockPrisma as any, mockQueue as any, {
      claimLeaseDurationMs: 5 * 60 * 1000,
    });

    const result = await scheduler.runSchedulerPass(currentTime);

    assert.equal(result.claimedCount, 1, "Expired lease should be recovered and claimed");
    assert.equal(result.enqueuedCount, 1);
  });
});
