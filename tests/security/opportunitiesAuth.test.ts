import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { proxy } from "../../src/proxy.ts";
import { GET as getOpportunities } from "../../src/app/api/opportunities/route.ts";
import { GET as getOpportunityById } from "../../src/app/api/opportunities/[id]/route.ts";

describe("Opportunities Route Protection & Security", () => {
  it("redirects unauthenticated users trying to visit /opportunities to /login", () => {
    const req = new NextRequest("http://localhost:3000/opportunities");
    const res = proxy(req);

    assert.strictEqual(res.status, 307);
    const location = res.headers.get("location");
    assert.ok(location);
    assert.ok(
      location.includes("/login?redirect=%2Fopportunities"),
      `Expected redirect to /login with redirect parameter, got: ${location}`
    );
  });

  it("redirects unauthenticated users trying to visit /opportunities/:id to /login with full path preserved", () => {
    const req = new NextRequest("http://localhost:3000/opportunities/job_123?domain=software");
    const res = proxy(req);

    assert.strictEqual(res.status, 307);
    const location = res.headers.get("location");
    assert.ok(location);
    assert.ok(
      location.includes("/login?redirect=%2Fopportunities%2Fjob_123%3Fdomain%3Dsoftware"),
      `Expected redirect to /login preserving query params, got: ${location}`
    );
  });

  it("allows authenticated users with valid session cookie to access /opportunities", () => {
    const req = new NextRequest("http://localhost:3000/opportunities", {
      headers: {
        cookie: "cl_session=valid_session_123; cl_role=student",
      },
    });
    const res = proxy(req);

    // Should proceed to next()
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get("location"), null);
  });

  it("redirects unauthenticated users trying to access /notifications to /login", () => {
    const req = new NextRequest("http://localhost:3000/notifications");
    const res = proxy(req);

    assert.strictEqual(res.status, 307);
    const location = res.headers.get("location");
    assert.ok(location?.includes("/login?redirect=%2Fnotifications"));
  });

  it("returns 401 when GET /api/opportunities is invoked without authentication", async () => {
    const req = new NextRequest("http://localhost:3000/api/opportunities");
    const res = await getOpportunities(req);

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, "UNAUTHENTICATED");
  });

  it("returns 401 when GET /api/opportunities/:id is invoked without authentication", async () => {
    const req = new NextRequest("http://localhost:3000/api/opportunities/opp_123");
    const res = await getOpportunityById(req, { params: Promise.resolve({ id: "opp_123" }) });

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, "UNAUTHENTICATED");
  });
});
