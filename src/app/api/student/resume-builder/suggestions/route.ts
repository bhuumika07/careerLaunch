import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { requireRole, handleAuthError } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const db = readDb();
    const profile = (db.studentProfiles || []).find((p) => p.userId === user.id);
    const roadmap = (db.roadmaps || []).find((r) => r.userId === user.id);

    // Verified skills
    const verifiedSkills = (profile?.skills || []).filter((s) => s.status === "verified");

    // Completed roadmap projects
    const completedRoadmapProjects = (roadmap?.modules || [])
      .filter((m) => m.status === "completed" && m.project)
      .map((m) => m.project);

    // Earned certifications
    const certifications = profile?.certifications || [];

    return NextResponse.json({
      success: true,
      suggestions: {
        verifiedSkills,
        completedRoadmapProjects,
        certifications,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
