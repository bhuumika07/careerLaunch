// src/lib/middleware/ownershipGuard.ts

/**
 * Middleware to verify that a resource belongs to the authenticated student.
 * Usage: const { resume } = await ensureOwnership({ resumeId, studentId: auth.user.id });
 */
import { PrismaClient } from "@prisma/client";
import { AuthContext } from "../auth-guard"; // assume exported type

const prisma = new PrismaClient();

export async function ensureResumeOwnership(resumeId: string, auth: AuthContext) {
  const resume = await prisma.resume.findUnique({
    where: { id: resumeId },
    select: { studentId: true },
  });
  if (!resume) {
    // Return undefined; the route can decide 404 vs 403
    return null;
  }
  if (resume.studentId !== auth.user.id) {
    // Not the owner
    return false;
  }
  return true;
}

export async function ensureResumeVersionOwnership(versionId: string, auth: AuthContext) {
  const version = await prisma.resumeVersion.findUnique({
    where: { id: versionId },
    select: { resume: { select: { studentId: true } } },
  });
  if (!version) return null;
  if (version.resume.studentId !== auth.user.id) return false;
  return true;
}
