import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import { readDb } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { getOpportunityVerificationHistory } from "@/lib/services/verification/adminService";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["admin"], req);

    const { searchParams } = new URL(req.url);
    const opportunityId = searchParams.get("opportunityId");

    if (!opportunityId) {
      return NextResponse.json(
        { error: "Query parameter 'opportunityId' is required" },
        { status: 400 }
      );
    }

    let verificationLogs: any[] = [];

    try {
      if (prisma && (prisma as any).verificationLog) {
        verificationLogs = await (prisma as any).verificationLog.findMany({
          where: { opportunityId },
          orderBy: { checkedAt: 'desc' },
        });
      }
    } catch {
      // Prisma fallback
    }

    if (verificationLogs.length === 0) {
      const fileDb = readDb();
      verificationLogs = (fileDb as any).verificationLogs || [];
    }

    const history = getOpportunityVerificationHistory(
      { verificationLogs },
      opportunityId
    );

    return NextResponse.json({
      success: true,
      opportunityId,
      totalLogs: history.length,
      history,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
