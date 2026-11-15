import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { readDb, writeDb, User, Role } from "@/lib/db";
import { hashPassword } from "@/lib/auth-utils";
import { createSession } from "@/lib/session";

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
    const db = readDb();

    // Check if user already exists
    const normalizedEmail = email.toLowerCase().trim();
    const existing = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
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
    const now = new Date().toISOString();
    const userId = `usr_${role}_${Date.now()}`;

    const newUser: User = {
      id: userId,
      name,
      email: normalizedEmail,
      passwordHash,
      role: role as Role,
      status: "active",
      emailVerified: false,
      onboardingCompleted: false,
      createdAt: now,
      updatedAt: now,
    };

    db.users.push(newUser);

    // Create an initial empty profile record in unified studentProfiles (CareerProfile)
    db.studentProfiles = db.studentProfiles || [];
    db.studentProfiles.push({
      userId,
      skills: [],
      projects: [],
      experience: [],
      certifications: [],
      achievements: [],
      updatedAt: now,
    });

    // Create email verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenRecord = {
      id: `tok_${crypto.randomBytes(8).toString("hex")}`,
      token: verificationToken,
      userId,
      email: normalizedEmail,
      type: "email_verification" as const,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      used: false,
      createdAt: now,
    };
    db.verificationTokens = db.verificationTokens || [];
    db.verificationTokens.push(tokenRecord);

    writeDb(db);

    // Auto-login newly registered user
    const session = await createSession(userId, role as Role);

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
          onboardingCompleted: newUser.onboardingCompleted,
        },
        sessionId: session.id,
        redirectTo: "/onboarding",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error occurred during registration.",
      },
      { status: 500 }
    );
  }
}
