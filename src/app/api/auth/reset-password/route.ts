import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readDb, writeDb } from "@/lib/db";
import { hashPassword } from "@/lib/auth-utils";

const resetSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = resetSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const { token, password } = result.data;
    const db = readDb();
    const now = Date.now();

    const tokenRecord = db.verificationTokens.find(
      (t) => t.token === token && t.type === "password_reset" && !t.used
    );

    if (!tokenRecord) {
      return NextResponse.json(
        { success: false, error: "Invalid or previously used reset token." },
        { status: 400 }
      );
    }

    if (tokenRecord.expiresAt < now) {
      return NextResponse.json(
        { success: false, error: "This password reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    const user = db.users.find((u) => u.id === tokenRecord.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Associated user account was not found." },
        { status: 404 }
      );
    }

    // Update password
    user.passwordHash = await hashPassword(password);
    user.updatedAt = new Date().toISOString();

    // Mark token as used
    tokenRecord.used = true;

    // Invalidate existing sessions for security on password change
    db.sessions = db.sessions.filter((s) => s.userId !== user.id);

    writeDb(db);

    return NextResponse.json({
      success: true,
      message: "Your password has been reset successfully. Please sign in with your new password.",
      redirectTo: "/login",
    });
  } catch (error) {
    console.error("Reset password API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reset password." },
      { status: 500 }
    );
  }
}
