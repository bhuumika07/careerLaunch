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

  const recruiterSession: Session = {
    id: "test_sess_recruiter",
    userId: "usr_recruiter_demo",
    role: "recruiter",
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
    (s) => !["test_sess_student", "test_sess_recruiter", "test_sess_admin"].includes(s.id)
  );
  db.sessions.push(studentSession, recruiterSession, adminSession);
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
  await testCase("Unauthenticated request calling Recruiter API returns 401", async () => {
    const mockReq = new Request("http://localhost/api/test");
    try {
      await requireRole(["recruiter"], mockReq);
      assert.fail("Should have thrown AuthError 401");
    } catch (err: any) {
      assert(err instanceof AuthError, "Expected AuthError");
      assert.strictEqual(err.statusCode, 401, "Expected 401 status code");
      assert.strictEqual(err.code, "UNAUTHENTICATED");
    }
  });

  // 2. Student calling Recruiter-only API should throw 403 Forbidden
  await testCase("Student calling Recruiter-only API returns 403 Forbidden", async () => {
    const mockReq = new Request("http://localhost/api/recruiter-only", {
      headers: {
        Authorization: `Bearer ${studentSession.id}`,
      },
    });

    try {
      await requireRole(["recruiter"], mockReq);
      assert.fail("Should have thrown AuthError 403");
    } catch (err: any) {
      assert(err instanceof AuthError, "Expected AuthError");
      assert.strictEqual(err.statusCode, 403, "Expected 403 status code");
      assert.strictEqual(err.code, "FORBIDDEN_ROLE");
      assert(err.message.includes("requires [recruiter] role"), "Message should mention role requirement");
    }
  });

  // 3. Recruiter calling Recruiter-only API succeeds (200)
  await testCase("Recruiter calling Recruiter-only API is Authorized (200)", async () => {
    const mockReq = new Request("http://localhost/api/recruiter-only", {
      headers: {
        Authorization: `Bearer ${recruiterSession.id}`,
      },
    });

    const result = await requireRole(["recruiter"], mockReq);
    assert.strictEqual(result.user.role, "recruiter");
    assert.strictEqual(result.session.id, recruiterSession.id);
  });

  // 4. Recruiter calling Student-only API throws 403 Forbidden
  await testCase("Recruiter calling Student-only API returns 403 Forbidden", async () => {
    const mockReq = new Request("http://localhost/api/student-only", {
      headers: {
        Authorization: `Bearer ${recruiterSession.id}`,
      },
    });

    try {
      await requireRole(["student"], mockReq);
      assert.fail("Should have thrown AuthError 403");
    } catch (err: any) {
      assert(err instanceof AuthError, "Expected AuthError");
      assert.strictEqual(err.statusCode, 403, "Expected 403 status code");
      assert.strictEqual(err.code, "FORBIDDEN_ROLE");
    }
  });

  // 5. Admin possesses superuser bypass for any role API
  await testCase("Admin calling Recruiter-only API has Superuser Access (200)", async () => {
    const mockReq = new Request("http://localhost/api/recruiter-only", {
      headers: {
        Authorization: `Bearer ${adminSession.id}`,
      },
    });

    const result = await requireRole(["recruiter"], mockReq);
    assert.strictEqual(result.user.role, "admin");
  });

  // Clean up mock sessions
  const cleanupDb = readDb();
  cleanupDb.sessions = cleanupDb.sessions.filter(
    (s) => !["test_sess_student", "test_sess_recruiter", "test_sess_admin"].includes(s.id)
  );
  writeDb(cleanupDb);

  console.log("--------------------------------------------------");
  console.log(` RESULTS: ${passed} passed, ${failed} failed`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runRbacTests();
