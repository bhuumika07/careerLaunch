// src/app/api/resume/[id]/import/route.ts
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { readDb } from "@/lib/db";
import { requireRole, handleAuthError } from "@/lib/auth/authorization";
import { resumeSyncService, ParsedFieldReviewItem } from "@/lib/services/student/resumeSyncService";
import { profileService } from "@/lib/services/student/profileService";
import { getStudentResumeById, getStudentResumeVersionById } from "@/lib/dal/student-resume.dal";
import { personalizedJsonResponse } from "@/lib/api/response";

// POST /api/resume/[id]/import - Merge explicitly approved fields into profile via resumeSyncService
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireRole(["student"], req);
    const { id } = await params;
    const body = await req.json();

    const { approvedFieldIds } = body as { approvedFieldIds: string[] };

    if (!Array.isArray(approvedFieldIds) || approvedFieldIds.length === 0) {
      return personalizedJsonResponse(
        { success: false, error: "Please select at least one field to import." },
        { status: 400 }
      );
    }

    // Check ownership via DAL first (Prisma authoritative source)
    let extractedData: any = null;
    const prismaResume = await getStudentResumeById(user.id, id);
    const prismaVersion = !prismaResume ? await getStudentResumeVersionById(user.id, id) : null;

    if (prismaResume && prismaResume.versions?.[0]) {
      extractedData = prismaResume.versions[0].parsedData;
    } else if (prismaVersion) {
      extractedData = prismaVersion.parsedData;
    } else {
      // Check legacy db.json with strict user isolation
      const db = readDb();
      const resume = db.resumes?.find((r) => r.id === id && r.userId === user.id);
      if (!resume) {
        return personalizedJsonResponse(
          { success: false, error: "Resume not found." },
          { status: 404 }
        );
      }
      extractedData = resume.extractedData;
    }

    const approvedSet = new Set(approvedFieldIds);
    const reviews: ParsedFieldReviewItem[] = [];

    // 1. CGPA Review Item
    if (approvedSet.has("diff_cgpa") && extractedData?.education?.[0]?.cgpa) {
      reviews.push({
        fieldPath: "academics.cgpa",
        originalValue: extractedData.education[0].cgpa,
        status: "accepted",
      });
    }

    // 2. Skills Review Items
    for (const skill of extractedData?.skills || []) {
      if (approvedSet.has(`diff_skill_${skill.name}`)) {
        reviews.push({
          fieldPath: `skills.${skill.name}`,
          originalValue: skill.name,
          status: "accepted",
        });
      }
    }

    // 3. Projects Review Items
    for (const proj of extractedData?.projects || []) {
      const fieldId = `diff_proj_${proj.title.replace(/\s+/g, "_")}`;
      if (approvedSet.has(fieldId)) {
        reviews.push({
          fieldPath: `projects.${proj.title}`,
          originalValue: proj,
          status: "accepted",
        });
      }
    }

    // Process via authoritative ResumeSyncService
    // Invariant: Unconfirmed fields are not applied; student-confirmed fields cannot be overwritten;
    // downstream snapshots are marked stale; audit log is written to ProfileSyncLog.
    const syncResult = await resumeSyncService.syncConfirmedFields({
      studentId: user.id,
      resumeVersionId: id,
      reviews,
    });

    let updatedProfile = null;
    try {
      updatedProfile = await profileService.getProfile(user.id);
    } catch {
      // ignore
    }

    const appliedCount = syncResult.fieldsApplied.length;
    const skippedCount = syncResult.fieldsSkipped.length;

    let message = `Successfully imported ${appliedCount} approved field(s) into your student profile.`;
    if (skippedCount > 0) {
      message += ` (${skippedCount} field(s) skipped because existing student-confirmed values are protected).`;
    }

    return personalizedJsonResponse({
      success: true,
      message,
      syncResult,
      profile: updatedProfile,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
