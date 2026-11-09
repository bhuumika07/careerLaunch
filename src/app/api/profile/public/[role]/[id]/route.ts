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

    if (role === "student") {
      const profile = db.studentProfiles.find((p) => p.userId === user.id);
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

    if (role === "faculty") {
      const profile = db.facultyProfiles.find((p) => p.userId === user.id);
      return NextResponse.json({
        success: true,
        user: { id: user.id, name: user.name, role: user.role },
        profile,
      });
    }

    if (role === "recruiter") {
      const profile = db.recruiterProfiles.find((p) => p.userId === user.id);
      return NextResponse.json({
        success: true,
        user: { id: user.id, name: user.name, role: user.role },
        profile: profile
          ? {
              companyName: profile.companyName,
              website: profile.website,
              industry: profile.industry,
              aboutCompany: profile.aboutCompany,
              verificationStatus: profile.verificationStatus,
            }
          : null,
      });
    }

    if (role === "institution") {
      const profile = db.institutionProfiles.find((p) => p.userId === user.id);
      return NextResponse.json({
        success: true,
        user: { id: user.id, name: user.name, role: user.role },
        profile: profile
          ? {
              name: profile.name,
              type: profile.type,
              location: profile.location,
              website: profile.website,
              accreditation: profile.accreditation,
              departments: profile.departments,
              verificationStatus: profile.verificationStatus,
            }
          : null,
      });
    }

    return NextResponse.json(
      { success: false, error: "Unsupported role for public profile" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Public profile API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch public profile." },
      { status: 500 }
    );
  }
}
