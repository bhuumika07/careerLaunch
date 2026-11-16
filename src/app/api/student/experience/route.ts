// src/app/api/student/experience/route.ts
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth/authorization";
import {
  extendedProfileService,
  StudentExperienceInputSchema,
} from "@/lib/services/student/extendedProfileService";
import { personalizedJsonResponse } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const experiences = await extendedProfileService.getExperiences(user.id);
    return personalizedJsonResponse({ success: true, experiences });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const body = await req.json();

    const validation = StudentExperienceInputSchema.safeParse(body);
    if (!validation.success) {
      return personalizedJsonResponse(
        { success: false, error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const experience = await extendedProfileService.addOrUpdateExperience(user.id, validation.data);
    return personalizedJsonResponse({ success: true, experience });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);

    let experienceId = "";
    const { searchParams } = new URL(req.url);
    const queryId = searchParams.get("id");

    if (queryId) {
      experienceId = queryId;
    } else {
      try {
        const body = await req.json();
        experienceId = body.id || "";
      } catch {
        // body may be empty
      }
    }

    if (!experienceId) {
      return personalizedJsonResponse(
        { success: false, error: "Experience ID is required." },
        { status: 400 }
      );
    }

    await extendedProfileService.deleteExperience(user.id, experienceId);

    return personalizedJsonResponse({
      success: true,
      message: "Experience deleted successfully.",
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
