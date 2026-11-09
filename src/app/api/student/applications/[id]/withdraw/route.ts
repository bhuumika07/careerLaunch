import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";
import { requireRole, handleAuthError } from "@/lib/auth-guard";

// POST /api/student/applications/[id]/withdraw
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireRole(["student"], req);
    const { id } = await params;

    const db = readDb();
    const appIndex = db.applications.findIndex(
      (a) => a.id === id && a.studentId === user.id
    );

    if (appIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Application not found." },
        { status: 404 }
      );
    }

    const application = db.applications[appIndex];
    if (application.status === "Selected") {
      return NextResponse.json(
        { success: false, error: "Cannot withdraw an offer that has already reached selection." },
        { status: 400 }
      );
    }

    // Decrement applicantCount on opportunity
    const opp = db.opportunities.find((o) => o.id === application.opportunityId);
    if (opp && opp.applicantCount > 0) {
      opp.applicantCount--;
    }

    db.applications.splice(appIndex, 1);
    writeDb(db);

    return NextResponse.json({
      success: true,
      message: "Application withdrawn successfully.",
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
