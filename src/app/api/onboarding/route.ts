// src/app/api/onboarding/route.ts
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { requireAuth, handleAuthError } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import { profileService } from "@/lib/services/student/profileService";
import { personalizedJsonResponse } from "@/lib/api/response";
import { readDb, writeDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const profile = await profileService.getProfile(user.id);

    return personalizedJsonResponse({
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
    const { data = {}, completeOnboarding = true } = body;

    // Map input fields to StudentProfile schema
    const profileUpdatePayload: Record<string, unknown> = {
      source: "STUDENT",
      confirmed: true,
    };

    if (data.phone !== undefined) profileUpdatePayload.phone = data.phone;
    if (data.bio !== undefined) profileUpdatePayload.bio = data.bio;
    if (data.location !== undefined) profileUpdatePayload.location = data.location;
    if (data.college !== undefined || data.institution !== undefined) {
      profileUpdatePayload.college = data.college || data.institution;
    }
    if (data.degree !== undefined) profileUpdatePayload.degree = data.degree;
    if (data.branch !== undefined || data.department !== undefined) {
      profileUpdatePayload.branch = data.branch || data.department;
    }
    if (data.graduationYear !== undefined && data.graduationYear !== "") {
      profileUpdatePayload.graduationYear = Number(data.graduationYear);
    }
    if (data.cgpa !== undefined && data.cgpa !== "") {
      profileUpdatePayload.cgpa = Number(data.cgpa);
    }
    if (data.portfolioUrl !== undefined) profileUpdatePayload.portfolioUrl = data.portfolioUrl;
    if (data.githubUrl !== undefined) profileUpdatePayload.githubUrl = data.githubUrl;
    if (data.linkedinUrl !== undefined) profileUpdatePayload.linkedinUrl = data.linkedinUrl;

    const { profile } = await profileService.updateProfile(user.id, profileUpdatePayload);

    // If job seeker preferences are present, update StudentPreference
    if (data.preferredLocations || data.targetRoles || data.expectedCompensation) {
      await prisma.studentPreference.upsert({
        where: { studentProfileId: profile.id },
        update: {
          preferredLocations: Array.isArray(data.preferredLocations)
            ? data.preferredLocations
            : data.preferredLocations
            ? [data.preferredLocations]
            : [],
          preferredRoles: Array.isArray(data.targetRoles)
            ? data.targetRoles
            : data.targetRoles
            ? [data.targetRoles]
            : [],
        },
        create: {
          studentProfileId: profile.id,
          preferredLocations: Array.isArray(data.preferredLocations)
            ? data.preferredLocations
            : data.preferredLocations
            ? [data.preferredLocations]
            : [],
          preferredRoles: Array.isArray(data.targetRoles)
            ? data.targetRoles
            : data.targetRoles
            ? [data.targetRoles]
            : [],
        },
      }).catch((err) => {
        console.warn("[onboarding] Failed to update preferences:", err.message);
      });
    }

    // Mark onboarding complete on User in PostgreSQL or local file store
    if (completeOnboarding) {
      if (prisma?.user) {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { onboardingCompleted: true },
          });
        } catch (prismaErr: any) {
          console.warn("[onboarding] Failed to update user in Prisma, using local store:", prismaErr?.message);
        }
      }

      try {
        const db = readDb();
        const localUser = db.users?.find((u) => u.id === user.id);
        if (localUser) {
          localUser.onboardingCompleted = true;
          localUser.updatedAt = new Date().toISOString();
          writeDb(db);
        }
      } catch (fileErr) {
        console.warn("[onboarding] Failed to update user in local file store:", fileErr);
      }
    }

    const redirectTo = user.role === "admin" ? "/admin/dashboard" : "/student/dashboard";

    return personalizedJsonResponse({
      success: true,
      redirectTo,
      profile,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
