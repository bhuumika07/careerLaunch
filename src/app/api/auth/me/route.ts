import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleAuthError } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  try {
    const { user, session } = await requireAuth(req);

    return NextResponse.json({
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
