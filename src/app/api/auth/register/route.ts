import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth-utils";
import { createSession, type Role } from "@/lib/session";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["student", "job_seeker"]),
  termsAccepted: z.boolean().refine((val) => val === true, "You must accept the Terms of Service"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error.issues[0]?.message || "Validation failed",
          errors: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, email, password, role } = result.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    let existing = null;
    try {
      existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
    } catch (err: unknown) {
      console.error("[register] Database error checking existing user:", err);
      return NextResponse.json(
        { success: false, error: "Database service temporarily unavailable.", code: "DB_UNAVAILABLE" },
        { status: 503 }
      );
    }

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "An account with this email address already exists.",
        },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const userId = `usr_${role}_${Date.now()}`;

    // Create user and initial empty studentProfile atomically
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          id: userId,
          name,
          email: normalizedEmail,
          passwordHash,
          role,
          status: "active",
          emailVerified: false,
          onboardingCompleted: false,
        },
      });

      // Create linked StudentProfile
      await tx.studentProfile.create({
        data: {
          userId: user.id,
          college: null,
          degree: null,
          branch: null,
          currentYear: null,
          graduationYear: null,
          cgpa: null,
          fieldMetadata: {},
        },
      });

      // Create email verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");
      await tx.verificationToken.create({
        data: {
          id: `tok_${crypto.randomBytes(8).toString("hex")}`,
          token: verificationToken,
          userId: user.id,
          email: normalizedEmail,
          type: "email_verification",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          used: false,
        },
      });

      return user;
    });

    // Auto-login newly registered user in PostgreSQL
    const session = await createSession(newUser.id, role as Role);

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully.",
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status,
          emailVerified: newUser.emailVerified,
          onboardingCompleted: newUser.onboardingCompleted,
        },
        session: {
          id: session.id,
          expiresAt: session.expiresAt,
        },
        redirectTo: "/onboarding",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred during registration.";
    console.error("Registration error:", error);
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
