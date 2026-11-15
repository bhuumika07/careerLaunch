import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, ApplicationRecord, ApplicationStatus } from "@/lib/db";
import { requireRole, handleAuthError } from "@/lib/auth-guard";

// GET /api/student/applications - List student's tracked applications
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const db = readDb();

    const studentApps = (db.applications || []).filter((a) => a.studentId === user.id);

    // Hydrate with opportunity details
    const hydrated = studentApps.map((app) => {
      const opportunity = (db.opportunities || []).find((o) => o.id === app.opportunityId);
      const isExpiredOrClosed = opportunity ? opportunity.status === "closed" || opportunity.status === "expired" : true;
      return {
        ...app,
        opportunity: opportunity || null,
        isExpiredOrClosed,
        confirmationSource: "self_reported",
      };
    });

    return NextResponse.json({
      success: true,
      applications: hydrated,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

// POST /api/student/applications - Track new external application
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const body = await req.json();
    const { opportunityId, status = "Applied", notes = "" } = body;

    if (!opportunityId) {
      return NextResponse.json({ success: false, error: "Opportunity ID required" }, { status: 400 });
    }

    const db = readDb();
    const now = new Date().toISOString();

    // Check if already tracked
    let existing = (db.applications || []).find((a) => a.studentId === user.id && a.opportunityId === opportunityId);

    if (existing) {
      existing.status = status as ApplicationStatus;
      if (notes) existing.coverNote = notes;
      existing.updatedAt = now;
      existing.history = existing.history || [];
      existing.history.push({
        status: status as ApplicationStatus,
        timestamp: now,
        note: "Updated via tracking prompt",
      });
      writeDb(db);
      return NextResponse.json({ success: true, application: existing });
    }

    const newApp: ApplicationRecord = {
      id: `app_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      opportunityId,
      studentId: user.id,
      resumeId: "",
      coverNote: notes,
      status: status as ApplicationStatus,
      appliedAt: now,
      updatedAt: now,
      history: [
        {
          status: status as ApplicationStatus,
          timestamp: now,
          note: "Self-reported external application",
        },
      ],
    };

    db.applications = db.applications || [];
    db.applications.push(newApp);
    writeDb(db);

    return NextResponse.json({ success: true, application: newApp }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}

// PATCH /api/student/applications - Update tracking status or notes
export async function PATCH(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const body = await req.json();
    const { id, status, notes, interviewRound } = body;

    const db = readDb();
    const app = (db.applications || []).find((a) => a.id === id && a.studentId === user.id);
    if (!app) {
      return NextResponse.json({ success: false, error: "Application record not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    if (status) {
      app.status = status;
      app.history = app.history || [];
      app.history.push({
        status,
        timestamp: now,
        note: `Status updated to ${status}`,
      });
    }
    if (notes !== undefined) app.coverNote = notes;
    if (interviewRound) app.interviewRound = interviewRound;
    app.updatedAt = now;

    writeDb(db);
    return NextResponse.json({ success: true, application: app });
  } catch (error) {
    return handleAuthError(error);
  }
}
