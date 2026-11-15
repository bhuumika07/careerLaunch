// src/app/api/student/experience/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import {
  extendedProfileService,
  StudentExperienceInputSchema,
} from "@/lib/services/student/extendedProfileService";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const experiences = await extendedProfileService.getExperiences(user.id);
    return NextResponse.json({ success: true, experiences });
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
      return NextResponse.json(
        { success: false, error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const experience = await extendedProfileService.addOrUpdateExperience(user.id, validation.data);
    return NextResponse.json({ success: true, experience });
  } catch (error) {
    return handleAuthError(error);
  }
}
