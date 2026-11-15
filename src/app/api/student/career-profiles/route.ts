// src/app/api/student/career-profiles/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import { careerRoleService } from "@/lib/services/career-roles/careerRoleService";
import { z } from "zod";

const TargetRoleToggleSchema = z.object({
  roleId: z.string().min(1, "Role ID is required"),
  selected: z.boolean(),
});

/**
 * GET /api/student/career-profiles
 * Retrieves scored career role recommendations for the authenticated student.
 * Invariant: Never recommends roles with zero active opportunities.
 */
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);

    const { searchParams } = new URL(req.url);
    const domain = searchParams.get("domain") || undefined;
    const minScoreStr = searchParams.get("minScore");
    const minScore = minScoreStr ? parseInt(minScoreStr, 10) : undefined;

    const data = await careerRoleService.getRecommendations(user.id, {
      domain,
      minScore: !isNaN(minScore as number) ? minScore : undefined,
    });

    return NextResponse.json({
      success: true,
      userId: user.id,
      ...data,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

/**
 * POST /api/student/career-profiles
 * Toggles a role as targeted/untargeted for the authenticated student,
 * persisting the change via the career-interests store.
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const body = await req.json();

    const validation = TargetRoleToggleSchema.safeParse(body);
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

    const { roleId, selected } = validation.data;
    const updatedInterests = await careerRoleService.setRoleTarget(
      user.id,
      roleId,
      selected
    );

    return NextResponse.json({
      success: true,
      userId: user.id,
      roleId,
      selected,
      interests: updatedInterests,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
