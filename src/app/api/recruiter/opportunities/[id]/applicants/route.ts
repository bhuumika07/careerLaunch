import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { requireRole, handleAuthError } from "@/lib/auth-guard";

// GET /api/recruiter/opportunities/[id]/applicants - Recruiter views candidate pipeline
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireRole(["recruiter", "admin"], req);
    const { id } = await params;

    const db = readDb();
    const opportunity = db.opportunities.find((o) => o.id === id);

    if (!opportunity) {
      return NextResponse.json(
        { success: false, error: "Opportunity not found." },
        { status: 404 }
      );
    }

    if (opportunity.recruiterId !== user.id && user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: You do not manage this opportunity." },
        { status: 403 }
      );
    }

    const applications = db.applications.filter((a) => a.opportunityId === id);

    // Hydrate candidates with profile data & resume
    const candidates = applications.map((app) => {
      const candidateUser = db.users.find((u) => u.id === app.studentId);
      const studentProfile = db.studentProfiles.find((p) => p.userId === app.studentId);
      const resume = db.resumes.find((r) => r.id === app.resumeId);

      // Compute skill match score against opportunity required skills
      const candidateSkills = studentProfile?.skills.map((s) => s.name.toLowerCase()) || [];
      const matchedSkills = opportunity.skills.filter((reqSkill) =>
        candidateSkills.includes(reqSkill.toLowerCase())
      );
      const matchScore = opportunity.skills.length > 0
        ? Math.round((matchedSkills.length / opportunity.skills.length) * 100)
        : 85;

      return {
        applicationId: app.id,
        status: app.status,
        appliedAt: app.appliedAt,
        coverNote: app.coverNote,
        interviewRound: app.interviewRound,
        history: app.history,
        matchScore,
        matchedSkills,
        candidate: {
          id: candidateUser?.id,
          name: candidateUser?.name || "Student Candidate",
          email: candidateUser?.email || "candidate@example.com",
          avatarUrl: candidateUser?.avatarUrl,
          department: studentProfile?.department || "Computer Science",
          degree: studentProfile?.degree || "B.Tech",
          graduationYear: studentProfile?.graduationYear || 2026,
          cgpa: studentProfile?.cgpa || 8.5,
          skills: studentProfile?.skills || [],
          projects: studentProfile?.projects || [],
          resumeFileName: resume?.fileName || "Resume.pdf",
        },
      };
    });

    return NextResponse.json({
      success: true,
      opportunity,
      candidates,
      analytics: {
        totalApplicants: applications.length,
        shortlisted: applications.filter((a) => a.status === "Shortlisted").length,
        selected: applications.filter((a) => a.status === "Selected").length,
        underReview: applications.filter((a) => a.status === "Under review" || a.status === "Submitted").length,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
