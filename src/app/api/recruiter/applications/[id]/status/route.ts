import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, ApplicationStatus, InterviewRound } from "@/lib/db";
import { requireRole, handleAuthError } from "@/lib/auth-guard";

// PATCH /api/recruiter/applications/[id]/status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireRole(["recruiter", "admin"], req);
    const { id } = await params;
    const body = await req.json();

    const { status, note, interviewRound } = body as {
      status?: ApplicationStatus;
      note?: string;
      interviewRound?: InterviewRound;
    };

    const db = readDb();
    const application = db.applications.find((a) => a.id === id);

    if (!application) {
      return NextResponse.json(
        { success: false, error: "Application not found." },
        { status: 404 }
      );
    }

    const opportunity = db.opportunities.find((o) => o.id === application.opportunityId);
    if (!opportunity) {
      return NextResponse.json(
        { success: false, error: "Associated opportunity not found." },
        { status: 404 }
      );
    }

    if (opportunity.recruiterId !== user.id && user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: You do not manage this candidate." },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();

    if (status && status !== application.status) {
      application.status = status;
      application.history.push({
        status,
        timestamp: now,
        note: note || `Status transitioned to ${status} by recruiter.`,
      });

      // Update opportunity counters
      if (status === "Shortlisted") {
        opportunity.shortlistedCount = (opportunity.shortlistedCount || 0) + 1;
      } else if (status === "Selected") {
        opportunity.selectedCount = (opportunity.selectedCount || 0) + 1;
      }
    }

    if (interviewRound) {
      application.interviewRound = interviewRound;
      application.history.push({
        status: application.status,
        timestamp: now,
        note: `Interview scheduled on ${interviewRound.date} via ${interviewRound.mode}.`,
      });
    }

    writeDb(db);

    return NextResponse.json({
      success: true,
      application,
      message: "Candidate application updated successfully.",
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
