// src/app/api/student/profile/sync-resume/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import { resumeSyncService } from "@/lib/services/student/resumeSyncService";
import { z } from "zod";

const SyncResumePayloadSchema = z.object({
  resumeVersionId: z.string().min(1, "resumeVersionId is required"),
  reviews: z.array(
    z.object({
      id: z.string().optional(),
      fieldPath: z.string().min(1, "fieldPath is required"),
      originalValue: z.any(),
      correctedValue: z.any().optional(),
      status: z.enum(["pending", "accepted", "edited", "rejected"]),
    })
  ),
});

/**
 * POST /api/student/profile/sync-resume
 * Syncs confirmed ParsedFieldReview items into StudentProfile and writes an audit log.
 * Unconfirmed items are strictly rejected.
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const body = await req.json();

    const validation = SyncResumePayloadSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const result = await resumeSyncService.syncConfirmedFields({
      studentId: user.id,
      resumeVersionId: validation.data.resumeVersionId,
      reviews: validation.data.reviews,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
