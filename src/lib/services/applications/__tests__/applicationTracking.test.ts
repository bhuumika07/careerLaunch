// src/lib/services/applications/__tests__/applicationTracking.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { ApplicationTrackingService } from "../applicationTrackingService.ts";

describe("Phase 7 Chunk 7.1 & 7.2: Application Tracking State Machine & Lifecycle", () => {
  function createMockEnvironment() {
    const mockStore = {
      opportunities: [
        {
          id: "opp_active_1",
          title: "Backend Engineer",
          employer: "GitLab",
          status: "ACTIVE",
          location: "Remote",
          applicantCount: 5,
        },
        {
          id: "opp_closed_1",
          title: "Senior Fullstack Engineer",
          employer: "Stripe",
          status: "CLOSED",
          location: "San Francisco",
          applicantCount: 20,
        },
      ],
      applications: [
        {
          id: "app_existing_1",
          studentId: "student_bob",
          opportunityId: "opp_active_1",
          status: "SUBMITTED",
          appliedAt: "2026-11-10T10:00:00Z",
          updatedAt: "2026-11-10T10:00:00Z",
          history: [
            { status: "SUBMITTED", timestamp: "2026-11-10T10:00:00Z", note: "Initial submission." },
          ],
        },
      ],
    };

    const service = new ApplicationTrackingService(mockStore);

    return { service, mockStore };
  }

  describe("1. Application Submission & Duplicate Prevention", () => {
    it("submits application for an ACTIVE opportunity with initial SUBMITTED state and history entry", async () => {
      const { service, mockStore } = createMockEnvironment();

      const app = await service.submitApplication("student_alice", "opp_active_1", {
        coverNote: "Excited to contribute to GitLab Orbit!",
      });

      assert.strictEqual(app.status, "SUBMITTED");
      assert.strictEqual(app.studentId, "student_alice");
      assert.strictEqual(app.opportunityId, "opp_active_1");
      assert.strictEqual(app.coverNote, "Excited to contribute to GitLab Orbit!");
      assert.strictEqual(app.history.length, 1);
      assert.strictEqual(app.history[0].status, "SUBMITTED");

      // Verify opportunity applicant count was incremented
      const opp = mockStore.opportunities.find((o) => o.id === "opp_active_1");
      assert.strictEqual(opp?.applicantCount, 6);
    });

    it("invariant: strictly rejects duplicate active applications to the same opportunity", async () => {
      const { service } = createMockEnvironment();

      // student_bob already has an active application for opp_active_1
      await assert.rejects(
        async () => {
          await service.submitApplication("student_bob", "opp_active_1");
        },
        {
          message: "You have already submitted an active application for this opportunity.",
        }
      );
    });

    it("invariant: strictly rejects applications to CLOSED or non-active opportunities", async () => {
      const { service } = createMockEnvironment();

      await assert.rejects(
        async () => {
          await service.submitApplication("student_alice", "opp_closed_1");
        },
        {
          message: /Only ACTIVE listings accept applications/,
        }
      );
    });
  });

  describe("2. State Machine Transitions", () => {
    it("follows valid status transitions: SUBMITTED -> UNDER_REVIEW -> INTERVIEWING -> OFFERED", async () => {
      const { service } = createMockEnvironment();

      // Bob's application starts at SUBMITTED
      const reviewApp = await service.updateApplicationStatus(
        "student_bob",
        "app_existing_1",
        "UNDER_REVIEW",
        "Recruiter screening underway"
      );
      assert.strictEqual(reviewApp.status, "UNDER_REVIEW");
      assert.strictEqual(reviewApp.history.length, 2);

      const interviewApp = await service.updateApplicationStatus(
        "student_bob",
        "app_existing_1",
        "INTERVIEWING",
        "Technical interview scheduled"
      );
      assert.strictEqual(interviewApp.status, "INTERVIEWING");
      assert.strictEqual(interviewApp.history.length, 3);

      const offerApp = await service.updateApplicationStatus(
        "student_bob",
        "app_existing_1",
        "OFFERED",
        "Formal offer letter extended"
      );
      assert.strictEqual(offerApp.status, "OFFERED");
      assert.strictEqual(offerApp.history.length, 4);
    });

    it("invariant: rejects illegal transitions from terminal states", async () => {
      const { service } = createMockEnvironment();

      // Transition to terminal REJECTED state
      await service.updateApplicationStatus("student_bob", "app_existing_1", "REJECTED");

      // Attempt transition out of REJECTED
      await assert.rejects(
        async () => {
          await service.updateApplicationStatus("student_bob", "app_existing_1", "INTERVIEWING");
        },
        {
          message: /Invalid status transition from 'REJECTED'/,
        }
      );
    });
  });

  describe("3. Application Withdrawal & Data Preservation Invariant", () => {
    it("withdraws application cleanly, writes audit note, and NEVER deletes the record", async () => {
      const { service, mockStore } = createMockEnvironment();

      const withdrawn = await service.withdrawApplication(
        "student_bob",
        "app_existing_1",
        "Accepted another offer at Google"
      );

      assert.strictEqual(withdrawn.status, "WITHDRAWN");
      assert.ok(
        withdrawn.history.some(
          (h) => h.status === "WITHDRAWN" && h.note.includes("Accepted another offer")
        )
      );

      // DATA PRESERVATION INVARIANT: The record must remain in the store!
      const storedApp = mockStore.applications.find((a) => a.id === "app_existing_1");
      assert.ok(storedApp, "Application must NEVER be deleted upon withdrawal");
      assert.strictEqual(storedApp?.status, "WITHDRAWN");

      // Verify applicant count was safely decremented
      const opp = mockStore.opportunities.find((o) => o.id === "opp_active_1");
      assert.strictEqual(opp?.applicantCount, 4);
    });

    it("invariant: rejects withdrawing an already withdrawn application", async () => {
      const { service } = createMockEnvironment();

      await service.withdrawApplication("student_bob", "app_existing_1");

      await assert.rejects(
        async () => {
          await service.withdrawApplication("student_bob", "app_existing_1");
        },
        {
          message: "Application is already withdrawn.",
        }
      );
    });
  });

  describe("4. Ownership Isolation & Queries", () => {
    it("returns only applications belonging to the authenticated student", async () => {
      const { service } = createMockEnvironment();

      const bobApps = await service.getStudentApplications("student_bob");
      assert.strictEqual(bobApps.length, 1);
      assert.strictEqual(bobApps[0].studentId, "student_bob");

      const aliceApps = await service.getStudentApplications("student_alice");
      assert.strictEqual(aliceApps.length, 0);
    });
  });
});
