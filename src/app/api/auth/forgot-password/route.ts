import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { readDb, writeDb } from "@/lib/db";

const forgotSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = forgotSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    const { email } = result.data;
    const db = readDb();
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());

    // Even if user not found, respond with generic success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account matches that email, password reset instructions have been generated.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour

    // Clean previous unused tokens for this user
    db.verificationTokens = db.verificationTokens.filter(
      (t) => !(t.userId === user.id && t.type === "password_reset")
    );

    db.verificationTokens.push({
      id: `pr_${Date.now()}`,
      token: resetToken,
      userId: user.id,
      email: user.email,
      type: "password_reset",
      expiresAt,
      used: false,
      createdAt: new Date().toISOString(),
    });

    writeDb(db);

    return NextResponse.json({
      success: true,
      message: "Password reset link generated successfully.",
      resetToken, // Returned for dev testing & direct link display
      resetLink: `/reset-password?token=${resetToken}`,
    });
  } catch (error) {
    console.error("Forgot password API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process password reset request." },
      { status: 500 }
    );
  }
}
