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
  role: z.enum(["student", "faculty", "recruiter", "institution"]),
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

    // Institution and recruiter start as pending_verification
    const status =
      role === "institution" || role === "recruiter" ? "pending_verification" : "active";

    const newUser: User = {
      id: userId,
      name,
      email: normalizedEmail,
      passwordHash,
      role: role as Role,
      status,
      emailVerified: false,
      onboardingCompleted: false,
      createdAt: now,
      updatedAt: now,
    };

    db.users.push(newUser);

    // Create an initial empty profile record for the role
    if (role === "student") {
      db.studentProfiles.push({
        userId,
        skills: [],
        projects: [],
        experience: [],
        certifications: [],
        achievements: [],
        updatedAt: now,
      });
    } else if (role === "faculty") {
      db.facultyProfiles.push({
        userId,
        designation: "Faculty Member",
        department: "General",
        institution: "Pending Institution Onboarding",
        qualifications: [],
        expertise: [],
        experienceHistory: [],
        publications: [],
        certificationsFDPs: [],
        collaborationInterests: [],
        updatedAt: now,
      });
    } else if (role === "recruiter") {
      db.recruiterProfiles.push({
        userId,
        companyName: "Pending Onboarding",
        website: "",
        industry: "Technology",
        recruiterDesignation: "Technical Recruiter",
        officialEmail: normalizedEmail,
        verificationStatus: "pending",
        hiringPreferences: {
          targetDepartments: [],
          targetRoles: [],
          preferredSkills: [],
        },
        opportunitiesCount: 0,
        updatedAt: now,
      });
    } else if (role === "institution") {
      db.institutionProfiles.push({
        userId,
        name: "Pending Institution Onboarding",
        type: "University",
        location: "",
        website: "",
        adminName: name,
        adminDesignation: "Authorized Administrator",
        adminContact: "",
        verificationStatus: "pending",
        departments: [],
        studentCountByBatch: {},
        facultyCountByDepartment: {},
        updatedAt: now,
      });
    }

    // Generate email verification token
    const token = crypto.randomBytes(32).toString("hex");
    db.verificationTokens.push({
      id: `vt_${Date.now()}`,
      token,
      userId,
      email: normalizedEmail,
      type: "email_verification",
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      used: false,
      createdAt: now,
    });

    writeDb(db);

    // Establish session cookie immediately
    await createSession(userId, role as Role);

    return NextResponse.json(
      {
        success: true,
        message: "Registration successful. Welcome to CareerLaunch!",
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status,
          onboardingCompleted: false,
        },
        verificationToken: token, // Returned for dev testing & automatic verification prompt
        redirectTo: "/onboarding",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}
