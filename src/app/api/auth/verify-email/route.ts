import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readDb, writeDb } from "@/lib/db";
import { requireAuth, handleAuthError } from "@/lib/auth-guard";

const verifySchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = verifySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Invalid token provided." },
        { status: 400 }
      );
    }

    const { token } = result.data;
    const db = readDb();
    const now = Date.now();

    const tokenRecord = db.verificationTokens.find(
      (t) => t.token === token && t.type === "email_verification" && !t.used
    );

    if (!tokenRecord) {
      return NextResponse.json(
        { success: false, error: "Invalid or already used verification token." },
        { status: 400 }
      );
    }

    if (tokenRecord.expiresAt < now) {
      return NextResponse.json(
        { success: false, error: "This email verification link has expired." },
        { status: 400 }
      );
    }

    const user = db.users.find((u) => u.id === tokenRecord.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User record not found." },
        { status: 404 }
      );
    }

    user.emailVerified = true;
    user.updatedAt = new Date().toISOString();
    tokenRecord.used = true;

    writeDb(db);

    return NextResponse.json({
      success: true,
      message: "Email verified successfully! You may now proceed.",
      email: user.email,
    });
  } catch (error) {
    console.error("Verify email API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to verify email." },
      { status: 500 }
    );
  }
}

// Resend verification email
export async function PUT(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const db = readDb();

    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: "Your email is already verified.",
      });
    }

    // Invalidate old tokens
    db.verificationTokens = db.verificationTokens.filter(
      (t) => !(t.userId === user.id && t.type === "email_verification")
    );

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    db.verificationTokens.push({
      id: `vt_${Date.now()}`,
      token,
      userId: user.id,
      email: user.email,
      type: "email_verification",
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      used: false,
      createdAt: new Date().toISOString(),
    });

    writeDb(db);

    return NextResponse.json({
      success: true,
      message: "A fresh verification link has been generated.",
      token,
      verificationLink: `/verify-email?token=${token}`,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
