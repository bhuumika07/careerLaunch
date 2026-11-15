// src/app/api/student/profile/completion/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import { profileCompletionService } from "@/lib/services/student/profileCompletionService";

/**
 * GET /api/student/profile/completion
 * Computes the profile completion status for the authenticated student.
 */
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);

    const completion = await profileCompletionService.calculateCompletion(user.id);

    return NextResponse.json({
      success: true,
      userId: user.id,
      completion,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
