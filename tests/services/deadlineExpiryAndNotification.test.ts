import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isRecommendable } from "../../src/lib/services/verification/lifecycleConsistency.ts";
import { checkAndNotifyExpiredOpportunities } from "../../src/lib/services/notifications/deadlineNotificationService.ts";
import { readDb, writeDb } from "../../src/lib/db.ts";

describe("Opportunity Deadline Expiration & Student Notification", () => {
  it("strictly excludes opportunities whose deadline has passed from recommendable feed", () => {
    const activeOpp = {
      id: "test_opp_active",
      title: "Backend Engineer",
      applicationDeadline: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString(),
      lastVerifiedDate: new Date().toISOString(),
      status: "active",
      lifecycleStatus: "active",
    };

    const expiredOpp = {
      id: "test_opp_expired",
      title: "Expired Role",
      applicationDeadline: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // 2 hours ago
      lastVerifiedDate: new Date().toISOString(),
      status: "active",
      lifecycleStatus: "active",
    };

    assert.strictEqual(isRecommendable(activeOpp), true, "Future deadline should be recommendable");
    assert.strictEqual(isRecommendable(expiredOpp), false, "Past deadline must NOT be recommendable");
  });

  it("automatically generates a notification for students who saved an expired opportunity", async () => {
    const testUserId = "usr_student_test_expiry_" + Date.now();
    const testOppId = "opp_test_expired_" + Date.now();

    // 1. Setup mock expired opportunity and bookmark in db
    const db = readDb();
    if (!db.bookmarks) db.bookmarks = [];
    if (!db.opportunities) db.opportunities = [];
    if (!db.notifications) db.notifications = [];

    db.opportunities.push({
      id: testOppId,
      title: "Cloud Infrastructure Intern",
      org: "Stripe India",
      deadline: new Date(Date.now() - 3600 * 1000).toISOString(), // Expired 1 hour ago
      status: "expired",
      category: "Internships",
      skills: ["AWS", "Terraform"],
      eligibility: { degrees: ["B.Tech"], graduationYears: [2026] },
      location: "Bengaluru",
      workMode: "hybrid",
      stipendSalary: "Competitive",
      sourceUrl: "https://stripe.com",
      isExternal: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    db.bookmarks.push({
      id: `bm_${Date.now()}`,
      userId: testUserId,
      opportunityId: testOppId,
      createdAt: new Date().toISOString(),
    });

    writeDb(db);

    // 2. Run the deadline check & notification service
    const result = await checkAndNotifyExpiredOpportunities(testUserId);
    assert.ok(result.notificationsCreated >= 1, "Should create at least 1 deadline notification");

    // 3. Verify notification content
    const updatedDb = readDb();
    const notif = updatedDb.notifications.find(
      (n: any) => n.userId === testUserId && n.opportunityId === testOppId
    );

    assert.ok(notif, "Notification must exist for student");
    assert.strictEqual(notif.type, "deadline_reminder");
    assert.strictEqual(notif.title, "Application Deadline Passed");
    assert.ok(notif.message.includes("Cloud Infrastructure Intern"));
    assert.strictEqual(notif.read, false);

    // 4. Test idempotency (running again should not create duplicate notifications)
    const secondPass = await checkAndNotifyExpiredOpportunities(testUserId);
    assert.strictEqual(secondPass.notificationsCreated, 0, "Should not duplicate notifications");

    // Cleanup test fixtures
    const cleanDb = readDb();
    cleanDb.opportunities = cleanDb.opportunities.filter((o: any) => o.id !== testOppId);
    cleanDb.bookmarks = cleanDb.bookmarks.filter((b: any) => b.userId !== testUserId);
    cleanDb.notifications = cleanDb.notifications.filter((n: any) => n.userId !== testUserId);
    writeDb(cleanDb);
  });
});
