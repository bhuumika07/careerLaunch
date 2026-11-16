// src/app/api/student/preferences/route.ts
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth/authorization";
import {
  extendedProfileService,
  StudentPreferenceInputSchema,
} from "@/lib/services/student/extendedProfileService";
import { personalizedJsonResponse } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireRole(["student"], req);
    const preferences = await extendedProfileService.getPreferences(user.id);
    return personalizedJsonResponse({ success: true, preferences });
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
      return personalizedJsonResponse(
        { success: false, error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const preferences = await extendedProfileService.updatePreferences(user.id, validation.data);
    return personalizedJsonResponse({ success: true, preferences });
  } catch (error) {
    return handleAuthError(error);
  }
}
