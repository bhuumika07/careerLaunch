// src/lib/services/verification/__tests__/frequencyPolicy.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateNextVerificationSchedule } from "../frequencyPolicy.ts";

describe("Verification Frequency Policy Table", () => {
  const now = new Date("2026-11-15T12:00:00Z");

  it("Tier 1: PENDING (newly ingested) schedules immediately (0 delay)", () => {
    const result = calculateNextVerificationSchedule({
      status: "PENDING",
      now,
    });

    assert.equal(result.intervalMinutes, 0);
    assert.equal(result.nextVerificationAt.getTime(), now.getTime());
    assert.ok(result.scheduleReason.includes("PENDING"));
  });

  it("Tier 2: 0-24h old opportunities scheduled every 3 hours", () => {
    const postedAt = new Date("2026-11-15T06:00:00Z"); // 6 hours old
    const result = calculateNextVerificationSchedule({
      status: "ACTIVE",
      postedAt,
      now,
    });

    assert.equal(result.intervalMinutes, 3 * 60);
    assert.equal(
      result.nextVerificationAt.toISOString(),
      new Date("2026-11-15T15:00:00Z").toISOString()
    );
    assert.ok(result.scheduleReason.includes("0-24h"));
  });

  it("Tier 3: 1-7 days old opportunities scheduled every 8 hours", () => {
    const postedAt = new Date("2026-11-12T12:00:00Z"); // 3 days old
    const result = calculateNextVerificationSchedule({
      status: "ACTIVE",
      postedAt,
      now,
    });

    assert.equal(result.intervalMinutes, 8 * 60);
    assert.equal(
      result.nextVerificationAt.toISOString(),
      new Date("2026-11-15T20:00:00Z").toISOString()
    );
    assert.ok(result.scheduleReason.includes("1-7 days"));
  });

  it("Tier 4: 8-30 days old opportunities scheduled every 24 hours", () => {
    const postedAt = new Date("2026-11-01T12:00:00Z"); // 14 days old
    const result = calculateNextVerificationSchedule({
      status: "ACTIVE",
      postedAt,
      now,
    });

    assert.equal(result.intervalMinutes, 24 * 60);
    assert.equal(
      result.nextVerificationAt.toISOString(),
      new Date("2026-11-16T12:00:00Z").toISOString()
    );
    assert.ok(result.scheduleReason.includes("8-30 days"));
  });

  it("Tier 5: >30 days old opportunities scheduled every 48 hours", () => {
    const postedAt = new Date("2026-09-01T12:00:00Z"); // >60 days old
    const result = calculateNextVerificationSchedule({
      status: "ACTIVE",
      postedAt,
      now,
    });

    assert.equal(result.intervalMinutes, 48 * 60);
    assert.ok(result.scheduleReason.includes(">30 days"));
  });

  it("Tier 6: Near explicit deadline overrides regular age tier to 3 hours", () => {
    const postedAt = new Date("2026-10-01T12:00:00Z"); // 45 days old (would be 48h)
    const deadline = new Date("2026-11-16T00:00:00Z"); // 12 hours from now

    const result = calculateNextVerificationSchedule({
      status: "ACTIVE",
      postedAt,
      applicationDeadline: deadline,
      now,
    });

    assert.equal(result.intervalMinutes, 3 * 60);
    assert.ok(result.scheduleReason.includes("deadline"));
  });

  it("Tier 7: Consecutive failures apply exponential backoff", () => {
    // Failure 1: 30 mins
    const res1 = calculateNextVerificationSchedule({
      status: "ACTIVE",
      consecutiveFailures: 1,
      now,
    });
    assert.equal(res1.intervalMinutes, 30);

    // Failure 2: 60 mins
    const res2 = calculateNextVerificationSchedule({
      status: "ACTIVE",
      consecutiveFailures: 2,
      now,
    });
    assert.equal(res2.intervalMinutes, 60);

    // Failure 3: 120 mins
    const res3 = calculateNextVerificationSchedule({
      status: "ACTIVE",
      consecutiveFailures: 3,
      now,
    });
    assert.equal(res3.intervalMinutes, 120);
  });

  it("Tier 8: Provider rate limits override policy when more restrictive", () => {
    const postedAt = new Date("2026-11-15T06:00:00Z"); // 0-24h (regularly 3h = 180m)
    const sourceMinInterval = 360; // Source rate limit requires 6h (360m)

    const result = calculateNextVerificationSchedule({
      status: "ACTIVE",
      postedAt,
      sourceMinIntervalMinutes: sourceMinInterval,
      now,
    });

    assert.equal(result.intervalMinutes, 360);
    assert.ok(result.scheduleReason.includes("overridden by provider rate-limit"));
  });
});
