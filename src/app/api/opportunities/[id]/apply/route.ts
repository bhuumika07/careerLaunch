import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, ApplicationRecord } from "@/lib/db";
import { requireRole, handleAuthError } from "@/lib/auth-guard";

// POST /api/opportunities/[id]/apply - Student applies
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireRole(["student"], req);
    const { id } = await params;
    const body = await req.json();

    const { resumeId, coverNote } = body;

    const db = readDb();
    const opportunity = db.opportunities.find((o) => o.id === id);

    if (!opportunity) {
      return NextResponse.json(
        { success: false, error: "Opportunity not found." },
        { status: 404 }
      );
    }

    if (opportunity.status !== "active") {
      return NextResponse.json(
        { success: false, error: "This opportunity is no longer accepting applications." },
        { status: 400 }
      );
    }

    // Check if student already applied
    const existing = db.applications.find(
      (a) => a.studentId === user.id && a.opportunityId === id
    );

    if (existing) {
      return NextResponse.json(
        { success: false, error: "You have already submitted an application for this opportunity." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const newApplication: ApplicationRecord = {
      id: `app_${Date.now()}`,
      studentId: user.id,
      opportunityId: id,
      resumeId: resumeId || undefined,
      status: "Submitted",
      appliedAt: now,
      coverNote: coverNote || "",
      history: [
        {
          status: "Submitted",
          timestamp: now,
          note: "Application submitted by candidate via platform.",
        },
      ],
    };

    db.applications.push(newApplication);
    opportunity.applicantCount = (opportunity.applicantCount || 0) + 1;
    writeDb(db);

    return NextResponse.json({
      success: true,
      application: newApplication,
      message: "Application submitted successfully! Track progress in your Applications dashboard.",
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
