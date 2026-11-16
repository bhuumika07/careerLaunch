import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
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
    const now = new Date();

    const tokenRecord = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!tokenRecord || tokenRecord.type !== "password_reset" || tokenRecord.used) {
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

    const newHash = await hashPassword(password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: tokenRecord.userId },
        data: { passwordHash: newHash },
      }),
      prisma.verificationToken.update({
        where: { id: tokenRecord.id },
        data: { used: true },
      }),
      // Invalidate existing sessions on password change
      prisma.session.deleteMany({
        where: { userId: tokenRecord.userId },
      }),
    ]);

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
