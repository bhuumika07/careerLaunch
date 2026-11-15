// src/lib/services/verification/__tests__/decisionEngine.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateVerificationDecision } from "../decisionEngine.ts";
import type { VerificationResult } from "../types.ts";

describe("Verification Decision Engine (Pure Logic)", () => {
  const now = new Date("2026-11-15T12:00:00Z");

  it("AVAILABLE: transitions PENDING to ACTIVE and updates lastVerifiedAt", () => {
    const result: VerificationResult = {
      outcome: "AVAILABLE",
      checkedAt: now,
      evidence: "Found on board",
      evidenceType: "job_board_listing",
      httpStatus: 200,
    };

    const output = evaluateVerificationDecision({
      currentStatus: "PENDING",
      applicationDeadline: null,
      lastVerifiedAt: null,
      consecutiveFailures: 2,
      result,
      now,
    });

    assert.equal(output.newStatus, "ACTIVE");
    assert.equal(output.lastVerificationOutcome, "AVAILABLE");
    assert.equal(output.lastVerifiedAt?.toISOString(), now.toISOString());
    assert.equal(output.consecutiveFailures, 0);
    assert.equal(output.lastVerificationError, null);
  });

  it("AVAILABLE: transitions STALE to ACTIVE", () => {
    const oldVerified = new Date("2026-11-01T10:00:00Z");
    const result: VerificationResult = {
      outcome: "AVAILABLE",
      checkedAt: now,
      evidence: "Found on board",
      evidenceType: "job_board_listing",
    };

    const output = evaluateVerificationDecision({
      currentStatus: "STALE",
      applicationDeadline: null,
      lastVerifiedAt: oldVerified,
      consecutiveFailures: 1,
      result,
      now,
    });

    assert.equal(output.newStatus, "ACTIVE");
    assert.equal(output.lastVerifiedAt?.toISOString(), now.toISOString());
  });

  it("AVAILABLE on CLOSED: does NOT auto-reactivate (blocked by default reopening policy)", () => {
    const oldVerified = new Date("2026-11-01T10:00:00Z");
    const result: VerificationResult = {
      outcome: "AVAILABLE",
      checkedAt: now,
      evidence: "Unexpectedly appeared on board",
      evidenceType: "job_board_listing",
    };

    const output = evaluateVerificationDecision({
      currentStatus: "CLOSED",
      applicationDeadline: null,
      lastVerifiedAt: oldVerified,
      consecutiveFailures: 0,
      result,
      now,
    });

    assert.equal(output.newStatus, "REVIEW_REQUIRED");
    assert.equal(output.reopenPrevented, true);
    assert.ok(output.lastVerificationError?.includes("blocked"));
  });

  it("AVAILABLE on INVALID: does NOT auto-reactivate", () => {
    const result: VerificationResult = {
      outcome: "AVAILABLE",
      checkedAt: now,
      evidence: "Job found",
      evidenceType: "job_board_listing",
    };

    const output = evaluateVerificationDecision({
      currentStatus: "INVALID",
      applicationDeadline: null,
      lastVerifiedAt: null,
      consecutiveFailures: 0,
      result,
      now,
    });

    assert.equal(output.newStatus, "REVIEW_REQUIRED");
    assert.equal(output.reopenPrevented, true);
  });

  it("CLOSED: transitions to CLOSED and sets closedAt", () => {
    const previousVerified = new Date("2026-11-10T00:00:00Z");
    const result: VerificationResult = {
      outcome: "CLOSED",
      checkedAt: now,
      evidence: "Job ID absent from board",
      evidenceType: "job_board_listing",
      httpStatus: 200,
    };

    const output = evaluateVerificationDecision({
      currentStatus: "ACTIVE",
      applicationDeadline: null,
      lastVerifiedAt: previousVerified,
      consecutiveFailures: 0,
      result,
      now,
    });

    assert.equal(output.newStatus, "CLOSED");
    assert.equal(output.lastVerificationOutcome, "CLOSED");
    assert.equal(output.closedAt?.toISOString(), now.toISOString());
    // Crucial rule: closing must NOT overwrite lastVerifiedAt with closing timestamp
    assert.equal(output.lastVerifiedAt?.toISOString(), previousVerified.toISOString());
  });

  it("UNKNOWN: never changes lastVerifiedAt and increments consecutiveFailures", () => {
    const previousVerified = new Date("2026-11-14T00:00:00Z");
    const result: VerificationResult = {
      outcome: "UNKNOWN",
      checkedAt: now,
      reason: "HTTP 503 Service Unavailable",
      httpStatus: 503,
    };

    const output = evaluateVerificationDecision({
      currentStatus: "ACTIVE",
      applicationDeadline: null,
      lastVerifiedAt: previousVerified,
      consecutiveFailures: 2,
      result,
      now,
    });

    assert.equal(output.newStatus, "ACTIVE"); // Still active within grace period
    assert.equal(output.lastVerificationOutcome, "UNKNOWN");
    assert.equal(output.lastVerifiedAt?.toISOString(), previousVerified.toISOString());
    assert.equal(output.consecutiveFailures, 3);
    assert.equal(output.lastVerificationError, "HTTP 503 Service Unavailable");
  });

  it("UNKNOWN: transitions to STALE when elapsed time exceeds freshness threshold", () => {
    const oldVerified = new Date("2026-11-01T00:00:00Z"); // > 72 hours ago
    const result: VerificationResult = {
      outcome: "UNKNOWN",
      checkedAt: now,
      reason: "Timeout after 15s",
    };

    const output = evaluateVerificationDecision({
      currentStatus: "ACTIVE",
      applicationDeadline: null,
      lastVerifiedAt: oldVerified,
      consecutiveFailures: 1,
      result,
      now,
    });

    assert.equal(output.newStatus, "STALE");
    assert.equal(output.lastVerifiedAt?.toISOString(), oldVerified.toISOString());
  });

  it("CONFLICT: transitions to REVIEW_REQUIRED", () => {
    const result: VerificationResult = {
      outcome: "CONFLICT",
      checkedAt: now,
      reason: "Stored title diverges from published title",
    };

    const output = evaluateVerificationDecision({
      currentStatus: "ACTIVE",
      applicationDeadline: null,
      lastVerifiedAt: now,
      consecutiveFailures: 0,
      result,
      now,
    });

    assert.equal(output.newStatus, "REVIEW_REQUIRED");
    assert.equal(output.lastVerificationOutcome, "CONFLICT");
    assert.equal(output.lastVerificationError, "Stored title diverges from published title");
  });

  it("EXPIRED: past deadline takes precedence over ACTIVE or STALE", () => {
    const pastDeadline = new Date("2026-11-10T00:00:00Z");
    const result: VerificationResult = {
      outcome: "AVAILABLE",
      checkedAt: now,
      evidence: "Present",
      evidenceType: "job_board_listing",
    };

    const output = evaluateVerificationDecision({
      currentStatus: "ACTIVE",
      applicationDeadline: pastDeadline,
      lastVerifiedAt: now,
      consecutiveFailures: 0,
      result,
      now,
    });

    assert.equal(output.newStatus, "EXPIRED");
  });
});
