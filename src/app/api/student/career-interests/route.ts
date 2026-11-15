// src/app/api/student/career-interests/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import {
  extendedProfileService,
  CareerInterestsPayloadSchema,
} from "@/lib/services/student/extendedProfileService";

/**
 * GET /api/student/career-interests
 * Retrieves target career interests for the authenticated student.
 */
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);

    const interests = await extendedProfileService.getCareerInterests(user.id);

    return NextResponse.json({
      success: true,
      userId: user.id,
      interests,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

/**
 * PUT /api/student/career-interests
 * Updates target career interests for the authenticated student.
 * Never trusts client-supplied student ID.
 */
export async function PUT(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const body = await req.json();

    const validation = CareerInterestsPayloadSchema.safeParse(body);
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

    const updated = await extendedProfileService.updateCareerInterests(
      user.id,
      validation.data
    );

    return NextResponse.json({
      success: true,
      interests: updated,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
