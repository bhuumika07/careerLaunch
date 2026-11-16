// src/lib/dal/student-applications.dal.ts
import "server-only";
import { prisma } from "@/lib/prisma";
import type { ApplicationStatus } from "@prisma/client";

/**
 * Retrieves all applications submitted by the authenticated student.
 */
export async function getStudentApplications(userId: string) {
  if (!userId) throw new Error("userId is required for retrieving applications.");

  return prisma.application.findMany({
    where: { userId },
    include: {
      opportunity: {
        select: {
          id: true,
          title: true,
          organizationName: true,
          locationCity: true,
          workMode: true,
          lifecycleStatus: true,
          applicationDeadline: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Retrieves a single application by ID, strictly verifying ownership by userId.
 * Returns null if not found or owned by another user (caller returns 404).
 */
export async function getStudentApplicationById(userId: string, applicationId: string) {
  if (!userId || !applicationId) {
    throw new Error("userId and applicationId are required.");
  }

  return prisma.application.findFirst({
    where: {
      id: applicationId,
      userId,
    },
    include: {
      opportunity: true,
    },
  });
}

/**
 * Creates a new application record strictly for the authenticated student.
 */
export async function createStudentApplication(
  userId: string,
  opportunityId: string,
  data?: {
    notes?: string;
    resumeVersionId?: string;
    status?: ApplicationStatus;
  }
) {
  if (!userId || !opportunityId) {
    throw new Error("userId and opportunityId are required for application creation.");
  }

  return prisma.application.create({
    data: {
      userId,
      opportunityId,
      status: data?.status || "saved",
      notes: data?.notes,
      resumeVersionId: data?.resumeVersionId,
      appliedDate: data?.status === "applied" ? new Date() : undefined,
    },
    include: {
      opportunity: true,
    },
  });
}

/**
 * Updates application status after verifying ownership by userId.
 */
export async function updateStudentApplicationStatus(
  userId: string,
  applicationId: string,
  status: ApplicationStatus,
  notes?: string
) {
  if (!userId || !applicationId) {
    throw new Error("userId and applicationId are required.");
  }

  const existing = await prisma.application.findFirst({
    where: {
      id: applicationId,
      userId,
    },
  });

  if (!existing) {
    return null;
  }

  return prisma.application.update({
    where: { id: applicationId },
    data: {
      status,
      notes: notes ?? existing.notes,
      appliedDate: status === "applied" && !existing.appliedDate ? new Date() : existing.appliedDate,
    },
    include: {
      opportunity: true,
    },
  });
}
