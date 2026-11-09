import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { requireRole, handleAuthError } from "@/lib/auth-guard";

// GET /api/student/applications - List student's applications
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const db = readDb();

    const studentApps = db.applications.filter((a) => a.studentId === user.id);

    // Hydrate with opportunity details
    const hydrated = studentApps.map((app) => {
      const opportunity = db.opportunities.find((o) => o.id === app.opportunityId);
      const resume = db.resumes.find((r) => r.id === app.resumeId);
      return {
        ...app,
        opportunity: opportunity || null,
        resumeName: resume?.fileName || "Default Profile",
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
