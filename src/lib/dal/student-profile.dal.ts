// src/lib/dal/student-profile.dal.ts
import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export interface StudentProfileData {
  college?: string | null;
  degree?: string | null;
  branch?: string | null;
  currentYear?: number | null;
  graduationYear?: number | null;
  cgpa?: number | null;
  cgpaScale?: number | null;
  phone?: string | null;
  bio?: string | null;
  location?: string | null;
  portfolioUrl?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  fieldMetadata?: Prisma.InputJsonValue;
}

/**
 * Retrieves student profile strictly scoped to the server-verified userId.
 */
export async function getStudentProfileByUserId(userId: string) {
  if (!userId) throw new Error("userId is required for profile retrieval.");
  return prisma.studentProfile.findUnique({
    where: { userId },
    include: {
      interests: { orderBy: { priority: "asc" } },
      preference: true,
      skills: {
        include: { skill: true },
        orderBy: { createdAt: "desc" },
      },
      projects: { orderBy: { createdAt: "desc" } },
      experiences: { orderBy: { createdAt: "desc" } },
    },
  });
}

/**
 * Upserts a student profile strictly scoped to the authenticated userId.
 */
export async function upsertStudentProfile(userId: string, data: StudentProfileData) {
  if (!userId) throw new Error("userId is required for profile upsert.");

  const payload: Prisma.StudentProfileUncheckedUpdateInput = {
    college: data.college ?? undefined,
    degree: data.degree ?? undefined,
    branch: data.branch ?? undefined,
    currentYear: data.currentYear ?? undefined,
    graduationYear: data.graduationYear ?? undefined,
    cgpa: data.cgpa ?? undefined,
    cgpaScale: data.cgpaScale ?? undefined,
    phone: data.phone ?? undefined,
    bio: data.bio ?? undefined,
    location: data.location ?? undefined,
    portfolioUrl: data.portfolioUrl ?? undefined,
    githubUrl: data.githubUrl ?? undefined,
    linkedinUrl: data.linkedinUrl ?? undefined,
    fieldMetadata: data.fieldMetadata ?? undefined,
  };

  return prisma.studentProfile.upsert({
    where: { userId },
    create: {
      userId,
      ...(payload as any),
    },
    update: payload,
    include: {
      interests: true,
      preference: true,
    },
  });
}

/**
 * Updates a student profile strictly scoped to the authenticated userId.
 */
export async function updateStudentProfile(userId: string, data: Partial<StudentProfileData>) {
  if (!userId) throw new Error("userId is required for profile update.");

  return prisma.studentProfile.update({
    where: { userId },
    data: data as Prisma.StudentProfileUpdateInput,
  });
}
