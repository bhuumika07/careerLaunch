import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, Opportunity } from "@/lib/db";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import { findDuplicateOpportunity } from "@/lib/services/opportunity-manager";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["admin"], req);
    const db = readDb();
    const opportunities = db.opportunities || [];

    // Analyze duplicates
    const flaggedDuplicates: any[] = [];
    opportunities.forEach((opp, i) => {
      const rest = opportunities.filter((_, idx) => idx !== i);
      const dup = findDuplicateOpportunity(opp, rest);
      if (dup.isDuplicate) {
        flaggedDuplicates.push({
          opportunity: opp,
          duplicateOf: dup.matchedOpp,
          similarity: dup.similarityScore,
        });
      }
    });

    return NextResponse.json({
      success: true,
      opportunities,
      flaggedDuplicates,
      reportedContent: [
        {
          id: "rep_1",
          opportunityId: "opp_1",
          reason: "Outdated stipend range reported by student candidate",
          status: "pending_review",
          createdAt: "2026-11-08T12:00:00.000Z",
        },
      ],
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user: adminUser } = await requireRole(["admin"], req);
    const body = await req.json();
    const { opportunityId, action, reason } = body;

    const db = readDb();
    const opp = (db.opportunities || []).find((o) => o.id === opportunityId);
    if (!opp) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    if (action === "close") {
      opp.status = "closed";
    } else if (action === "activate") {
      opp.status = "active";
    }

    if (!db.auditLogs) db.auditLogs = [];
    db.auditLogs.unshift({
      id: `log_${Date.now()}`,
      action: `OPPORTUNITY_${action.toUpperCase()}`,
      performedBy: adminUser.id,
      targetId: opportunityId,
      details: reason || `Admin marked opportunity as ${action}`,
      timestamp: new Date().toISOString(),
    });

    writeDb(db);

    return NextResponse.json({
      success: true,
      opportunity: opp,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
