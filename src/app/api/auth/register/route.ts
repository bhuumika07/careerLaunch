import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { readDb, writeDb, type User } from "@/lib/db";
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

    let userCreatedInPrisma = false;
    let newUser: { id: string; name: string; email: string; role: string; status: string; onboardingCompleted: boolean } | null = null;
    const passwordHash = await hashPassword(password);
    const userId = `usr_${role}_${Date.now()}`;
    const now = new Date().toISOString();
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // 1. Try PostgreSQL via Prisma
    try {
      const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error: "An account with this email address already exists.",
          },
          { status: 409 }
        );
      }

      const created = await prisma.$transaction(async (tx) => {
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

      newUser = {
        id: created.id,
        name: created.name || name,
        email: created.email,
        role: created.role,
        status: created.status,
        onboardingCompleted: created.onboardingCompleted,
      };
      userCreatedInPrisma = true;
    } catch (prismaErr: unknown) {
      console.warn("[register] Prisma unavailable, falling back to local file store:", prismaErr);
    }

    // 2. Fallback to local store if Prisma is unavailable
    if (!userCreatedInPrisma) {
      const db = readDb();
      if (!db.users) db.users = [];
      const fileExisting = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);

      if (fileExisting) {
        return NextResponse.json(
          {
            success: false,
            error: "An account with this email address already exists.",
          },
          { status: 409 }
        );
      }

      const fileUser: User = {
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

      db.users.push(fileUser);

      if (!db.studentProfiles) db.studentProfiles = [];
      db.studentProfiles.push({
        userId,
        skills: [],
        projects: [],
        experience: [],
        certifications: [],
        achievements: [],
        updatedAt: now,
      });

      if (!db.verificationTokens) db.verificationTokens = [];
      db.verificationTokens.push({
        id: `vt_${Date.now()}`,
        token: verificationToken,
        userId,
        email: normalizedEmail,
        type: "email_verification",
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        used: false,
        createdAt: now,
      });

      writeDb(db);

      newUser = {
        id: fileUser.id,
        name: fileUser.name,
        email: fileUser.email,
        role: fileUser.role,
        status: fileUser.status,
        onboardingCompleted: fileUser.onboardingCompleted,
      };
    }

    if (!newUser) {
      return NextResponse.json(
        { success: false, error: "Failed to create account. Please try again." },
        { status: 500 }
      );
    }

    // Auto-login newly registered user
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
          onboardingCompleted: false,
        },
        session: {
          id: session.id,
          role: session.role,
          expiresAt: session.expiresAt,
        },
        verificationToken,
        redirectTo: "/onboarding",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("[register] Unhandled registration error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}
