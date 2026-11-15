// src/app/api/student/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import { profileService, StudentProfileInputSchema } from "@/lib/services/student/profileService";

/**
 * GET /api/student/profile
 * Retrieves the authenticated student's academic and foundational profile.
 * Strictly scoped to session user.
 */
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);

    const profile = await profileService.getProfile(user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      profile,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

/**
 * PUT /api/student/profile
 * Updates the authenticated student's profile partially.
 * Strictly ignores any client-supplied userId or studentId.
 * Enforces that resume-extracted values never overwrite confirmed student fields.
 */
export async function PUT(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const body = await req.json();

    // Validate request body via Zod
    const validation = StudentProfileInputSchema.safeParse(body);
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

    const result = await profileService.updateProfile(user.id, validation.data);

    return NextResponse.json({
      success: true,
      profile: result.profile,
      updatedFields: result.updatedFields,
      skippedFields: result.skippedFields,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
