// src/app/api/student/skillgap/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import { skillGapService } from "@/lib/services/career-roles/skillGapService";

/**
 * GET /api/student/skillgap
 * Returns verified skill gap analysis and available target roles for the authenticated student.
 */
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const { searchParams } = new URL(req.url);
    const roleId = searchParams.get("roleId") || null;

    const [availableRoles, analysis] = await Promise.all([
      skillGapService.getAvailableTargetRoles(user.id),
      skillGapService.analyzeSkillGap(user.id, roleId),
    ]);

    return NextResponse.json({
      success: true,
      availableRoles,
      analysis,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
