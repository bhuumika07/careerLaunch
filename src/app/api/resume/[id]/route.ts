// src/app/api/resume/[id]/route.ts
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth/authorization";
import { getStudentResumeById, deleteStudentResume } from "@/lib/dal/student-resume.dal";
import { profileService } from "@/lib/services/student/profileService";
import { generateProfileDiff } from "@/lib/services/resume-parser";
import { personalizedJsonResponse } from "@/lib/api/response";

// GET /api/resume/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireRole(["student"], req);
    const { id } = await params;

    // Authoritative DAL check: verifies resume belongs strictly to user.id
    const resume = await getStudentResumeById(user.id, id);
    if (!resume) {
      return personalizedJsonResponse(
        { success: false, error: "Resume not found." },
        { status: 404 }
      );
    }

    const studentProfile = await profileService.getProfile(user.id);
    const latestVersion = resume.versions?.[0];
    const extractedData = latestVersion?.parsedData || null;

    const profileDiff =
      studentProfile && extractedData
        ? generateProfileDiff(studentProfile as any, extractedData as any)
        : [];

    return personalizedJsonResponse({
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

    // Authoritative DAL check: verifies ownership before deleting
    const deleted = await deleteStudentResume(user.id, id);
    if (!deleted) {
      return personalizedJsonResponse(
        { success: false, error: "Resume not found." },
        { status: 404 }
      );
    }

    return personalizedJsonResponse({
      success: true,
      message: "Resume removed successfully.",
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
