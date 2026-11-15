// src/app/api/opportunities/[id]/matching/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import { matchingService } from "@/lib/services/matching/matchingService";
import * as fs from "node:fs";
import * as path from "node:path";

function findOpportunity(id: string): any {
  try {
    const dbPath = path.resolve(process.cwd(), "src/data/db.json");
    if (fs.existsSync(dbPath)) {
      const db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
      return (db.opportunities || []).find((o: any) => o.id === id);
    }
  } catch (err) {
    console.error("[matchingRoute] Error reading db.json:", err);
  }
  return null;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireRole(["student"], req);
    const { id: opportunityId } = await context.params;

    const opp = findOpportunity(opportunityId);
    if (!opp) {
      return NextResponse.json(
        { success: false, error: "Opportunity not found" },
        { status: 404 }
      );
    }

    const matchResult = await matchingService.matchOpportunity(user.id, opp);

    return NextResponse.json({
      success: true,
      match: matchResult,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
