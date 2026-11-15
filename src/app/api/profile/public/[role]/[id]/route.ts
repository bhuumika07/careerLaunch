import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ role: string; id: string }> }
) {
  try {
    const { role, id } = await params;
    const db = readDb();

    const user = db.users.find(
      (u) => (u.id === id || u.email === id) && u.role === role && u.status === "active"
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Public profile not found or inactive." },
        { status: 404 }
      );
    }

    if (role === "student" || role === "job_seeker") {
      const profile = (db.studentProfiles || []).find((p) => p.userId === user.id);
      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
        profile: profile
          ? {
              institution: profile.institution,
              department: profile.department,
              degree: profile.degree,
              graduationYear: profile.graduationYear,
              currentStatus: profile.currentStatus,
              totalExperience: profile.totalExperience,
              currentRole: profile.currentRole,
              targetRoles: profile.targetRoles,
              bio: profile.bio,
              portfolioUrl: profile.portfolioUrl,
              githubUrl: profile.githubUrl,
              linkedinUrl: profile.linkedinUrl,
              skills: profile.skills,
              projects: profile.projects,
              certifications: profile.certifications,
              achievements: profile.achievements,
            }
          : null,
      });
    }

    return NextResponse.json(
      { success: false, error: "Role profile not publicly viewable." },
      { status: 403 }
    );
  } catch (error) {
    console.error("Public profile API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load public profile." },
      { status: 500 }
    );
  }
}
