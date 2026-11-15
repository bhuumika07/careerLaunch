// src/app/api/student/preferences/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth-guard";
import {
  extendedProfileService,
  StudentPreferenceInputSchema,
} from "@/lib/services/student/extendedProfileService";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const preferences = await extendedProfileService.getPreferences(user.id);
    return NextResponse.json({ success: true, preferences });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const body = await req.json();

    const validation = StudentPreferenceInputSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const preferences = await extendedProfileService.updatePreferences(user.id, validation.data);
    return NextResponse.json({ success: true, preferences });
  } catch (error) {
    return handleAuthError(error);
  }
}
