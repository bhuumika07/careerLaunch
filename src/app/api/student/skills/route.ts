// src/app/api/student/skills/route.ts
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth/authorization";
import {
  extendedProfileService,
  StudentSkillInputSchema,
} from "@/lib/services/student/extendedProfileService";
import { personalizedJsonResponse } from "@/lib/api/response";

/**
 * GET /api/student/skills
 * Retrieves skills for the authenticated student.
 */
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const skills = await extendedProfileService.getStudentSkills(user.id);

    return personalizedJsonResponse({
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
      return personalizedJsonResponse(
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

    return personalizedJsonResponse({
      success: true,
      skill: savedSkill,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

/**
 * DELETE /api/student/skills
 * Removes a skill from the authenticated student's profile.
 * Identifiers taken exclusively from server-verified session + request body/query.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);

    let idOrName = "";
    const { searchParams } = new URL(req.url);
    const queryId = searchParams.get("id") || searchParams.get("name");

    if (queryId) {
      idOrName = queryId;
    } else {
      try {
        const body = await req.json();
        idOrName = body.id || body.name || "";
      } catch {
        // body may be empty
      }
    }

    if (!idOrName) {
      return personalizedJsonResponse(
        { success: false, error: "Skill id or name is required for deletion." },
        { status: 400 }
      );
    }

    await extendedProfileService.removeStudentSkill(user.id, idOrName);

    return personalizedJsonResponse({
      success: true,
      message: `Skill ${idOrName} removed successfully.`,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
