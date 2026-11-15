// src/app/api/student/skills/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import {
  extendedProfileService,
  StudentSkillInputSchema,
} from "@/lib/services/student/extendedProfileService";

/**
 * GET /api/student/skills
 * Retrieves skills for the authenticated student.
 */
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);

    const skills = await extendedProfileService.getStudentSkills(user.id);

    return NextResponse.json({
      success: true,
      skills,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

/**
 * POST /api/student/skills
 * Adds or updates a student skill with alias resolution and duplicate prevention.
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const body = await req.json();

    const validation = StudentSkillInputSchema.safeParse(body);
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

    const savedSkill = await extendedProfileService.addOrUpdateStudentSkill(
      user.id,
      validation.data
    );

    return NextResponse.json({
      success: true,
      skill: savedSkill,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
