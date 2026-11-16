// src/app/api/auth/me/route.ts
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { requireAuth, handleAuthError } from "@/lib/auth/authorization";
import { personalizedJsonResponse } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  try {
    const { user, session } = await requireAuth(req);

    return personalizedJsonResponse({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        avatarUrl: user.avatarUrl,
        onboardingCompleted: user.onboardingCompleted,
      },
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
