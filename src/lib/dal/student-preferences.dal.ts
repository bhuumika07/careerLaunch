// src/lib/dal/student-preferences.dal.ts
import "server-only";
import { prisma } from "@/lib/prisma";

export interface StudentPreferencesData {
  preferredLocations?: string[];
  preferredWorkModes?: string[];
  preferredRoles?: string[];
  minExpectedSalary?: number | null;
  openToRelocation?: boolean;
}

export interface CareerInterestData {
  targetRole: string;
  domain: string;
  priority?: number;
}

/**
 * Retrieves student preferences strictly scoped to the server-verified userId.
 */
export async function getStudentPreferences(userId: string) {
  if (!userId) throw new Error("userId is required for retrieving preferences.");

  return prisma.studentPreference.findFirst({
    where: {
      studentProfile: { userId },
    },
  });
}

/**
 * Upserts student preferences strictly scoped to the authenticated student profile.
 */
export async function upsertStudentPreferences(userId: string, data: StudentPreferencesData) {
  if (!userId) throw new Error("userId is required for saving preferences.");

  // Ensure student profile exists
  const profile = await prisma.studentProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  return prisma.studentPreference.upsert({
    where: { studentProfileId: profile.id },
    create: {
      studentProfileId: profile.id,
      preferredLocations: data.preferredLocations || [],
      preferredWorkModes: data.preferredWorkModes || [],
      preferredRoles: data.preferredRoles || [],
      minExpectedSalary: data.minExpectedSalary ?? null,
      openToRelocation: data.openToRelocation !== undefined ? data.openToRelocation : true,
    },
    update: {
      preferredLocations: data.preferredLocations ?? undefined,
      preferredWorkModes: data.preferredWorkModes ?? undefined,
      preferredRoles: data.preferredRoles ?? undefined,
      minExpectedSalary: data.minExpectedSalary !== undefined ? data.minExpectedSalary : undefined,
      openToRelocation: data.openToRelocation !== undefined ? data.openToRelocation : undefined,
    },
  });
}

/**
 * Retrieves career interests strictly scoped to the server-verified userId.
 */
export async function getStudentCareerInterests(userId: string) {
  if (!userId) throw new Error("userId is required for retrieving career interests.");

  return prisma.careerInterest.findMany({
    where: {
      studentProfile: { userId },
    },
    orderBy: { priority: "asc" },
  });
}

/**
 * Sets student career interests atomically under the authenticated profile.
 */
export async function setStudentCareerInterests(userId: string, interests: CareerInterestData[]) {
  if (!userId) throw new Error("userId is required for setting career interests.");

  const profile = await prisma.studentProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  return prisma.$transaction(async (tx) => {
    // Delete existing interests for this student
    await tx.careerInterest.deleteMany({
      where: { studentProfileId: profile.id },
    });

    // Create new interests
    if (interests.length > 0) {
      await tx.careerInterest.createMany({
        data: interests.map((ci, index) => ({
          studentProfileId: profile.id,
          targetRole: ci.targetRole,
          domain: ci.domain,
          priority: ci.priority || index + 1,
        })),
      });
    }

    return tx.careerInterest.findMany({
      where: { studentProfileId: profile.id },
      orderBy: { priority: "asc" },
    });
  });
}
