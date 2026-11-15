import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, StudentProfile } from "@/lib/db";
import { requireAuth, handleAuthError } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const db = readDb();

    const profile = (db.studentProfiles || []).find((p) => p.userId === user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted,
      },
      profile: profile || null,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const body = await req.json();
    const { data, completeOnboarding = true } = body;

    const db = readDb();
    const now = new Date().toISOString();

    db.studentProfiles = db.studentProfiles || [];
    let profile = db.studentProfiles.find((p) => p.userId === user.id);

    if (!profile) {
      profile = {
        userId: user.id,
        skills: [],
        projects: [],
        experience: [],
        certifications: [],
        achievements: [],
        updatedAt: now,
      };
      db.studentProfiles.push(profile);
    }

    // Common shared fields
    if (data.phone !== undefined) profile.phone = data.phone;
    if (data.bio !== undefined) profile.bio = data.bio;
    if (data.location !== undefined) profile.location = data.location;
    if (data.avatarUrl !== undefined) profile.avatarUrl = data.avatarUrl;

    if (user.role === "student") {
      // Student-specific fields
      if (data.institution !== undefined) profile.institution = data.institution;
      if (data.department !== undefined) profile.department = data.department;
      if (data.degree !== undefined) profile.degree = data.degree;
      if (data.graduationYear !== undefined) profile.graduationYear = Number(data.graduationYear);
      if (data.cgpa !== undefined) profile.cgpa = Number(data.cgpa);
    } else if (user.role === "job_seeker") {
      // Job Seeker-specific fields
      if (data.currentStatus !== undefined) profile.currentStatus = data.currentStatus;
      if (data.totalExperience !== undefined) profile.totalExperience = data.totalExperience;
      if (data.currentRole !== undefined) profile.currentRole = data.currentRole;
      if (data.targetRoles !== undefined) profile.targetRoles = Array.isArray(data.targetRoles) ? data.targetRoles : [data.targetRoles];
      if (data.preferredLocations !== undefined) profile.preferredLocations = Array.isArray(data.preferredLocations) ? data.preferredLocations : [data.preferredLocations];
      if (data.expectedCompensation !== undefined) profile.expectedCompensation = data.expectedCompensation;
    }

    profile.updatedAt = now;

    // Update user onboarding state
    const dbUser = (db.users || []).find((u) => u.id === user.id);
    if (dbUser && completeOnboarding) {
      dbUser.onboardingCompleted = true;
      dbUser.updatedAt = now;
    }

    writeDb(db);

    const redirectTo = user.role === "admin" ? "/admin/dashboard" : "/student/dashboard";

    return NextResponse.json({
      success: true,
      redirectTo,
      profile,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
