import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import { generateProfileDiff } from "@/lib/services/resume-parser";

// GET /api/resume/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireRole(["student"], req);
    const { id } = await params;
    const db = readDb();

    const resume = db.resumes.find((r) => r.id === id && r.userId === user.id);
    if (!resume) {
      return NextResponse.json(
        { success: false, error: "Resume not found." },
        { status: 404 }
      );
    }

    const studentProfile = db.studentProfiles.find((p) => p.userId === user.id);
    const profileDiff = studentProfile
      ? generateProfileDiff(studentProfile, resume.extractedData)
      : [];

    return NextResponse.json({
      success: true,
      resume,
      profileDiff,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

// DELETE /api/resume/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireRole(["student"], req);
    const { id } = await params;
    const db = readDb();

    const index = db.resumes.findIndex((r) => r.id === id && r.userId === user.id);
    if (index === -1) {
      return NextResponse.json(
        { success: false, error: "Resume not found." },
        { status: 404 }
      );
    }

    db.resumes.splice(index, 1);
    writeDb(db);

    return NextResponse.json({
      success: true,
      message: "Resume removed successfully.",
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
