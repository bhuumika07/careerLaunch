// src/server/services/resume/resumeService.ts

import { PrismaClient, Resume, ResumeVersion, ParsedFieldReview, ProfileSyncLog } from "@prisma/client";
import { generateStorageKey, storeFile, deleteFile, getSignedUrl } from "../../../lib/utils/storage";
import { AuthContext } from "../../../lib/auth-guard";
import { ensureResumeOwnership, ensureResumeVersionOwnership } from "../../../lib/middleware/ownershipGuard";

const prisma = new PrismaClient();

/** Create a new resume entry for the authenticated student */
export async function createResume(auth: AuthContext, title: string) {
  const resume = await prisma.resume.create({
    data: {
      studentId: auth.user.id,
      title,
    },
  });
  return resume;
}

/** List resumes (with latest version info) for the student */
export async function listResumes(auth: AuthContext) {
  const resumes = await prisma.resume.findMany({
    where: { studentId: auth.user.id },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
  });
  return resumes;
}

/** Get a resume by id (owner only) */
export async function getResume(auth: AuthContext, resumeId: string) {
  const permitted = await ensureResumeOwnership(resumeId, auth);
  if (permitted === null) return null; // not found
  if (!permitted) throw new Error("Forbidden");
  return prisma.resume.findUnique({ where: { id: resumeId }, include: { versions: true } });
}

/** Upload a new version for a resume */
export async function uploadResumeVersion(
  auth: AuthContext,
  resumeId: string,
  fileBuffer: Buffer,
  originalFileName: string,
  mimeType: string
) {
  const permitted = await ensureResumeOwnership(resumeId, auth);
  if (permitted === null) return null;
  if (!permitted) throw new Error("Forbidden");

  // generate storage key and store file
  const storageKey = await storeFile(fileBuffer, originalFileName, mimeType);

  const latest = await prisma.resumeVersion.findFirst({
    where: { resumeId },
    orderBy: { versionNumber: "desc" },
  });
  const versionNumber = latest ? latest.versionNumber + 1 : 1;

  const checksum = require("crypto").createHash("sha256").update(fileBuffer).digest("hex");

  const version = await prisma.resumeVersion.create({
    data: {
      resumeId,
      versionNumber,
      originalFileName,
      mimeType,
      fileSize: fileBuffer.length,
      storageKey,
      checksum,
      status: "uploaded",
    },
  });
  return version;
}

/** Activate a version (set isActive flag, unset others) */
export async function activateVersion(auth: AuthContext, versionId: string) {
  const permitted = await ensureResumeVersionOwnership(versionId, auth);
  if (permitted === null) return null;
  if (!permitted) throw new Error("Forbidden");

  const version = await prisma.resumeVersion.findUnique({ where: { id: versionId } });
  if (!version) return null;

  // Unset other active versions for the same resume
  await prisma.resumeVersion.updateMany({
    where: { resumeId: version.resumeId },
    data: { isActive: false },
  });

  const updated = await prisma.resumeVersion.update({
    where: { id: versionId },
    data: { isActive: true, status: "ready", parsedAt: new Date() },
  });
  return updated;
}

/** Delete a version (file + DB) */
export async function deleteVersion(auth: AuthContext, versionId: string) {
  const permitted = await ensureResumeVersionOwnership(versionId, auth);
  if (permitted === null) return null;
  if (!permitted) throw new Error("Forbidden");

  const version = await prisma.resumeVersion.findUnique({ where: { id: versionId } });
  if (!version) return null;

  // Delete stored file
  await deleteFile(version.storageKey, version.originalFileName);

  // Remove DB record (cascade may remove related reviews)
  await prisma.resumeVersion.delete({ where: { id: versionId } });
  return true;
}

/** Get signed download URL for a version */
export async function getVersionDownloadUrl(auth: AuthContext, versionId: string) {
  const permitted = await ensureResumeVersionOwnership(versionId, auth);
  if (permitted === null) return null;
  if (!permitted) throw new Error("Forbidden");

  const version = await prisma.resumeVersion.findUnique({ where: { id: versionId } });
  if (!version) return null;

  const url = await getSignedUrl(version.storageKey, version.originalFileName);
  return url;
}

/** Log profile sync actions (audit) */
export async function logProfileSync(
  studentId: string,
  resumeVersionId: string,
  fieldsApplied: any
) {
  await prisma.profileSyncLog.create({
    data: {
      studentId,
      resumeVersionId,
      fieldsApplied,
    },
  });
}
