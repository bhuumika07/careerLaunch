// src/lib/dal/student-resume.dal.ts
import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma, ResumeStatus } from "@prisma/client";

/**
 * Retrieves all resumes belonging to the authenticated student.
 */
export async function getStudentResumes(userId: string) {
  if (!userId) throw new Error("userId is required for retrieving resumes.");

  return prisma.resume.findMany({
    where: { studentId: userId },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Retrieves a single resume by ID, verifying it belongs strictly to userId.
 * Returns null if not found or belongs to another user (caller returns 404, never leaking 403 existence).
 */
export async function getStudentResumeById(userId: string, resumeId: string) {
  if (!userId || !resumeId) throw new Error("userId and resumeId are required.");

  return prisma.resume.findFirst({
    where: {
      id: resumeId,
      studentId: userId,
    },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          parsedFieldReviews: true,
        },
      },
    },
  });
}

/**
 * Retrieves a resume version by ID, verifying ownership via parent resume.studentId.
 * Returns null if not found or belongs to another student.
 */
export async function getStudentResumeVersionById(userId: string, versionId: string) {
  if (!userId || !versionId) throw new Error("userId and versionId are required.");

  return prisma.resumeVersion.findFirst({
    where: {
      id: versionId,
      resume: {
        studentId: userId,
      },
    },
    include: {
      resume: true,
      parsedFieldReviews: true,
    },
  });
}

/**
 * Creates a new Resume and initial ResumeVersion for the authenticated student.
 */
export async function createStudentResume(
  userId: string,
  data: {
    title: string;
    originalFileName: string;
    mimeType: string;
    fileSize: number;
    storageKey: string;
    checksum: string;
    status: ResumeStatus;
  }
) {
  if (!userId) throw new Error("userId is required for creating a resume.");

  return prisma.resume.create({
    data: {
      studentId: userId,
      title: data.title,
      versions: {
        create: {
          versionNumber: 1,
          originalFileName: data.originalFileName,
          mimeType: data.mimeType,
          fileSize: data.fileSize,
          storageKey: data.storageKey,
          checksum: data.checksum,
          status: data.status,
          isActive: true,
        },
      },
    },
    include: {
      versions: true,
    },
  });
}

/**
 * Deletes a resume after verifying that it belongs to the authenticated user.
 * Returns false if resume does not exist or belongs to another user.
 */
export async function deleteStudentResume(userId: string, resumeId: string): Promise<boolean> {
  if (!userId || !resumeId) throw new Error("userId and resumeId are required.");

  const existing = await prisma.resume.findFirst({
    where: {
      id: resumeId,
      studentId: userId,
    },
  });

  if (!existing) {
    return false;
  }

  // Delete versions and parent resume
  await prisma.$transaction([
    prisma.parsedFieldReview.deleteMany({
      where: { resumeVersion: { resumeId } },
    }),
    prisma.resumeVersion.deleteMany({
      where: { resumeId },
    }),
    prisma.resume.delete({
      where: { id: resumeId },
    }),
  ]);

  return true;
}
