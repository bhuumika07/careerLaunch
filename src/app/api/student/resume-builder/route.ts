import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, ResumeBuilderRecord } from "@/lib/db";
import { requireRole, handleAuthError } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const db = readDb();
    let resumes = (db.resumeDocuments || []).filter((r) => r.userId === user.id);

    // If none exists, synthesize initial one from profile
    if (resumes.length === 0) {
      const profile = (db.studentProfiles || []).find((p) => p.userId === user.id);
      const initialResume: ResumeBuilderRecord = {
        id: `res_bld_${Date.now()}`,
        userId: user.id,
        title: "Frontend Systems Engineer (Primary)",
        targetRole: "Frontend Engineer",
        template: "modern-minimal",
        personalInfo: {
          fullName: user.name,
          email: user.email,
          phone: profile?.phone || "+1 (555) 382-9012",
          location: profile?.location || "San Francisco, CA",
          portfolioUrl: profile?.portfolioUrl || "https://alexmorgan.dev",
          linkedinUrl: profile?.linkedinUrl || "https://linkedin.com/in/alexmorgan",
          githubUrl: profile?.githubUrl || "https://github.com/alexmorgan",
          summary:
            profile?.bio ||
            "Passionate software engineer experienced in building scalable web architectures, design systems, and resilient frontend telemetry.",
        },
        education: [
          {
            institution: profile?.institution || "St. Jude Institute of Technology",
            degree: profile?.degree || "B.Tech in Computer Science",
            department: profile?.department || "Computer Science & Engineering",
            graduationYear: profile?.graduationYear || 2026,
            cgpa: profile?.cgpa || 8.92,
          },
        ],
        experience: profile?.experience || [],
        projects: profile?.projects || [],
        skills: profile?.skills || [],
        certifications: profile?.certifications || [],
        achievements: profile?.achievements || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (!db.resumeDocuments) db.resumeDocuments = [];
      db.resumeDocuments.push(initialResume);
      writeDb(db);
      resumes = [initialResume];
    }

    return NextResponse.json({
      success: true,
      resumes,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const body = await req.json();
    const db = readDb();
    if (!db.resumeDocuments) db.resumeDocuments = [];

    const now = new Date().toISOString();
    let record: ResumeBuilderRecord;

    if (body.id) {
      // Update existing
      const index = db.resumeDocuments.findIndex((r) => r.id === body.id && r.userId === user.id);
      if (index === -1) {
        return NextResponse.json({ error: "Resume version not found" }, { status: 404 });
      }
      record = {
        ...db.resumeDocuments[index],
        ...body,
        updatedAt: now,
      };
      db.resumeDocuments[index] = record;
    } else {
      // Create new version
      record = {
        ...body,
        id: `res_bld_${Date.now()}`,
        userId: user.id,
        createdAt: now,
        updatedAt: now,
      };
      db.resumeDocuments.push(record);
    }

    writeDb(db);

    return NextResponse.json({
      success: true,
      resume: record,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
