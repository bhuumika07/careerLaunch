import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
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
    const now = new Date();

    const tokenRecord = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!tokenRecord || tokenRecord.type !== "email_verification" || tokenRecord.used) {
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

    await prisma.$transaction([
      prisma.user.update({
        where: { id: tokenRecord.userId },
        data: { emailVerified: true },
      }),
      prisma.verificationToken.update({
        where: { id: tokenRecord.id },
        data: { used: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Email verified successfully! You may now proceed.",
      email: tokenRecord.email,
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

    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: "Your email is already verified.",
      });
    }

    // Invalidate old tokens
    await prisma.verificationToken.deleteMany({
      where: {
        userId: user.id,
        type: "email_verification",
      },
    });

    const token = crypto.randomBytes(32).toString("hex");
    await prisma.verificationToken.create({
      data: {
        id: `vt_${Date.now()}`,
        token,
        userId: user.id,
        email: user.email,
        type: "email_verification",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        used: false,
      },
    });

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
