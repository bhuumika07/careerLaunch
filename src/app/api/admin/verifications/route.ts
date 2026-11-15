import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";
import { requireRole, handleAuthError } from "@/lib/auth-guard";

// GET /api/admin/verifications - Opportunity quality & source review queue
export async function GET(req: NextRequest) {
  try {
    await requireRole(["admin"], req);
    const db = readDb();

    const pendingReviewOpportunities = (db.opportunities || [])
      .filter((o) => o.isExternal || !o.lastVerifiedDate)
      .map((o) => ({
        id: o.id,
        title: o.title,
        org: o.org,
        category: o.category,
        sourceUrl: o.sourceUrl || "https://example.com",
        verificationStatus: "pending",
        lastVerifiedDate: o.lastVerifiedDate,
      }));

    return NextResponse.json({
      success: true,
      pendingOpportunities: pendingReviewOpportunities,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

// POST /api/admin/verifications - Approve or flag an opportunity
export async function POST(req: NextRequest) {
  try {
    const { user: adminUser } = await requireRole(["admin"], req);
    const body = await req.json();
    const { opportunityId, decision, reason } = body;

    if (!opportunityId || !["approve", "reject"].includes(decision)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const db = readDb();
    const opp = (db.opportunities || []).find((o) => o.id === opportunityId);
    if (!opp) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    opp.lastVerifiedDate = now;
    if (decision === "reject") {
      opp.status = "closed";
    }

    writeDb(db);

    return NextResponse.json({
      success: true,
      message: `Opportunity ${decision === "approve" ? "verified" : "rejected"} successfully.`,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
