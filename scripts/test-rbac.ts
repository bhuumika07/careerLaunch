import assert from "assert";
import { readDb, writeDb, Session, User } from "../src/lib/db";
import { requireRole, AuthError } from "../src/lib/auth-guard";

async function runRbacTests() {
  console.log("==================================================");
  console.log(" RUNNING RBAC & requireRole() SECURITY TEST SUITE ");
  console.log("==================================================");

  const db = readDb();
  const now = Date.now();

  // Create mock sessions
  const studentSession: Session = {
    id: "test_sess_student",
    userId: "usr_student_demo",
    role: "student",
    expiresAt: now + 3600000,
    createdAt: new Date().toISOString(),
  };

  const jobSeekerSession: Session = {
    id: "test_sess_jobseeker",
    userId: "usr_jobseeker_demo",
    role: "job_seeker",
    expiresAt: now + 3600000,
    createdAt: new Date().toISOString(),
  };

  const adminSession: Session = {
    id: "test_sess_admin",
    userId: "usr_admin_demo",
    role: "admin",
    expiresAt: now + 3600000,
    createdAt: new Date().toISOString(),
  };

  db.sessions = db.sessions.filter(
    (s) => !["test_sess_student", "test_sess_jobseeker", "test_sess_admin"].includes(s.id)
  );
  db.sessions.push(studentSession, jobSeekerSession, adminSession);
  writeDb(db);

  let passed = 0;
  let failed = 0;

  async function testCase(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(`    -> ${err.message}`);
      failed++;
    }
  }

  // 1. Unauthenticated request should throw 401
  await testCase("Unauthenticated request calling Admin API returns 401", async () => {
    const mockReq = new Request("http://localhost/api/test");
    try {
      await requireRole(["admin"], mockReq);
      assert.fail("Should have thrown AuthError 401");
    } catch (err: any) {
      assert(err instanceof AuthError, "Expected AuthError");
      assert.strictEqual(err.statusCode, 401, "Expected 401 status code");
      assert.strictEqual(err.code, "UNAUTHENTICATED");
    }
  });

  // 2. Student calling Admin-only API should throw 403 Forbidden
  await testCase("Student calling Admin-only API returns 403 Forbidden", async () => {
    const mockReq = new Request("http://localhost/api/admin-only", {
      headers: {
        Authorization: `Bearer ${studentSession.id}`,
      },
    });

    try {
      await requireRole(["admin"], mockReq);
      assert.fail("Should have thrown AuthError 403");
    } catch (err: any) {
      assert(err instanceof AuthError, "Expected AuthError");
      assert.strictEqual(err.statusCode, 403, "Expected 403 status code");
      assert.strictEqual(err.code, "FORBIDDEN_ROLE");
      assert(err.message.includes("requires [admin] role"), "Message should mention role requirement");
    }
  });

  // 3. Student calling Student-authorized API succeeds (200)
  await testCase("Student calling Student API is Authorized (200)", async () => {
    const mockReq = new Request("http://localhost/api/student-endpoint", {
      headers: {
        Authorization: `Bearer ${studentSession.id}`,
      },
    });

    const result = await requireRole(["student"], mockReq);
    assert.strictEqual(result.user.role, "student");
    assert.strictEqual(result.session.id, studentSession.id);
  });

  // 4. Job Seeker calling unified career API succeeds (200)
  await testCase("Job Seeker calling Unified Career API succeeds (200)", async () => {
    const mockReq = new Request("http://localhost/api/career-endpoint", {
      headers: {
        Authorization: `Bearer ${jobSeekerSession.id}`,
      },
    });

    const result = await requireRole(["student", "job_seeker"], mockReq);
    assert.strictEqual(result.user.role, "job_seeker");
    assert.strictEqual(result.session.id, jobSeekerSession.id);
  });

  // 5. Admin possesses superuser bypass for any role API
  await testCase("Admin calling Protected API has Superuser Access (200)", async () => {
    const mockReq = new Request("http://localhost/api/protected", {
      headers: {
        Authorization: `Bearer ${adminSession.id}`,
      },
    });

    const result = await requireRole(["student"], mockReq);
    assert.strictEqual(result.user.role, "admin");
  });

  // Clean up mock sessions
  const cleanupDb = readDb();
  cleanupDb.sessions = cleanupDb.sessions.filter(
    (s) => !["test_sess_student", "test_sess_jobseeker", "test_sess_admin"].includes(s.id)
  );
  writeDb(cleanupDb);

  console.log("==================================================");
  console.log(` RBAC TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) process.exit(1);
}

runRbacTests().catch((e) => {
  console.error("Test runner crashed:", e);
  process.exit(1);
});
