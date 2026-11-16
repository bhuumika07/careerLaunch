import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

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
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Even if user not found, respond with generic success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account matches that email, password reset instructions have been generated.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Clean previous unused tokens for this user
    await prisma.verificationToken.deleteMany({
      where: {
        userId: user.id,
        type: "password_reset",
      },
    });

    await prisma.verificationToken.create({
      data: {
        id: `pr_${Date.now()}`,
        token: resetToken,
        userId: user.id,
        email: user.email,
        type: "password_reset",
        expiresAt,
        used: false,
      },
    });

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
